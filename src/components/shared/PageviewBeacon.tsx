'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const EXCLUDED_PREFIXES = ['/dashboard', '/login', '/api']
// Same-tab-session cache for the auth check below -- avoids calling
// supabase.auth.getSession() on every single pageview navigation (still
// cheap, it's a local read not a network round-trip, but no reason to
// repeat it once we already know this browser tab is logged in or not).
let cachedIsDashboardUser: boolean | null = null

// session_id is now computed server-side (src/lib/analytics.ts) from a
// daily-rotating hash of IP + UA -- no client-generated id, no
// sessionStorage, nothing to store here at all.
export default function PageviewBeacon() {
  const pathname = usePathname()

  useEffect(() => {
    if (EXCLUDED_PREFIXES.some(p => pathname.startsWith(p))) return

    async function maybeTrack() {
      // Excludes anyone logged into /dashboard (family-only, per CLAUDE.md)
      // from public-site pageview counts too -- a logged-out visitor (the
      // real traffic this exists to measure) has no session and is unaffected.
      if (cachedIsDashboardUser === null) {
        try {
          const { data: { session } } = await createClient().auth.getSession()
          cachedIsDashboardUser = !!session
        } catch {
          cachedIsDashboardUser = false
        }
      }
      if (cachedIsDashboardUser) return

      const payload = JSON.stringify({
        path: pathname,
        referrer: document.referrer || undefined,
      })

      // sendBeacon fires-and-forgets without blocking navigation and
      // survives the page being torn down mid-request (unlike a plain
      // fetch) -- exactly the "zero render blocking" behavior this needs
      // on every route change. Falls back to fetch+keepalive on the rare
      // browser without sendBeacon support.
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/track', blob)
      } else {
        fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
    }

    maybeTrack()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return null
}
