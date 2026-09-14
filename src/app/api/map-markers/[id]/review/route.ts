import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

type Action = 'approve' | 'retire'

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

  const body = await request.json() as { action: Action }
  const { action } = body

  if (!['approve', 'retire'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Service role bypasses RLS -- same pattern as /api/articles/[id]/review.
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: marker } = await sb
    .from('map_markers')
    .select('id, name, status')
    .eq('id', id)
    .single()

  if (!marker) {
    return NextResponse.json({ error: 'Marker not found' }, { status: 404 })
  }

  const newStatus = action === 'approve' ? 'published' : 'retired'
  const now = new Date().toISOString()

  const update: Record<string, string> = { status: newStatus, updated_at: now }
  if (action === 'approve') update.last_confirmed = now

  const { error } = await sb
    .from('map_markers')
    .update(update)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await sb.from('audit_log').insert({
    agent_id: 'dsx-hitl-dashboard',
    action: action === 'approve' ? 'map_marker_approved' : 'map_marker_retired',
    marker_id: id,
    result: 'success',
    error: null,
  })

  return NextResponse.json({ success: true, marker_id: id, action, status: newStatus })
}
