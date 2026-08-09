'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { AUG27_HEADLINE, AUG27_CTA, AUG27_SOURCE, isDismissed, dismiss } from '@/lib/aug27-capture'

const COOKIE_NAME = 'ds_aug27_bar_dismissed'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Status = 'idle' | 'loading' | 'success' | 'error'

export function Aug27StickyBar() {
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    setMounted(true)
    setDismissed(isDismissed(COOKIE_NAME))
  }, [])

  function close() {
    setDismissed(true)
    dismiss(COOKIE_NAME)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('error')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: AUG27_SOURCE }),
      })
      if (!res.ok) {
        setStatus('error')
        return
      }
      setStatus('success')
      dismiss(COOKIE_NAME)
    } catch {
      setStatus('error')
    }
  }

  // Avoid a hydration flash: render nothing on the server and until the
  // cookie check resolves client-side, then show only if not dismissed.
  if (!mounted || dismissed) return null

  return (
    <div className="w-full border-b border-white/[0.06]" style={{ background: '#1a0f08' }}>
      <div className="container flex flex-wrap items-center justify-center gap-3 py-2 text-center">
        <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-[#070910]" style={{ background: '#f0975a' }}>
          Aug 27
        </span>
        <p className="text-xs sm:text-sm text-bright font-medium">{AUG27_HEADLINE}</p>

        {status === 'success' ? (
          <span className="text-xs sm:text-sm font-semibold" style={{ color: '#f0975a' }}>You&apos;re on the list</span>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={status === 'loading'}
              className="w-40 sm:w-52 bg-transparent border border-ice/40 rounded-md px-3 py-1 text-xs sm:text-sm text-bright placeholder-whisper focus:outline-none focus:border-ice transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-3 py-1 rounded-md text-xs sm:text-sm font-bold text-white whitespace-nowrap disabled:opacity-50"
              style={{ background: '#ec1272' }}
            >
              {status === 'loading' ? '…' : AUG27_CTA}
            </button>
          </form>
        )}

        <button
          onClick={close}
          aria-label="Dismiss"
          className="text-whisper hover:text-bright transition-colors ml-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
