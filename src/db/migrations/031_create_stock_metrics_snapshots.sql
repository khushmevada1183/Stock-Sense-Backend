CREATE TABLE IF NOT EXISTS stock_metrics_snapshots (
  symbol TEXT NOT NULL,
  as_of_date DATE NOT NULL,
  week_52_high NUMERIC(14, 4),
  week_52_low NUMERIC(14, 4),
  week_52_high_date DATE,
  week_52_low_date DATE,
  high_3m NUMERIC(14, 4),
  low_3m NUMERIC(14, 4),
  high_12m NUMERIC(14, 4),
  low_12m NUMERIC(14, 4),
  return_3m_percent NUMERIC(10, 4),
  return_12m_percent NUMERIC(10, 4),
  avg_volume_20d BIGINT,
  source TEXT NOT NULL DEFAULT 'computed',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, as_of_date),
  CONSTRAINT stock_metrics_snapshots_range_check CHECK (
    (week_52_high IS NULL OR week_52_low IS NULL OR week_52_high >= week_52_low)
    AND (high_3m IS NULL OR low_3m IS NULL OR high_3m >= low_3m)
    AND (high_12m IS NULL OR low_12m IS NULL OR high_12m >= low_12m)
  )
);

CREATE INDEX IF NOT EXISTS idx_stock_metrics_snapshots_symbol_asof_desc
  ON stock_metrics_snapshots (symbol, as_of_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_metrics_snapshots_asof_desc
  ON stock_metrics_snapshots (as_of_date DESC);

DROP TRIGGER IF EXISTS trg_stock_metrics_snapshots_updated_at ON stock_metrics_snapshots;

CREATE TRIGGER trg_stock_metrics_snapshots_updated_at
BEFORE UPDATE ON stock_metrics_snapshots
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
