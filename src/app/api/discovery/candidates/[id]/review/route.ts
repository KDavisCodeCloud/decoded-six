import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

type Action = 'approve' | 'reject'

interface DiscoveryItemRow {
  id: string
  title: string
  url: string
  snippet: string | null
  source_id: string
}

interface SourceRow {
  id: string
  name: string
  default_tier: number
}

function buildFactBrief(
  angle: string,
  itemIds: string[],
  items: DiscoveryItemRow[],
  sources: Record<string, SourceRow>,
): string {
  const lines = [`What's new versus DecodedSix's existing coverage: ${angle}`, '', 'Sources:']
  for (const id of itemIds) {
    const item = items.find(i => i.id === id)
    if (!item) continue
    const source = sources[item.source_id]
    const tier = source ? `Tier ${source.default_tier}` : 'Tier 3'
    lines.push(`- [${tier} — ${source?.name ?? 'unknown source'}] ${item.title} — ${item.url}`)
    if (item.snippet) lines.push(`  ${item.snippet.slice(0, 300)}`)
  }
  return lines.join('\n')
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

  const body = await request.json() as { action: Action; edited_topic?: string; notes?: string }
  const { action, edited_topic, notes } = body

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: candidate } = await sb
    .from('topic_candidates')
    .select('*')
    .eq('id', id)
    .single()

  if (!candidate) {
    return NextResponse.json({ error: 'Candidate not found' }, { status: 404 })
  }
  if (candidate.status !== 'proposed') {
    return NextResponse.json(
      { error: `Cannot review candidate with status '${candidate.status}'` },
      { status: 409 },
    )
  }

  const now = new Date().toISOString()
  const reviewer = user.email ?? user.id

  if (action === 'reject') {
    await sb.from('topic_candidates').update({
      status: 'rejected',
      rejected_reason: notes ?? null,
      reviewed_by: reviewer,
      reviewed_at: now,
    }).eq('id', id)

    return NextResponse.json({ success: true, id, action })
  }

  // Approve: build the fact_brief the writer will actually use, then insert
  // into topic_queue -- the real handoff point content_agent.py's
  // fact_brief param has needed since 2026-09-02 with nothing wiring it up.
  const finalTopic = edited_topic?.trim() || candidate.topic

  const itemIds: string[] = candidate.source_item_ids ?? []
  const { data: items } = await sb
    .from('discovery_items')
    .select('id, title, url, snippet, source_id')
    .in('id', itemIds.length > 0 ? itemIds : ['00000000-0000-0000-0000-000000000000'])

  const sourceIds = [...new Set((items ?? []).map((i: DiscoveryItemRow) => i.source_id))]
  const { data: sourceRows } = await sb
    .from('discovery_sources')
    .select('id, name, default_tier')
    .in('id', sourceIds.length > 0 ? sourceIds : ['00000000-0000-0000-0000-000000000000'])

  const sourcesById: Record<string, SourceRow> = {}
  for (const s of sourceRows ?? []) sourcesById[s.id] = s

  const factBrief = buildFactBrief(candidate.angle, itemIds, (items ?? []) as DiscoveryItemRow[], sourcesById)

  const { error: queueError } = await sb.from('topic_queue').insert({
    product_id: 'gta-hub',
    candidate_id: id,
    topic: finalTopic,
    fact_brief: factBrief,
    article_type: candidate.suggested_article_type || 'news',
    template_variant: candidate.suggested_template_variant,
    update_of: candidate.update_of,
    status: 'queued',
  })

  if (queueError) {
    return NextResponse.json({ error: queueError.message }, { status: 500 })
  }

  await sb.from('topic_candidates').update({
    status: 'approved',
    reviewed_by: reviewer,
    reviewed_at: now,
  }).eq('id', id)

  return NextResponse.json({ success: true, id, action })
}
