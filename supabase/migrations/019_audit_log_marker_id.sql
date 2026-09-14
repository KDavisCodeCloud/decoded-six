-- Migration 019: audit_log.marker_id.
--
-- audit_log only ever had article_id to identify what an entry was about.
-- The map-marker review route (2A, admin preview) has no article to attach
-- to, and CLAUDE.md's non-negotiable is "audit log entry on every agent
-- action" -- an untraceable entry (no way to tell which marker was
-- approved/retired) doesn't really satisfy that. Nullable, additive, no
-- existing rows affected.

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS marker_id UUID REFERENCES map_markers(id);

CREATE INDEX IF NOT EXISTS idx_audit_log_marker_id ON audit_log(marker_id);
