import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dashboardUser } from '@/lib/dashboard-auth'

// Mission Control card: latest map scraper runs, open map alerts, queue sizes.
// map_scrape_runs / map_alerts are service-role only (migrations 031/032).
export async function GET() {
  if (!(await dashboardUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const scraped = () => db.from('map_markers').select('id', { count: 'exact', head: true }).eq('source_type', 'scraper')
  const [runs, alerts, pending, held, live] = await Promise.all([
    db.from('map_scrape_runs')
      .select('id, trigger, started_at, finished_at, status, fetched, new_items, extracted, placed, auto_published, queued, held, merged, dropped, blocklist_hits, source_errors, error')
      .order('started_at', { ascending: false }).limit(5),
    db.from('map_alerts').select('id, kind, severity, title, detail, created_at')
      .is('acknowledged_at', null).order('created_at', { ascending: false }).limit(10),
    scraped().eq('status', 'pending'),
    scraped().eq('status', 'held'),
    scraped().in('status', ['community_reported', 'verified']),
  ])
  if (runs.error) return NextResponse.json({ error: runs.error.message }, { status: 500 })
  return NextResponse.json({
    runs: runs.data ?? [],
    alerts: alerts.data ?? [],
    queue: { pending: pending.count ?? 0, held: held.count ?? 0, live: live.count ?? 0 },
  })
}

// Acknowledge an alert: POST { id }
export async function POST(request: Request) {
  if (!(await dashboardUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json() as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await db.from('map_alerts').update({ acknowledged_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await db.from('audit_log').insert({ agent_id: 'dsx-hitl-dashboard', action: 'map_alert_acknowledged', result: id })
  return NextResponse.json({ ok: true })
}
