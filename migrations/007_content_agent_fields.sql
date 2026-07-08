-- DecodedSix Migration 007 — Content pipeline agent fields
--
-- The content pipeline agents (ds_draft, ds_humanizer, ds_detect,
-- ds_copyright) need two things migration 001 didn't provide:
--
-- 1. articles.agent_generated — no such column existed; ds_draft.py sets
--    it true on every insert so the dashboard can distinguish agent-authored
--    drafts from anything entered manually.
-- 2. articles.article_type's CHECK constraint only allowed
--    news/guide/tier_list/weekly/analysis — ds_draft.py's category input is
--    news/rumor/guide/event per CLAUDE.md's Phase 3 spec, so 'rumor' and
--    'event' need to be valid values too.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS agent_generated boolean DEFAULT false;

ALTER TABLE articles
  DROP CONSTRAINT IF EXISTS articles_article_type_check;

ALTER TABLE articles
  ADD CONSTRAINT articles_article_type_check
  CHECK (article_type IN (
    'news', 'guide', 'tier_list', 'weekly', 'analysis', 'rumor', 'event'
  ));
