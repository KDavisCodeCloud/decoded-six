'use client'

import { useEffect, useRef } from 'react'
import type { MapLayer } from '@/lib/map-layers'

const MIAMI_LAT = 25.7617
const MIAMI_LNG = -80.1918

/** Static overview. With a map_layers row: the whole game world at zoom 0; otherwise CARTO around Miami. */
export function MiniMap({ layer }: { layer?: MapLayer }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let minimap: import('leaflet').Map | undefined
    let cancelled = false

    if (layer) {
      Promise.all([import('leaflet'), import('@/lib/map-layers'), import('@/lib/map-crs')]).then(([L, ml, mc]) => {
        if (cancelled || !containerRef.current) return
        minimap = L.map(containerRef.current, {
          crs: mc.GTADB_CRS,
          zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
          touchZoom: false, keyboard: false, boxZoom: false, attributionControl: false,
        })
        minimap.fitBounds(ml.layerBounds(layer, 0), { padding: [2, 2] })
        const tl = L.tileLayer('', { tileSize: 256, noWrap: true, maxNativeZoom: layer.max_native_zoom })
        tl.getTileUrl = (c: import('leaflet').Coords) => ml.tileUrl(layer, c.z, c.x, c.y)
          ?? 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
        tl.addTo(minimap)
        containerRef.current.style.background = layer.background_color
      })
      return () => { cancelled = true; minimap?.remove() }
    }

    import('leaflet').then(L => {
      if (cancelled || !containerRef.current) return
      minimap = L.map(containerRef.current, {
        center: [MIAMI_LAT, MIAMI_LNG],
        zoom: 9,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(minimap)
    })

    return () => {
      cancelled = true
      minimap?.remove()
    }
  }, [layer])

  return (
    <div className="bg-panel border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.04]">
        <span className="text-[10px] font-mono text-quiet uppercase tracking-widest">
          {layer ? 'Leonida' : 'Vice City'}
        </span>
      </div>
      <div ref={containerRef} style={{ height: 120, width: '100%' }} />
    </div>
  )
}
