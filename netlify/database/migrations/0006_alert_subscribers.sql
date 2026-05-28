-- Alert subscribers: stores users who have activated daily contract alerts
CREATE TABLE IF NOT EXISTS alert_subscribers (
  id                 SERIAL PRIMARY KEY,
  email              TEXT NOT NULL UNIQUE,
  name               TEXT NOT NULL DEFAULT '',
  keywords           TEXT NOT NULL DEFAULT '',
  naics_codes        TEXT NOT NULL DEFAULT '',
  certifications     TEXT NOT NULL DEFAULT '',
  sam_api_key        TEXT NOT NULL DEFAULT '',
  telegram_chat_id   TEXT,
  frequency          TEXT NOT NULL DEFAULT 'daily',
  min_score          TEXT NOT NULL DEFAULT 'TEAM',
  active             BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribe_token  TEXT NOT NULL DEFAULT '',
  last_run           TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_subscribers_email
  ON alert_subscribers(email);

CREATE INDEX IF NOT EXISTS idx_alert_subscribers_active
  ON alert_subscribers(active);
