-- 011_article_redirects.sql
-- Phase 1A duplicate-article consolidation (2026-08-09): several published
-- articles covered the same release-date/pricing and pre-order/edition
-- topics -- some with stale, contradicted facts (e.g. claiming pricing was
-- unconfirmed after other live articles had already confirmed $79.99/$99.99).
-- Rather than delete the losing articles outright (which would 404 any
-- inbound/indexed links), they're archived with a redirect_slug pointing at
-- the canonical survivor. The [locale]/news/[slug] route 301s to it.

ALTER TABLE articles ADD COLUMN IF NOT EXISTS redirect_slug TEXT;

COMMENT ON COLUMN articles.redirect_slug IS
  'Set only when status = archived. Slug of the canonical article this one was consolidated into; the article page issues a permanent redirect to /news/{redirect_slug} instead of 404ing.';
