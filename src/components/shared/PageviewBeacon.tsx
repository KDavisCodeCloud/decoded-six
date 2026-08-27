'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const EXCLUDED_PREFIXES = ['/dashboard', '/login', '/api']
const SESSION_KEY = 'ds6_session_id'
// Same-tab-session cache for the auth check below -- avoids calling
// supabase.auth.getSession() on every single pageview navigation (still
// cheap, it's a local read not a network round-trip, but no reason to
// repeat it once we already know this browser tab is logged in or not).
let cachedIsDashboardUser: boolean | null = null

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    // sessionStorage unavailable (private browsing, etc) — one-off id, still fine for a pageview count
    return crypto.randomUUID()
  }
}

export default function PageviewBeacon() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (EXCLUDED_PREFIXES.some(p => pathname.startsWith(p))) return

    async function maybeTrack() {
      // Excludes anyone logged into /dashboard (family-only, per CLAUDE.md)
      // from public-site pageview counts too -- previously only the
      // /dashboard route itself was excluded, so browsing the live site in
      // a normal tab while logged in still counted as a real visitor with
      // zero distinction. Same Supabase auth cookie /dashboard's own
      // server-side check reads, just read client-side here since public
      // pages aren't behind auth. A logged-out visitor (the real traffic
      // this exists to measure) has no session and is unaffected.
      if (cachedIsDashboardUser === null) {
        try {
          const { data: { session } } = await createClient().auth.getSession()
          cachedIsDashboardUser = !!session
        } catch {
          cachedIsDashboardUser = false
        }
      }
      if (cachedIsDashboardUser) return

      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: getSessionId(),
          path: pathname,
          referrer: document.referrer || undefined,
          utmSource: searchParams.get('utm_source') || undefined,
          utmMedium: searchParams.get('utm_medium') || undefined,
          utmCampaign: searchParams.get('utm_campaign') || undefined,
        }),
        keepalive: true,
      }).catch(() => {})
    }

    maybeTrack()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return null
}
