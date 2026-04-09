-- V1 stock-data refactor: classify rows by dataset/timeframe/source-family
-- and ensure aggregate views only materialize production data.

ALTER TABLE stock_price_ticks
  ADD COLUMN IF NOT EXISTS dataset_type TEXT NOT NULL DEFAULT 'prod',
  ADD COLUMN IF NOT EXISTS timeframe TEXT NOT NULL DEFAULT '1d',
  ADD COLUMN IF NOT EXISTS source_family TEXT;

ALTER TABLE stock_price_ticks
  ALTER COLUMN source_family SET DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_price_ticks_dataset_type_check'
  ) THEN
    ALTER TABLE stock_price_ticks
      ADD CONSTRAINT stock_price_ticks_dataset_type_check
      CHECK (dataset_type IN ('prod', 'test'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_price_ticks_timeframe_check'
  ) THEN
    ALTER TABLE stock_price_ticks
      ADD CONSTRAINT stock_price_ticks_timeframe_check
      CHECK (timeframe IN ('tick', '1m', '5m', '15m', '1d'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_price_ticks_source_family_check'
  ) THEN
    ALTER TABLE stock_price_ticks
      ADD CONSTRAINT stock_price_ticks_source_family_check
      CHECK (
        source_family IS NULL
        OR source_family IN ('historical', 'live', 'smoke', 'backfill', 'manual')
      );
  END IF;
END
$$;

UPDATE stock_price_ticks
SET
  dataset_type = CASE
    WHEN LOWER(COALESCE(source, '')) LIKE '%smoke%'
      OR LOWER(COALESCE(source, '')) LIKE '%test%'
      THEN 'test'
    ELSE 'prod'
  END,
  timeframe = CASE
    WHEN LOWER(COALESCE(source, '')) LIKE '%live%'
      OR LOWER(COALESCE(source, '')) LIKE '%tick%'
      THEN 'tick'
    WHEN LOWER(COALESCE(source, '')) LIKE '%15m%'
      THEN '15m'
    WHEN LOWER(COALESCE(source, '')) LIKE '%5m%'
      THEN '5m'
    WHEN LOWER(COALESCE(source, '')) LIKE '%1m%'
      THEN '1m'
    WHEN LOWER(COALESCE(source, '')) LIKE '%historical%'
      OR LOWER(COALESCE(source, '')) LIKE '%daily%'
      THEN '1d'
    ELSE '1d'
  END,
  source_family = CASE
    WHEN LOWER(COALESCE(source, '')) LIKE '%historical%'
      OR LOWER(COALESCE(source, '')) LIKE '%daily%'
      THEN 'historical'
    WHEN LOWER(COALESCE(source, '')) LIKE '%live%'
      OR LOWER(COALESCE(source, '')) LIKE '%tick%'
      OR LOWER(COALESCE(source, '')) LIKE '%poll%'
      THEN 'live'
    WHEN LOWER(COALESCE(source, '')) LIKE '%smoke%'
      OR LOWER(COALESCE(source, '')) LIKE '%test%'
      THEN 'smoke'
    WHEN LOWER(COALESCE(source, '')) LIKE '%backfill%'
      OR LOWER(COALESCE(source, '')) LIKE '%bootstrap%'
      THEN 'backfill'
    ELSE 'manual'
  END;

CREATE INDEX IF NOT EXISTS idx_stock_price_ticks_dataset_symbol_ts_desc
  ON stock_price_ticks (dataset_type, symbol, ts DESC);

CREATE INDEX IF NOT EXISTS idx_stock_price_ticks_dataset_source_ts_desc
  ON stock_price_ticks (dataset_type, source, ts DESC);

CREATE INDEX IF NOT EXISTS idx_stock_price_ticks_dataset_timeframe_symbol_ts_desc
  ON stock_price_ticks (dataset_type, timeframe, symbol, ts DESC);

DROP MATERIALIZED VIEW IF EXISTS stock_price_candles_1m;
DROP MATERIALIZED VIEW IF EXISTS stock_price_candles_5m;
DROP MATERIALIZED VIEW IF EXISTS stock_price_candles_15m;
DROP MATERIALIZED VIEW IF EXISTS stock_price_candles_1d;

CREATE MATERIALIZED VIEW stock_price_candles_1m AS
SELECT
  symbol,
  time_bucket(INTERVAL '1 minute', ts) AS bucket,
  (array_agg(close ORDER BY ts ASC))[1]::NUMERIC(14, 4) AS open,
  max(COALESCE(high, close))::NUMERIC(14, 4) AS high,
  min(COALESCE(low, close))::NUMERIC(14, 4) AS low,
  (array_agg(close ORDER BY ts DESC))[1]::NUMERIC(14, 4) AS close,
  COALESCE(sum(volume), 0)::BIGINT AS volume
FROM stock_price_ticks
WHERE dataset_type = 'prod'
GROUP BY symbol, time_bucket(INTERVAL '1 minute', ts)
WITH NO DATA;

CREATE MATERIALIZED VIEW stock_price_candles_5m AS
SELECT
  symbol,
  time_bucket(INTERVAL '5 minutes', ts) AS bucket,
  (array_agg(close ORDER BY ts ASC))[1]::NUMERIC(14, 4) AS open,
  max(COALESCE(high, close))::NUMERIC(14, 4) AS high,
  min(COALESCE(low, close))::NUMERIC(14, 4) AS low,
  (array_agg(close ORDER BY ts DESC))[1]::NUMERIC(14, 4) AS close,
  COALESCE(sum(volume), 0)::BIGINT AS volume
FROM stock_price_ticks
WHERE dataset_type = 'prod'
GROUP BY symbol, time_bucket(INTERVAL '5 minutes', ts)
WITH NO DATA;

CREATE MATERIALIZED VIEW stock_price_candles_15m AS
SELECT
  symbol,
  time_bucket(INTERVAL '15 minutes', ts) AS bucket,
  (array_agg(close ORDER BY ts ASC))[1]::NUMERIC(14, 4) AS open,
  max(COALESCE(high, close))::NUMERIC(14, 4) AS high,
  min(COALESCE(low, close))::NUMERIC(14, 4) AS low,
  (array_agg(close ORDER BY ts DESC))[1]::NUMERIC(14, 4) AS close,
  COALESCE(sum(volume), 0)::BIGINT AS volume
FROM stock_price_ticks
WHERE dataset_type = 'prod'
GROUP BY symbol, time_bucket(INTERVAL '15 minutes', ts)
WITH NO DATA;

CREATE MATERIALIZED VIEW stock_price_candles_1d AS
SELECT
  symbol,
  time_bucket(INTERVAL '1 day', ts) AS bucket,
  (array_agg(close ORDER BY ts ASC))[1]::NUMERIC(14, 4) AS open,
  max(COALESCE(high, close))::NUMERIC(14, 4) AS high,
  min(COALESCE(low, close))::NUMERIC(14, 4) AS low,
  (array_agg(close ORDER BY ts DESC))[1]::NUMERIC(14, 4) AS close,
  COALESCE(sum(volume), 0)::BIGINT AS volume
FROM stock_price_ticks
WHERE dataset_type = 'prod'
GROUP BY symbol, time_bucket(INTERVAL '1 day', ts)
WITH NO DATA;

CREATE INDEX IF NOT EXISTS idx_stock_price_candles_1m_symbol_bucket
  ON stock_price_candles_1m (symbol, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_stock_price_candles_5m_symbol_bucket
  ON stock_price_candles_5m (symbol, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_stock_price_candles_15m_symbol_bucket
  ON stock_price_candles_15m (symbol, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_stock_price_candles_1d_symbol_bucket
  ON stock_price_candles_1d (symbol, bucket DESC);

CREATE OR REPLACE FUNCTION refresh_stock_price_candle_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW stock_price_candles_1m;
  REFRESH MATERIALIZED VIEW stock_price_candles_5m;
  REFRESH MATERIALIZED VIEW stock_price_candles_15m;
  REFRESH MATERIALIZED VIEW stock_price_candles_1d;
END;
$$ LANGUAGE plpgsql;
