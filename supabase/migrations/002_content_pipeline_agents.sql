-- Decoded Six — Content pipeline agent fields
-- product_id namespace: 'gta-hub'
--
-- Adds what ds_draft/ds_humanizer/ds_detect/ds_copyright (src/agents/content/)
-- need on top of 001_schema.sql:
--   - audit_log: didn't exist at all. CLAUDE.md non-negotiable: "Every agent
--     action writes to audit_log table." agents_log (001_schema.sql) is a
--     different, pre-existing thing — a per-run batch counter for scrapers
--     like Agent 04 (records_processed/started_at/completed_at, no
--     article_id or action column) — not a substitute for a per-action trail.
--   - articles.ai_detect_score: nowhere to persist Originality.ai's score.

CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id   TEXT NOT NULL,
  action     TEXT NOT NULL,
  article_id UUID REFERENCES articles(id),
  result     TEXT,
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS ai_detect_score INTEGER;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- No public read policy: audit_log is internal/service-role only, same as
-- agents_log above it — the public site never queries this table directly.
-- Service role bypasses RLS automatically for agent writes (see 001_schema.sql).

CREATE INDEX IF NOT EXISTS idx_audit_log_article_id ON audit_log(article_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
