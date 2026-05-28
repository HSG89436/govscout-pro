-- GovScout / Marcus Database Schema
-- Migration 0001 - Initial schema
-- All tables needed for Sprint 1-3 of the Marcus roadmap

-- USERS: Account identity and subscription
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email         TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  subscription_status TEXT DEFAULT 'inactive',
  paypal_subscription_id TEXT,
  role          TEXT DEFAULT 'user'
);

-- BUSINESS PROFILES: Marcus's persistent memory of the company
CREATE TABLE IF NOT EXISTS business_profiles (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id                   TEXT REFERENCES users(id) ON DELETE CASCADE,
  business_name             TEXT,
  plain_english_description TEXT,
  cage                      TEXT,
  uei                       TEXT,
  naics                     TEXT[],
  psc                       TEXT[],
  certifications            TEXT[],
  team_size                 TEXT,
  location                  TEXT,
  service_area              TEXT,
  experience                TEXT,
  past_performance          TEXT,
  bonding                   TEXT,
  clearances                TEXT,
  goals                     TEXT,
  sam_api_key               TEXT,
  profile_completion        INTEGER DEFAULT 0,
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- ALERT PREFERENCES: Where and how to send alerts
CREATE TABLE IF NOT EXISTS alert_preferences (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id           TEXT REFERENCES users(id) ON DELETE CASCADE,
  email_enabled     BOOLEAN DEFAULT false,
  alert_email       TEXT,
  telegram_enabled  BOOLEAN DEFAULT false,
  telegram_chat_id  TEXT,
  frequency         TEXT DEFAULT 'daily',
  quiet_hours_start INTEGER DEFAULT 22,
  quiet_hours_end   INTEGER DEFAULT 7,
  timezone          TEXT DEFAULT 'America/Los_Angeles',
  min_score         INTEGER DEFAULT 55,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- SAVED SEARCHES: Reusable opportunity-monitoring rules
CREATE TABLE IF NOT EXISTS saved_searches (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id              TEXT REFERENCES users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  naics                TEXT[],
  psc                  TEXT[],
  agencies             TEXT[],
  set_asides           TEXT[],
  keywords             TEXT[],
  exclude_keywords     TEXT[],
  place_of_performance TEXT,
  active               BOOLEAN DEFAULT true,
  scan_frequency       TEXT DEFAULT 'daily',
  last_scanned_at      TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- OPPORTUNITIES: Normalized SAM.gov records
CREATE TABLE IF NOT EXISTS opportunities (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sam_notice_id       TEXT UNIQUE,
  title               TEXT,
  agency              TEXT,
  office              TEXT,
  solicitation_number TEXT,
  naics               TEXT,
  psc                 TEXT,
  set_aside           TEXT,
  posted_date         DATE,
  response_deadline   TIMESTAMPTZ,
  description         TEXT,
  url                 TEXT,
  raw_json_hash       TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- OPPORTUNITY MATCHES: User-specific scores per opportunity
CREATE TABLE IF NOT EXISTS opportunity_matches (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id          TEXT REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id   TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  saved_search_id  TEXT REFERENCES saved_searches(id),
  fit_score        INTEGER,
  verdict          TEXT,
  reasons          TEXT[],
  risks            TEXT[],
  teaming_needs    TEXT[],
  next_action      TEXT,
  status           TEXT DEFAULT 'new',
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, opportunity_id)
);

-- PIPELINE ITEMS: Contracts the user is actively managing
CREATE TABLE IF NOT EXISTS pipeline_items (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id          TEXT REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id   TEXT REFERENCES opportunities(id),
  stage            TEXT DEFAULT 'watching',
  owner            TEXT,
  due_date         DATE,
  value_estimate   BIGINT,
  capture_summary  TEXT,
  go_no_go         TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- PIPELINE TASKS: Action list for each pursuit
CREATE TABLE IF NOT EXISTS pipeline_tasks (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pipeline_item_id TEXT REFERENCES pipeline_items(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  due_at           TIMESTAMPTZ,
  priority         TEXT DEFAULT 'normal',
  status           TEXT DEFAULT 'open',
  source           TEXT DEFAULT 'manual',
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- DOCUMENTS: Uploaded solicitation files
CREATE TABLE IF NOT EXISTS documents (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id        TEXT REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id TEXT REFERENCES opportunities(id),
  filename       TEXT,
  file_type      TEXT,
  storage_url    TEXT,
  extracted_text TEXT,
  uploaded_at    TIMESTAMPTZ DEFAULT now()
);

-- ALERTS: System-generated alert messages
CREATE TABLE IF NOT EXISTS alerts (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id        TEXT REFERENCES users(id) ON DELETE CASCADE,
  type           TEXT,
  subject        TEXT,
  body           TEXT,
  opportunity_id TEXT REFERENCES opportunities(id),
  task_id        TEXT REFERENCES pipeline_tasks(id),
  severity       TEXT DEFAULT 'info',
  sent           BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ALERT DELIVERY LOGS: Proof and debugging for delivery
CREATE TABLE IF NOT EXISTS alert_delivery_logs (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  alert_id          TEXT REFERENCES alerts(id) ON DELETE CASCADE,
  channel           TEXT,
  destination       TEXT,
  status            TEXT,
  provider_response TEXT,
  sent_at           TIMESTAMPTZ DEFAULT now(),
  error             TEXT
);

-- CHAT MESSAGES: Conversation history tied to account
CREATE TABLE IF NOT EXISTS chat_messages (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id             TEXT REFERENCES users(id) ON DELETE CASCADE,
  role                TEXT NOT NULL,
  content             TEXT NOT NULL,
  linked_entity_type  TEXT,
  linked_entity_id    TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- INDEXES for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user ON opportunity_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_user ON pipeline_items(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_pipeline ON pipeline_tasks(pipeline_item_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, sent);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_opps_sam ON opportunities(sam_notice_id);
CREATE INDEX IF NOT EXISTS idx_searches_user ON saved_searches(user_id, active);
