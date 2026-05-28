-- Migration 0002 - Pipeline display fields + unique constraint
-- Adds direct display columns so we don't need a join to opportunities
-- Adds sam_notice_id as the stable external key
-- Adds unique constraint for upsert support

ALTER TABLE pipeline_items
  ADD COLUMN IF NOT EXISTS sam_notice_id TEXT,
  ADD COLUMN IF NOT EXISTS title         TEXT,
  ADD COLUMN IF NOT EXISTS agency        TEXT,
  ADD COLUMN IF NOT EXISTS deadline      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS naics_code    TEXT,
  ADD COLUMN IF NOT EXISTS notes         TEXT;

-- Allow opportunity_id to be NULL (already is, just confirming intent)
-- Add unique constraint for upsert: one row per user per contract
CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_user_notice
  ON pipeline_items(user_id, sam_notice_id)
  WHERE sam_notice_id IS NOT NULL;
