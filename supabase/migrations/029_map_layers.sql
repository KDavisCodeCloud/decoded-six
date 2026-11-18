-- DecodedSix Migration 029 — Map base layers + gtadb world frame (Map Phase 1)
--
-- 1. map_layers: registry of selectable base layers. The public map reads
--    enabled rows at request time, so a layer can be pulled (e.g. a takedown
--    of the gtadb community layer) with one UPDATE and no redeploy:
--      UPDATE map_layers SET enabled = false WHERE id = 'community';
--    This row's `enabled` IS the MAP_COMMUNITY_LAYER_ENABLED flag. It lives in
--    the DB, not a Vercel env var, because env changes need a redeploy.
-- 2. gtadb world frame: meters, origin at map centre, +x east, +y north,
--    bounds +/-16384. map_markers / map_areas get a `frame` so rows seeded in
--    real-world Florida lat/lng (migration 002) are never drawn on a
--    game-meter layer as nonsense.
-- 3. Seeds the 5 county labels and re-seats the 6 region markers in gtadb
--    meters (medians of gtadb landmarks tagged with each name; gtadb
--    landmarks data CC BY 4.0, commit 8b1dc4f06).

CREATE TABLE IF NOT EXISTS map_layers (
  id                text PRIMARY KEY,
  product_id        text NOT NULL DEFAULT 'gta-hub',
  label             text NOT NULL,
  kind              text NOT NULL CHECK (kind IN ('community', 'official')),
  frame             text NOT NULL DEFAULT 'gtadb_world',
  tile_url_template text NOT NULL,            -- {z} {x} {y} placeholders
  min_zoom          integer NOT NULL DEFAULT 0,
  max_native_zoom   integer NOT NULL,
  max_zoom          integer NOT NULL,
  tile_ranges       jsonb NOT NULL,           -- {"z": [[minX, minY], [maxX, maxY]]}, only these tiles exist
  background_color  text NOT NULL DEFAULT '#2c67a4',
  attribution       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{text, url, license_url, adapted}]
  source_ref        text,                     -- e.g. 'rolux/gtadb.org@8b1dc4f06 maps/tiles/6/yanis,18'
  enabled           boolean NOT NULL DEFAULT true,
  is_default        boolean NOT NULL DEFAULT false,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE map_layers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_map_layers" ON map_layers;
CREATE POLICY "service_role_all_map_layers"
  ON map_layers FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "public_read_enabled_map_layers" ON map_layers;
CREATE POLICY "public_read_enabled_map_layers"
  ON map_layers FOR SELECT
  TO anon, authenticated
  USING (enabled = true AND product_id = 'gta-hub');

-- at most one default layer
CREATE UNIQUE INDEX IF NOT EXISTS map_layers_one_default
  ON map_layers (product_id) WHERE is_default;

-- canonical game-world position (meters in `frame`); lat/lng `coordinates`
-- stays for legacy real-world rows
ALTER TABLE map_markers ADD COLUMN IF NOT EXISTS x numeric;
ALTER TABLE map_markers ADD COLUMN IF NOT EXISTS y numeric;
ALTER TABLE map_markers ADD COLUMN IF NOT EXISTS frame text;

-- geojson coordinates are interpreted in `frame`; 'label' areas are a single
-- Point (name only, polygons come with the official map)
ALTER TABLE map_areas ADD COLUMN IF NOT EXISTS frame text NOT NULL DEFAULT 'real_world_latlng';
ALTER TABLE map_areas ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'polygon';
ALTER TABLE map_areas DROP CONSTRAINT IF EXISTS map_areas_kind_check;
ALTER TABLE map_areas ADD CONSTRAINT map_areas_kind_check CHECK (kind IN ('polygon', 'label'));

-- 5 counties, label points only
INSERT INTO map_areas (name, geojson, color, opacity, frame, kind)
SELECT v.name, jsonb_build_object('type', 'Point', 'coordinates', jsonb_build_array(v.x, v.y)),
       '#f5a623', 0, 'gtadb_world', 'label'
FROM (VALUES
  ('Mariana County',   -4008, -3760),
  ('Vice-Dale County',   413,   365),
  ('Kelly County',     -4862,  3638),
  ('Leonard County',    -914,  3350),
  ('Lummox County',    -3157,  6969)
) AS v(name, x, y)
WHERE NOT EXISTS (
  SELECT 1 FROM map_areas a WHERE a.name = v.name AND a.frame = 'gtadb_world'
);

-- the 6 seeded region markers, in gtadb meters
UPDATE map_markers m SET x = v.x, y = v.y, frame = 'gtadb_world', updated_at = now()
FROM (VALUES
  ('Vice City',                  -1106,  -106),
  ('Port Gellhorn',              -6483,  3714),
  ('Ambrosia',                   -2776,  3890),
  ('Leonida Keys',               -2482, -5872),
  ('Grassrivers',                -3057, -4756),
  ('Mount Kalaga National Park', -3430,  6371)
) AS v(name, x, y)
WHERE m.name = v.name AND m.category = 'landmark' AND m.x IS NULL;
