import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dashboardUser } from '@/lib/dashboard-auth'

// Mission Control card: latest twice-daily Vercel usage check vs Hobby limits
// (src/agents/ops/vercel_usage.py, migration 038; service-role only).
function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function GET() {
  if (!(await dashboardUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await db().from('vercel_usage_checks')
    .select('id, checked_at, trigger, threshold_pct, metrics, unavailable, alerts, max_pct, error, acknowledged_at')
    .eq('product_id', 'gta-hub').order('checked_at', { ascending: false }).limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ latest: data?.[0] ?? null })
}

// Acknowledge the alert on a check: POST { id }
export async function POST(request: Request) {
  const user = await dashboardUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const sb = db()
  const { error } = await sb.from('vercel_usage_checks')
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user.email ?? user.id }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await sb.from('audit_log').insert({ agent_id: `hitl:${user.email ?? user.id}`, action: 'vercel_usage_alert_acknowledged', result: id })
  return NextResponse.json({ ok: true })
}
