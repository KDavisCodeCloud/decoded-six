import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'

type Action = 'approve' | 'reject' | 'revise' | 'unpublish'

// Listing pages (news/guides) only carried a 60s `revalidate` export with no
// event-driven invalidation anywhere in the codebase -- confirmed 2026-09-16
// there wasn't a single revalidatePath/revalidateTag call in the whole repo.
// Time-based ISR only refreshes on the NEXT request after the window elapses,
// so a low-traffic route (the bare /news index gets far less direct traffic
// than individual article permalinks or the homepage) can sit stale for far
// longer than the nominal window in practice -- this is what actually
// happened: /news was frozen for weeks even though the underlying data
// changed constantly, while the homepage (same 60s config, more real
// traffic) kept looking fresh. Firing this on every status change makes
// freshness event-driven instead of dependent on traffic hitting the route
// at the right moment.
//
// revalidatePath('/[locale]/news', 'layout') uses the literal bracket
// pattern Next.js matches against every locale value, not just 'en' --
// needed because next-intl's 'as-needed' prefix means the default locale
// has no prefix (/news) while every other locale does (/fr/news, /ja/news).
function revalidateArticleSurfaces(category: string, slug: string) {
  const listingSegment = category === 'guide' ? 'guides' : 'news'
  revalidatePath(`/${listingSegment}`)
  revalidatePath(`/[locale]/${listingSegment}`, 'layout')
  revalidatePath(`/${listingSegment}/${slug}`)
  revalidatePath(`/[locale]/${listingSegment}/[slug]`, 'layout')
  revalidatePath('/')
  revalidatePath('/[locale]', 'layout')
}

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
    .select('id, slug, status, category')
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
      // 'revision_in_progress' (not 'needs_revision') so the article leaves
      // the dashboard queue view immediately on click -- queue/page.tsx
      // only fetches status IN ('pending_review','needs_revision'). The
      // backend's revise agent moves it back to 'pending_review' (or
      // 'needs_revision' again if it still doesn't pass) when it finishes.
      update = { ...update, status: 'revision_in_progress', hitl_notes: notes! }
    }
  }

  const { error } = await sb.from('articles').update(update).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Only approve/reject/unpublish change what's publicly visible --
  // 'revise' just flips to revision_in_progress, nothing public changes.
  if (action === 'approve' || action === 'reject' || action === 'unpublish') {
    revalidateArticleSurfaces(article.category, article.slug)
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

  // Fire-and-forget: translate the article into all 7 supported locales
  // (Kelvin, 2026-08-07 — reach more people worldwide). Never blocks or
  // fails the approve response.
  //
  // The old comment here claimed "a failure here is still visible" in
  // ds_translate's own audit_log entries. That reasoning only holds if the
  // request actually reaches ds_translate. It did not: confirmed 2026-10-01
  // that DECODEDSIX_API_URL is set to an EMPTY STRING in Vercel production,
  // so triggerTranslation's `if (!apiUrl) return` guard made every approval
  // silently skip translation — no error, no log, no row. 8 published
  // articles ended up with no translations at all and 5 more partial, which
  // then surfaced as untranslated locale pages serving English. Awaiting it
  // is NOT the fix (that would block the reviewer on 7 LLM translations);
  // making the skip audible is.
  if (action === 'approve') {
    if (!process.env.DECODEDSIX_API_URL) {
      console.error(`[translate-trigger] DECODEDSIX_API_URL is unset/empty — translation SKIPPED for ${id}`)
      await sb.from('audit_log').insert({
        agent_id: 'dsx-hitl-dashboard',
        action: 'translate_trigger_skipped',
        article_id: id,
        result: 'failure',
        error: 'DECODEDSIX_API_URL unset or empty — article published untranslated',
      })
    } else {
      void triggerTranslation(id)
    }
  }

  // Trigger the actual revision agent. Unlike translation (which is a
  // nice-to-have after a successful publish), a failed trigger here can't
  // just be logged and dropped — the article was just moved to
  // 'revision_in_progress', which queue/page.tsx doesn't display at all, so
  // a silent failure would make the article vanish from the dashboard with
  // no agent ever actually running. If the trigger can't be sent (API URL
  // unset, backend unreachable), revert it to 'needs_revision' so it stays
  // visible and reviewable instead of stuck in an invisible status forever.
  //
  // AWAITED, not fire-and-forget. This was `void triggerRevision(...)`, which
  // meant the revert above was itself fire-and-forget: the response returned,
  // the serverless function terminated, and the pending revert never ran.
  // That is exactly what happened to gta-vi-album-november-19-launch-date on
  // 2026-09-23 21:06 — DECODEDSIX_API_URL was empty, the revert was queued and
  // dropped, and the article sat invisible in 'revision_in_progress' for nine
  // days. The whole point of the fallback is that it is guaranteed, so it has
  // to complete before the handler returns. It costs one fetch to the backend,
  // which already responds immediately (it queues the work in BackgroundTasks).
  if (action === 'revise') {
    await triggerRevision(id, sb, notes!)
  }

  return NextResponse.json({ success: true, article_id: id, action })
}

function triggerTranslation(articleId: string): Promise<void> {
  const apiUrl = process.env.DECODEDSIX_API_URL
  const apiKey = process.env.DECODEDSIX_API_KEY
  if (!apiUrl) return Promise.resolve()

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  return fetch(`${apiUrl}/api/translate/${articleId}`, { method: 'POST', headers })
    .then(() => undefined)
    .catch((err) => {
      console.error(`[translate-trigger] failed for article ${articleId}:`, err)
    })
}

async function triggerRevision(
  articleId: string,
  sb: SupabaseClient,
  hitlNotes: string,
): Promise<void> {
  const apiUrl = process.env.DECODEDSIX_API_URL
  const apiKey = process.env.DECODEDSIX_API_KEY

  const revert = (reason: string) =>
    sb.from('articles')
      .update({ status: 'needs_revision', hitl_notes: `${hitlNotes}\n\n[revision trigger failed: ${reason}]` })
      .eq('id', articleId)

  if (!apiUrl) {
    console.error(`[revise-trigger] DECODEDSIX_API_URL not set — reverting article ${articleId} to needs_revision`)
    await revert('backend URL not configured')
    return
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  try {
    const res = await fetch(`${apiUrl}/agents/decodedsix/revise/${articleId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ hitl_notes: hitlNotes }),
    })
    if (!res.ok) {
      console.error(`[revise-trigger] backend returned ${res.status} for article ${articleId}`)
      await revert(`backend returned ${res.status}`)
    }
  } catch (err) {
    console.error(`[revise-trigger] failed for article ${articleId}:`, err)
    await revert('backend unreachable')
  }
}
