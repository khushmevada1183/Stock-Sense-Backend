-- Auth hardening: add RBAC role support for JWT claims and authorization.
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('user', 'premium_user', 'admin'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
