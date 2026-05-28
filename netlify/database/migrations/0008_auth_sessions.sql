-- Migration 0008 — Verified authentication system
-- Adds password-based login and server-side sessions to replace email-only access

-- Add password hash column to users (nullable — existing users must set on next login)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Sessions table — server-side tokens issued on successful login
CREATE TABLE IF NOT EXISTS user_sessions (
  token        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '8 hours',
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user   ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON user_sessions(expires_at);

-- Clean up expired sessions automatically (Postgres won't do this automatically, but good practice)
-- Application code cleans up on login and logout.

-- Set Steve's initial password: govscout2026  (bcrypt cost 10)
-- He must change this after first login.
UPDATE users
  SET password_hash = '$2b$10$dUJrTpbrZuPwRBb7kvwPo.RFMXD6cpJVABElrYDq6RCxZ0Txn/HCq'
WHERE email = 'sharriman2002@gmail.com'
  AND password_hash IS NULL;
