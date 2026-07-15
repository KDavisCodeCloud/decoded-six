'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const EXCLUDED_PREFIXES = ['/dashboard', '/login', '/api']
const SESSION_KEY = 'ds6_session_id'

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return null
}
