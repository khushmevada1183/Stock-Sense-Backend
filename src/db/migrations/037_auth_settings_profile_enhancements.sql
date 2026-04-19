-- Add settings/profile fields to users for account preferences.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS income_range TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Track per-session activity timestamps for device/session management endpoints.
ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

UPDATE user_sessions
SET last_used_at = COALESCE(last_used_at, created_at)
WHERE last_used_at IS NULL;

ALTER TABLE user_sessions
  ALTER COLUMN last_used_at SET DEFAULT NOW();

ALTER TABLE user_sessions
  ALTER COLUMN last_used_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_last_used
  ON user_sessions (user_id, revoked_at, last_used_at DESC);

-- Extend auth audit event whitelist for settings/security endpoints.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'auth_audit_logs_type_check'
      AND conrelid = 'public.auth_audit_logs'::regclass
  ) THEN
    ALTER TABLE auth_audit_logs DROP CONSTRAINT auth_audit_logs_type_check;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.auth_audit_logs') IS NOT NULL THEN
    ALTER TABLE auth_audit_logs
      ADD CONSTRAINT auth_audit_logs_type_check
      CHECK (
        event_type IN (
          'signup',
          'login',
          'oauth_login',
          'refresh',
          'logout',
          'logout_all',
          'logout_device',
          'forgot_password',
          'reset_password',
          'change_password',
          'resend_verification',
          'verify_email',
          'report_activity',
          'profile_update'
        )
      );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;
$$;
