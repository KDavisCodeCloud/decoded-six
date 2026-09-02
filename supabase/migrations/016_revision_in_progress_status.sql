-- Migration 016: add 'revision_in_progress' to articles.status.
--
-- The dashboard's "Revise" button set status='needs_revision' with no
-- automation and no way to leave the HITL queue view (queue/page.tsx
-- filters status IN ('pending_review','needs_revision')). This status
-- exists so clicking Revise immediately removes the article from that
-- view while the agent actually revises it in the background, then it
-- returns to 'pending_review' for a final human look -- never publishes
-- directly, per this project's HITL non-negotiable.

ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE articles ADD CONSTRAINT articles_status_check
  CHECK (status IN ('draft', 'published', 'archived', 'pending_review', 'needs_revision', 'revision_in_progress'));
