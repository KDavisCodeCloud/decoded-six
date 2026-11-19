-- Migration 039: business categories that matter in GTA (Kelvin, 2026-11-18):
-- nightclubs, bars, fire stations, liquor stores, fast food (Burger Shot,
-- Cluckin' Bell, ...), electronics stores, and convenience stores that are
-- not gas stations (24/7, LTD without pumps, ...). Hospitals already exist.
-- Keep in sync with src/lib/map-categories.ts and VALID_CATEGORIES in
-- src/agents/map/ds_map_scrape.py.

ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_category_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_category_check
  CHECK (category IN (
    'money_spot', 'vehicle_spawn', 'property', 'heist', 'mission_start',
    'weapon_pickup', 'health_armor', 'collectible', 'landmark', 'daily_location',
    'fuel_station', 'store', 'clothing', 'fence', 'gym', 'safehouse',
    'hospital', 'police_station', 'side_activity', 'street_race', 'random_event',
    -- 039
    'nightclub', 'bar', 'fire_station', 'liquor_store', 'fast_food', 'electronics', 'convenience_store'
  ));

ALTER TABLE map_leads DROP CONSTRAINT IF EXISTS map_leads_category_check;
ALTER TABLE map_leads ADD CONSTRAINT map_leads_category_check CHECK (category IS NULL OR category IN (
  'money_spot', 'vehicle_spawn', 'property', 'heist', 'mission_start', 'weapon_pickup',
  'health_armor', 'collectible', 'landmark', 'daily_location',
  'fuel_station', 'store', 'clothing', 'fence', 'gym', 'safehouse', 'hospital',
  'police_station', 'side_activity', 'street_race', 'random_event',
  'nightclub', 'bar', 'fire_station', 'liquor_store', 'fast_food', 'electronics', 'convenience_store'));
