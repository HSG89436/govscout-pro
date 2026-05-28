-- Persist the Telegram destination managed by api-profile.js.
ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
