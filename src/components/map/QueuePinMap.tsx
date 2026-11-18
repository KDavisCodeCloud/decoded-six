'use client'

import { useEffect, useRef } from 'react'
import type { MapLayer } from '@/lib/map-layers'

const EMPTY_TILE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

interface Props {
  layer: MapLayer
  x: number | null
  y: number | null
  radiusM: number | null
  /** called with canonical meters after a drag (or a click when unplaced) */
  onMove: (x: number, y: number) => void
}

// HITL queue mini-map: the proposed pin on the active base layer, draggable.
// An unplaced ("needs placement") item starts zoomed out; click to drop a pin.
export function QueuePinMap({ layer, x, y, radiusM, onMove }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  useEffect(() => {
    if (!ref.current) return
    let map: import('leaflet').Map | undefined
    let cancelled = false
    Promise.all([import('leaflet'), import('@/lib/map-layers'), import('@/lib/map-crs')]).then(([L, ml, mc]) => {
      if (cancelled || !ref.current) return
      map = L.map(ref.current, { crs: mc.GTADB_CRS, attributionControl: false, zoomSnap: 0.5, minZoom: 0, maxZoom: layer.max_zoom })
      const tl = L.tileLayer('', { tileSize: 256, noWrap: true, maxNativeZoom: layer.max_native_zoom, maxZoom: layer.max_zoom })
      tl.getTileUrl = (c: import('leaflet').Coords) => ml.tileUrl(layer, c.z, c.x, c.y) ?? EMPTY_TILE
      tl.addTo(map)
      ref.current.style.background = layer.background_color

      const icon = L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#f5a623;border:3px solid #070910;box-shadow:0 0 0 2px #f5a623"></div>',
        iconSize: [18, 18], iconAnchor: [9, 9],
      })
      let pin: import('leaflet').Marker | undefined
      let circle: import('leaflet').Circle | undefined
      const place = (px: number, py: number, r: number | null) => {
        const ll = ml.metersToLatLng(px, py) as [number, number]
        if (!pin) {
          pin = L.marker(ll, { draggable: true, icon, keyboard: true, title: 'Drag to move' }).addTo(map!)
          pin.on('dragend', () => {
            const p = pin!.getLatLng()
            circle?.setLatLng(p)
            onMoveRef.current(Math.round(p.lng), Math.round(p.lat))
          })
        } else pin.setLatLng(ll)
        if (r) {
          if (!circle) circle = L.circle(ll, { radius: r, color: '#f5a623', weight: 1, fillOpacity: 0.12 }).addTo(map!)
          else circle.setLatLng(ll).setRadius(r)
        }
      }
      if (x != null && y != null) {
        place(x, y, radiusM)
        map.setView(ml.metersToLatLng(x, y) as [number, number], radiusM && radiusM > 300 ? 3 : 4)
      } else {
        map.fitBounds(ml.layerBounds(layer, 0))
        map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
          place(e.latlng.lng, e.latlng.lat, 50)
          onMoveRef.current(Math.round(e.latlng.lng), Math.round(e.latlng.lat))
        })
      }
    })
    return () => { cancelled = true; map?.remove() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, x == null])

  return <div ref={ref} className="h-56 w-full rounded-lg border border-white/[0.08]" />
}
