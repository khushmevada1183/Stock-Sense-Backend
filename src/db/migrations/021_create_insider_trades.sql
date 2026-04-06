CREATE TABLE IF NOT EXISTS insider_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_key TEXT NOT NULL UNIQUE,
  trade_date DATE NOT NULL,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  insider_name TEXT NOT NULL,
  insider_role TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  quantity BIGINT NOT NULL,
  average_price NUMERIC(14, 2) NOT NULL,
  trade_value_cr NUMERIC(16, 2) NOT NULL,
  mode TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'scraper',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT insider_trades_exchange_check CHECK (exchange IN ('NSE', 'BSE')),
  CONSTRAINT insider_trades_type_check CHECK (transaction_type IN ('buy', 'sell')),
  CONSTRAINT insider_trades_positive_quantity CHECK (quantity > 0),
  CONSTRAINT insider_trades_positive_price CHECK (average_price > 0),
  CONSTRAINT insider_trades_non_negative_value CHECK (trade_value_cr >= 0)
);

CREATE INDEX IF NOT EXISTS idx_insider_trades_trade_date
  ON insider_trades (trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_insider_trades_symbol_trade_date
  ON insider_trades (symbol, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_insider_trades_insider_trade_date
  ON insider_trades (insider_name, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_insider_trades_type_trade_date
  ON insider_trades (transaction_type, trade_date DESC);

DROP TRIGGER IF EXISTS trg_insider_trades_updated_at ON insider_trades;
CREATE TRIGGER trg_insider_trades_updated_at
BEFORE UPDATE ON insider_trades
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
