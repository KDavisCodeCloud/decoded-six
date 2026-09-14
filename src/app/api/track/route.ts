import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { computeSessionId, classifyDevice, classifyReferrerSource, matchBotName } from '@/lib/analytics'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const DEDUPE_WINDOW_MS = 30_000

// Belt-and-suspenders: PageviewBeacon.tsx already excludes these prefixes
// client-side, but this route shouldn't trust that -- anything could POST
// here directly.
const IGNORED_PATH_PREFIXES = ['/dashboard', '/api']

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}

// Self-hosted, first-party pageview tracker. No third-party analytics, no
// cookies, no IP ever stored -- see src/lib/analytics.ts for the session-id
// hash and src/components/shared/PageviewBeacon.tsx for the client side.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { path?: string; referrer?: string } | null
    const path = body?.path
    if (!path || typeof path !== 'string') {
      return NextResponse.json({ ok: false, error: 'path required' }, { status: 400 })
    }
    if (IGNORED_PATH_PREFIXES.some(p => path.startsWith(p))) {
      return NextResponse.json({ ok: true, skipped: 'ignored_path' })
    }

    const userAgent = request.headers.get('user-agent') ?? ''
    const ip = clientIp(request)
    const db = getAdminClient()

    const botName = matchBotName(userAgent)
    if (botName) {
      await db.from('analytics_bot_hits').insert({
        product_id: 'gta-hub',
        path: path.slice(0, 500),
        bot_name: botName,
      })
      return NextResponse.json({ ok: true, bot: botName })
    }

    const sessionId = computeSessionId(ip, userAgent)
    const device = classifyDevice(userAgent)
    const referrer = body?.referrer?.slice(0, 500) || null
    const referrerSource = classifyReferrerSource(referrer)
    const country = request.headers.get('x-vercel-ip-country') || null

    // Dedupe: identical (session_id, path) within the last 30s is treated
    // as one pageview -- covers double-fires (StrictMode, fast back/forward
    // nav) without needing client-side debounce logic.
    const cutoff = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString()
    const { data: recent } = await db
      .from('analytics_pageviews')
      .select('id')
      .eq('session_id', sessionId)
      .eq('path', path.slice(0, 500))
      .gte('created_at', cutoff)
      .limit(1)

    if (recent && recent.length > 0) {
      return NextResponse.json({ ok: true, deduped: true })
    }

    await db.from('analytics_pageviews').insert({
      product_id: 'gta-hub',
      path: path.slice(0, 500),
      referrer,
      referrer_source: referrerSource,
      country,
      device,
      session_id: sessionId,
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Never let tracking failures surface to the visitor
    return NextResponse.json({ ok: false })
  }
}
