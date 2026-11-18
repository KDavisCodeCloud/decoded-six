import { createClient } from '@supabase/supabase-js'
import { DashboardMapClient } from './DashboardMapClient'
import type { MapMarker, MapArea } from '@/lib/types'
import type { MapLayer } from '@/lib/map-layers'

export const metadata = { title: 'Map Control — DecodedSix' }

// Service-role, server-only fetch (never reaches the browser bundle) --
// map_markers' RLS only allows public SELECT of status='published'
// (002_map_schema.sql), and this admin view needs every status. Rather than
// widen RLS to grant authenticated a blanket read of every marker (a bigger
// permanent security surface than this one admin page needs), the service
// role reads it here, server-side, gated by dashboard/layout.tsx's existing
// Supabase-auth redirect -- same shape as the map-marker review API route.
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getAllMapData() {
  const sb = serviceClient()
  const [{ data: markers }, { data: areas }, { data: layers }] = await Promise.all([
    // the 3,340 gtadb_import rows are the scraper's gazetteer, not pins to
    // review -- keep them out (they'd also blow past PostgREST's 1000-row cap)
    sb.from('map_markers').select('*')
      .or('source_type.is.null,source_type.neq.gtadb_import')
      .order('created_at', { ascending: false }).limit(1000),
    sb.from('map_areas').select('*').order('name', { ascending: true }),
    // same enabled-only set the public map gets, so the preview matches it
    sb.from('map_layers').select('*').eq('enabled', true).order('sort_order', { ascending: true }),
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
  const sb = serviceClient()
  const { data } = await sb.from('articles').select('id, slug, title, category').in('id', ids)
  const map: Record<string, { slug: string; title: string; category: string }> = {}
  for (const row of data ?? []) {
    map[row.id] = { slug: row.slug, title: row.title, category: row.category }
  }
  return map
}

export default async function DashboardMapPage() {
  const { markers, areas, layers } = await getAllMapData()
  const linkedArticles = await getLinkedArticles(markers)

  return <DashboardMapClient markers={markers} areas={areas} layers={layers} linkedArticles={linkedArticles} />
}
