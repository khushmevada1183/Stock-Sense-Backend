CREATE TABLE IF NOT EXISTS corporate_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL UNIQUE,
  action_date DATE NOT NULL,
  announcement_date DATE,
  record_date DATE,
  symbol TEXT NOT NULL,
  company_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT,
  ratio_numerator NUMERIC(12, 4),
  ratio_denominator NUMERIC(12, 4),
  cash_value NUMERIC(16, 2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'scraper',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT corporate_actions_type_check CHECK (
    action_type IN ('dividend', 'split', 'bonus', 'rights', 'buyback')
  ),
  CONSTRAINT corporate_actions_non_negative_cash_value CHECK (cash_value >= 0),
  CONSTRAINT corporate_actions_ratio_pair_check CHECK (
    (ratio_numerator IS NULL AND ratio_denominator IS NULL)
    OR (ratio_numerator > 0 AND ratio_denominator > 0)
  ),
  CONSTRAINT corporate_actions_announcement_before_action CHECK (
    announcement_date IS NULL OR announcement_date <= action_date
  ),
  CONSTRAINT corporate_actions_record_before_action CHECK (
    record_date IS NULL OR record_date <= action_date
  )
);

CREATE INDEX IF NOT EXISTS idx_corporate_actions_action_date
  ON corporate_actions (action_date DESC);

CREATE INDEX IF NOT EXISTS idx_corporate_actions_symbol_action_date
  ON corporate_actions (symbol, action_date DESC);

CREATE INDEX IF NOT EXISTS idx_corporate_actions_type_action_date
  ON corporate_actions (action_type, action_date DESC);

DROP TRIGGER IF EXISTS trg_corporate_actions_updated_at ON corporate_actions;
CREATE TRIGGER trg_corporate_actions_updated_at
BEFORE UPDATE ON corporate_actions
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
