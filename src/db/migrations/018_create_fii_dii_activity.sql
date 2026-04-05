CREATE TABLE IF NOT EXISTS fii_dii_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_date DATE NOT NULL,
  category TEXT NOT NULL,
  segment TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'scraper',
  gross_buy NUMERIC(18, 2) NOT NULL DEFAULT 0,
  gross_sell NUMERIC(18, 2) NOT NULL DEFAULT 0,
  net_value NUMERIC(18, 2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fii_dii_category_check CHECK (category IN ('FII', 'DII')),
  CONSTRAINT fii_dii_segment_check CHECK (segment IN ('equity', 'debt', 'hybrid')),
  CONSTRAINT fii_dii_activity_unique UNIQUE (flow_date, category, segment, source)
);

CREATE INDEX IF NOT EXISTS idx_fii_dii_activity_date
  ON fii_dii_activity (flow_date DESC);

CREATE INDEX IF NOT EXISTS idx_fii_dii_activity_segment_date
  ON fii_dii_activity (segment, flow_date DESC);

DROP TRIGGER IF EXISTS trg_fii_dii_activity_updated_at ON fii_dii_activity;
CREATE TRIGGER trg_fii_dii_activity_updated_at
BEFORE UPDATE ON fii_dii_activity
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
