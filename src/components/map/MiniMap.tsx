'use client'

import { useEffect, useRef } from 'react'

const MIAMI_LAT = 25.7617
const MIAMI_LNG = -80.1918

export function MiniMap() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let minimap: import('leaflet').Map | undefined

    import('leaflet').then(L => {
      if (!containerRef.current) return
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
      minimap?.remove()
    }
  }, [])

  return (
    <div className="bg-panel border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.04]">
        <span className="text-[10px] font-mono text-quiet uppercase tracking-widest">
          Vice City
        </span>
      </div>
      <div ref={containerRef} style={{ height: 120, width: '100%' }} />
    </div>
  )
}
