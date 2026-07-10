'use client'

import { useState, type FormEvent } from 'react'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface NewsletterSignupProps {
  variant?: 'article' | 'section'
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Amber CTA (#f5a623) is the cross-product THD brand accent (global CLAUDE.md
// "Base Design System"), not part of this repo's own locked public-site
// palette (void/panel/flame/purple/ice — no amber token exists there, and
// 'gold' #f0975a is explicitly reserved for the rumor tag only). Used as an
// arbitrary value rather than added to tailwind.config.ts, which is marked
// locked. Cyan border uses the existing `ice` token (#2fc4e8) instead of the
// task's literal #00fff7 — same idea, already-established color, task said
// "or similar". Background uses the existing `void`/transparent tokens
// rather than the literal #070910, which is close enough to `void`
// (#0a0a0f) to be the same color in practice.
export function NewsletterSignup({ variant = 'article' }: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('error')
      setErrorMsg('Enter a valid email address')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data?.error ?? 'Signup failed, try again')
        return
      }
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg('Signup failed, try again')
    }
  }

  const isSection = variant === 'section'

  return (
    <div
      className={
        isSection
          ? 'rounded-2xl border border-ice/20 bg-void p-8 md:p-10'
          : 'rounded-xl border border-ice/20 bg-transparent p-6'
      }
    >
      <h3 className={`font-heading font-bold text-bright ${isSection ? 'text-2xl mb-2' : 'text-lg mb-1.5'}`}>
        Get the GTA 6 intel first
      </h3>
      <p className={`text-quiet leading-relaxed ${isSection ? 'text-base mb-6' : 'text-sm mb-4'}`}>
        Get the GTA 6 Confirmed vs Rumored master list — updated weekly.
      </p>

      {status === 'success' ? (
        <p className="text-[#f5a623] font-semibold text-sm">You&apos;re in. GTA 6 intel incoming.</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={isSection ? 'flex flex-col sm:flex-row gap-3' : 'flex flex-col gap-2.5'}
        >
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            disabled={status === 'loading'}
            className="flex-1 bg-transparent border border-ice/40 rounded-lg px-4 py-2.5 text-sm text-bright placeholder-whisper focus:outline-none focus:border-ice transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-5 py-2.5 rounded-lg text-sm font-bold text-[#070910] bg-[#f5a623] hover:bg-[#f5a623]/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {status === 'loading' ? 'Signing up…' : 'Get the list'}
          </button>
        </form>
      )}

      {status === 'error' && <p className="text-flame text-xs mt-2">{errorMsg}</p>}
    </div>
  )
}
