'use client'

import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { AnimatePresence, motion } from 'framer-motion'
import { tileUrl, GTADB_FRAME, GTADB_LANDMARKS_ATTRIBUTION, type LayerAttribution, type MapLayer } from '@/lib/map-layers'

// 1x1 transparent GIF: tiles outside the layer's tile_ranges never hit the
// network, the map background (the layer's ocean colour) shows through.
const EMPTY_TILE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/**
 * Custom tile layer for map_layers rows: gtadb names tiles {z},{y},{x}.jpg and
 * only ships tiles that touch land, so getTileUrl maps through tileUrl() and
 * skips everything outside the per-zoom tile ranges.
 */
const RangedTileLayer = L.TileLayer.extend({
  initialize(this: L.TileLayer & { _ds: MapLayer }, layer: MapLayer, options: L.TileLayerOptions) {
    this._ds = layer
    ;(L.TileLayer.prototype as unknown as { initialize: (url: string, o: L.TileLayerOptions) => void })
      .initialize.call(this, '', options)
  },
  getTileUrl(this: L.TileLayer & { _ds: MapLayer; _getZoomForUrl: () => number }, c: L.Coords) {
    return tileUrl(this._ds, this._getZoomForUrl(), c.x, c.y) ?? EMPTY_TILE
  },
}) as unknown as new (layer: MapLayer, options: L.TileLayerOptions) => L.TileLayer

export function BaseLayer({ layer }: { layer: MapLayer }) {
  const map = useMap()

  useEffect(() => {
    const tl = new RangedTileLayer(layer, {
      tileSize: 256,
      noWrap: true,
      // phones zoom out one level past the tile set to fit the island; Leaflet scales the min-zoom tiles down
      minZoom: Math.min(layer.min_zoom, -1),
      minNativeZoom: layer.min_zoom,
      maxNativeZoom: layer.max_native_zoom,
      maxZoom: layer.max_zoom,
      errorTileUrl: EMPTY_TILE,
      keepBuffer: 4,
    })
    tl.addTo(map)
    map.getContainer().style.background = layer.background_color
    return () => { tl.remove() }
  }, [map, layer])

  return null
}

/** Map-corner switcher between enabled base layers (only renders with 2+). */
export function LayerSwitcher({
  layers, activeId, onChange,
}: { layers: MapLayer[]; activeId: string; onChange: (id: string) => void }) {
  if (layers.length < 2) return null
  return (
    <div
      role="radiogroup"
      aria-label="Base map"
      className="absolute top-3 right-3 z-[1000] flex flex-col gap-1 rounded-xl border border-white/[0.08] bg-void/85 p-1.5 backdrop-blur-sm"
    >
      {layers.map(l => {
        const active = l.id === activeId
        return (
          <button
            key={l.id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(l.id)}
            className={`min-h-[44px] rounded-lg px-3 text-left text-xs transition-colors ${
              active ? 'bg-flame/15 text-flame' : 'text-quiet hover:bg-white/[0.05] hover:text-bright'
            }`}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}

/** Collapsible sidebar credits: every enabled layer's attribution + Leaflet. */
function Credit({ label, a }: { label: string; a: LayerAttribution }) {
  return (
    <li className="mt-2">
      <span className="text-bright">{label}:</span>{' '}
      {a.url ? <a href={a.url} target="_blank" rel="noopener" className="underline decoration-white/20 hover:text-flame">{a.text}</a> : a.text}
      {a.license_url && (
        <> · <a href={a.license_url} target="_blank" rel="noopener license" className="underline decoration-white/20 hover:text-flame">license</a></>
      )}
      {a.adapted && <> · adapted</>}
    </li>
  )
}

export function MapCredits({ layers }: { layers: MapLayer[] }) {
  const [open, setOpen] = useState(false)
  const gtadbFrame = layers.some(l => l.frame === GTADB_FRAME)
  return (
    <section className="rounded-xl border border-white/[0.06] bg-panel">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between px-3 text-[11px] font-mono uppercase tracking-widest text-quiet hover:text-bright"
      >
        Map credits
        <span aria-hidden className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="overflow-hidden px-3 pb-3 text-[11px] leading-relaxed text-quiet"
          >
            {layers.flatMap(l => l.attribution.map((a, i) => <Credit key={`${l.id}-${i}`} label={l.label} a={a} />))}
            {gtadbFrame && <Credit label="County labels, region outlines (approx.) & positions" a={GTADB_LANDMARKS_ATTRIBUTION} />}
            <li className="mt-2">Map icons © Rockstar Games. Some category pins: <a href="https://fonts.google.com/icons" target="_blank" rel="noopener" className="underline decoration-white/20 hover:text-flame">Material Symbols</a> by Google (Apache 2.0)</li>
            <li className="mt-2">
              <a href="https://leafletjs.com" target="_blank" rel="noopener" className="underline decoration-white/20 hover:text-flame">Leaflet</a> (BSD-2-Clause)
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  )
}
