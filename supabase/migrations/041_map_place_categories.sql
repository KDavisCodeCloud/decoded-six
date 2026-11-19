-- Migration 041: Kelvin 2026-11-19 -- "they all can't be landmarks".
-- Adds service / vehicle / transit / activity / place categories and narrows
-- what a landmark is (see the definition in scripts/import_gtadb_landmarks.py):
-- a NAMED, recognisable place you navigate by that isn't a service you use.
-- Generic structures -> infrastructure, natural features -> nature, homes and
-- offices -> residential. Keep in sync with src/lib/map-categories.ts and
-- VALID_CATEGORIES in src/agents/map/ds_map_scrape.py.

ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_category_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_category_check
  CHECK (category IN (
    'money_spot', 'vehicle_spawn', 'property', 'heist', 'mission_start', 'weapon_pickup', 'health_armor', 'collectible', 'landmark', 'daily_location', 'fuel_station', 'store', 'clothing', 'fence', 'gym', 'safehouse', 'hospital', 'police_station', 'side_activity', 'street_race', 'random_event', 'nightclub', 'bar', 'fire_station', 'liquor_store', 'fast_food', 'electronics', 'convenience_store', 'barber', 'tattoo', 'mod_shop',
    -- 041
    'ammunation', 'shoe_store', 'pharmacy', 'atm', 'car_wash', 'ev_charger', 'vehicle_dealer', 'vehicle_rental', 'marina', 'bus_stop', 'train_station', 'airport', 'restaurant', 'sports', 'attraction', 'hotel', 'government', 'nature', 'residential', 'infrastructure', 'fishing_spot', 'stunt_jump'
  ));

ALTER TABLE map_leads DROP CONSTRAINT IF EXISTS map_leads_category_check;
ALTER TABLE map_leads ADD CONSTRAINT map_leads_category_check CHECK (category IS NULL OR category IN (
    'money_spot', 'vehicle_spawn', 'property', 'heist', 'mission_start', 'weapon_pickup', 'health_armor', 'collectible', 'landmark', 'daily_location', 'fuel_station', 'store', 'clothing', 'fence', 'gym', 'safehouse', 'hospital', 'police_station', 'side_activity', 'street_race', 'random_event', 'nightclub', 'bar', 'fire_station', 'liquor_store', 'fast_food', 'electronics', 'convenience_store', 'barber', 'tattoo', 'mod_shop',
    'ammunation', 'shoe_store', 'pharmacy', 'atm', 'car_wash', 'ev_charger', 'vehicle_dealer', 'vehicle_rental', 'marina', 'bus_stop', 'train_station', 'airport', 'restaurant', 'sports', 'attraction', 'hotel', 'government', 'nature', 'residential', 'infrastructure', 'fishing_spot', 'stunt_jump'));
