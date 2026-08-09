import { NextResponse } from 'next/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SYSTEME_CONTACTS_URL = 'https://api.systeme.io/api/contacts'

// Allowlist, not free-form client input -- a source tag becomes a real
// systeme.io segment, so it's picked server-side from a known set rather
// than trusting whatever string the client sends.
const SOURCES = {
  article: 'decodedsix-article',
  aug27: 'decodedsix_aug27_waitlist',
} as const
type SourceKey = keyof typeof SOURCES

export async function POST(request: Request) {
  let email: string | undefined
  let sourceKey: SourceKey = 'article'

  try {
    const body = await request.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined
    if (typeof body?.source === 'string' && body.source in SOURCES) {
      sourceKey = body.source as SourceKey
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  const apiKey = process.env.SYSTEME_API_KEY
  if (!apiKey) {
    // Never block a signup in prod just because the integration isn't wired
    // yet — log and return success so the UI doesn't show a false failure.
    console.warn('SYSTEME_API_KEY not set — skipping systeme.io contact creation')
    return NextResponse.json({ success: true })
  }

  try {
    const res = await fetch(SYSTEME_CONTACTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        email,
        fields: [{ slug: 'source', value: SOURCES[sourceKey] }],
      }),
    })

    if (!res.ok) {
      // Never log the raw email — status/text only.
      console.error(`systeme.io contact creation failed: ${res.status} ${res.statusText}`)
      return NextResponse.json({ error: 'Signup failed, try again' }, { status: 500 })
    }
  } catch (err) {
    console.error('systeme.io contact creation threw:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Signup failed, try again' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
