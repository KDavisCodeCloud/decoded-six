-- Migration 017: template_variant on articles.
--
-- AdSense "Low value content" rejection #2 (2026-09 re-request) is most
-- likely driven by structural uniformity -- every DSX-CA1 article shares the
-- same skeleton (same FAQ placement, same section pattern, same closers).
-- Individually fine, collectively reads as automated content at scale.
-- content_agent.py now assigns one of 4 structural templates (A/B/C/D) per
-- article, deterministically from a hash of the topic string (not the slug --
-- the slug doesn't exist yet at the point in the pipeline where the template
-- has to be chosen, since it's part of the writer's own LLM output).
--
-- New articles only -- existing rows are NOT retrofitted, so this column is
-- nullable and every reader treats NULL the same as 'A' (today's only shape).

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS template_variant TEXT
    CHECK (template_variant IN ('A', 'B', 'C', 'D'));
