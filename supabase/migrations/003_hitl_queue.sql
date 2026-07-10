-- Decoded Six — HITL queue
-- product_id namespace: 'gta-hub'
--
-- From "Session 9 — DecodedSix Supabase Migrations": the one genuinely
-- new table that task asked for. The other four it specified (articles,
-- audit_log, waitlist_emails, monetization_gates) already existed by the
-- time that session ran, each with a schema that diverges from what was
-- requested — see root migrations/README.md's reconciliation note. This
-- file was originally (incorrectly) written to the root migrations/
-- directory as 009_hitl_queue.sql; moved here because that directory is
-- dead/unreachable against the real database (confirmed twice already —
-- see root migrations/README.md and project memory) and articles(id)
-- below needs to resolve against the real table in 001_schema.sql.

CREATE TABLE IF NOT EXISTS hitl_queue (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  TEXT NOT NULL DEFAULT 'gta-hub',
  article_id  UUID REFERENCES articles(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'approved', 'rejected', 'held')),
  action      TEXT,
  notes       TEXT,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE hitl_queue ENABLE ROW LEVEL SECURITY;
-- No explicit service_role policy — service role bypasses RLS automatically
-- for agent writes (see 001_schema.sql / 002_content_pipeline_agents.sql).
-- Dashboard approve/reject/hold actions go through Supabase Auth as
-- `authenticated`, which does need explicit policies below.

CREATE POLICY "hitl_queue_authenticated_read" ON hitl_queue
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hitl_queue_authenticated_update" ON hitl_queue
  FOR UPDATE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_hitl_queue_article_id ON hitl_queue(article_id);
CREATE INDEX IF NOT EXISTS idx_hitl_queue_status ON hitl_queue(status);

-- NOTE: real articles.status (001_schema.sql) is CHECK ('draft','published',
-- 'archived') — there is no 'hitl_review' value for this table to key off
-- of yet. Same gap n8n/hitl_notification.json's README note flags. Adding
-- it is a deliberate status-enum decision, not done here.
