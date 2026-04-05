CREATE TABLE IF NOT EXISTS user_push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'fcm',
  device_token TEXT NOT NULL,
  platform TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_push_devices_provider_token_unique UNIQUE (provider, device_token)
);

CREATE INDEX IF NOT EXISTS idx_user_push_devices_user_active
  ON user_push_devices (user_id, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES price_alerts(id) ON DELETE SET NULL,
  delivery_key TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL,
  provider TEXT NOT NULL,
  recipient TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_deliveries_channel_check CHECK (
    channel IN ('email', 'push')
  ),
  CONSTRAINT notification_deliveries_status_check CHECK (
    status IN ('queued', 'processing', 'sent', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_created
  ON notification_deliveries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status_created
  ON notification_deliveries (status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_alert_channel
  ON notification_deliveries (alert_id, channel, created_at DESC);

DROP TRIGGER IF EXISTS trg_user_push_devices_updated_at ON user_push_devices;
CREATE TRIGGER trg_user_push_devices_updated_at
BEFORE UPDATE ON user_push_devices
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();

DROP TRIGGER IF EXISTS trg_notification_deliveries_updated_at ON notification_deliveries;
CREATE TRIGGER trg_notification_deliveries_updated_at
BEFORE UPDATE ON notification_deliveries
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
