'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AUG27_HEADLINE, AUG27_BODY, AUG27_CTA, AUG27_SOURCE, isDismissed, dismiss } from '@/lib/aug27-capture'

const COOKIE_NAME = 'ds_aug27_popup_dismissed'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TIMED_DELAY_MS = 10_000

type Status = 'idle' | 'loading' | 'success' | 'error'

export function Aug27Popup() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const shownRef = useRef(false)

  function show() {
    if (shownRef.current || isDismissed(COOKIE_NAME)) return
    shownRef.current = true
    setVisible(true)
  }

  function close() {
    setVisible(false)
    dismiss(COOKIE_NAME)
  }

  useEffect(() => {
    if (isDismissed(COOKIE_NAME)) return

    const timer = setTimeout(show, TIMED_DELAY_MS)

    // Exit intent: cursor leaves through the top of the viewport, the
    // classic "heading for the tab bar" signal.
    function onMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) show()
    }
    document.addEventListener('mouseleave', onMouseLeave)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

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

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aug27-popup-heading"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-ice/20 bg-panel p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Dismiss"
          className="absolute top-4 right-4 text-whisper hover:text-bright transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <span className="inline-block mb-3 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide text-[#070910]" style={{ background: '#f0975a' }}>
          August 27 · Netflix
        </span>

        <h2 id="aug27-popup-heading" className="font-heading font-bold text-2xl text-bright mb-2 leading-tight">
          {AUG27_HEADLINE}
        </h2>
        <p className="text-quiet text-sm leading-relaxed mb-5">{AUG27_BODY}</p>

        {status === 'success' ? (
          <p className="text-[#f0975a] font-semibold text-sm">You&apos;re on the list. See you August 27.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={status === 'loading'}
              className="bg-transparent border border-ice/40 rounded-lg px-4 py-2.5 text-sm text-bright placeholder-whisper focus:outline-none focus:border-ice transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity disabled:opacity-50"
              style={{ background: '#ec1272' }}
            >
              {status === 'loading' ? 'Signing up…' : AUG27_CTA}
            </button>
            {status === 'error' && (
              <p className="text-flame text-xs">Enter a valid email address</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
