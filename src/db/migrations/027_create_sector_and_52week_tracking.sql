CREATE TABLE IF NOT EXISTS stock_sector_taxonomy (
  symbol TEXT PRIMARY KEY,
  company_name TEXT,
  sector TEXT NOT NULL DEFAULT 'UNKNOWN',
  industry TEXT NOT NULL DEFAULT 'UNKNOWN',
  market_cap NUMERIC(20, 2),
  source TEXT NOT NULL DEFAULT 'stock-nse-india',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_sector_taxonomy_sector_market_cap
  ON stock_sector_taxonomy (sector, market_cap DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_stock_sector_taxonomy_industry_market_cap
  ON stock_sector_taxonomy (industry, market_cap DESC NULLS LAST);

DROP TRIGGER IF EXISTS trg_stock_sector_taxonomy_updated_at ON stock_sector_taxonomy;
CREATE TRIGGER trg_stock_sector_taxonomy_updated_at
BEFORE UPDATE ON stock_sector_taxonomy
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

CREATE TABLE IF NOT EXISTS sector_heatmap_snapshots (
  sector TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_stocks INTEGER NOT NULL DEFAULT 0,
  advancing INTEGER NOT NULL DEFAULT 0,
  declining INTEGER NOT NULL DEFAULT 0,
  unchanged INTEGER NOT NULL DEFAULT 0,
  avg_change_percent NUMERIC(10, 4),
  total_market_cap NUMERIC(24, 2),
  source TEXT NOT NULL DEFAULT 'aggregated',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sector, captured_at)
);

CREATE INDEX IF NOT EXISTS idx_sector_heatmap_snapshots_captured_at
  ON sector_heatmap_snapshots (captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_sector_heatmap_snapshots_sector_captured
  ON sector_heatmap_snapshots (sector, captured_at DESC);

DROP TRIGGER IF EXISTS trg_sector_heatmap_snapshots_updated_at ON sector_heatmap_snapshots;
CREATE TRIGGER trg_sector_heatmap_snapshots_updated_at
BEFORE UPDATE ON sector_heatmap_snapshots
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

CREATE TABLE IF NOT EXISTS stock_52_week_levels (
  symbol TEXT PRIMARY KEY,
  week_52_high NUMERIC(20, 4),
  week_52_low NUMERIC(20, 4),
  high_date DATE,
  low_date DATE,
  current_price NUMERIC(20, 4),
  distance_from_high_percent NUMERIC(10, 4),
  distance_from_low_percent NUMERIC(10, 4),
  source TEXT NOT NULL DEFAULT 'stock-nse-india',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stock_52_week_levels_range_check CHECK (
    week_52_high IS NULL OR week_52_low IS NULL OR week_52_high >= week_52_low
  )
);

CREATE INDEX IF NOT EXISTS idx_stock_52_week_levels_distance_high
  ON stock_52_week_levels (distance_from_high_percent ASC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_stock_52_week_levels_distance_low
  ON stock_52_week_levels (distance_from_low_percent ASC NULLS LAST);

DROP TRIGGER IF EXISTS trg_stock_52_week_levels_updated_at ON stock_52_week_levels;
CREATE TRIGGER trg_stock_52_week_levels_updated_at
BEFORE UPDATE ON stock_52_week_levels
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
