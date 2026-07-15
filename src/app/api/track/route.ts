import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Self-hosted pageview beacon — no PII, no third-party analytics. session_id
// is a random client-generated token with no identity behind it.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, path, referrer, utmSource, utmMedium, utmCampaign } = body as {
      sessionId?: string
      path?: string
      referrer?: string
      utmSource?: string
      utmMedium?: string
      utmCampaign?: string
    }

    if (!sessionId || typeof sessionId !== 'string' || !path || typeof path !== 'string') {
      return NextResponse.json({ error: 'sessionId and path required' }, { status: 400 })
    }

    const db = getAdminClient()
    await db.from('visitor_sessions').insert({
      product_id: 'gta-hub',
      session_id: sessionId.slice(0, 64),
      path: path.slice(0, 500),
      referrer: referrer?.slice(0, 500) || null,
      utm_source: utmSource?.slice(0, 200) || null,
      utm_medium: utmMedium?.slice(0, 200) || null,
      utm_campaign: utmCampaign?.slice(0, 200) || null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Never let tracking failures surface to the visitor
    return NextResponse.json({ ok: false })
  }
}
