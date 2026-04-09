-- Canonicalize stock summary metrics by keeping 52-week windows in stock_metrics_snapshots.
-- This migration removes redundant duplicate 12m fields and drops legacy stock_52_week_levels.

ALTER TABLE stock_metrics_snapshots
  DROP CONSTRAINT IF EXISTS stock_metrics_snapshots_range_check;

ALTER TABLE stock_metrics_snapshots
  DROP COLUMN IF EXISTS high_12m,
  DROP COLUMN IF EXISTS low_12m;

ALTER TABLE stock_metrics_snapshots
  ADD CONSTRAINT stock_metrics_snapshots_range_check CHECK (
    (week_52_high IS NULL OR week_52_low IS NULL OR week_52_high >= week_52_low)
    AND (high_3m IS NULL OR low_3m IS NULL OR high_3m >= low_3m)
  );

DROP TABLE IF EXISTS stock_52_week_levels;
