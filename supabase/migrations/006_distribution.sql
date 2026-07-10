-- Decoded Six — Marketing distribution (LinkedIn + Reddit draft) support
-- Written against the real, live schema in this directory (see
-- migrations/README.md — the root migrations/ dir is dead/unreachable).

-- Bookkeeping flags on the real articles table (supabase/migrations/001_schema.sql).
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS linkedin_posted      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS linkedin_posted_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reddit_draft_created  BOOLEAN NOT NULL DEFAULT FALSE;

-- Reddit drafts — draft only, a human posts manually (ban risk otherwise).
CREATE TABLE IF NOT EXISTS reddit_drafts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id  TEXT NOT NULL DEFAULT 'gta-hub',
  article_id  UUID REFERENCES articles(id) ON DELETE CASCADE,
  subreddit   TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'posted', 'discarded')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reddit_drafts ENABLE ROW LEVEL SECURITY;
-- No explicit service_role policy — service role bypasses RLS automatically
-- (same convention as hitl_queue in 003_hitl_queue.sql).

CREATE POLICY "reddit_drafts_authenticated_read" ON reddit_drafts
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_reddit_drafts_article_id ON reddit_drafts(article_id);
CREATE INDEX IF NOT EXISTS idx_reddit_drafts_status ON reddit_drafts(status);
