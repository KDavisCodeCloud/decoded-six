import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dashboardUser } from '@/lib/dashboard-auth'
import { MAP_CATEGORIES } from '@/lib/map-categories'
import { parseLeadLines } from '@/lib/map-leads'

// Map Phase 3b -- Leads (dashboard only).
// GET   -> leads, newest first
// POST  { text }               bulk paste, one lead per line (see parseLeadLines)
// PATCH { id, status }         close / reopen a lead
// A lead never carries coordinates and is never evidence; the scraper only
// uses it to decide what to search for first.

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

const COLUMNS = 'id, name, category, area, notes, status, search_count, last_searched_at, evidence_found_at, matched_marker_ids, created_at'

export async function GET() {
  if (!(await dashboardUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await db().from('map_leads').select(COLUMNS)
    .eq('product_id', 'gta-hub').order('created_at', { ascending: false }).limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads: data ?? [] })
}

export async function POST(request: NextRequest) {
  const user = await dashboardUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body || typeof body.text !== 'string') {
    return NextResponse.json({ error: 'expected { text }' }, { status: 400 })
  }
  const parsed = parseLeadLines(body.text.slice(0, 50_000), MAP_CATEGORIES)
  const sb = db()
  let inserted: { id: string }[] = []
  if (parsed.leads.length) {
    // re-pasting the same list is a no-op: skip leads that already exist
    // (uq_map_leads_open_name is the backstop for a concurrent paste)
    const keyOf = (l: { name: string; category: string | null; area: string | null }) =>
      `${l.name.trim().toLowerCase()}|${l.category ?? ''}|${(l.area ?? '').trim().toLowerCase()}`
    const { data: existing, error: exErr } = await sb.from('map_leads').select('name, category, area')
      .eq('product_id', 'gta-hub').in('name', parsed.leads.map(l => l.name))
    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 })
    const have = new Set((existing ?? []).map(keyOf))
    const fresh = parsed.leads.filter(l => !have.has(keyOf(l)))
    if (fresh.length) {
      const { data, error } = await sb.from('map_leads')
        .insert(fresh.map(l => ({ ...l, created_by: user.email ?? user.id }))).select('id')
      if (error) return NextResponse.json({ error: error.message, errors: parsed.errors }, { status: 500 })
      inserted = data ?? []
    }
  }
  await sb.from('audit_log').insert({
    agent_id: `hitl:${user.email ?? user.id}`, action: 'map_leads_added',
    result: `added ${inserted.length} of ${parsed.leads.length} parsed; ${parsed.errors.length} line errors`,
  })
  return NextResponse.json({ added: inserted.length, parsed: parsed.leads.length, errors: parsed.errors })
}

export async function PATCH(request: NextRequest) {
  const user = await dashboardUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null)
  const status = body?.status
  if (!body?.id || typeof body.id !== 'string' || !['open', 'closed'].includes(status)) {
    return NextResponse.json({ error: "expected { id, status: 'open' | 'closed' }" }, { status: 400 })
  }
  const sb = db()
  const { data, error } = await sb.from('map_leads')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', body.id).select(COLUMNS).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await sb.from('audit_log').insert({
    agent_id: `hitl:${user.email ?? user.id}`, action: `map_lead_${status === 'closed' ? 'closed' : 'reopened'}`,
    result: `lead ${body.id}`,
  })
  return NextResponse.json({ lead: data })
}
