CREATE TABLE IF NOT EXISTS ipo_subscription_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipo_calendar(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'scraper',
  retail_subscribed NUMERIC(10, 2) NOT NULL DEFAULT 0,
  nii_subscribed NUMERIC(10, 2) NOT NULL DEFAULT 0,
  qib_subscribed NUMERIC(10, 2) NOT NULL DEFAULT 0,
  employee_subscribed NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_subscribed NUMERIC(10, 2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ipo_subscription_snapshot_unique UNIQUE (ipo_id, snapshot_date, source),
  CONSTRAINT ipo_subscription_snapshot_non_negative CHECK (
    retail_subscribed >= 0
    AND nii_subscribed >= 0
    AND qib_subscribed >= 0
    AND employee_subscribed >= 0
    AND total_subscribed >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_ipo_subscription_snapshots_ipo_date
  ON ipo_subscription_snapshots (ipo_id, snapshot_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ipo_subscription_snapshots_date
  ON ipo_subscription_snapshots (snapshot_date DESC, created_at DESC);

DROP TRIGGER IF EXISTS trg_ipo_subscription_snapshots_updated_at ON ipo_subscription_snapshots;
CREATE TRIGGER trg_ipo_subscription_snapshots_updated_at
BEFORE UPDATE ON ipo_subscription_snapshots
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
