CREATE TABLE IF NOT EXISTS mutual_fund_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holding_key TEXT NOT NULL UNIQUE,
  holding_month DATE NOT NULL,
  amc_name TEXT NOT NULL,
  scheme_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  quantity BIGINT NOT NULL,
  market_value_cr NUMERIC(16, 2) NOT NULL,
  holding_percent NUMERIC(8, 4) NOT NULL,
  source TEXT NOT NULL DEFAULT 'scraper',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mutual_fund_holdings_positive_quantity CHECK (quantity > 0),
  CONSTRAINT mutual_fund_holdings_non_negative_value CHECK (market_value_cr >= 0),
  CONSTRAINT mutual_fund_holdings_percent_range CHECK (holding_percent >= 0 AND holding_percent <= 100)
);

CREATE INDEX IF NOT EXISTS idx_mutual_fund_holdings_month
  ON mutual_fund_holdings (holding_month DESC);

CREATE INDEX IF NOT EXISTS idx_mutual_fund_holdings_symbol_month
  ON mutual_fund_holdings (symbol, holding_month DESC);

CREATE INDEX IF NOT EXISTS idx_mutual_fund_holdings_amc_month
  ON mutual_fund_holdings (amc_name, holding_month DESC);

DROP TRIGGER IF EXISTS trg_mutual_fund_holdings_updated_at ON mutual_fund_holdings;
CREATE TRIGGER trg_mutual_fund_holdings_updated_at
BEFORE UPDATE ON mutual_fund_holdings
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
