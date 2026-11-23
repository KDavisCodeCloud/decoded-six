// Single source of truth for map marker categories (Map Phase 2).
// Mirrors map_markers_category_check in migration 031 and VALID_CATEGORIES in
// src/agents/map/ds_map_scrape.py -- keep all three in sync.
// gang_territory is an AREA category (map_areas.category), not a marker.

export type CategoryGroup = 'Money' | 'Services' | 'Vehicles' | 'Transit' | 'Food & Nightlife' | 'Activities' | 'Collectibles' | 'Territory' | 'Places'

export interface MapCategory {
  key: string
  label: string
  group: CategoryGroup
  color: string
}

export const MAP_CATEGORIES: MapCategory[] = [
  { key: 'money_spot',     label: 'Money Spots',      group: 'Money',        color: '#3fd17a' },
  { key: 'heist',          label: 'Heists',           group: 'Money',        color: '#f5a623' },
  { key: 'fence',          label: 'Fences',           group: 'Money',        color: '#c9e265' },
  { key: 'atm',            label: 'Banks & ATMs',     group: 'Money',        color: '#9ef01a' },
  { key: 'daily_location', label: 'Daily',            group: 'Money',        color: '#00c2a8' },

  { key: 'store',          label: 'Stores',           group: 'Services',     color: '#7fb2ff' },
  { key: 'convenience_store', label: 'Convenience Stores', group: 'Services', color: '#06d6a0' },
  { key: 'clothing',       label: 'Clothing',         group: 'Services',     color: '#b07cff' },
  { key: 'jewelry_store',  label: 'Jewelry Stores',   group: 'Services',     color: '#ff8fab' },
  { key: 'shoe_store',     label: 'Footwear',         group: 'Services',     color: '#d4a373' },
  { key: 'electronics',    label: 'Electronics',      group: 'Services',     color: '#4cc9f0' },
  { key: 'ammunation',     label: 'Ammu-Nation / Guns', group: 'Services',   color: '#b5179e' },
  { key: 'pharmacy',       label: 'Pharmacies',       group: 'Services',     color: '#80ffdb' },
  { key: 'barber',         label: 'Barbers & Salons', group: 'Services',     color: '#ffafcc' },
  { key: 'tattoo',         label: 'Tattoo Parlors',   group: 'Services',     color: '#9b5de5' },
  { key: 'gym',            label: 'Gyms',             group: 'Services',     color: '#ff5d5d' },
  { key: 'hospital',       label: 'Hospitals',        group: 'Services',     color: '#f4f4f8' },
  { key: 'police_station', label: 'Police',           group: 'Services',     color: '#2f6fe6' },
  { key: 'fire_station',   label: 'Fire Stations',    group: 'Services',     color: '#e63946' },
  { key: 'safehouse',      label: 'Safehouses',       group: 'Services',     color: '#e0c36a' },
  { key: 'property',       label: 'Properties',       group: 'Services',     color: '#a47148' },

  { key: 'fuel_station',   label: 'Gas Stations',     group: 'Vehicles',     color: '#ff8a3d' },
  { key: 'ev_charger',     label: 'EV Chargers',      group: 'Vehicles',     color: '#00f5d4' },
  { key: 'car_wash',       label: 'Car Washes',       group: 'Vehicles',     color: '#48cae4' },
  { key: 'pay_n_spray',    label: "Pay 'n' Spray",    group: 'Vehicles',     color: '#ff9e00' },
  { key: 'bike_mod_shop',  label: 'Bike Mod Shops',   group: 'Vehicles',     color: '#cdb4db' },
  { key: 'mod_shop',       label: 'Car Customization', group: 'Vehicles',    color: '#e9ff70' },
  { key: 'vehicle_dealer', label: 'Dealerships',      group: 'Vehicles',     color: '#ffd166' },
  { key: 'vehicle_rental', label: 'Vehicle Rentals',  group: 'Vehicles',     color: '#f4a261' },
  { key: 'vehicle_spawn',  label: 'Vehicle Spawns',   group: 'Vehicles',     color: '#5a96ff' },
  { key: 'marina',         label: 'Marinas',          group: 'Vehicles',     color: '#1d9bf0' },

  { key: 'bus_stop',       label: 'Bus Stops',        group: 'Transit',      color: '#ffbe0b' },
  { key: 'train_station',  label: 'Train & Metro',    group: 'Transit',      color: '#fb5607' },
  { key: 'helipad',        label: 'Helipads',         group: 'Transit',      color: '#a8dadc' },
  { key: 'airport',        label: 'Airports & Airfields', group: 'Transit',  color: '#c0c0d8' },

  { key: 'restaurant',     label: 'Restaurants',      group: 'Food & Nightlife', color: '#f28482' },
  { key: 'fast_food',      label: 'Fast Food',        group: 'Food & Nightlife', color: '#ffe14d' },
  { key: 'bar',            label: 'Bars',             group: 'Food & Nightlife', color: '#e07a5f' },
  { key: 'nightclub',      label: 'Nightclubs',       group: 'Food & Nightlife', color: '#ff2bd6' },
  { key: 'strip_club',     label: 'Strip Clubs',      group: 'Food & Nightlife', color: '#ff4d9d' },
  { key: 'liquor_store',   label: 'Liquor Stores',    group: 'Food & Nightlife', color: '#9d4edd' },

  { key: 'mission_start',  label: 'Missions',         group: 'Activities',   color: '#FF2D6B' },
  { key: 'side_activity',  label: 'Side Activities',  group: 'Activities',   color: '#ff6fb5' },
  { key: 'street_race',    label: 'Street Races',     group: 'Activities',   color: '#ffb000' },
  { key: 'stunt_jump',     label: 'Stunt Jumps',      group: 'Activities',   color: '#ff006e' },
  { key: 'fishing_spot',   label: 'Fishing Spots',    group: 'Activities',   color: '#4361ee' },
  { key: 'golf',           label: 'Golf',             group: 'Activities',   color: '#80b918' },
  { key: 'tennis',         label: 'Tennis',           group: 'Activities',   color: '#d9ed92' },
  { key: 'basketball',     label: 'Basketball',       group: 'Activities',   color: '#f77f00' },
  { key: 'pool_hall',      label: 'Pool Halls',       group: 'Activities',   color: '#2a9d8f' },
  { key: 'cinema',         label: 'Cinemas',          group: 'Activities',   color: '#e9c46a' },
  { key: 'skydiving',      label: 'Skydiving',        group: 'Activities',   color: '#90e0ef' },
  { key: 'sports',         label: 'Sports & Recreation', group: 'Activities', color: '#38b000' },
  { key: 'attraction',     label: 'Attractions',      group: 'Activities',   color: '#f15bb5' },
  { key: 'random_event',   label: 'Random Events',    group: 'Activities',   color: '#d94dff' },

  { key: 'collectible',    label: 'Collectibles',     group: 'Collectibles', color: '#ffcc00' },
  { key: 'weapon_pickup',  label: 'Weapon Pickups',   group: 'Collectibles', color: '#e6358a' },
  { key: 'health_armor',   label: 'Health / Armor',   group: 'Collectibles', color: '#00d2ff' },

  // Landmark = a NAMED place people recognise and navigate by that isn't a
  // service you use (signs, monuments, murals, iconic buildings, named bridges).
  // Anything that does something for the player has its own category above.
  { key: 'landmark',       label: 'Landmarks',        group: 'Places',       color: '#7c4dff' },
  { key: 'hotel',          label: 'Hotels & Motels',  group: 'Places',       color: '#e5989b' },
  { key: 'government',     label: 'Civic & Government', group: 'Places',     color: '#8d99ae' },
  { key: 'residential',    label: 'Residences & Offices', group: 'Places',   color: '#b5a886' },
  { key: 'nature',         label: 'Nature',           group: 'Places',       color: '#52b788' },
  { key: 'infrastructure', label: 'Infrastructure',   group: 'Places',       color: '#6c757d' },
]

/** Area categories (map_areas.category). Territory polygons arrive with the official map. */
export const AREA_CATEGORIES = [
  { key: 'gang_territory', label: 'Gang Territory', group: 'Territory' as CategoryGroup, color: '#ff2d6b' },
]

export const CATEGORY_GROUPS: CategoryGroup[] = ['Money', 'Services', 'Vehicles', 'Transit', 'Food & Nightlife', 'Activities', 'Collectibles', 'Territory', 'Places']

/** Off until the viewer turns them on: bridges, parking lots, towers -- real, but clutter for most players. */
export const DEFAULT_HIDDEN_CATEGORIES = ['infrastructure']

export const MARKER_CATEGORY_KEYS = MAP_CATEGORIES.map(c => c.key)

export const CATEGORY_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(MAP_CATEGORIES.map(c => [c.key, c.label]))
export const CATEGORY_COLOR_BY_KEY: Record<string, string> = Object.fromEntries(MAP_CATEGORIES.map(c => [c.key, c.color]))

/** Statuses visible on the public map (RLS policy public_read_published_markers, migration 031). */
export const PUBLIC_MARKER_STATUSES = ['published', 'community_reported', 'verified'] as const

/**
 * Scraper pins placed from a place name (gazetteer) rather than a map
 * screenshot or a staff drag: shown with an "Approximate location" badge and
 * a dashed accuracy circle. A screenshot match or a staff move clears it.
 */
export function isApproximate(m: { source_type?: string | null; placement_method?: string | null; accuracy_radius_m?: number | string | null }): boolean {
  return m.source_type === 'scraper'
    && m.placement_method !== 'screenshot_match' && m.placement_method !== 'hitl_manual'
    && Number(m.accuracy_radius_m ?? 0) > 25
}
