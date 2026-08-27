-- 013_article_type_expand.sql
-- Adds 'exclusive', 'deep_dive', 'breaking_news', and 'feature' to
-- articles.article_type, per the Pulse (dsx-ca1) content-standard rebuild
-- (2026-08-27). These are long-form/urgency signals the writer prompt and
-- topic-picker now branch on (word-count floor, required sections,
-- priority-queue ordering) -- 'news', 'evergreen', 'conversion' alone
-- (005_articles_agent_fields.sql) can't express them. 'feature' specifically
-- covers the spec's "Feature breakdown (gameplay system, mechanic,
-- character)" tier -- the spec described it by content nature, not an
-- explicit tag, but giving it its own article_type keeps all 4 new word-count
-- tiers equally explicit/enforceable rather than 3 of them being real flags
-- and one being an implicit judgment call.
-- Run via: supabase db query --linked -f supabase/migrations/013_article_type_expand.sql
-- (CLI's `db query --linked` shim is broken in this environment as of
-- 2026-08-27 -- actually applied via the Management API's database/query
-- endpoint using the token at ~/.supabase/access-token; this file is the
-- durable record, applied and verified live, not just aspirational.)

ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_article_type_check;
ALTER TABLE articles ADD CONSTRAINT articles_article_type_check
  CHECK (article_type IN ('news', 'evergreen', 'conversion', 'exclusive', 'deep_dive', 'breaking_news', 'feature'));
