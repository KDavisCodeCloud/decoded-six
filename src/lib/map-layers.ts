// Base layers for the interactive map (map_layers, migration 029).
//
// Canonical frame 'gtadb_world': meters, origin at the map centre, +x east,
// +y north, world bounds +/-16384 m. In Leaflet this is a CRS.Simple variant
// where LatLng = [y, x] in meters and zoom 0 fits the whole 32768 m world in
// 1024 px, so zoom 5 = 1 px/m -- exactly gtadb's tile pyramid (tiles.py), and
// gtadb's tile column/row at zoom z are Leaflet's own tile coords.
// Pure (no Leaflet import) so it runs in Node tests and server code; the CRS
// itself lives in map-crs.ts.

export const GTADB_FRAME = 'gtadb_world'
export const WORLD_HALF_M = 16384
export const ZOOM0_PX = 1024

export interface LayerAttribution {
  text: string
  url?: string
  license_url?: string
  adapted?: boolean
}

/** County labels / region positions derive from gtadb landmarks data: credited whenever the gtadb frame is shown. */
export const GTADB_LANDMARKS_ATTRIBUTION: LayerAttribution = {
  text: 'GTA VI Landmarks Data (CC BY 4.0) — https://map.gtadb.org',
  url: 'https://map.gtadb.org',
  license_url: 'https://creativecommons.org/licenses/by/4.0/',
  adapted: true,
}

export interface MapLayer {
  id: string
  label: string
  kind: 'community' | 'official'
  frame: string
  tile_url_template: string
  min_zoom: number
  max_native_zoom: number
  max_zoom: number
  tile_ranges: Record<string, [[number, number], [number, number]]>
  background_color: string
  attribution: LayerAttribution[]
  source_ref: string | null
  is_default: boolean
  sort_order: number
}

/** gtadb meters -> Leaflet LatLng tuple for GTADB_CRS. */
export function metersToLatLng(x: number, y: number): [number, number] {
  return [y, x]
}

/** gtadb meters -> tile column/row at zoom z (same as Leaflet's tile coords under GTADB_CRS). */
export function metersToTile(x: number, y: number, z: number): { x: number; y: number } {
  const pxPerM = (ZOOM0_PX * 2 ** z) / (2 * WORLD_HALF_M)
  return {
    x: Math.floor(((x + WORLD_HALF_M) * pxPerM) / 256),
    y: Math.floor(((WORLD_HALF_M - y) * pxPerM) / 256),
  }
}

/** Tile (z, x, y) URL for a layer, or null when gtadb has no tile there (open ocean). */
export function tileUrl(layer: Pick<MapLayer, 'tile_url_template' | 'tile_ranges'>, z: number, x: number, y: number): string | null {
  const r = layer.tile_ranges[String(z)]
  if (!r || x < r[0][0] || x > r[1][0] || y < r[0][1] || y > r[1][1]) return null
  return layer.tile_url_template
    .replace(/\{z\}/g, String(z))
    .replace(/\{x\}/g, String(x))
    .replace(/\{y\}/g, String(y))
}

/** Meter bounds actually covered by tiles at a zoom level: [[minY, minX], [maxY, maxX]]. */
export function layerBounds(layer: Pick<MapLayer, 'tile_ranges'>, z = 0): [[number, number], [number, number]] {
  const r = layer.tile_ranges[String(z)]
  const mPerTile = (2 * WORLD_HALF_M) / (ZOOM0_PX * 2 ** z / 256)
  if (!r) return [[-WORLD_HALF_M, -WORLD_HALF_M], [WORLD_HALF_M, WORLD_HALF_M]]
  const minX = -WORLD_HALF_M + r[0][0] * mPerTile
  const maxX = -WORLD_HALF_M + (r[1][0] + 1) * mPerTile
  const maxY = WORLD_HALF_M - r[0][1] * mPerTile
  const minY = WORLD_HALF_M - (r[1][1] + 1) * mPerTile
  return [[minY, minX], [maxY, maxX]]
}

/** Default first, then sort_order. */
export function orderLayers<T extends Pick<MapLayer, 'is_default' | 'sort_order'>>(layers: T[]): T[] {
  return [...layers].sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.sort_order - b.sort_order)
}
