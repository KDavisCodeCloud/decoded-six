import { NextResponse, type NextRequest } from 'next/server'
import { auditShort, currentReviewer, serviceClient } from '@/lib/shorts-server'

export const dynamic = 'force-dynamic'

// Adds a TikTok/YouTube account an approved short can be routed to. Handles
// only -- there is no auto-posting, so no tokens or passwords are ever stored.
export async function POST(request: NextRequest) {
  const reviewer = await currentReviewer()
  if (!reviewer) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as { platform?: string; handle?: string; label?: string }
  const platform = body.platform ?? 'tiktok'
  const handle = (body.handle ?? '').trim().replace(/^@?/, '@')

  if (!['tiktok', 'youtube'].includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }
  if (!/^@[A-Za-z0-9._-]{2,30}$/.test(handle)) {
    return NextResponse.json({ error: 'Enter a handle like @thedecodedsix' }, { status: 400 })
  }

  const sb = serviceClient()
  const { data, error } = await sb
    .from('ds_short_accounts')
    .upsert({ platform, handle, label: body.label?.trim() || null, active: true }, { onConflict: 'platform,handle' })
    .select('id, platform, handle, label')
    .single()
  if (error) {
    await auditShort(sb, null, 'short_account_added', 'failure', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await auditShort(sb, null, 'short_account_added', `success: ${platform} ${handle} by ${reviewer}`)
  return NextResponse.json({ account: data })
}
