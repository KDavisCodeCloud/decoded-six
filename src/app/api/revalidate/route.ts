import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { pingIndexNow } from '@/lib/indexnow'

// Server-to-server revalidation for content edits made outside the dashboard
// review route -- today that is scripts/guide_screenshot_dropin.py swapping
// Kelvin's console captures into a PUBLISHED guide (2026-11-23). Bearer
// DECODEDSIX_API_KEY (the same shared secret Vercel already uses to call the
// backend). Only article slugs are accepted, never arbitrary paths, and the
// article must exist and be published.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thedecodedsix.com'

export async function POST(request: NextRequest) {
  const key = process.env.DECODEDSIX_API_KEY
  if (!key || request.headers.get('authorization') !== `Bearer ${key}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { slug } = (await request.json()) as { slug?: string }
  if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug)) {
    return NextResponse.json({ error: 'slug required' }, { status: 400 })
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: article } = await sb.from('articles').select('id, slug, category, status').eq('slug', slug).single()
  if (!article || article.status !== 'published') {
    return NextResponse.json({ error: 'not a published article' }, { status: 404 })
  }
  const section = article.category === 'guide' ? 'guides' : 'news'
  revalidatePath(`/${section}/${slug}`)
  revalidatePath(`/[locale]/${section}/[slug]`, 'layout')
  revalidatePath('/sitemap.xml')
  await pingIndexNow(sb, [`${siteUrl}/${section}/${slug}`], article.id)
  await sb.from('audit_log').insert({
    agent_id: 'dsx-revalidate', action: 'article_revalidated', article_id: article.id, result: 'success', error: null,
  })
  return NextResponse.json({ revalidated: `/${section}/${slug}` })
}
