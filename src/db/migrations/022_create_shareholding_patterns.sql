CREATE TABLE IF NOT EXISTS shareholding_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_key TEXT NOT NULL UNIQUE,
  period_end DATE NOT NULL,
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  promoter_holding NUMERIC(8, 4) NOT NULL,
  institutional_holding NUMERIC(8, 4) NOT NULL,
  retail_holding NUMERIC(8, 4) NOT NULL,
  other_holding NUMERIC(8, 4) NOT NULL,
  mutual_fund_holding NUMERIC(8, 4) NOT NULL,
  source TEXT NOT NULL DEFAULT 'scraper',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shareholding_promoter_range CHECK (promoter_holding >= 0 AND promoter_holding <= 100),
  CONSTRAINT shareholding_institutional_range CHECK (institutional_holding >= 0 AND institutional_holding <= 100),
  CONSTRAINT shareholding_retail_range CHECK (retail_holding >= 0 AND retail_holding <= 100),
  CONSTRAINT shareholding_other_range CHECK (other_holding >= 0 AND other_holding <= 100),
  CONSTRAINT shareholding_mutual_fund_range CHECK (mutual_fund_holding >= 0 AND mutual_fund_holding <= 100),
  CONSTRAINT shareholding_total_range CHECK (
    promoter_holding + institutional_holding + retail_holding + other_holding >= 99.5
    AND promoter_holding + institutional_holding + retail_holding + other_holding <= 100.5
  ),
  CONSTRAINT shareholding_mutual_within_institutional CHECK (
    mutual_fund_holding <= institutional_holding
  )
);

CREATE INDEX IF NOT EXISTS idx_shareholding_patterns_period
  ON shareholding_patterns (period_end DESC);

CREATE INDEX IF NOT EXISTS idx_shareholding_patterns_symbol_period
  ON shareholding_patterns (symbol, period_end DESC);

CREATE INDEX IF NOT EXISTS idx_shareholding_patterns_institutional_period
  ON shareholding_patterns (institutional_holding DESC, period_end DESC);

DROP TRIGGER IF EXISTS trg_shareholding_patterns_updated_at ON shareholding_patterns;
CREATE TRIGGER trg_shareholding_patterns_updated_at
BEFORE UPDATE ON shareholding_patterns
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
