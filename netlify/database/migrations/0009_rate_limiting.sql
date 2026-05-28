-- 0009_rate_limiting.sql
-- Adds login brute-force protection columns to users table.
-- login_attempts: count of consecutive failed login attempts
-- lockout_until:  if set and in the future, login is denied

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS login_attempts  INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lockout_until   TIMESTAMPTZ;
