'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import type { MapArea } from '@/lib/types'

interface AreaOverlayProps {
  areas: MapArea[]
}

// Region hover (2026-11-23, Kelvin): whatever region the cursor is over --
// Vice City, Hamlet, Port Gellhorn, Kelly County, Lummox County... -- lights
// up with its name. The game-map regions (frame gtadb_world, opacity 0) are
// invisible until hovered; their outlines are DecodedSix's own approximation,
// derived from gtadb landmark addresses (CC BY 4.0), so the tooltip says so.
export function AreaOverlay({ areas }: AreaOverlayProps) {
  const map = useMap()

  useEffect(() => {
    const layers: L.Layer[] = []

    areas.forEach(area => {
      try {
        const base: L.PathOptions = {
          fillColor: area.color,
          fillOpacity: area.opacity,
          color: area.color,
          weight: area.opacity > 0 ? 1 : 0,
          opacity: area.opacity > 0 ? 0.4 : 0,
        }
        const hover: L.PathOptions = {
          fillOpacity: Math.max(area.opacity + 0.12, 0.2),
          weight: 2.5,
          opacity: 0.95,
          dashArray: area.frame === 'gtadb_world' ? '6 4' : undefined,
        }
        const approx = area.frame === 'gtadb_world'
        const layer = L.geoJSON(area.geojson as unknown as GeoJSON.GeoJsonObject, { style: base })
          .bindTooltip(
            `<span class="area-tooltip-name">${area.name}</span>${approx ? '<span class="area-tooltip-note">approx. boundary</span>' : ''}`,
            { sticky: true, direction: 'top', offset: [0, -12], className: 'area-tooltip' },
          )
          .on('mouseover', e => (e.target as L.GeoJSON).setStyle(hover))
          .on('mouseout', e => (e.target as L.GeoJSON).setStyle(base))
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
