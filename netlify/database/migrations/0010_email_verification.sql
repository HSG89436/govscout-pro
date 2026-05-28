-- 0010_email_verification.sql
-- Adds email verification fields to users table.
-- email_verified:     TRUE once the user clicks the link in the verification email
-- email_verify_token: 64-char hex token; NULL after verification

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified      BOOLEAN    NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verify_token  VARCHAR(64);

-- Admin account is pre-verified (no email to send to)
UPDATE users SET email_verified = TRUE WHERE role = 'admin';
