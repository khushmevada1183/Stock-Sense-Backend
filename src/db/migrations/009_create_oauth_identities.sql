-- Auth hardening: OAuth provider identity links.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS oauth_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT oauth_identities_provider_check CHECK (provider IN ('google', 'facebook')),
  CONSTRAINT oauth_identities_provider_user_key UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_identities_user_provider
  ON oauth_identities (user_id, provider);

DROP TRIGGER IF EXISTS trg_oauth_identities_updated_at ON oauth_identities;
CREATE TRIGGER trg_oauth_identities_updated_at
BEFORE UPDATE ON oauth_identities
FOR EACH ROW
EXECUTE FUNCTION set_row_updated_at();
