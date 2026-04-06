CREATE TABLE IF NOT EXISTS block_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_key TEXT NOT NULL UNIQUE,
  trade_date DATE NOT NULL,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  deal_type TEXT NOT NULL,
  quantity BIGINT NOT NULL,
  price_per_share NUMERIC(14, 2) NOT NULL,
  total_value_cr NUMERIC(14, 2) NOT NULL,
  buyer_name TEXT,
  seller_name TEXT,
  source TEXT NOT NULL DEFAULT 'scraper',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT block_deals_exchange_check CHECK (exchange IN ('NSE', 'BSE')),
  CONSTRAINT block_deals_type_check CHECK (deal_type IN ('block', 'bulk')),
  CONSTRAINT block_deals_positive_quantity CHECK (quantity > 0),
  CONSTRAINT block_deals_positive_price CHECK (price_per_share > 0),
  CONSTRAINT block_deals_non_negative_value CHECK (total_value_cr >= 0)
);

CREATE INDEX IF NOT EXISTS idx_block_deals_trade_date
  ON block_deals (trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_block_deals_symbol_trade_date
  ON block_deals (symbol, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_block_deals_exchange_trade_date
  ON block_deals (exchange, trade_date DESC);

DROP TRIGGER IF EXISTS trg_block_deals_updated_at ON block_deals;
CREATE TRIGGER trg_block_deals_updated_at
BEFORE UPDATE ON block_deals
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
