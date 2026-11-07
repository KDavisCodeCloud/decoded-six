import { NextResponse } from 'next/server'
import { currentReviewer, serviceClient, SHORTS_BUCKET, SIGNED_URL_SECONDS } from '@/lib/shorts-server'

// Every status change has to show on the next fetch -- no caching of any kind
// (the Sep 24 ISR stale-queue bug).
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await currentReviewer())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sb = serviceClient()

  const [{ data: shorts, error }, { data: accounts }] = await Promise.all([
    sb.from('ds_shorts')
      .select('*, tiktok_account:ds_short_accounts(id, handle, label), linked_article:articles(slug, title, category)')
      .order('post_date', { ascending: true }),
    sb.from('ds_short_accounts')
      .select('id, platform, handle, label')
      .eq('active', true)
      .order('created_at', { ascending: true }),
  ])
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mint playback URLs only for files that still exist (retention may have
  // removed posted ones).
  const paths = (shorts ?? [])
    .filter(s => s.storage_path && !s.storage_deleted_at)
    .map(s => s.storage_path as string)
  const urls: Record<string, string> = {}
  if (paths.length) {
    const { data: signed } = await sb.storage.from(SHORTS_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS)
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urls[s.path] = s.signedUrl
    }
  }

  return NextResponse.json(
    {
      shorts: (shorts ?? []).map(s => ({ ...s, video_url: s.storage_path ? urls[s.storage_path] ?? null : null })),
      accounts: accounts ?? [],
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
