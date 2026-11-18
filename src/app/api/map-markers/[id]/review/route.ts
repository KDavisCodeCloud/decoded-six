import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

// approve: staff approval. Scraper pins -> 'verified' (spec: staff approval
//          promotes), everything else keeps the original -> 'published'.
// reject:  scraper pins -> 'rejected' (remembered; the scraper never re-creates it).
// retire:  withdraw a live pin.
// move:    drag-to-move / place a "needs placement" item: { x, y } in gtadb meters.
type Action = 'approve' | 'retire' | 'reject' | 'move'
const WORLD_HALF_M = 16384

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    },
  )

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { action: Action; x?: number; y?: number }
  const { action } = body

  if (!['approve', 'retire', 'reject', 'move'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (action === 'move' && !(Number.isFinite(body.x) && Number.isFinite(body.y)
      && Math.abs(body.x!) <= WORLD_HALF_M && Math.abs(body.y!) <= WORLD_HALF_M)) {
    return NextResponse.json({ error: 'move needs x, y in gtadb meters' }, { status: 400 })
  }

  // Service role bypasses RLS -- same pattern as /api/articles/[id]/review.
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: marker } = await sb
    .from('map_markers')
    .select('id, name, status, source_type, x')
    .eq('id', id)
    .single()

  if (!marker) {
    return NextResponse.json({ error: 'Marker not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const update: Record<string, unknown> = { updated_at: now }
  if (action === 'approve') {
    if (marker.x == null && marker.source_type === 'scraper') {
      return NextResponse.json({ error: 'Place it on the map first (drag the pin), then approve' }, { status: 400 })
    }
    update.status = marker.source_type === 'scraper' ? 'verified' : 'published'
    update.last_confirmed = now
    if (marker.source_type === 'scraper') { update.verified = true; update.verified_at = now }
  } else if (action === 'reject') {
    update.status = 'rejected'
  } else if (action === 'retire') {
    update.status = 'retired'
  } else {
    Object.assign(update, { x: body.x, y: body.y, frame: 'gtadb_world', placement_method: 'hitl_manual', accuracy_radius_m: 50 })
  }
  const newStatus = (update.status as string | undefined) ?? marker.status

  const { error } = await sb
    .from('map_markers')
    .update(update)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await sb.from('audit_log').insert({
    agent_id: 'dsx-hitl-dashboard',
    action: `map_marker_${action === 'approve' ? 'approved' : action === 'retire' ? 'retired' : action === 'reject' ? 'rejected' : 'moved'}`,
    marker_id: id,
    result: action === 'move' ? `success: moved to ${body.x},${body.y}` : `success: ${newStatus}`,
    error: null,
  })

  return NextResponse.json({ success: true, marker_id: id, action, status: newStatus, x: body.x, y: body.y })
}
