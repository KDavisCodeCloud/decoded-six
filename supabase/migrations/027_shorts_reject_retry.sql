-- Migration 027: Reject = delete the video and make a new one.
--
-- Owner's rule (2026-11-07): rejecting a short deletes its video and the
-- factory makes a replacement for the same day, either on the same subject
-- (same script, different footage) or a new subject (new script). The
-- dashboard records the choice; video-factory/shorts_worker.py on the
-- owner's PC does the work:
--   rejected + retry_mode='same' -> draft, render_attempt+1 -> rendered -> pending_review
--   rejected + retry_mode='new'  -> regenerating (new script) -> draft -> pending_review
-- render_attempt shifts automatic clip selection so a retry never reuses
-- the rejected footage.

ALTER TABLE ds_shorts ADD COLUMN IF NOT EXISTS retry_mode TEXT CHECK (retry_mode IN ('same', 'new'));
ALTER TABLE ds_shorts ADD COLUMN IF NOT EXISTS render_attempt INTEGER NOT NULL DEFAULT 0;

ALTER TABLE ds_shorts DROP CONSTRAINT IF EXISTS ds_shorts_status_check;
ALTER TABLE ds_shorts ADD CONSTRAINT ds_shorts_status_check CHECK (status IN (
  'held', 'draft', 'rendering', 'pending_review', 'approved', 'rejected',
  'needs_revision', 'regenerating', 'scheduled', 'posted'));
