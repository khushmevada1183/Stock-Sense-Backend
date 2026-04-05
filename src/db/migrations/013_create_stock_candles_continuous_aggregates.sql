-- License-safe Timescale materialized candle views for OHLCV history.
-- Note: this environment does not currently permit continuous aggregate policies.

CREATE MATERIALIZED VIEW IF NOT EXISTS stock_price_candles_1m AS
SELECT
  symbol,
  time_bucket(INTERVAL '1 minute', ts) AS bucket,
  (array_agg(close ORDER BY ts ASC))[1]::NUMERIC(14, 4) AS open,
  max(COALESCE(high, close))::NUMERIC(14, 4) AS high,
  min(COALESCE(low, close))::NUMERIC(14, 4) AS low,
  (array_agg(close ORDER BY ts DESC))[1]::NUMERIC(14, 4) AS close,
  COALESCE(sum(volume), 0)::BIGINT AS volume
FROM stock_price_ticks
GROUP BY symbol, time_bucket(INTERVAL '1 minute', ts)
WITH NO DATA;

CREATE MATERIALIZED VIEW IF NOT EXISTS stock_price_candles_5m AS
SELECT
  symbol,
  time_bucket(INTERVAL '5 minutes', ts) AS bucket,
  (array_agg(close ORDER BY ts ASC))[1]::NUMERIC(14, 4) AS open,
  max(COALESCE(high, close))::NUMERIC(14, 4) AS high,
  min(COALESCE(low, close))::NUMERIC(14, 4) AS low,
  (array_agg(close ORDER BY ts DESC))[1]::NUMERIC(14, 4) AS close,
  COALESCE(sum(volume), 0)::BIGINT AS volume
FROM stock_price_ticks
GROUP BY symbol, time_bucket(INTERVAL '5 minutes', ts)
WITH NO DATA;

CREATE MATERIALIZED VIEW IF NOT EXISTS stock_price_candles_15m AS
SELECT
  symbol,
  time_bucket(INTERVAL '15 minutes', ts) AS bucket,
  (array_agg(close ORDER BY ts ASC))[1]::NUMERIC(14, 4) AS open,
  max(COALESCE(high, close))::NUMERIC(14, 4) AS high,
  min(COALESCE(low, close))::NUMERIC(14, 4) AS low,
  (array_agg(close ORDER BY ts DESC))[1]::NUMERIC(14, 4) AS close,
  COALESCE(sum(volume), 0)::BIGINT AS volume
FROM stock_price_ticks
GROUP BY symbol, time_bucket(INTERVAL '15 minutes', ts)
WITH NO DATA;

CREATE MATERIALIZED VIEW IF NOT EXISTS stock_price_candles_1d AS
SELECT
  symbol,
  time_bucket(INTERVAL '1 day', ts) AS bucket,
  (array_agg(close ORDER BY ts ASC))[1]::NUMERIC(14, 4) AS open,
  max(COALESCE(high, close))::NUMERIC(14, 4) AS high,
  min(COALESCE(low, close))::NUMERIC(14, 4) AS low,
  (array_agg(close ORDER BY ts DESC))[1]::NUMERIC(14, 4) AS close,
  COALESCE(sum(volume), 0)::BIGINT AS volume
FROM stock_price_ticks
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
