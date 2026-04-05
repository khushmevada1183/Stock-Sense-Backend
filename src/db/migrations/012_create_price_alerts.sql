CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  target_value NUMERIC(18, 4) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT price_alerts_alert_type_check CHECK (
    alert_type IN (
      'price_above',
      'price_below',
      'percent_change_up',
      'percent_change_down',
      'volume_spike',
      'daily_change'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_created_at
  ON price_alerts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol_active
  ON price_alerts (symbol, is_active);
