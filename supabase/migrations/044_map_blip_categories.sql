-- Migration 044: Kelvin 2026-11-23 -- "use all of the icons relevant to the
-- game". Adds a category for every remaining GTA 6 in-game map blip type
-- (illegal operations, hidden packages, collectible cards, WAiNK spots,
-- base jumps, hunting, shooting ranges, banks, payday loans...). Keep in sync
-- with src/lib/map-categories.ts and VALID_CATEGORIES in ds_map_scrape.py.

ALTER TABLE map_markers DROP CONSTRAINT IF EXISTS map_markers_category_check;
ALTER TABLE map_markers ADD CONSTRAINT map_markers_category_check
  CHECK (category IN (
    'money_spot', 'vehicle_spawn', 'property', 'heist', 'mission_start', 'weapon_pickup', 'health_armor', 'collectible', 'landmark', 'daily_location', 'fuel_station', 'store', 'clothing', 'fence', 'gym', 'safehouse', 'hospital', 'police_station', 'side_activity', 'street_race', 'random_event', 'nightclub', 'bar', 'fire_station', 'liquor_store', 'fast_food', 'electronics', 'convenience_store', 'barber', 'tattoo', 'mod_shop',     'ammunation', 'shoe_store', 'pharmacy', 'atm', 'car_wash', 'ev_charger', 'vehicle_dealer', 'vehicle_rental', 'marina', 'bus_stop', 'train_station', 'airport', 'restaurant', 'sports', 'attraction', 'hotel', 'government', 'nature', 'residential', 'infrastructure', 'fishing_spot', 'stunt_jump',     'golf', 'tennis', 'basketball', 'cinema', 'jewelry_store', 'strip_club', 'pay_n_spray', 'bike_mod_shop', 'helipad', 'skydiving', 'pool_hall',
    -- 044
    'arcade', 'bank', 'base_jump', 'book_swap', 'cafe', 'collectible_card', 'drone_race', 'gang_operation', 'hangar', 'hidden_package', 'hunting', 'knife_flight', 'magazine', 'mini_golf', 'mural', 'payday_loan', 'playlist', 'safe', 'shooting_range', 'smash_n_grab', 'standout_vehicle', 'street_food', 'towable_atm', 'treasure', 'under_the_bridge', 'vehicle_request', 'waink_curiosity', 'waink_landmark', 'waink_sculpture'
  ));

ALTER TABLE map_leads DROP CONSTRAINT IF EXISTS map_leads_category_check;
ALTER TABLE map_leads ADD CONSTRAINT map_leads_category_check CHECK (category IS NULL OR category IN (
    'money_spot', 'vehicle_spawn', 'property', 'heist', 'mission_start', 'weapon_pickup', 'health_armor', 'collectible', 'landmark', 'daily_location', 'fuel_station', 'store', 'clothing', 'fence', 'gym', 'safehouse', 'hospital', 'police_station', 'side_activity', 'street_race', 'random_event', 'nightclub', 'bar', 'fire_station', 'liquor_store', 'fast_food', 'electronics', 'convenience_store', 'barber', 'tattoo', 'mod_shop',     'ammunation', 'shoe_store', 'pharmacy', 'atm', 'car_wash', 'ev_charger', 'vehicle_dealer', 'vehicle_rental', 'marina', 'bus_stop', 'train_station', 'airport', 'restaurant', 'sports', 'attraction', 'hotel', 'government', 'nature', 'residential', 'infrastructure', 'fishing_spot', 'stunt_jump',     'golf', 'tennis', 'basketball', 'cinema', 'jewelry_store', 'strip_club', 'pay_n_spray', 'bike_mod_shop', 'helipad', 'skydiving', 'pool_hall',
    'arcade', 'bank', 'base_jump', 'book_swap', 'cafe', 'collectible_card', 'drone_race', 'gang_operation', 'hangar', 'hidden_package', 'hunting', 'knife_flight', 'magazine', 'mini_golf', 'mural', 'payday_loan', 'playlist', 'safe', 'shooting_range', 'smash_n_grab', 'standout_vehicle', 'street_food', 'towable_atm', 'treasure', 'under_the_bridge', 'vehicle_request', 'waink_curiosity', 'waink_landmark', 'waink_sculpture'));
