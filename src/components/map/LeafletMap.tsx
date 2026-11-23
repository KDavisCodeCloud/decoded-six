'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { MapMarker, MapArea } from '@/lib/types'
import { BaseLayer, LayerSwitcher, MapCredits } from './BaseLayer'
import { AreaLabels } from './AreaLabels'
import { GTADB_FRAME, metersToLatLng, layerBounds, orderLayers, type MapLayer } from '@/lib/map-layers'
import { GTADB_CRS } from '@/lib/map-crs'
import { CategoryBadge } from './CategoryBadge'
import { isApproximate, MAP_CATEGORIES, DEFAULT_HIDDEN_CATEGORIES } from '@/lib/map-categories'
import { LocationPanel } from './LocationPanel'
import { AreaOverlay } from './AreaOverlay'
import { CategoryFilter } from './CategoryFilter'
import { SearchBar } from './SearchBar'
import { MoneyFilter } from './MoneyFilter'
import { DailyTracker } from './DailyTracker'
import { MiniMap } from './MiniMap'
import { latLngToWorld, worldToLatLng, CRS_SIMPLE_BOUNDS } from '@/lib/map-coords'
import { soundManager, SoundEvents } from '@/lib/sounds'
import { pinHtml, pinGeometry } from '@/lib/map-icons'

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

// (The zoomed-out perspective tilt was removed 2026-11-18 at Kelvin's request:
// the map always renders flat.)
const FOCUS_ZOOM: Record<MapMode, number> = { meters: 3, tiles: 4, world: 14 }
// Pin colour = category, solid, on every map (public and dashboard). Status is
// never drawn on the pin -- it shows in the LocationPanel when a pin is opened.
// Icon pins (2026-11-23): a round badge in the category colour with an
// original glyph (src/lib/map-icons.ts), so a bus stop, stunt jump or fishing
// spot reads at a glance. Icons are cached per category/size/state -- Leaflet
// reuses the same L.DivIcon object, so ~1,000 dashboard pins stay cheap.
const iconCache = new Map<string, L.DivIcon>()
function createMarkerIcon(category: string, size: number, selected = false) {
  const key = `${category}|${size}|${selected ? 1 : 0}`
  let icon = iconCache.get(key)
  if (!icon) {
    // pointer-style in-game blips anchor at their tip so they sit ON the spot
    const g = pinGeometry(category, size)
    icon = L.divIcon({
      className: '',
      html: pinHtml(category, g.size, selected),
      iconSize: [g.size, g.size],
      iconAnchor: g.anchor,
      popupAnchor: [0, -g.size / 2],
    })
    iconCache.set(key, icon)
  }
  return icon
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

/**
 * Phones: the desktop opening view (zoom 1 on Vice City) shows one corner of
 * the island on a ~360px screen. On narrow maps, open fitted to the pins
 * instead so the whole island is visible; a deep link still wins.
 */
function FitOnSmallScreen({ mode, markers, skip }: { mode: MapMode; markers: MapMarker[]; skip: boolean }) {
  const map = useMap()
  const applied = useRef(false)
  useEffect(() => {
    if (applied.current || skip || mode !== 'meters') return
    applied.current = true
    if (map.getSize().x >= 768) return
    const pts = markers.map(m => markerPosition(m, mode)).filter((p): p is [number, number] => !!p)
    if (pts.length < 2) return
    map.fitBounds(L.latLngBounds(pts), { padding: [10, 10] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])
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
  const categoryCounts = useMemo(() => markers.reduce<Record<string, number>>((acc, m) => {
    acc[m.category] = (acc[m.category] ?? 0) + 1
    return acc
  }, {}), [markers])
  const polygonAreas = useMemo(() => areas.filter(a => a.kind !== 'label'), [areas])
  const labelAreas = useMemo(() => areas.filter(a => a.kind === 'label'), [areas])

  // every category is ON by default; the left bar switches categories off/on
  // infrastructure (bridges, lots, towers) starts off on the public map; the dashboard shows everything
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => new Set(showAllStatuses ? [] : DEFAULT_HIDDEN_CATEGORIES))
  const [search, setSearch] = useState('')
  // phones: smaller pins so the fitted whole-island view isn't a solid carpet
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setNarrow(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const [minPayout, setMinPayout] = useState(0)
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const [processing, setProcessing] = useState(false)

  const toggleCategory = useCallback((cat: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }, [])

  const showAllCategories = useCallback(() => setHiddenCategories(new Set()), [])
  const hideAllCategories = useCallback(() => setHiddenCategories(new Set(MAP_CATEGORIES.map(c => c.key))), [])

  const clearAll = useCallback(() => {
    setHiddenCategories(new Set())
    setSearch('')
    setMinPayout(0)
  }, [])

  const visible = markers.filter(m => {
    if (hiddenCategories.has(m.category)) return false
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
                  <CategoryBadge category={m.category} size={16} />
                  <span className="truncate">{m.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <CategoryFilter
          hidden={hiddenCategories}
          onToggle={toggleCategory}
          onShowAll={showAllCategories}
          onHideAll={hideAllCategories}
          counts={categoryCounts}
          hideEmpty={!showAllStatuses}
        />
        <MoneyFilter minPayout={minPayout} onChange={setMinPayout} />
        {mode === 'meters' && <MapCredits layers={orderedLayers} />}
      </aside>

      {/* Map */}
      <div
        className="relative order-1 h-[70svh] min-h-[340px] flex-none overflow-hidden rounded-xl border border-white/[0.06] md:order-none md:h-auto md:flex-1"
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            cursor: pickingLocation ? 'crosshair' : undefined,
          }}
        >
          <MapContainer
            center={center}
            zoom={initialZoom}
            crs={mode === 'meters' ? GTADB_CRS : mode === 'tiles' ? L.CRS.Simple : undefined}
            minZoom={mode === 'world' ? undefined : mode === 'meters' ? -1 : 0}
            maxZoom={mode === 'meters' ? Math.max(...orderedLayers.map(l => l.max_zoom)) : mode === 'tiles' ? 6 : 19}
            maxBounds={meterBounds ? L.latLngBounds(meterBounds).pad(0.25) : undefined}
            maxBoundsViscosity={0.8}
            zoomSnap={0.5}
            style={{ width: '100%', height: '100%', background: activeLayer?.background_color ?? '#07050d' }}
          >
            <FitOnSmallScreen mode={mode} markers={markers} skip={!!initialView || !!initialMarkerId} />
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

            {mode === 'meters' ? (
              // every pin at once, as a category icon badge, at every zoom -- no clustering.
              visible.map(marker => {
                const isOpen = selectedMarker?.id === marker.id
                return (
                  <Marker
                    key={marker.id}
                    position={markerPosition(marker, mode)!}
                    icon={createMarkerIcon(marker.category, isOpen ? 30 : narrow ? 20 : 24, isOpen)}
                    zIndexOffset={isOpen ? 1000 : 0}
                    eventHandlers={{ click: () => openMarker(marker) }}
                  />
                )
              })
            ) : (
            <MarkerClusterGroup
              chunkedLoading
              iconCreateFunction={clusterIcon}
              maxClusterRadius={mode === 'world' ? 60 : 40}
              disableClusteringAtZoom={mode === 'world' ? 16 : 5}
            >
              {visible.map(marker => {
                const isOpen = selectedMarker?.id === marker.id
                return (
                  <Marker
                    key={marker.id}
                    position={markerPosition(marker, mode)!}
                    icon={createMarkerIcon(marker.category, isOpen ? 30 : 24, isOpen)}
                    eventHandlers={{ click: () => openMarker(marker) }}
                  />
                )
              })}
            </MarkerClusterGroup>
            )}

            {/* approximate pins: dashed accuracy circle for the open marker (meters CRS: radius is in meters) */}
            {mode === 'meters' && selectedMarker && isApproximate(selectedMarker) && markerPosition(selectedMarker, mode) && (
              <Circle
                center={markerPosition(selectedMarker, mode)!}
                radius={Number(selectedMarker.accuracy_radius_m)}
                pathOptions={{ color: '#f5a623', weight: 1.5, dashArray: '6 6', fillColor: '#f5a623', fillOpacity: 0.08 }}
                interactive={false}
              />
            )}
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
