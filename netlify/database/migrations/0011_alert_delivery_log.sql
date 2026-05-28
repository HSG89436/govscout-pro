-- 0011_alert_delivery_log.sql
-- Tracks every alert delivery attempt for debugging and audit

CREATE TABLE IF NOT EXISTS alert_delivery_log (
  id              SERIAL PRIMARY KEY,
  subscriber_id   INTEGER,          -- alert_subscribers.id (nullable — test sends won't have one)
  subscriber_email TEXT NOT NULL,
  channel         TEXT NOT NULL,    -- 'email' | 'telegram'
  status          TEXT NOT NULL,    -- 'sent' | 'failed' | 'skipped'
  leads_count     INTEGER DEFAULT 0,
  error_message   TEXT,
  is_test         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_delivery_log_email      ON alert_delivery_log (subscriber_email);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_log_created_at ON alert_delivery_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_delivery_log_status     ON alert_delivery_log (status);
