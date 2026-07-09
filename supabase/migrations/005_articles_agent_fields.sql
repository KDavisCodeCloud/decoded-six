-- 005_articles_agent_fields.sql
-- Extends articles table for DSX-CA1 content agent (Session G)
-- DO NOT create a new table — extend the existing articles table
-- Run via: supabase db query --linked -f supabase/migrations/005_articles_agent_fields.sql

-- 1. Expand status CHECK to include agent HITL states
--    PostgreSQL auto-names inline single-column CHECK as articles_status_check
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE articles ADD CONSTRAINT articles_status_check
  CHECK (status IN ('draft', 'published', 'archived', 'pending_review', 'needs_revision'));

-- 2. Add agent-only columns (all nullable — existing rows unaffected)
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS article_type       TEXT
    CHECK (article_type IN ('news', 'evergreen', 'conversion')),
  ADD COLUMN IF NOT EXISTS publish_date       DATE,
  ADD COLUMN IF NOT EXISTS faq_pairs          JSONB,
  ADD COLUMN IF NOT EXISTS internal_links_used TEXT[],
  ADD COLUMN IF NOT EXISTS external_citation  TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_links    JSONB,
  ADD COLUMN IF NOT EXISTS schema_article     JSONB,
  ADD COLUMN IF NOT EXISTS schema_faq         JSONB,
  ADD COLUMN IF NOT EXISTS schema_breadcrumb  JSONB,
  ADD COLUMN IF NOT EXISTS word_count         INTEGER,
  ADD COLUMN IF NOT EXISTS hitl_reviewer      TEXT,
  ADD COLUMN IF NOT EXISTS hitl_reviewed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hitl_notes         TEXT,
  ADD COLUMN IF NOT EXISTS page_views         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_clicks   INTEGER NOT NULL DEFAULT 0;

-- 3. Index for HITL queue queries (pending_review + needs_revision filter)
CREATE INDEX IF NOT EXISTS idx_articles_status_agent
  ON articles (status, created_at DESC)
  WHERE status IN ('pending_review', 'needs_revision');

-- 4. Index for article_type scheduling queries
CREATE INDEX IF NOT EXISTS idx_articles_type
  ON articles (article_type, publish_date DESC);
