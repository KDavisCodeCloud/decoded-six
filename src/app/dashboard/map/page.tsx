import { createClient } from '@supabase/supabase-js'
import { DashboardMapClient } from './DashboardMapClient'
import type { MapMarker, MapArea } from '@/lib/types'
import type { MapLayer } from '@/lib/map-layers'
import type { QueueItem } from '@/components/map/MapReviewQueue'
import type { MapLead } from '@/lib/map-leads'

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

// Scraper HITL queue: pending scraper pins + their evidence rows (031).
async function getReviewQueue(): Promise<QueueItem[]> {
  const sb = serviceClient()
  const { data: rows } = await sb.from('map_markers')
    .select('id, name, category, description, county, x, y, accuracy_radius_m, confidence, independent_source_count, placement_method, created_at, lead:map_leads(id, name)')
    .eq('source_type', 'scraper').eq('status', 'pending')
    .order('confidence', { ascending: false, nullsFirst: false }).limit(200)
  // evidence-verified leads first (a real source answered a lead), then by confidence
  const items = ((rows ?? []) as unknown as Omit<QueueItem, 'sources'>[])
    .map(i => ({ ...i, lead: Array.isArray(i.lead) ? (i.lead[0] ?? null) : (i.lead ?? null) }))
    .sort((a, b) => Number(!!b.lead) - Number(!!a.lead))
  if (items.length === 0) return []
  const { data: src } = await sb.from('map_marker_sources')
    .select('marker_id, url, source_kind, author_id, evidence_quote, screenshot_url')
    .in('marker_id', items.map(i => i.id))
  const byMarker = new Map<string, QueueItem['sources']>()
  for (const s of src ?? []) {
    const list = byMarker.get(s.marker_id) ?? []
    list.push(s)
    byMarker.set(s.marker_id, list)
  }
  return items.map(i => ({ ...i, sources: byMarker.get(i.id) ?? [] }))
}

async function getLeads(): Promise<MapLead[]> {
  const { data } = await serviceClient().from('map_leads')
    .select('id, name, category, area, notes, status, search_count, last_searched_at, evidence_found_at, matched_marker_ids, created_at')
    .eq('product_id', 'gta-hub').order('created_at', { ascending: false }).limit(500)
  return (data as MapLead[] | null) ?? []
}

export const dynamic = 'force-dynamic'

export default async function DashboardMapPage() {
  const [{ markers, areas, layers }, queue, leads] = await Promise.all([getAllMapData(), getReviewQueue(), getLeads()])
  const linkedArticles = await getLinkedArticles(markers)

  return <DashboardMapClient markers={markers} areas={areas} layers={layers} linkedArticles={linkedArticles} queue={queue} leads={leads} />
}
