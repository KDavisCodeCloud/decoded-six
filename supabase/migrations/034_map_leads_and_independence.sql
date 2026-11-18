-- Migration 034: Map Phase 3b (Leads) + the revised independence rule.
--
-- Independence (Kelvin, 2026-11-18): different author/channel = independent,
-- regardless of domain. Same author anywhere, crossposts/reposts and replies
-- in one thread count once. map_marker_sources gains the keys that rule needs.
--
-- Leads: things we know exist in the game but can't place yet ("Pawn shop in
-- Port Gellhorn"). Name, category, area -- never coordinates. The scraper
-- searches open leads first each cycle. A lead is NEVER a source, never sets
-- a position and never publishes anything alone: it only steers search, and
-- a marker that real evidence produced is tagged with the lead it answers so
-- the HITL queue can put it first.

ALTER TABLE map_marker_sources ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE map_marker_sources ADD COLUMN IF NOT EXISTS thread_key  text;
ALTER TABLE map_marker_sources ADD COLUMN IF NOT EXISTS content_key text;

CREATE TABLE IF NOT EXISTS map_leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        text NOT NULL DEFAULT 'gta-hub',
  name              text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 200),
  category          text,
  area              text,
  notes             text,
  status            text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'evidence_found', 'closed')),
  created_by        text,
  search_count      integer NOT NULL DEFAULT 0,
  last_searched_at  timestamptz,
  evidence_found_at timestamptz,
  matched_marker_ids uuid[] NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE map_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS map_leads_service_role ON map_leads;
CREATE POLICY map_leads_service_role ON map_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
-- same category list as map_markers (031), or NULL when the lead doesn't know
ALTER TABLE map_leads DROP CONSTRAINT IF EXISTS map_leads_category_check;
ALTER TABLE map_leads ADD CONSTRAINT map_leads_category_check CHECK (category IS NULL OR category IN (
  'money_spot', 'vehicle_spawn', 'property', 'heist', 'mission_start', 'weapon_pickup',
  'health_armor', 'collectible', 'landmark', 'daily_location',
  'fuel_station', 'store', 'clothing', 'fence', 'gym', 'safehouse', 'hospital',
  'police_station', 'side_activity', 'street_race', 'random_event'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_map_leads_open_name
  ON map_leads (product_id, lower(btrim(name)), coalesce(category, ''), coalesce(lower(btrim(area)), ''));
CREATE INDEX IF NOT EXISTS idx_map_leads_status ON map_leads (status, last_searched_at NULLS FIRST);

ALTER TABLE map_markers ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES map_leads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_map_markers_lead ON map_markers (lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE map_scrape_runs ADD COLUMN IF NOT EXISTS leads jsonb NOT NULL DEFAULT '{}'::jsonb;
