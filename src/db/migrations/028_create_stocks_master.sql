CREATE TABLE IF NOT EXISTS stocks_master (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(30) NOT NULL UNIQUE,
  isin VARCHAR(12) UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  exchange VARCHAR(10) NOT NULL DEFAULT 'NSE',
  nse_symbol VARCHAR(30),
  bse_code VARCHAR(10),
  series VARCHAR(5) NOT NULL DEFAULT 'EQ',
  sector VARCHAR(100),
  industry VARCHAR(100),
  index_membership JSONB NOT NULL DEFAULT '[]'::jsonb,
  listing_date DATE,
  face_value NUMERIC(10, 2),
  lot_size INTEGER NOT NULL DEFAULT 1,
  is_fo_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  is_sme BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  logo_url TEXT,
  website TEXT,
  description TEXT,
  headquarters VARCHAR(255),
  employees INTEGER,
  founded_year INTEGER,
  source TEXT NOT NULL DEFAULT 'stock-nse-india',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stocks_master_exchange_check CHECK (
    exchange IN ('NSE', 'BSE', 'BOTH')
  )
);

CREATE INDEX IF NOT EXISTS idx_stocks_master_symbol
  ON stocks_master (symbol);

CREATE INDEX IF NOT EXISTS idx_stocks_master_isin
  ON stocks_master (isin);

CREATE INDEX IF NOT EXISTS idx_stocks_master_sector
  ON stocks_master (sector);

CREATE INDEX IF NOT EXISTS idx_stocks_master_exchange
  ON stocks_master (exchange);

CREATE INDEX IF NOT EXISTS idx_stocks_master_active_symbol
  ON stocks_master (is_active, symbol);

CREATE INDEX IF NOT EXISTS idx_stocks_master_fts
  ON stocks_master USING GIN(
    to_tsvector('english', COALESCE(company_name, '') || ' ' || COALESCE(symbol, ''))
  );

DROP TRIGGER IF EXISTS trg_stocks_master_updated_at ON stocks_master;

CREATE TRIGGER trg_stocks_master_updated_at
BEFORE UPDATE ON stocks_master
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
