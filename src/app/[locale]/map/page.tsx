import { PUBLIC_MARKER_STATUSES } from '@/lib/map-categories'
import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MapPlaceholder } from '@/components/map/MapPlaceholder'
import { SubmitLocationForm } from '@/components/map/SubmitLocationForm'
import { MapPageClient } from './MapPageClient'
import { supabase } from '@/lib/supabase'
import { unlocalizedAlternates } from '@/lib/seo'
import type { MapMarker, MapArea } from '@/lib/types'
import type { MapLayer } from '@/lib/map-layers'

export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'GTA 6 Interactive Map',
    description: 'An interactive map of the GTA 6 world — locations, points of interest, and areas confirmed so far.',
    alternates: unlocalizedAlternates('/map'),
  }
}

// map_layers is read per request (RLS: enabled rows only), so pulling a layer
// -- e.g. UPDATE map_layers SET enabled = false WHERE id = 'community' -- takes
// effect without a redeploy.
// published (staff + named gtadb places) + community_reported (scraper
// auto-publish) + verified. ~950 rows at launch and growing, so page past
// PostgREST's 1000-row cap.
async function getPublicMarkers(): Promise<{ data: MapMarker[] }> {
  const PAGE = 1000
  const out: MapMarker[] = []
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await supabase
      .from('map_markers')
      .select('*')
      .in('status', [...PUBLIC_MARKER_STATUSES])
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`map markers page ${from}: ${error.message}`)
    out.push(...((data as MapMarker[] | null) ?? []))
    if (!data || data.length < PAGE) break
  }
  return { data: out }
}

async function getMapData() {
  const [{ data: markers }, { data: areas }, { data: layers }] = await Promise.all([
    getPublicMarkers(),
    supabase
      .from('map_areas')
      .select('*')
      .order('name', { ascending: true }),
    supabase
      .from('map_layers')
      .select('id, label, kind, frame, tile_url_template, min_zoom, max_native_zoom, max_zoom, tile_ranges, background_color, attribution, source_ref, is_default, sort_order')
      .eq('enabled', true)
      .order('sort_order', { ascending: true }),
  ])
  return {
    markers: (markers as MapMarker[] | null) ?? [],
    areas: (areas as MapArea[] | null) ?? [],
    layers: (layers as MapLayer[] | null) ?? [],
  }
}

async function getLinkedArticles(markers: MapMarker[]) {
  const ids = [...new Set(markers.map(m => m.linked_article_id).filter((id): id is string => !!id))]
  if (ids.length === 0) return {}
  const { data } = await supabase
    .from('articles')
    .select('id, slug, title, category')
    .in('id', ids)
  const map: Record<string, { slug: string; title: string; category: string }> = {}
  for (const row of data ?? []) {
    map[row.id] = { slug: row.slug, title: row.title, category: row.category }
  }
  return map
}

function parseNumber(v: string | string[] | undefined): number | undefined {
  if (typeof v !== 'string') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const mapLive = process.env.NEXT_PUBLIC_MAP_LIVE === 'true'

  if (!mapLive) {
    return (
      <>
        <Header />
        <main className="container py-16 flex flex-col gap-8">
          <MapPlaceholder />
          <div className="max-w-lg mx-auto w-full">
            <SubmitLocationForm mapLive={false} pickedCoords={null} />
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const { markers, areas, layers } = await getMapData()
  const linkedArticles = await getLinkedArticles(markers)

  const initialMarkerId = typeof params.marker === 'string' ? params.marker : undefined
  // game-world layers deep-link in meters (?x=&y=&z=); the legacy real-world
  // map keeps ?lat=&lng=&z=. LatLng in the meter CRS is [y, x].
  const zoom = parseNumber(params.z)
  const lat = layers.length > 0 ? parseNumber(params.y) : parseNumber(params.lat)
  const lng = layers.length > 0 ? parseNumber(params.x) : parseNumber(params.lng)
  const initialView = lat !== undefined && lng !== undefined && zoom !== undefined
    ? { lat, lng, zoom }
    : undefined

  return (
    <>
      <Header />
      <main className="container py-8 flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-0.5 h-5 bg-flame rounded-full" />
          <h1 className="font-heading font-bold text-lg text-bright uppercase tracking-widest">
            Interactive Map
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            <span className="text-xs font-mono text-quiet">
              {markers.length} locations live
            </span>
          </div>
        </div>

        <MapPageClient
          markers={markers}
          areas={areas}
          layers={layers}
          linkedArticles={linkedArticles}
          initialMarkerId={initialMarkerId}
          initialView={initialView}
        />
      </main>
      <Footer />
    </>
  )
}
