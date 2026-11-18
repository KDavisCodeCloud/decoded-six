'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { MapArea } from '@/lib/types'

// Name-only areas (map_areas.kind = 'label', geojson = Point [x, y] in the
// map's frame) -- the 5 county labels until the official map gives us
// polygons. Non-interactive text, faded out once zoomed in past county scale.
const HIDE_ABOVE_ZOOM = 3

function esc(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export function AreaLabels({ areas }: { areas: MapArea[] }) {
  const map = useMap()

  useEffect(() => {
    const group = L.layerGroup()
    for (const a of areas) {
      const coords = (a.geojson as { type?: string; coordinates?: [number, number] }).coordinates
      if ((a.geojson as { type?: string }).type !== 'Point' || !coords) continue
      L.marker([coords[1], coords[0]], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: 'ds-area-label',
          html: `<span>${esc(a.name.replace(/ County$/, ''))}<small>County</small></span>`,
          iconSize: [0, 0],
        }),
      }).addTo(group)
    }
    group.addTo(map)

    const sync = () => {
      const el = map.getContainer()
      el.classList.toggle('ds-hide-area-labels', map.getZoom() > HIDE_ABOVE_ZOOM)
    }
    sync()
    map.on('zoomend', sync)
    return () => { map.off('zoomend', sync); group.remove() }
  }, [map, areas])

  return null
}
