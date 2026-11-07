import { NextResponse, type NextRequest } from 'next/server'
import { auditShort, currentReviewer, serviceClient } from '@/lib/shorts-server'

export const dynamic = 'force-dynamic'

type Action = 'approve' | 'revise' | 'reject' | 'mark_posted'

interface Body {
  action: Action
  notes?: string
  // approve
  tiktok_account_id?: string
  // revise: edited script; any field left out keeps its current value
  hook?: string
  voiceover?: string
  post_caption?: string
  hashtags?: string
  // mark_posted
  platform?: 'tiktok' | 'youtube'
  url?: string
}

// Which statuses each action may start from. Mirrors the article review
// route's 409 on an out-of-order click (e.g. a second tab).
const FROM: Record<Action, string[]> = {
  approve: ['pending_review'],
  revise: ['pending_review', 'approved', 'rejected'],
  reject: ['pending_review', 'needs_revision', 'approved'],
  mark_posted: ['approved', 'scheduled', 'posted'],
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const reviewer = await currentReviewer()
  if (!reviewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as Body
  const { action } = body
  if (!(action in FROM)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const sb = serviceClient()
  const { data: short } = await sb
    .from('ds_shorts')
    .select('id, status, day_number, tiktok_posted_at, youtube_posted_at')
    .eq('id', id)
    .single()
  if (!short) {
    return NextResponse.json({ error: 'Short not found' }, { status: 404 })
  }
  if (!FROM[action].includes(short.status)) {
    return NextResponse.json(
      { error: `Cannot ${action.replace('_', ' ')} a short with status '${short.status}'` },
      { status: 409 },
    )
  }

  const now = new Date().toISOString()
  const notes = body.notes?.trim()
  let update: Record<string, string | null> = { reviewed_by: reviewer, reviewed_at: now }

  if (action === 'approve') {
    if (!body.tiktok_account_id) {
      return NextResponse.json({ error: 'Pick the TikTok account this video goes to' }, { status: 400 })
    }
    const { data: account } = await sb
      .from('ds_short_accounts')
      .select('id')
      .eq('id', body.tiktok_account_id)
      .eq('platform', 'tiktok')
      .single()
    if (!account) {
      return NextResponse.json({ error: 'TikTok account not found' }, { status: 400 })
    }
    // local_delivered_at reset: approvals_sync.py (owner's PC) picks this up
    // and drops the video in the approvals folder, including a re-approved cut.
    update = {
      ...update, status: 'approved', tiktok_account_id: account.id, reviewer_notes: notes || null,
      local_delivered_at: null, local_path: null,
    }
  } else if (action === 'reject') {
    if (!notes) {
      return NextResponse.json({ error: 'Rejection needs a note' }, { status: 400 })
    }
    update = { ...update, status: 'rejected', reviewer_notes: notes }
  } else if (action === 'revise') {
    const edits: Record<string, string> = {}
    for (const k of ['hook', 'voiceover', 'post_caption', 'hashtags'] as const) {
      const v = body[k]?.trim()
      if (v) edits[k] = v
    }
    if (!notes && !Object.keys(edits).length) {
      return NextResponse.json({ error: 'Add a note or edit the script' }, { status: 400 })
    }
    if (edits.hook) edits.hook = edits.hook.toUpperCase()
    // needs_revision is what the factory re-renders (make_videos.py --from-db).
    update = { ...update, ...edits, status: 'needs_revision', reviewer_notes: notes || 'Script edited in dashboard' }
  } else {
    const platform = body.platform
    if (platform !== 'tiktok' && platform !== 'youtube') {
      return NextResponse.json({ error: 'Pick TikTok or YouTube' }, { status: 400 })
    }
    const url = body.url?.trim() || null
    if (url && !/^https:\/\/(www\.|m\.|vm\.)?(tiktok\.com|youtube\.com|youtu\.be)\//.test(url)) {
      return NextResponse.json({ error: 'That doesn\'t look like a TikTok or YouTube link' }, { status: 400 })
    }
    update = { ...update, [`${platform}_posted_at`]: now, [`${platform}_url`]: url }
    const tiktokDone = platform === 'tiktok' || !!short.tiktok_posted_at
    const youtubeDone = platform === 'youtube' || !!short.youtube_posted_at
    // 'scheduled' = out on one platform; 'posted' = both (starts the 14-day
    // storage retention clock).
    update.status = tiktokDone && youtubeDone ? 'posted' : 'scheduled'
  }

  const { error } = await sb.from('ds_shorts').update(update).eq('id', id)
  if (error) {
    await auditShort(sb, id, `short_${action}`, 'failure', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await auditShort(sb, id, `short_${action}`, `success: day ${short.day_number} ${short.status} -> ${update.status} by ${reviewer}`)
  return NextResponse.json({ ok: true, status: update.status })
}
