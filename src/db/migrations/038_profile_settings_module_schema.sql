-- Profile + Settings module schema extension.
-- This migration is additive and compatible with existing auth/session tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) users: ensure required profile fields exist.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS income_range TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Passwords are stored as hashes in password_hash.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE users
SET full_name = COALESCE(NULLIF(TRIM(full_name), ''), split_part(email, '@', 1))
WHERE full_name IS NULL OR TRIM(full_name) = '';

ALTER TABLE users
  ALTER COLUMN full_name SET NOT NULL;

ALTER TABLE users
  ALTER COLUMN password_hash SET NOT NULL;

-- Ensure users(email) has a unique index for lookup + uniqueness guarantees.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%(%email%)'
  ) THEN
    CREATE UNIQUE INDEX idx_users_email_unique ON users (email);
  END IF;
END;
$$;

-- 2) user_sessions: add device + activity tracking fields for settings module.
ALTER TABLE user_sessions
  ADD COLUMN IF NOT EXISTS device_name TEXT,
  ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;

UPDATE user_sessions
SET last_activity = COALESCE(last_activity, last_used_at, created_at, NOW())
WHERE last_activity IS NULL;

ALTER TABLE user_sessions
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE user_sessions
  ALTER COLUMN last_activity SET DEFAULT NOW();

ALTER TABLE user_sessions
  ALTER COLUMN last_activity SET NOT NULL;

-- Required index for fast user session lookups.
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
  ON user_sessions (user_id);

-- Optimized index for listing active devices by recency.
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_last_activity
  ON user_sessions (user_id, last_activity DESC);

-- 3) suspicious_activity_reports: security reports raised by users.
CREATE TABLE IF NOT EXISTS suspicious_activity_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT suspicious_activity_reports_status_check
    CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed'))
);

-- Required index on user_id.
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_reports_user_id
  ON suspicious_activity_reports (user_id);

-- Operational indexes for moderation queues and timeline views.
CREATE INDEX IF NOT EXISTS idx_suspicious_activity_reports_status_created_at
  ON suspicious_activity_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_reports_user_created_at
  ON suspicious_activity_reports (user_id, created_at DESC);
