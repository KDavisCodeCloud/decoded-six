// Single source of truth for map marker categories (Map Phase 2).
// Mirrors map_markers_category_check in migration 031 and VALID_CATEGORIES in
// src/agents/map/ds_map_scrape.py -- keep all three in sync.
// gang_territory is an AREA category (map_areas.category), not a marker.

export type CategoryGroup = 'Money' | 'Services' | 'Activities' | 'Collectibles' | 'Territory' | 'Landmarks'

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
  { key: 'daily_location', label: 'Daily',            group: 'Money',        color: '#00c2a8' },

  { key: 'fuel_station',   label: 'Gas Stations',     group: 'Services',     color: '#ff8a3d' },
  { key: 'store',          label: 'Stores',           group: 'Services',     color: '#7fb2ff' },
  { key: 'clothing',       label: 'Clothing',         group: 'Services',     color: '#b07cff' },
  { key: 'gym',            label: 'Gyms',             group: 'Services',     color: '#ff5d5d' },
  { key: 'safehouse',      label: 'Safehouses',       group: 'Services',     color: '#e0c36a' },
  { key: 'property',       label: 'Properties',       group: 'Services',     color: '#a47148' },
  { key: 'hospital',       label: 'Hospitals',        group: 'Services',     color: '#f4f4f8' },
  { key: 'police_station', label: 'Police',           group: 'Services',     color: '#2f6fe6' },

  { key: 'mission_start',  label: 'Missions',         group: 'Activities',   color: '#FF2D6B' },
  { key: 'side_activity',  label: 'Side Activities',  group: 'Activities',   color: '#ff6fb5' },
  { key: 'street_race',    label: 'Street Races',     group: 'Activities',   color: '#ffb000' },
  { key: 'random_event',   label: 'Random Events',    group: 'Activities',   color: '#d94dff' },
  { key: 'vehicle_spawn',  label: 'Vehicles',         group: 'Activities',   color: '#5a96ff' },

  { key: 'collectible',    label: 'Collectibles',     group: 'Collectibles', color: '#ffcc00' },
  { key: 'weapon_pickup',  label: 'Weapons',          group: 'Collectibles', color: '#e6358a' },
  { key: 'health_armor',   label: 'Health / Armor',   group: 'Collectibles', color: '#00d2ff' },

  { key: 'landmark',       label: 'Landmarks',        group: 'Landmarks',    color: '#7c4dff' },
]

/** Area categories (map_areas.category). Territory polygons arrive with the official map. */
export const AREA_CATEGORIES = [
  { key: 'gang_territory', label: 'Gang Territory', group: 'Territory' as CategoryGroup, color: '#ff2d6b' },
]

export const CATEGORY_GROUPS: CategoryGroup[] = ['Money', 'Services', 'Activities', 'Collectibles', 'Territory', 'Landmarks']

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
