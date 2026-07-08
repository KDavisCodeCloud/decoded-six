'use client'

import { useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { MapMarker, MapArea } from '@/lib/types'
import { MarkerPopup, CATEGORY_COLORS } from './MarkerPopup'
import { AreaOverlay } from './AreaOverlay'
import { CategoryFilter } from './CategoryFilter'
import { SearchBar } from './SearchBar'
import { MoneyFilter } from './MoneyFilter'
import { DailyTracker } from './DailyTracker'
import { MiniMap } from './MiniMap'

const MIAMI: [number, number] = [25.7617, -80.1918]

function createMarkerIcon(category: string) {
  const color = CATEGORY_COLORS[category] ?? '#9b94b8'
  return L.divIcon({
    className: '',
    html: `<div style="
      width:10px;height:10px;border-radius:50%;
      background:${color};
      box-shadow:0 0 0 2px ${color}44, 0 0 8px ${color}66;
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    popupAnchor: [0, -12],
  })
}

interface LeafletMapProps {
  markers: MapMarker[]
  areas: MapArea[]
}

export function LeafletMap({ markers, areas }: LeafletMapProps) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [minPayout, setMinPayout] = useState(0)

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setSelectedCategories(new Set())
    setSearch('')
    setMinPayout(0)
  }, [])

  const visible = markers.filter(m => {
    if (selectedCategories.size > 0 && !selectedCategories.has(m.category)) return false
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    if (minPayout > 0 && (m.payout_per_hour ?? 0) < minPayout) return false
    return true
  })

  return (
    <div className="flex h-full gap-3">
      {/* Left sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-0.5">
        <SearchBar value={search} onChange={setSearch} />
        <CategoryFilter
          selected={selectedCategories}
          onToggle={toggleCategory}
          onClearAll={clearAll}
        />
        <MoneyFilter minPayout={minPayout} onChange={setMinPayout} />
      </aside>

      {/* Map */}
      <div className="flex-1 relative rounded-xl overflow-hidden border border-white/[0.06]">
        <MapContainer
          center={MIAMI}
          zoom={12}
          style={{ width: '100%', height: '100%', background: '#07050d' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />
          {areas.length > 0 && <AreaOverlay areas={areas} />}
          {visible.map(marker => (
            <Marker
              key={marker.id}
              position={[marker.coordinates.lat, marker.coordinates.lng]}
              icon={createMarkerIcon(marker.category)}
            >
              <Popup>
                <MarkerPopup marker={marker} />
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Marker count overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-void/80 border border-white/[0.06] rounded-lg px-3 py-1.5 backdrop-blur-sm">
          <span className="text-[10px] font-mono text-quiet">
            {visible.length} / {markers.length} locations
          </span>
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="w-44 flex-shrink-0 flex flex-col gap-3">
        <MiniMap />
        <DailyTracker markers={markers} />
      </aside>
    </div>
  )
}
