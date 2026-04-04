-- Auth hardening: OTP-based email verification tokens.
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_expiry
  ON email_verification_tokens (user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_validity
  ON email_verification_tokens (expires_at, used_at);
