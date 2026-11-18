-- Migration 031: Map Phase 2 -- canonical frame, categories, provenance
-- columns, and the tables the real-time pin pipeline (Phase 3) writes to.
--
-- Canonical frame = gtadb world meters (origin at the map centre, +x east,
-- +y north, bounds +/-16384). Markers store x/y meters + frame; never tile or
-- pixel coordinates. map_frames holds the affine transform from each other
-- frame (e.g. the official Rockstar poster's pixel grid) INTO gtadb meters.
--
-- Status workflow (extends 002):
--   pending            HITL queue (scraper 0.5-0.85, community submissions,
--                      "needs placement")
--   held               scraper confidence < 0.5; revisited when a new source
--                      arrives, never shown publicly
--   approved           accepted but not on the public map (gtadb gazetteer
--                      imports live here)
--   community_reported auto-published by the scraper (>= 0.85, >= 2
--                      independent sources, >= 1 non-editorial); public, badged
--   verified           >= 3 independent sources or staff approval; public
--   published          staff-placed / legacy public status
--   rejected           HITL rejection; remembered so the scraper never
--                      re-creates it
--   retired            withdrawn

-- ---------------------------------------------------------------- map_frames
CREATE TABLE IF NOT EXISTS map_frames (
  id             text PRIMARY KEY,
  product_id     text NOT NULL DEFAULT 'gta-hub',
  name           text NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('canonical', 'raster', 'real_world')),
  -- 2x3 affine [[a, b, c], [d, e, f]] mapping (u, v) in this frame to
  -- canonical meters: x = a*u + b*v + c, y = d*u + e*v + f
  affine         jsonb NOT NULL DEFAULT '[[1,0,0],[0,1,0]]'::jsonb,
  rmse_m         numeric,
  control_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE map_frames ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS map_frames_service_role ON map_frames;
CREATE POLICY map_frames_service_role ON map_frames FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS map_frames_public_read ON map_frames;
CREATE POLICY map_frames_public_read ON map_frames FOR SELECT TO anon, authenticated
  USING (product_id = 'gta-hub');

INSERT INTO map_frames (id, name, kind, affine, rmse_m, notes) VALUES
  ('gtadb_world', 'gtadb world meters (canonical)', 'canonical', '[[1,0,0],[0,1,0]]', 0,
   'Canonical frame. rolux/gtadb.org: origin at map centre, +x east, +y north, 1 unit = 1 m, bounds +/-16384.')
ON CONFLICT (id) DO NOTHING;

-- map_layers.frame now points at a registered frame
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'map_layers_frame_fkey') THEN
    ALTER TABLE map_layers ADD CONSTRAINT map_layers_frame_fkey FOREIGN KEY (frame) REFERENCES map_frames(id);
  END IF;
END $$;

-- --------------------------------------------------------- map_markers cols
ALTER TABLE map_markers
  ADD COLUMN IF NOT EXISTS source_type              text,
  ADD COLUMN IF NOT EXISTS external_ref             text,
  ADD COLUMN IF NOT EXISTS source_urls              text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_domains           text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS license                  text,
  ADD COLUMN IF NOT EXISTS attribution              text,
  ADD COLUMN IF NOT EXISTS confidence               numeric,
  ADD COLUMN IF NOT EXISTS independent_source_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accuracy_radius_m        numeric,
  ADD COLUMN IF NOT EXISTS placement_method         text,
  ADD COLUMN IF NOT EXISTS county                   text,
  ADD COLUMN IF NOT EXISTS first_seen_at            timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at              timestamptz,
  ADD COLUMN IF NOT EXISTS game_version             text,
  ADD COLUMN IF NOT EXISTS tags                     text[] NOT NULL DEFAULT '{}';

-- frame was added in 029 without a default
ALTER TABLE map_markers ALTER COLUMN frame SET DEFAULT 'gtadb_world';
-- scraper rows that still need placement have no coordinates at all
ALTER TABLE map_markers ALTER COLUMN coordinates SET DEFAULT '{}'::jsonb;

ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_source_type_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_source_type_check
  CHECK (source_type IS NULL OR source_type IN ('gtadb_import', 'scraper', 'community_submission', 'staff'));
ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_placement_method_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_placement_method_check
  CHECK (placement_method IS NULL OR placement_method IN ('screenshot_match', 'gazetteer', 'hitl_manual', 'import'));
ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_game_version_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_game_version_check
  CHECK (game_version IS NULL OR game_version IN ('pre_launch', 'launch'));
ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_county_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_county_check
  CHECK (county IS NULL OR county IN ('Mariana', 'Vice-Dale', 'Kelly', 'Leonard', 'Lummox'));
ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_confidence_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_confidence_check
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_source_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_source_check
  CHECK (source IN ('community', 'agent_scraped', 'manual', 'import'));

ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_status_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_status_check
  CHECK (status IN ('pending', 'held', 'approved', 'community_reported', 'verified',
                    'published', 'rejected', 'retired'));

ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_category_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_category_check
  CHECK (category IN (
    -- original 10 (002)
    'money_spot', 'vehicle_spawn', 'property', 'heist', 'mission_start',
    'weapon_pickup', 'health_armor', 'collectible', 'landmark', 'daily_location',
    -- Phase 2
    'fuel_station', 'store', 'clothing', 'fence', 'gym', 'safehouse',
    'hospital', 'police_station', 'side_activity', 'street_race', 'random_event'
  ));

-- Upsert key for imports (gtadb landmark ID, e.g. 'L1'). Not partial: PostgREST
-- on_conflict needs a plain unique index; NULL external_refs never collide.
DROP INDEX IF EXISTS uq_map_markers_external_ref;
CREATE UNIQUE INDEX IF NOT EXISTS uq_map_markers_source_external_ref
  ON map_markers (source_type, external_ref);
CREATE INDEX IF NOT EXISTS idx_map_markers_category_xy ON map_markers (category, x, y) WHERE x IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_map_markers_status ON map_markers (status);

-- Public map shows staff-published, auto-published and verified pins
DROP POLICY IF EXISTS "public_read_published_markers" ON map_markers;
CREATE POLICY "public_read_published_markers" ON map_markers FOR SELECT
  USING (status IN ('published', 'community_reported', 'verified'));

-- Backfill the 6 staff-placed region markers (re-seated in meters by 029)
UPDATE map_markers
   SET source_type = 'staff', placement_method = 'hitl_manual', game_version = 'pre_launch',
       accuracy_radius_m = COALESCE(accuracy_radius_m, 400),
       first_seen_at = COALESCE(first_seen_at, created_at)
 WHERE source = 'manual' AND source_type IS NULL;
-- Grassrivers is placed from only 3 gtadb landmarks (Kelvin, 2026-11-18)
UPDATE map_markers SET accuracy_radius_m = 800
 WHERE name = 'Grassrivers' AND source = 'manual';
UPDATE map_markers SET source_type = 'community_submission'
 WHERE source = 'community' AND source_type IS NULL;

-- ------------------------------------------------------ map_areas: territory
ALTER TABLE map_areas
  ADD COLUMN IF NOT EXISTS category   text,
  ADD COLUMN IF NOT EXISTS product_id text NOT NULL DEFAULT 'gta-hub';
ALTER TABLE map_areas DROP CONSTRAINT IF EXISTS map_areas_category_check;
ALTER TABLE map_areas ADD CONSTRAINT map_areas_category_check
  CHECK (category IS NULL OR category IN ('county', 'region', 'gang_territory'));
UPDATE map_areas SET category = 'county' WHERE kind = 'label' AND name LIKE '% County' AND category IS NULL;
UPDATE map_areas SET category = 'region' WHERE kind = 'polygon' AND category IS NULL;

-- ------------------------------------------------- per-source evidence rows
-- One row per (marker, source item). Independence is computed from these:
-- two sources are independent only if author AND domain both differ.
CREATE TABLE IF NOT EXISTS map_marker_sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      text NOT NULL DEFAULT 'gta-hub',
  marker_id       uuid NOT NULL REFERENCES map_markers(id) ON DELETE CASCADE,
  source_kind     text NOT NULL CHECK (source_kind IN ('reddit', 'youtube', 'stream', 'editorial', 'gtadb', 'community', 'staff')),
  url             text NOT NULL,
  domain          text NOT NULL,
  author_id       text,
  evidence_quote  text,
  screenshot_url  text,
  placement_method text,
  proposed_x      numeric,
  proposed_y      numeric,
  radius_m        numeric,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marker_id, url)
);
CREATE INDEX IF NOT EXISTS idx_map_marker_sources_marker ON map_marker_sources (marker_id);
ALTER TABLE map_marker_sources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS map_marker_sources_service_role ON map_marker_sources;
CREATE POLICY map_marker_sources_service_role ON map_marker_sources FOR ALL TO service_role USING (true) WITH CHECK (true);
-- source links are shown on public marker cards (Phase 6)
DROP POLICY IF EXISTS map_marker_sources_public_read ON map_marker_sources;
CREATE POLICY map_marker_sources_public_read ON map_marker_sources FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM map_markers m WHERE m.id = marker_id
                 AND m.status IN ('published', 'community_reported', 'verified')));

-- --------------------------------------------------------- scraper run log
CREATE TABLE IF NOT EXISTS map_scrape_runs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       text NOT NULL DEFAULT 'gta-hub',
  trigger          text NOT NULL DEFAULT 'schedule',
  started_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz,
  status           text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed')),
  fetched          integer NOT NULL DEFAULT 0,
  new_items        integer NOT NULL DEFAULT 0,
  extracted        integer NOT NULL DEFAULT 0,
  placed           jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {screenshot_match, gazetteer, none}
  auto_published   integer NOT NULL DEFAULT 0,
  queued           integer NOT NULL DEFAULT 0,
  held             integer NOT NULL DEFAULT 0,
  merged           integer NOT NULL DEFAULT 0,
  dropped          jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {reason: count}
  blocklist_hits   integer NOT NULL DEFAULT 0,
  blocklist_detail jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_errors    jsonb NOT NULL DEFAULT '[]'::jsonb,
  examples         jsonb NOT NULL DEFAULT '[]'::jsonb,
  error            text
);
CREATE INDEX IF NOT EXISTS idx_map_scrape_runs_started ON map_scrape_runs (started_at DESC);
ALTER TABLE map_scrape_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS map_scrape_runs_service_role ON map_scrape_runs;
CREATE POLICY map_scrape_runs_service_role ON map_scrape_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Items already processed (cache by post/video ID, so a post is extracted once)
CREATE TABLE IF NOT EXISTS map_scrape_seen (
  item_key     text PRIMARY KEY,          -- e.g. reddit:t3_abc123, youtube:dQw4w9WgXcQ
  product_id   text NOT NULL DEFAULT 'gta-hub',
  source_id    uuid REFERENCES discovery_sources(id) ON DELETE SET NULL,
  url          text NOT NULL,
  outcome      text NOT NULL,             -- extracted | dropped:<reason> | blocklisted
  marker_ids   uuid[] NOT NULL DEFAULT '{}',
  first_seen   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE map_scrape_seen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS map_scrape_seen_service_role ON map_scrape_seen;
CREATE POLICY map_scrape_seen_service_role ON map_scrape_seen FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------ discovery_sources: map purpose
-- The content discovery cycle reads purpose='content' only; the map scraper
-- reads purpose='map'. Same registry, two consumers.
ALTER TABLE discovery_sources
  ADD COLUMN IF NOT EXISTS purpose     text NOT NULL DEFAULT 'content',
  ADD COLUMN IF NOT EXISTS source_kind text;   -- map only: reddit | youtube | editorial
ALTER TABLE discovery_sources DROP CONSTRAINT IF EXISTS discovery_sources_purpose_check;
ALTER TABLE discovery_sources ADD CONSTRAINT discovery_sources_purpose_check
  CHECK (purpose IN ('content', 'map'));

-- A feed can serve both consumers (e.g. a YouTube channel), so the URL is
-- unique per purpose rather than globally.
ALTER TABLE discovery_sources DROP CONSTRAINT IF EXISTS discovery_sources_fetch_url_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_discovery_sources_url_purpose ON discovery_sources (fetch_url, purpose);
