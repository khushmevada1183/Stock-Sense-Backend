-- Password reset refactor: code verification now issues a temporary reset session token.
ALTER TABLE password_reset_tokens
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reset_session_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS reset_session_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_reset_session_hash_unique
  ON password_reset_tokens (reset_session_token_hash)
  WHERE reset_session_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_reset_session_validity
  ON password_reset_tokens (reset_session_expires_at, used_at);
