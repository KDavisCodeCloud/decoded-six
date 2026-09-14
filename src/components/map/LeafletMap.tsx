'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { MapMarker, MapArea } from '@/lib/types'
import { CATEGORY_COLORS } from './MarkerPopup'
import { LocationPanel, STATUS_COLORS } from './LocationPanel'
import { AreaOverlay } from './AreaOverlay'
import { CategoryFilter } from './CategoryFilter'
import { SearchBar } from './SearchBar'
import { MoneyFilter } from './MoneyFilter'
import { DailyTracker } from './DailyTracker'
import { MiniMap } from './MiniMap'
import { latLngToWorld, worldToLatLng, CRS_SIMPLE_BOUNDS } from '@/lib/map-coords'
import { soundManager, SoundEvents } from '@/lib/sounds'

const MIAMI: [number, number] = [25.7617, -80.1918]

// Set once the real Leonida tile pyramid exists (scripts/generate_map_tiles.mjs
// output) -- falls back to the CARTO dark basemap (real-world Earth
// coordinates) until then. Must be NEXT_PUBLIC_-prefixed to reach the browser
// bundle, unlike a server-only env var.
const MAP_TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || ''
const TILE_MODE = MAP_TILE_URL.length > 0

// Zoom level at or below which the perspective-tilt effect is active.
// Removed on zoom-in per the DESIGN.md "signature first-load moment" spec.
const TILT_ZOOM_THRESHOLD = TILE_MODE ? 1 : 11

function createMarkerIcon(color: string) {
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

function markerPosition(marker: MapMarker): [number, number] {
  if (TILE_MODE) return latLngToWorld(marker.coordinates.lat, marker.coordinates.lng, 1)
  return [marker.coordinates.lat, marker.coordinates.lng]
}

function clusterIcon(cluster: { getChildCount: () => number }) {
  const count = cluster.getChildCount()
  const size = count >= 20 ? 40 : count >= 8 ? 34 : 28
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:rgba(245,166,35,0.18); border:2px solid #f5a623;
      display:flex;align-items:center;justify-content:center;
      color:#f5a623;font-family:'JetBrains Mono',monospace;font-weight:700;
      font-size:${count >= 100 ? 10 : 11}px;
      box-shadow:0 0 12px rgba(245,166,35,0.35);
    ">${count}</div>`,
    className: '',
    iconSize: [size, size],
  })
}

interface LinkedArticleInfo {
  slug: string
  title: string
  category: string
}

interface DeepLinkView {
  lat: number
  lng: number
  zoom: number
}

/** Reads ?marker= / ?lat=&lng=&z= once on mount and applies the view. */
function DeepLinkController({
  markers,
  initialMarkerId,
  initialView,
  onOpenMarker,
}: {
  markers: MapMarker[]
  initialMarkerId?: string
  initialView?: DeepLinkView
  onOpenMarker: (marker: MapMarker) => void
}) {
  const map = useMap()
  const applied = useRef(false)

  useEffect(() => {
    if (applied.current) return
    applied.current = true

    if (initialView) {
      const center = TILE_MODE
        ? latLngToWorld(initialView.lat, initialView.lng, 1)
        : ([initialView.lat, initialView.lng] as [number, number])
      map.setView(center, initialView.zoom)
    }

    if (initialMarkerId) {
      const marker = markers.find(m => m.id === initialMarkerId)
      if (marker) {
        const pos = markerPosition(marker)
        map.flyTo(pos, Math.max(map.getZoom(), TILE_MODE ? 4 : 14), { duration: 1 })
        onOpenMarker(marker)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  return null
}

/** Tracks zoom for the perspective-tilt effect. */
function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  })
  useEffect(() => { onZoom(map.getZoom()) }, [map, onZoom])
  return null
}

/** Active only while the community submission form is in "pick on map" mode. */
function MapClickHandler({ active, onPick }: { active: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (!active) return
      const [lat, lng] = TILE_MODE
        ? worldToLatLng(e.latlng.lat, e.latlng.lng, 1)
        : [e.latlng.lat, e.latlng.lng]
      onPick(lat, lng)
    },
  })
  return null
}

/** Imperative fly-to, exposed to the search dropdown outside the map tree. */
function FlyToController({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), TILE_MODE ? 4 : 14), { duration: 0.8 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])
  return null
}

interface LeafletMapProps {
  markers: MapMarker[]
  areas: MapArea[]
  linkedArticles?: Record<string, LinkedArticleInfo>
  showAllStatuses?: boolean
  onMarkerReviewed?: (id: string, action: 'approve' | 'retire') => void
  initialMarkerId?: string
  initialView?: DeepLinkView
  pickingLocation?: boolean
  onPickLocation?: (lat: number, lng: number) => void
}

export function LeafletMap({
  markers,
  areas,
  linkedArticles,
  showAllStatuses,
  onMarkerReviewed,
  initialMarkerId,
  initialView,
  pickingLocation,
  onPickLocation,
}: LeafletMapProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [minPayout, setMinPayout] = useState(0)
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [zoom, setZoom] = useState(TILE_MODE ? 2 : 12)
  const [processing, setProcessing] = useState(false)

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

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return markers.filter(m => m.name.toLowerCase().includes(q)).slice(0, 8)
  }, [search, markers])

  const openMarker = useCallback((marker: MapMarker) => {
    setSelectedMarker(marker)
    const params = new URLSearchParams(searchParams.toString())
    params.set('marker', marker.id)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const handleSelectSearchResult = useCallback((marker: MapMarker) => {
    setFlyTarget(markerPosition(marker))
    openMarker(marker)
    setSearch('')
  }, [openMarker])

  const closePanel = useCallback(() => {
    setSelectedMarker(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('marker')
    router.replace(params.toString() ? `?${params.toString()}` : '?', { scroll: false })
  }, [router, searchParams])

  async function reviewMarker(action: 'approve' | 'retire') {
    if (!selectedMarker) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/map-markers/${selectedMarker.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error(await res.text())
      soundManager.play(action === 'approve' ? SoundEvents.MARKER_APPROVED : SoundEvents.MARKER_REJECTED)
      onMarkerReviewed?.(selectedMarker.id, action)
      closePanel()
    } catch (err) {
      console.error('Marker review failed:', err)
    } finally {
      setProcessing(false)
    }
  }

  const tiltActive = zoom <= TILT_ZOOM_THRESHOLD

  const center: [number, number] = TILE_MODE ? [128, 128] : MIAMI
  const initialZoom = TILE_MODE ? 2 : 12

  return (
    <div className="flex h-full gap-3">
      {/* Left sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-0.5">
        <div className="relative">
          <SearchBar value={search} onChange={setSearch} />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-[1200] bg-panel border border-white/[0.08] rounded-xl overflow-hidden shadow-xl">
              {searchResults.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleSelectSearchResult(m)}
                  className="w-full text-left px-3 py-2 text-xs text-quiet hover:bg-white/[0.05] hover:text-bright transition-colors flex items-center gap-2"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: CATEGORY_COLORS[m.category] ?? '#9b94b8' }}
                  />
                  <span className="truncate">{m.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <CategoryFilter
          selected={selectedCategories}
          onToggle={toggleCategory}
          onClearAll={clearAll}
        />
        <MoneyFilter minPayout={minPayout} onChange={setMinPayout} />
      </aside>

      {/* Map */}
      <div
        className="flex-1 relative rounded-xl overflow-hidden border border-white/[0.06]"
        style={{ perspective: 1400 }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: tiltActive ? 'rotateX(10deg) scale(0.96)' : 'none',
            transformOrigin: 'center bottom',
            transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
            cursor: pickingLocation ? 'crosshair' : undefined,
          }}
        >
          <MapContainer
            center={center}
            zoom={initialZoom}
            crs={TILE_MODE ? L.CRS.Simple : undefined}
            minZoom={TILE_MODE ? 0 : undefined}
            maxZoom={TILE_MODE ? 6 : 19}
            style={{ width: '100%', height: '100%', background: '#07050d' }}
          >
            <ZoomWatcher onZoom={setZoom} />
            <DeepLinkController
              markers={markers}
              initialMarkerId={initialMarkerId}
              initialView={initialView}
              onOpenMarker={openMarker}
            />
            <FlyToController target={flyTarget} />
            {onPickLocation && (
              <MapClickHandler active={!!pickingLocation} onPick={onPickLocation} />
            )}

            {TILE_MODE ? (
              <TileLayer
                url={MAP_TILE_URL}
                tileSize={256}
                noWrap
                tms
                bounds={CRS_SIMPLE_BOUNDS(1)}
                attribution="DecodedSix placeholder tile set"
              />
            ) : (
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                subdomains="abcd"
                maxZoom={19}
              />
            )}

            {areas.length > 0 && <AreaOverlay areas={areas} />}

            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={clusterIcon}
              maxClusterRadius={TILE_MODE ? 40 : 60}
              disableClusteringAtZoom={TILE_MODE ? 5 : 16}
            >
              {visible.map(marker => {
                const color = showAllStatuses
                  ? STATUS_COLORS[marker.status] ?? '#9b94b8'
                  : CATEGORY_COLORS[marker.category] ?? '#9b94b8'
                return (
                  <Marker
                    key={marker.id}
                    position={markerPosition(marker)}
                    icon={createMarkerIcon(color)}
                    eventHandlers={{ click: () => openMarker(marker) }}
                  />
                )
              })}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

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

      <LocationPanel
        marker={selectedMarker}
        onClose={closePanel}
        linkedArticle={selectedMarker?.linked_article_id ? linkedArticles?.[selectedMarker.linked_article_id] : null}
        showAllStatuses={showAllStatuses}
        processing={processing}
        onApprove={() => reviewMarker('approve')}
        onRetire={() => reviewMarker('retire')}
      />
    </div>
  )
}
