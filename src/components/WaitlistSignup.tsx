'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function WaitlistSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setMessage(null)

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = await res.json()

      if (!res.ok || body.error) {
        setStatus('error')
        setMessage(body.error || 'Something went wrong. Try again.')
        return
      }

      setStatus('success')
      setMessage("You're on the list — we'll email you the moment the map goes live.")
      setEmail('')
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Try again.')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative bg-panel border border-white/[0.06] rounded-xl p-8 md:p-12 text-center overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[240px] bg-gold/8 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        <div className="text-3xl mb-3">🗺️</div>
        <h3 className="font-heading font-bold text-bright text-xl md:text-2xl mb-2">
          Interactive map launching with GTA 6
        </h3>
        <p className="text-quiet mb-6">Join waitlist to get access first</p>

        {status === 'success' ? (
          <p className="text-green-400 font-medium">{message}</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-raised border border-white/[0.08] rounded-lg px-4 py-2.5 text-bright placeholder:text-whisper focus:outline-none focus:border-gold/50 transition-colors"
            />
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full sm:w-auto shrink-0 bg-gold text-void font-heading font-bold px-5 py-2.5 rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'submitting' ? 'Joining…' : 'Join Waitlist'}
            </button>
          </form>
        )}

        {status === 'error' && message && (
          <p className="text-flame text-sm mt-3">{message}</p>
        )}
      </div>
    </motion.div>
  )
}
