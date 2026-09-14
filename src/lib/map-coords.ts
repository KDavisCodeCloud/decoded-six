// Coordinate mapping between the real-world lat/lng space every existing
// marker was seeded in (Florida, since Leonida mirrors it 1:1 per
// docs/MAP_SPEC.md's region list) and the CRS.Simple pixel/world space the
// custom Leonida tile pyramid renders in.
//
// This is a rough linear approximation, not a real projection -- precision
// doesn't matter until the real Leonida map image (and real in-game
// coordinates) replace this placeholder tile set. Its only job is letting
// every already-seeded marker keep rendering, at roughly the right relative
// position, the moment MAP_TILE_URL is set -- zero data migration required.
//
// World space matches Leaflet's CRS.Simple convention for a standard z/x/y
// tile pyramid: a fixed 256x256 unit square (scaled to the source image's
// aspect ratio), same units at every zoom level, with tile pixel density
// doubling per zoom instead of the world unit size changing.
export const REAL_WORLD_BOUNDS = {
  minLat: 24.5,
  maxLat: 31.5,
  minLng: -87.5,
  maxLng: -79.8,
}

export const WORLD_SIZE = 256

/**
 * Converts a real-world lat/lng into CRS.Simple [y, x] world coordinates
 * (aspectRatio = imageHeight / imageWidth of the source tile image).
 */
export function latLngToWorld(lat: number, lng: number, aspectRatio = 1): [number, number] {
  const { minLat, maxLat, minLng, maxLng } = REAL_WORLD_BOUNDS
  const xFrac = (lng - minLng) / (maxLng - minLng)
  const yFrac = (lat - minLat) / (maxLat - minLat)
  const worldHeight = WORLD_SIZE * aspectRatio
  return [yFrac * worldHeight, xFrac * WORLD_SIZE]
}

/** Inverse of latLngToWorld -- world [y, x] back to real-world lat/lng. */
export function worldToLatLng(y: number, x: number, aspectRatio = 1): [number, number] {
  const { minLat, maxLat, minLng, maxLng } = REAL_WORLD_BOUNDS
  const worldHeight = WORLD_SIZE * aspectRatio
  const lat = minLat + (y / worldHeight) * (maxLat - minLat)
  const lng = minLng + (x / WORLD_SIZE) * (maxLng - minLng)
  return [lat, lng]
}

export const CRS_SIMPLE_BOUNDS = (aspectRatio = 1): [[number, number], [number, number]] => [
  [0, 0],
  [WORLD_SIZE * aspectRatio, WORLD_SIZE],
]
