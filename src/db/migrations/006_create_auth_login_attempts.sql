-- Auth hardening: track login failures and temporary blocks.
CREATE TABLE IF NOT EXISTS auth_login_attempts (
  scope TEXT NOT NULL,
  identifier TEXT NOT NULL,
  failed_count INTEGER NOT NULL DEFAULT 0,
  first_failed_at TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, identifier),
  CONSTRAINT auth_login_attempts_scope_check CHECK (scope IN ('ip')),
  CONSTRAINT auth_login_attempts_failed_count_check CHECK (failed_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_blocked_until
  ON auth_login_attempts (blocked_until);

CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auth_login_attempts_updated_at ON auth_login_attempts;
CREATE TRIGGER trg_auth_login_attempts_updated_at
BEFORE UPDATE ON auth_login_attempts
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
