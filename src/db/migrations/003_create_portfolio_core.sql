-- Portfolio domain core tables for phase-1 frontend integration.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure trigger helper exists even on fresh/partial environments.
CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- If legacy bigint-based tables exist, move them aside for one-time migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'portfolios'
      AND column_name = 'id'
      AND data_type <> 'uuid'
  ) AND to_regclass('public.portfolios_legacy_003') IS NULL THEN
    ALTER TABLE public.portfolios RENAME TO portfolios_legacy_003;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'portfolio_transactions'
      AND column_name = 'id'
      AND data_type <> 'uuid'
  ) AND to_regclass('public.portfolio_transactions_legacy_003') IS NULL THEN
    ALTER TABLE public.portfolio_transactions RENAME TO portfolio_transactions_legacy_003;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  portfolio_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, portfolio_name)
);

ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'portfolios'
      AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'portfolios'
      AND column_name = 'portfolio_name'
  ) THEN
    ALTER TABLE portfolios RENAME COLUMN name TO portfolio_name;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portfolios_user_id_portfolio_name_key'
      AND conrelid = 'public.portfolios'::regclass
  ) THEN
    ALTER TABLE portfolios
      ADD CONSTRAINT portfolios_user_id_portfolio_name_key
      UNIQUE (user_id, portfolio_name);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  quantity NUMERIC(20, 6) NOT NULL CHECK (quantity > 0),
  price NUMERIC(14, 4) NOT NULL CHECK (price > 0),
  transaction_date DATE NOT NULL,
  fees NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE portfolio_transactions
  ADD COLUMN IF NOT EXISTS portfolio_id UUID,
  ADD COLUMN IF NOT EXISTS symbol TEXT,
  ADD COLUMN IF NOT EXISTS transaction_type TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(20, 6),
  ADD COLUMN IF NOT EXISTS price NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS transaction_date DATE,
  ADD COLUMN IF NOT EXISTS fees NUMERIC(14, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'portfolio_transactions'
      AND column_name = 'transaction_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'portfolio_transactions'
      AND column_name = 'transaction_date'
  ) THEN
    ALTER TABLE portfolio_transactions
      ADD COLUMN transaction_date DATE;
    UPDATE portfolio_transactions
      SET transaction_date = COALESCE(transaction_at::date, created_at::date, CURRENT_DATE)
      WHERE transaction_date IS NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'portfolio_transactions'
      AND column_name = 'transaction_date'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE portfolio_transactions
      ALTER COLUMN transaction_date SET DEFAULT CURRENT_DATE;
    UPDATE portfolio_transactions
      SET transaction_date = CURRENT_DATE
      WHERE transaction_date IS NULL;
    ALTER TABLE portfolio_transactions
      ALTER COLUMN transaction_date SET NOT NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portfolio_transactions_transaction_type_check'
      AND conrelid = 'public.portfolio_transactions'::regclass
  ) THEN
    ALTER TABLE portfolio_transactions
      ADD CONSTRAINT portfolio_transactions_transaction_type_check
      CHECK (transaction_type IN ('buy', 'sell'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portfolio_transactions_quantity_check'
      AND conrelid = 'public.portfolio_transactions'::regclass
  ) THEN
    ALTER TABLE portfolio_transactions
      ADD CONSTRAINT portfolio_transactions_quantity_check
      CHECK (quantity > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portfolio_transactions_price_check'
      AND conrelid = 'public.portfolio_transactions'::regclass
  ) THEN
    ALTER TABLE portfolio_transactions
      ADD CONSTRAINT portfolio_transactions_price_check
      CHECK (price > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portfolio_transactions_fees_check'
      AND conrelid = 'public.portfolio_transactions'::regclass
  ) THEN
    ALTER TABLE portfolio_transactions
      ADD CONSTRAINT portfolio_transactions_fees_check
      CHECK (fees >= 0);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portfolio_transactions_portfolio_id_fkey'
      AND conrelid = 'public.portfolio_transactions'::regclass
  ) THEN
    ALTER TABLE portfolio_transactions
      ADD CONSTRAINT portfolio_transactions_portfolio_id_fkey
      FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- One-time backfill from legacy bigint tables.
DO $$
BEGIN
  IF to_regclass('public.portfolios_legacy_003') IS NOT NULL THEN
    CREATE TEMP TABLE tmp_portfolio_id_map_003 (
      legacy_id BIGINT PRIMARY KEY,
      new_id UUID NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO tmp_portfolio_id_map_003 (legacy_id, new_id)
    SELECT id, gen_random_uuid()
    FROM public.portfolios_legacy_003;

    WITH normalized AS (
      SELECT
        lp.id AS legacy_id,
        COALESCE(NULLIF(BTRIM(lp.user_id), ''), '1') AS user_id,
        COALESCE(NULLIF(BTRIM(lp.name), ''), 'Portfolio') AS base_name,
        lp.description,
        COALESCE(lp.created_at, NOW()) AS created_at,
        COALESCE(lp.updated_at, lp.created_at, NOW()) AS updated_at,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(NULLIF(BTRIM(lp.user_id), ''), '1'), COALESCE(NULLIF(BTRIM(lp.name), ''), 'Portfolio')
          ORDER BY lp.id
        ) AS duplicate_rank
      FROM public.portfolios_legacy_003 lp
    )
    INSERT INTO public.portfolios (
      id,
      user_id,
      portfolio_name,
      description,
      created_at,
      updated_at
    )
    SELECT
      m.new_id,
      n.user_id,
      CASE
        WHEN n.duplicate_rank = 1 THEN n.base_name
        ELSE n.base_name || ' #' || n.legacy_id::text
      END AS portfolio_name,
      n.description,
      n.created_at,
      n.updated_at
    FROM normalized n
    JOIN tmp_portfolio_id_map_003 m ON m.legacy_id = n.legacy_id;

    IF to_regclass('public.portfolio_transactions_legacy_003') IS NOT NULL THEN
      INSERT INTO public.portfolio_transactions (
        id,
        portfolio_id,
        symbol,
        transaction_type,
        quantity,
        price,
        transaction_date,
        fees,
        metadata,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        m.new_id,
        UPPER(BTRIM(t.symbol)),
        CASE
          WHEN UPPER(t.transaction_type) = 'SELL' THEN 'sell'
          ELSE 'buy'
        END,
        t.quantity,
        t.price,
        COALESCE(t.transaction_at::date, t.created_at::date, CURRENT_DATE),
        COALESCE(t.fees, 0),
        jsonb_strip_nulls(
          jsonb_build_object(
            'legacyType', t.transaction_type,
            'legacyNotes', t.notes
          )
        ),
        COALESCE(t.created_at, NOW()),
        COALESCE(t.transaction_at, t.created_at, NOW())
      FROM public.portfolio_transactions_legacy_003 t
      JOIN tmp_portfolio_id_map_003 m ON m.legacy_id = t.portfolio_id
      WHERE t.symbol IS NOT NULL
        AND BTRIM(t.symbol) <> ''
        AND t.quantity > 0
        AND t.price > 0;
    END IF;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id_created_at
  ON portfolios (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_portfolio_id_date
  ON portfolio_transactions (portfolio_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_symbol_date
  ON portfolio_transactions (symbol, transaction_date DESC);

DROP TRIGGER IF EXISTS trg_portfolios_updated_at ON portfolios;
CREATE TRIGGER trg_portfolios_updated_at
BEFORE UPDATE ON portfolios
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS trg_portfolio_transactions_updated_at ON portfolio_transactions;
CREATE TRIGGER trg_portfolio_transactions_updated_at
BEFORE UPDATE ON portfolio_transactions
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
