'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { MapMarker, MapArea } from '@/lib/types'
import { BaseLayer, LayerSwitcher, MapCredits } from './BaseLayer'
import { AreaLabels } from './AreaLabels'
import { GTADB_FRAME, metersToLatLng, layerBounds, orderLayers, type MapLayer } from '@/lib/map-layers'
import { GTADB_CRS } from '@/lib/map-crs'
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

// Three render modes, fixed for the life of the map:
//  'meters' -- map_layers rows exist (migration 029): gtadb world frame,
//              markers/areas positioned by x/y meters; legacy lat/lng rows hidden
//  'tiles'  -- legacy NEXT_PUBLIC_MAP_TILE_URL placeholder pyramid
//  'world'  -- no tiles at all: CARTO real-world basemap
type MapMode = 'meters' | 'tiles' | 'world'

/** A picked map point: real-world lat/lng, or meters in a game-world frame. */
export type PickedPoint = { lat: number; lng: number } | { x: number; y: number; frame: string }

// Zoom level at or below which the perspective-tilt effect is active.
// Removed on zoom-in per the DESIGN.md "signature first-load moment" spec.
const TILT_ZOOM_THRESHOLD: Record<MapMode, number> = { meters: 1, tiles: 1, world: 11 }
const FOCUS_ZOOM: Record<MapMode, number> = { meters: 3, tiles: 4, world: 14 }

function createMarkerIcon(color: string) {
  return L.divIcon({
    className: '',
    // dark ring keeps light category colours readable on gtadb's light streets
    html: `<div style="
      width:12px;height:12px;border-radius:50%;
      background:${color};
      border:2px solid #070910;
      box-shadow:0 0 0 1.5px ${color}, 0 0 8px ${color}99;
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -12],
  })
}

/** Leaflet position for a marker in this mode, or null when it can't be placed there. */
function markerPosition(marker: MapMarker, mode: MapMode): [number, number] | null {
  if (mode === 'meters') {
    if (marker.frame !== GTADB_FRAME || marker.x == null || marker.y == null) return null
    return metersToLatLng(Number(marker.x), Number(marker.y))
  }
  if (marker.frame === GTADB_FRAME) return null   // game-meter row on a real-world map
  if (mode === 'tiles') return latLngToWorld(marker.coordinates.lat, marker.coordinates.lng, 1)
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
  mode,
  markers,
  initialMarkerId,
  initialView,
  onOpenMarker,
}: {
  mode: MapMode
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

    // in 'meters' mode the page passes ?x=&y= as lng/lat (LatLng = [y, x])
    if (initialView) {
      const center = mode === 'tiles'
        ? latLngToWorld(initialView.lat, initialView.lng, 1)
        : ([initialView.lat, initialView.lng] as [number, number])
      map.setView(center, initialView.zoom)
    }

    if (initialMarkerId) {
      const marker = markers.find(m => m.id === initialMarkerId)
      const pos = marker && markerPosition(marker, mode)
      if (marker && pos) {
        map.flyTo(pos, Math.max(map.getZoom(), FOCUS_ZOOM[mode]), { duration: 1 })
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
function MapClickHandler({ mode, active, onPick }: { mode: MapMode; active: boolean; onPick: (p: PickedPoint) => void }) {
  useMapEvents({
    click: (e) => {
      if (!active) return
      if (mode === 'meters') {
        onPick({ x: Math.round(e.latlng.lng), y: Math.round(e.latlng.lat), frame: GTADB_FRAME })
        return
      }
      const [lat, lng] = mode === 'tiles'
        ? worldToLatLng(e.latlng.lat, e.latlng.lng, 1)
        : [e.latlng.lat, e.latlng.lng]
      onPick({ lat, lng })
    },
  })
  return null
}

/** Imperative fly-to, exposed to the search dropdown outside the map tree. */
function FlyToController({ mode, target }: { mode: MapMode; target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), FOCUS_ZOOM[mode]), { duration: 0.8 })
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
  onPickLocation?: (p: PickedPoint) => void
  /** Enabled map_layers rows; any present switches the map to the gtadb meter frame. */
  layers?: MapLayer[]
}

export function LeafletMap({
  markers: allMarkers,
  areas: allAreas,
  layers,
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

  const orderedLayers = useMemo(() => orderLayers(layers ?? []), [layers])
  const [mode] = useState<MapMode>(() => orderedLayers.length > 0 ? 'meters' : TILE_MODE ? 'tiles' : 'world')
  const [activeLayerId, setActiveLayerId] = useState(orderedLayers[0]?.id ?? '')
  const activeLayer = orderedLayers.find(l => l.id === activeLayerId) ?? orderedLayers[0]

  // only rows that can actually be drawn in this mode
  const markers = useMemo(() => allMarkers.filter(m => markerPosition(m, mode) !== null), [allMarkers, mode])
  const areas = useMemo(() => allAreas.filter(a =>
    (a.frame ?? 'real_world_latlng') === (mode === 'meters' ? GTADB_FRAME : 'real_world_latlng')
  ), [allAreas, mode])
  const polygonAreas = useMemo(() => areas.filter(a => a.kind !== 'label'), [areas])
  const labelAreas = useMemo(() => areas.filter(a => a.kind === 'label'), [areas])

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [minPayout, setMinPayout] = useState(0)
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [zoom, setZoom] = useState(mode === 'world' ? 12 : mode === 'meters' ? 1 : 2)
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
    setFlyTarget(markerPosition(marker, mode))
    openMarker(marker)
    setSearch('')
  }, [openMarker, mode])

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

  const tiltActive = zoom <= TILT_ZOOM_THRESHOLD[mode]

  // meters: open on the layer's land extent (gtadb V18 is centred near Vice City)
  const meterBounds = activeLayer ? layerBounds(activeLayer, 0) : null
  const center: [number, number] = mode === 'meters' && meterBounds
    ? [(meterBounds[0][0] + meterBounds[1][0]) / 2, (meterBounds[0][1] + meterBounds[1][1]) / 2]
    : mode === 'tiles' ? [128, 128] : MIAMI
  const initialZoom = mode === 'world' ? 12 : mode === 'meters' ? 1 : 2

  return (
    <div className="flex h-full flex-col gap-3 md:flex-row">
      {/* Left sidebar (below the map on phones) */}
      <aside className="order-2 flex w-full flex-shrink-0 flex-col gap-3 pr-0.5 md:order-none md:w-52 md:overflow-y-auto">
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
        {mode === 'meters' && <MapCredits layers={orderedLayers} />}
      </aside>

      {/* Map */}
      <div
        className="relative order-1 h-[65vh] min-h-[360px] flex-none overflow-hidden rounded-xl border border-white/[0.06] md:order-none md:h-auto md:flex-1"
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
            crs={mode === 'meters' ? GTADB_CRS : mode === 'tiles' ? L.CRS.Simple : undefined}
            minZoom={mode === 'world' ? undefined : 0}
            maxZoom={mode === 'meters' ? Math.max(...orderedLayers.map(l => l.max_zoom)) : mode === 'tiles' ? 6 : 19}
            maxBounds={meterBounds ? L.latLngBounds(meterBounds).pad(0.25) : undefined}
            maxBoundsViscosity={0.8}
            zoomSnap={0.5}
            style={{ width: '100%', height: '100%', background: activeLayer?.background_color ?? '#07050d' }}
          >
            <ZoomWatcher onZoom={setZoom} />
            <DeepLinkController
              mode={mode}
              markers={markers}
              initialMarkerId={initialMarkerId}
              initialView={initialView}
              onOpenMarker={openMarker}
            />
            <FlyToController mode={mode} target={flyTarget} />
            {onPickLocation && (
              <MapClickHandler mode={mode} active={!!pickingLocation} onPick={onPickLocation} />
            )}

            {mode === 'meters' && activeLayer ? (
              <BaseLayer key={activeLayer.id} layer={activeLayer} />
            ) : mode === 'tiles' ? (
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

            {polygonAreas.length > 0 && <AreaOverlay areas={polygonAreas} />}
            {labelAreas.length > 0 && <AreaLabels areas={labelAreas} />}

            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={clusterIcon}
              maxClusterRadius={mode === 'world' ? 60 : 40}
              disableClusteringAtZoom={mode === 'world' ? 16 : mode === 'meters' ? 4 : 5}
            >
              {visible.map(marker => {
                const color = showAllStatuses
                  ? STATUS_COLORS[marker.status] ?? '#9b94b8'
                  : CATEGORY_COLORS[marker.category] ?? '#9b94b8'
                return (
                  <Marker
                    key={marker.id}
                    position={markerPosition(marker, mode)!}
                    icon={createMarkerIcon(color)}
                    eventHandlers={{ click: () => openMarker(marker) }}
                  />
                )
              })}
            </MarkerClusterGroup>
          </MapContainer>
        </div>

        {mode === 'meters' && activeLayer && (
          <LayerSwitcher layers={orderedLayers} activeId={activeLayer.id} onChange={setActiveLayerId} />
        )}

        {/* Marker count overlay */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-void/80 border border-white/[0.06] rounded-lg px-3 py-1.5 backdrop-blur-sm">
          <span className="text-[10px] font-mono text-quiet">
            {visible.length} / {markers.length} locations
          </span>
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="hidden w-44 flex-shrink-0 flex-col gap-3 md:flex">
        <MiniMap layer={mode === 'meters' ? activeLayer : undefined} />
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
