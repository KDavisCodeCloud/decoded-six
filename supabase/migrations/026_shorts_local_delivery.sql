-- Migration 026: track delivery of approved shorts to the owner's local
-- "approvals" folder.
--
-- Approval happens in the web dashboard, which cannot write to Kelvin's PC.
-- video-factory/approvals_sync.py runs locally, polls for approved shorts
-- with no local_delivered_at, downloads each into the approvals folder, opens
-- the folder, and stamps this column so a video is delivered exactly once.
-- Re-approving after a revision clears it (api/shorts/[id]/review), so the
-- new cut is delivered again.

ALTER TABLE ds_shorts ADD COLUMN IF NOT EXISTS local_delivered_at TIMESTAMPTZ;
ALTER TABLE ds_shorts ADD COLUMN IF NOT EXISTS local_path TEXT;
