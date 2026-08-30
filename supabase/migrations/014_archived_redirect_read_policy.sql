-- 014_archived_redirect_read_policy.sql
-- Real bug found and fixed 2026-08-29 while archiving 2 duplicate-cluster
-- articles: migration 011 added articles.redirect_slug and the
-- [locale]/news/[slug] route's getRedirectTarget() query
-- (.eq('status','archived').not('redirect_slug','is',null)) to serve it,
-- but never added an RLS policy letting the public/anon role -- which is
-- what the site's own frontend client uses (NEXT_PUBLIC_SUPABASE_ANON_KEY,
-- src/lib/supabase.ts) -- read archived rows at all. The only public SELECT
-- policy on this table (articles_public_read) is scoped to
-- status = 'published'. RLS silently returned zero rows for every
-- getRedirectTarget() call, so every archived article -- all 36 from the
-- Aug 27 dead-URL cleanup, plus the 2 archived today -- 404'd instead of
-- redirecting. Confirmed live via curl before this fix (HTTP 404, not a
-- 301/308) and again after (real redirect landing on the canonical page).
--
-- Scoped narrowly to archived rows that actually have a redirect_slug set,
-- not all archived content -- an archived row with no redirect_slug should
-- keep 404ing, not become generally readable.

DROP POLICY IF EXISTS "articles_public_read_archived_redirects" ON articles;
CREATE POLICY "articles_public_read_archived_redirects"
  ON articles FOR SELECT
  TO public
  USING (status = 'archived' AND redirect_slug IS NOT NULL);
