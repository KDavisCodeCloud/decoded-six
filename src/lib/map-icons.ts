// Map pin glyphs (2026-11-23, Kelvin: "the pins themselves need icons" so a
// player can tell a bus stop from a stunt jump at a glance).
//
// Every glyph here is ORIGINAL DecodedSix line art drawn on a 24x24 grid. We
// deliberately do not lift Rockstar's in-game blip sprites: they aren't in
// Rockstar's press kit, and the copies other map sites use come from sites on
// our never-copy blocklist (see CLAUDE.md / map rules). Shape language is
// blip-like (round badge, one bold glyph) so it reads the way GTA players
// expect, without being the same artwork.
//
// Keys mirror MAP_CATEGORIES in src/lib/map-categories.ts. A category with no
// glyph falls back to a plain dot, so adding a category never breaks the map.

import { CATEGORY_COLOR_BY_KEY } from './map-categories'

const G: Record<string, string> = {
  // Money
  money_spot: '<path d="M12 3v18M16 7.5c-.8-1.2-2.2-2-4-2-2.5 0-4 1.3-4 3s1.5 2.5 4 3 4 1.4 4 3.2-1.6 3.3-4 3.3c-1.9 0-3.4-.8-4.2-2.2"/>',
  heist: '<path d="M9 3.5h6L13.5 7h-3z"/><path d="M10.5 7C6 9 4 13 4 16a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4c0-3-2-7-6.5-9"/><path d="M12 11v6M10.3 12.5h2.6a1.2 1.2 0 0 1 0 2.4h-1.8a1.2 1.2 0 0 0 0 2.4h2.6"/>',
  fence: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  atm: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 14.5h4"/>',
  daily_location: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M9 14.5l2 2 4-4"/>',
  // Services
  store: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  convenience_store: '<path d="M4 10l1.2-5h13.6L20 10M4 10h16v10H4zM10 20v-5h4v5"/>',
  clothing: '<path d="M8.5 4L3 7l2 4 2-1v10h10V10l2 1 2-4-5.5-3c-.5 1.6-2 2.7-3.5 2.7S9 5.6 8.5 4z"/>',
  shoe_store: '<path d="M3 17V9l4 1 3 3 5 1c3 .5 6 1.6 6 3.2V17zM3 19.5h18"/>',
  electronics: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
  ammunation: '<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/><circle cx="12" cy="12" r="1"/>',
  pharmacy: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9.5 9.5l5 5"/>',
  barber: '<circle cx="6" cy="6.5" r="2.5"/><circle cx="6" cy="17.5" r="2.5"/><path d="M8.2 8L20 18M8.2 16L20 6"/>',
  tattoo: '<path d="M14 4l6 6M15.5 5.5L7 14l-2.5 5.5L10 17l8.5-8.5M7 14l3 3"/>',
  gym: '<path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/>',
  hospital: '<path d="M12 4.5v15M4.5 12h15" stroke-width="3.4"/>',
  police_station: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M12 8.5l1.1 2.2 2.4.3-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.3z"/>',
  fire_station: '<path d="M12 3c1 3 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.4-4 2.4-5 .3 1.6 1 2.5 2 3 .5-3-.4-5.4.6-8z"/>',
  safehouse: '<path d="M3 11.5L12 4l9 7.5M5.5 10v10h13V10M10 20v-5.5h4V20"/>',
  property: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2.5"/>',
  // Vehicles
  fuel_station: '<path d="M5 20.5V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15.5M3.5 20.5h12M5 10h9M14 8l3 2v7a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
  ev_charger: '<path d="M13 2.5L5 14h6l-1 7.5 8-11.5h-6z"/>',
  car_wash: '<path d="M7 4c1.5 2.5 3 4 3 6a3 3 0 0 1-6 0c0-2 1.5-3.5 3-6zM16.5 10c1.5 2.5 3 4 3 6a3 3 0 0 1-6 0c0-2 1.5-3.5 3-6z"/>',
  mod_shop: '<path d="M15 3.5a4.5 4.5 0 0 0-4.3 5.8L4 16l3.5 3.5 6.7-6.7A4.5 4.5 0 0 0 20.5 8.5l-3 1-2-2 1-3z"/>',
  vehicle_dealer: '<path d="M3 12V3.5h8.5L21 13l-8.5 8.5z"/><circle cx="7.5" cy="8" r="1.5"/>',
  vehicle_rental: '<rect x="8" y="2.5" width="8" height="10" rx="3"/><path d="M12 12.5v9M12 17h3M12 20h2"/>',
  vehicle_spawn: '<path d="M3.5 15.5v-3.5l2.2-5.5h12.6l2.2 5.5v3.5zM3.5 15.5V19h3v-3.5M17.5 15.5V19h3v-3.5M5.5 12h13"/>',
  marina: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 10.5h8M4.5 13.5c0 4.2 3.4 7.5 7.5 7.5s7.5-3.3 7.5-7.5"/>',
  // Transit
  bus_stop: '<rect x="5" y="3" width="14" height="15" rx="2.5"/><path d="M5 11h14M8 18v3M16 18v3M8.5 14.5h.01M15.5 14.5h.01" stroke-width="2.4"/>',
  train_station: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 10h12M9 17l-2 4M15 17l2 4M9.5 13.5h.01M14.5 13.5h.01" stroke-width="2.2"/>',
  airport: '<path d="M12 2.5c.9 0 1.4.9 1.4 1.9v4.9l7 4v2l-7-2v4l2 1.4v1.6l-3.4-1-3.4 1v-1.6l2-1.4v-4l-7 2v-2l7-4V4.4c0-1 .5-1.9 1.4-1.9z"/>',
  // Food & nightlife
  restaurant: '<path d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 21V3c-2 1-3.2 4-3.2 7H17"/>',
  fast_food: '<path d="M4 11a8 6 0 0 1 16 0zM3 14.5h18M4.5 17.5h15a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z"/>',
  bar: '<path d="M4 4h16l-8 9zM12 13v7M8 20h8M15 4l2-2"/>',
  nightclub: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  liquor_store: '<path d="M10 2.5h4V6l2 3v11.5a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/><path d="M8 13h8"/>',
  // Activities
  mission_start: '<path d="M5.5 21V4M5.5 4H18l-2.5 4 2.5 4H5.5"/>',
  side_activity: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  street_race: '<path d="M5 21V3.5M5 3.5h14v9H5"/><path d="M9.7 3.5v4.5h4.6V3.5M14.3 8v4.5h4.7M5 8h4.7v4.5" stroke-width="1.4"/>',
  stunt_jump: '<path d="M2.5 19.5h11L2.5 13z"/><path d="M11 12c2.2-5.5 6-7.7 9.5-7M17.5 2.5l3 2.5-2.5 3"/>',
  fishing_spot: '<path d="M2.5 12c3-4 8.5-6 13.5-3l4.5-3.5v13L16 15c-5 3-10.5 1-13.5-3z"/><circle cx="7.5" cy="11" r=".9"/>',
  sports: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 3.4 5.5 3.4 8.5s-1 6-3.4 8.5M12 3.5C9.6 6 8.6 9 8.6 12s1 6 3.4 8.5"/>',
  attraction: '<circle cx="12" cy="10" r="6.5"/><path d="M12 3.5v13M5.5 10h13M7.4 5.4l9.2 9.2M16.6 5.4l-9.2 9.2M8 21.5l4-5 4 5"/>',
  random_event: '<path d="M12 4v10" stroke-width="3"/><path d="M12 18.6v.4" stroke-width="3.4"/>',
  // Collectibles
  collectible: '<path d="M6 4h12l3 5-9 11L3 9zM3 9h18M9.5 4L12 20l2.5-16"/>',
  weapon_pickup: '<path d="M3 6.5h17.5v4.5H12l-1 2.5H8.5l-1 6H4l1.5-8.5H3z"/>',
  health_armor: '<path d="M12 20s-8-4.5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.5 12 20 12 20z"/>',
  // Places
  landmark: '<path d="M12 2l2 4v12h-4V6zM6.5 21.5h11M8 18h8"/>',
  hotel: '<path d="M3 19.5V6M3 15h18v4.5M3 11.5h5.5a2 2 0 0 1 2 2V15M10.5 11.5H19a2 2 0 0 1 2 2V15"/><circle cx="6" cy="8.8" r="1.4"/>',
  government: '<path d="M3 9l9-5 9 5M5.5 9.5v8.5M10 9.5v8.5M14 9.5v8.5M18.5 9.5v8.5M3 20.5h18"/>',
  residential: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" stroke-width="2.6"/><path d="M10.5 21v-3h3v3"/>',
  nature: '<path d="M12 21.5v-6M12 2.5l6 8h-3l4 5H5l4-5H6z"/>',
  infrastructure: '<path d="M2.5 16.5h19M2.5 12c3 0 6-3 9.5-3s6.5 3 9.5 3M7 11.5v5M12 9v7.5M17 11.5v5"/>',
}

const DOT = '<circle cx="12" cy="12" r="3.2" fill="currentColor"/>'

/** Dark glyph on light badges (hospital white, fast-food yellow), white on dark ones. */
function glyphColor(hex: string): string {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.6 ? '#070910' : '#ffffff'
}

export function hasGlyph(category: string): boolean {
  return category in G
}

/** Inline SVG (string) for a category glyph, sized `px`, coloured for its badge. */
export function glyphSvg(category: string, px: number, color?: string): string {
  const badge = CATEGORY_COLOR_BY_KEY[category] ?? '#9b94b8'
  const stroke = color ?? glyphColor(badge)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:${stroke};display:block" aria-hidden="true">${G[category] ?? DOT}</svg>`
}

/**
 * Full pin markup: a round badge in the category colour, a dark keyline so
 * light colours still read on gtadb's pale streets, and the glyph centred.
 */
export function pinHtml(category: string, size: number, selected = false): string {
  const badge = CATEGORY_COLOR_BY_KEY[category] ?? '#9b94b8'
  const ring = selected ? `0 0 0 2px #070910, 0 0 0 4px ${badge}, 0 0 14px ${badge}` : `0 0 0 1px ${badge}aa, 0 1px 4px rgba(0,0,0,.55)`
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${badge};border:2px solid #070910;box-shadow:${ring};display:flex;align-items:center;justify-content:center;box-sizing:border-box">${glyphSvg(category, Math.round(size * 0.6))}</div>`
}
