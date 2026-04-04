-- Core hypertable for OHLCV stock ticks/candles.
CREATE TABLE IF NOT EXISTS stock_price_ticks (
  symbol TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  open NUMERIC(14, 4),
  high NUMERIC(14, 4),
  low NUMERIC(14, 4),
  close NUMERIC(14, 4) NOT NULL,
  volume BIGINT,
  source TEXT NOT NULL DEFAULT 'nse',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, ts)
);

SELECT create_hypertable('stock_price_ticks', 'ts', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_stock_price_ticks_symbol_ts_desc
  ON stock_price_ticks (symbol, ts DESC);

CREATE INDEX IF NOT EXISTS idx_stock_price_ticks_ts_desc
  ON stock_price_ticks (ts DESC);

CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_price_ticks_updated_at ON stock_price_ticks;

CREATE TRIGGER trg_stock_price_ticks_updated_at
BEFORE UPDATE ON stock_price_ticks
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
