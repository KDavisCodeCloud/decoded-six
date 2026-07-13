import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  // Auth check — dashboard only
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

  const body = await request.json() as {
    agent: string
    article_type?: string
    topic_seed?: string
  }

  const apiUrl  = process.env.DECODEDSIX_API_URL
  const apiKey  = process.env.DECODEDSIX_API_KEY

  if (!apiUrl) {
    return NextResponse.json({ error: 'DECODEDSIX_API_URL not configured' }, { status: 503 })
  }

  if (body.agent === 'dsx-ca1') {
    const articleType = body.article_type ?? 'news'
    if (!['news', 'evergreen', 'conversion'].includes(articleType)) {
      return NextResponse.json({ error: 'Invalid article_type' }, { status: 400 })
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['X-API-Key'] = apiKey

    const upstream = await fetch(`${apiUrl}/agents/decodedsix/content`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        article_type: articleType,
        topic_seed: body.topic_seed?.trim() ?? '',
      }),
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return NextResponse.json(
        { error: `Agent returned ${upstream.status}: ${text.slice(0, 200)}` },
        { status: 502 },
      )
    }

    const result = await upstream.json()
    return NextResponse.json({ queued: true, agent: 'dsx-ca1', article_type: articleType, result })
  }

  return NextResponse.json({ error: `Unknown agent: ${body.agent}` }, { status: 400 })
}
