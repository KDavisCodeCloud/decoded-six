import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// visitor_sessions tracking started 2026-07-14 — counts before that date
// don't exist and never will. Low numbers here reflect that, not a bug.
const TRACKING_STARTED = '2026-07-14'

export async function GET() {
  const db = getAdminClient()
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setUTCHours(0, 0, 0, 0)
  const weekStart = new Date(now.getTime() - 7 * 86400000)

  const { data: weekRows, error } = await db
    .from('visitor_sessions')
    .select('session_id, path, created_at')
    .eq('product_id', 'gta-hub')
    .gte('created_at', weekStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = weekRows ?? []
  const todayRows = rows.filter(r => new Date(r.created_at) >= todayStart)

  const pageCounts = new Map<string, number>()
  for (const r of rows) {
    pageCounts.set(r.path, (pageCounts.get(r.path) ?? 0) + 1)
  }
  const topPages = [...pageCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, views]) => ({ path, views }))

  return NextResponse.json({
    trackingStarted: TRACKING_STARTED,
    pageviewsToday: todayRows.length,
    uniqueSessionsToday: new Set(todayRows.map(r => r.session_id)).size,
    pageviewsThisWeek: rows.length,
    uniqueSessionsThisWeek: new Set(rows.map(r => r.session_id)).size,
    topPages,
  })
}
