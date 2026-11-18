// Leaflet CRS for the gtadb world frame (see map-layers.ts). Client-only:
// Leaflet touches `window` at import.
import L from 'leaflet'
import { WORLD_HALF_M, ZOOM0_PX } from './map-layers'

/** px = x/32 + 512, py = 512 - y/32 at zoom 0 (CRS.Simple projects LatLng [lat=y, lng=x] to point (x, y)). */
export const GTADB_CRS: L.CRS = L.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(
    ZOOM0_PX / (2 * WORLD_HALF_M), ZOOM0_PX / 2,
    -ZOOM0_PX / (2 * WORLD_HALF_M), ZOOM0_PX / 2,
  ),
})

