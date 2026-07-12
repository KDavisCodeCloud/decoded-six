import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

type Action = 'approve' | 'reject' | 'revise'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Verify authenticated session from cookie
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

  const body = await request.json() as { action: Action; notes?: string }
  const { action, notes } = body

  if (!['approve', 'reject', 'revise'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (action === 'revise' && !notes?.trim()) {
    return NextResponse.json({ error: 'Revision notes required' }, { status: 400 })
  }

  // Service role key bypasses RLS — only used server-side here
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: article } = await sb
    .from('articles')
    .select('id, slug, status')
    .eq('id', id)
    .single()

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 })
  }

  if (!['pending_review', 'needs_revision'].includes(article.status)) {
    return NextResponse.json(
      { error: `Cannot review article with status '${article.status}'` },
      { status: 409 },
    )
  }

  const now = new Date().toISOString()
  const reviewer = user.email ?? user.id

  let update: Record<string, string | null> = {
    hitl_reviewer: reviewer,
    hitl_reviewed_at: now,
  }

  if (action === 'approve') {
    update = { ...update, status: 'published', published_at: now }
  } else if (action === 'reject') {
    update = { ...update, status: 'archived' }
  } else {
    update = { ...update, status: 'needs_revision', hitl_notes: notes! }
  }

  const { error } = await sb.from('articles').update(update).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await sb.from('audit_log').insert({
    agent_id: 'dsx-hitl-dashboard',
    action: `article_${action}d`,
    article_id: id,
    result: 'success',
    error: null,
  })

  return NextResponse.json({ success: true, article_id: id, action })
}
