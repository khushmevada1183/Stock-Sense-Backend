CREATE TABLE IF NOT EXISTS ipo_gmp_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipo_calendar(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'scraper',
  gmp_price NUMERIC(12, 2) NOT NULL,
  gmp_percent NUMERIC(8, 2) NOT NULL,
  expected_listing_price NUMERIC(12, 2),
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ipo_gmp_snapshot_unique UNIQUE (ipo_id, snapshot_date, source),
  CONSTRAINT ipo_gmp_sentiment_check CHECK (
    sentiment IN ('bullish', 'positive', 'neutral', 'bearish')
  )
);

CREATE INDEX IF NOT EXISTS idx_ipo_gmp_snapshots_ipo_date
  ON ipo_gmp_snapshots (ipo_id, snapshot_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ipo_gmp_snapshots_date
  ON ipo_gmp_snapshots (snapshot_date DESC, created_at DESC);

DROP TRIGGER IF EXISTS trg_ipo_gmp_snapshots_updated_at ON ipo_gmp_snapshots;
CREATE TRIGGER trg_ipo_gmp_snapshots_updated_at
BEFORE UPDATE ON ipo_gmp_snapshots
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
