-- Migration 025: Shorts factory HITL queue.
--
-- Vertical 9:16 Shorts/TikToks rendered by video-factory/make_videos.py land
-- here as pending_review and are approved/revised/rejected in
-- /dashboard/shorts, same mechanics as the article queue. Posting stays
-- manual (native TikTok/YouTube schedulers); the dashboard only tracks which
-- account a video goes to and when it was posted.
--
-- All tables: service-role only, same reasoning as 022 -- the dashboard reads
-- server-side behind dashboard/layout.tsx's auth gate and every status change
-- goes through /api/shorts/*, so no RLS grant to `authenticated` or `anon`.

-- Footage the factory cuts from (Phase 2 fills scene/usage tracking).
CREATE TABLE IF NOT EXISTS ds_short_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  TEXT NOT NULL DEFAULT 'gta-hub',
  filename    TEXT NOT NULL UNIQUE,  -- path relative to video-factory/trailers/
  origin      TEXT NOT NULL CHECK (origin IN ('trailer', 'extended_look', 'gameplay', 'official_press')),
  duration_s  NUMERIC,
  has_audio   BOOLEAN,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Accounts an approved video can be routed to. Handles only, never
-- credentials: there is no auto-posting.
CREATE TABLE IF NOT EXISTS ds_short_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  TEXT NOT NULL DEFAULT 'gta-hub',
  platform    TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube')),
  handle      TEXT NOT NULL,
  label       TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, handle)
);

CREATE TABLE IF NOT EXISTS ds_shorts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id         TEXT NOT NULL DEFAULT 'gta-hub',
  day_number         INTEGER NOT NULL,
  post_date          DATE NOT NULL UNIQUE,
  hook               TEXT NOT NULL,
  voiceover          TEXT NOT NULL,
  post_caption       TEXT,
  hashtags           TEXT,
  linked_article_id  UUID REFERENCES articles(id) ON DELETE SET NULL,
  source_id          UUID REFERENCES ds_short_sources(id) ON DELETE SET NULL,
  clip_start         NUMERIC,
  clip_end           NUMERIC,
  clip_override      TEXT,  -- manual 'file.mp4@01:05', wins over automatic selection
  voice              TEXT,  -- edge-tts voice name or 'custom'
  storage_path       TEXT,
  duration_s         NUMERIC,
  -- 'held' = written but not renderable yet (days 12-30 wait on real map
  -- marker categories at launch).
  status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                       'held', 'draft', 'rendering', 'pending_review', 'approved',
                       'rejected', 'needs_revision', 'scheduled', 'posted')),
  reviewer_notes     TEXT,
  reviewed_by        TEXT,
  reviewed_at        TIMESTAMPTZ,
  tiktok_account_id  UUID REFERENCES ds_short_accounts(id) ON DELETE SET NULL,
  tiktok_posted_at   TIMESTAMPTZ,
  youtube_posted_at  TIMESTAMPTZ,
  tiktok_url         TEXT,
  youtube_url        TEXT,
  storage_deleted_at TIMESTAMPTZ,  -- set by the 14-days-after-posted retention sweep
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ds_shorts_status ON ds_shorts(status, post_date);

CREATE OR REPLACE FUNCTION ds_shorts_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ds_shorts_updated_at ON ds_shorts;
CREATE TRIGGER trg_ds_shorts_updated_at BEFORE UPDATE ON ds_shorts
  FOR EACH ROW EXECUTE FUNCTION ds_shorts_touch_updated_at();

ALTER TABLE ds_short_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_short_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_shorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ds_short_sources_service_role ON ds_short_sources;
CREATE POLICY ds_short_sources_service_role ON ds_short_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ds_short_accounts_service_role ON ds_short_accounts;
CREATE POLICY ds_short_accounts_service_role ON ds_short_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ds_shorts_service_role ON ds_shorts;
CREATE POLICY ds_shorts_service_role ON ds_shorts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Private bucket. No storage.objects policies are added, so anon and
-- authenticated get nothing; the dashboard plays videos through short-lived
-- signed URLs minted server-side with the service role.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('shorts', 'shorts', false, 52428800, ARRAY['video/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Every dashboard/factory action on a short is audited, same table as
-- articles and map markers (019 added marker_id the same way).
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS short_id UUID REFERENCES ds_shorts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_short_id ON audit_log(short_id) WHERE short_id IS NOT NULL;
