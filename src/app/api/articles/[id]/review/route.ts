import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

type Action = 'approve' | 'reject' | 'revise' | 'unpublish'

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

  const body = await request.json() as { action: Action; notes?: string }
  const { action, notes } = body

  if (!['approve', 'reject', 'revise', 'unpublish'].includes(action)) {
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

  const now = new Date().toISOString()
  const reviewer = user.email ?? user.id

  let update: Record<string, string | null> = {
    hitl_reviewer: reviewer,
    hitl_reviewed_at: now,
  }

  let auditAction: string

  if (action === 'unpublish') {
    if (article.status !== 'published') {
      return NextResponse.json(
        { error: `Cannot unpublish article with status '${article.status}'` },
        { status: 409 },
      )
    }
    update = { ...update, status: 'archived' }
    auditAction = 'article_unpublished'
  } else {
    if (!['pending_review', 'needs_revision'].includes(article.status)) {
      return NextResponse.json(
        { error: `Cannot review article with status '${article.status}'` },
        { status: 409 },
      )
    }
    const pastTense: Record<string, string> = {
      approve: 'approved', reject: 'rejected', revise: 'revised',
    }
    auditAction = `article_${pastTense[action]}`

    if (action === 'approve') {
      update = { ...update, status: 'published', published_at: now }
    } else if (action === 'reject') {
      update = { ...update, status: 'archived' }
    } else {
      update = { ...update, status: 'needs_revision', hitl_notes: notes! }
    }
  }

  const { error } = await sb.from('articles').update(update).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await sb.from('audit_log').insert({
    agent_id: 'dsx-hitl-dashboard',
    action: auditAction,
    article_id: id,
    result: 'success',
    error: null,
  })

  // Additive: keeps the real hitl_queue row for this article in sync.
  // articles.status remains the source of truth for the dashboard UI —
  // this doesn't change that, it just stops hitl_queue from going stale
  // now that DSX-CA1's output_formatter creates a row here on entry.
  // 'revise'/'unpublish' don't map to hitl_queue's pending/approved/
  // rejected/held CHECK constraint, so only approve/reject resolve it;
  // a missing row (e.g. an article published before this existed) is not
  // an error — best-effort, matches this route's existing error handling.
  if (action === 'approve' || action === 'reject') {
    await sb
      .from('hitl_queue')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        action: auditAction,
        notes: notes ?? null,
        resolved_at: now,
      })
      .eq('article_id', id)
      .eq('status', 'pending')
  }

  return NextResponse.json({ success: true, article_id: id, action })
}
