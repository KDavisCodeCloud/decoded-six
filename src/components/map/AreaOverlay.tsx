'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { MapArea } from '@/lib/types'

interface AreaOverlayProps {
  areas: MapArea[]
}

export function AreaOverlay({ areas }: AreaOverlayProps) {
  const map = useMap()

  useEffect(() => {
    const layers: L.Layer[] = []

    areas.forEach(area => {
      try {
        const layer = L.geoJSON(area.geojson as unknown as GeoJSON.GeoJsonObject, {
          style: {
            fillColor: area.color,
            fillOpacity: area.opacity,
            color: area.color,
            weight: 1,
            opacity: 0.4,
          },
        }).bindTooltip(area.name, {
          permanent: false,
          direction: 'center',
          className: 'area-tooltip',
        })
        layer.addTo(map)
        layers.push(layer)
      } catch {
        // skip malformed geojson
      }
    })

    return () => {
      layers.forEach(l => map.hasLayer(l) && l.removeFrom(map))
    }
  }, [map, areas])

  return null
}
