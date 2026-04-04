-- Auth hardening: session and auth event audit trail.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_status TEXT NOT NULL DEFAULT 'success',
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auth_audit_logs_status_check CHECK (event_status IN ('success', 'failure')),
  CONSTRAINT auth_audit_logs_type_check CHECK (
    event_type IN (
      'signup',
      'login',
      'oauth_login',
      'refresh',
      'logout',
      'logout_all',
      'forgot_password',
      'reset_password',
      'resend_verification',
      'verify_email'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_created_at
  ON auth_audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_created_at
  ON auth_audit_logs (event_type, created_at DESC);
