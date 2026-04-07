-- Store precomputed technical indicators per symbol and timeframe bucket.
CREATE TABLE IF NOT EXISTS technical_indicators (
  symbol TEXT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket IN ('1m', '5m', '15m', '1d')),
  ts TIMESTAMPTZ NOT NULL,
  indicators JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'technicalindicators',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (symbol, bucket, ts)
);

CREATE INDEX IF NOT EXISTS idx_technical_indicators_symbol_bucket_ts_desc
  ON technical_indicators (symbol, bucket, ts DESC);

DROP TRIGGER IF EXISTS trg_technical_indicators_updated_at ON technical_indicators;

CREATE TRIGGER trg_technical_indicators_updated_at
BEFORE UPDATE ON technical_indicators
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
