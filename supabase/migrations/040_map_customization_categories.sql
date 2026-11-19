-- Migration 040: barber shops / salons, tattoo parlors, car customization
-- (mod shops, Pay 'n' Spray) as their own categories (Kelvin, 2026-11-18).
-- Previously folded into 'store'. Keep in sync with src/lib/map-categories.ts
-- and VALID_CATEGORIES in src/agents/map/ds_map_scrape.py.

ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_category_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_category_check
  CHECK (category IN (
    'money_spot', 'vehicle_spawn', 'property', 'heist', 'mission_start',
    'weapon_pickup', 'health_armor', 'collectible', 'landmark', 'daily_location',
    'fuel_station', 'store', 'clothing', 'fence', 'gym', 'safehouse',
    'hospital', 'police_station', 'side_activity', 'street_race', 'random_event',
    'nightclub', 'bar', 'fire_station', 'liquor_store', 'fast_food', 'electronics', 'convenience_store',
    -- 040
    'barber', 'tattoo', 'mod_shop'
  ));

ALTER TABLE map_leads DROP CONSTRAINT IF EXISTS map_leads_category_check;
ALTER TABLE map_leads ADD CONSTRAINT map_leads_category_check CHECK (category IS NULL OR category IN (
  'money_spot', 'vehicle_spawn', 'property', 'heist', 'mission_start', 'weapon_pickup',
  'health_armor', 'collectible', 'landmark', 'daily_location',
  'fuel_station', 'store', 'clothing', 'fence', 'gym', 'safehouse', 'hospital',
  'police_station', 'side_activity', 'street_race', 'random_event',
  'nightclub', 'bar', 'fire_station', 'liquor_store', 'fast_food', 'electronics', 'convenience_store',
  'barber', 'tattoo', 'mod_shop'));
