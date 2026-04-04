-- Persist minute-level market snapshots for fast frontend reads.
CREATE TABLE IF NOT EXISTS market_snapshots (
  captured_minute TIMESTAMPTZ PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'stock-nse-india',
  trending JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_shockers JSONB NOT NULL DEFAULT '{}'::jsonb,
  nse_most_active JSONB NOT NULL DEFAULT '{}'::jsonb,
  bse_most_active JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_captured_at_desc
  ON market_snapshots (captured_at DESC);

DROP TRIGGER IF EXISTS trg_market_snapshots_updated_at ON market_snapshots;

CREATE TRIGGER trg_market_snapshots_updated_at
BEFORE UPDATE ON market_snapshots
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();