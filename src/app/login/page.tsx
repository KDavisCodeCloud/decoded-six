'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-dash-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="font-pricedown text-gta-gold text-4xl leading-none">DECODED SIX</div>
          <div className="text-quiet text-xs uppercase tracking-widest mt-2">Mission Control</div>
        </div>

        <div className="dash-card p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-3xl mb-4">📬</div>
              <h2 className="font-heading font-bold text-bright text-lg mb-2">
                Check your email
              </h2>
              <p className="text-quiet text-sm leading-relaxed">
                Magic link sent to <span className="text-gta-gold">{email}</span>.
                Click the link to access Mission Control.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-6 text-xs text-whisper hover:text-quiet transition-colors"
              >
                ← Send another link
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs text-quiet uppercase tracking-widest mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-dash-bg border border-dash-border rounded-lg px-4 py-3 text-bright placeholder-whisper text-sm focus:outline-none focus:border-gta-gold transition-colors"
                />
              </div>

              {error && (
                <p className="text-neon-pink text-xs">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gta-gold text-dash-bg font-heading font-bold py-3 rounded-lg text-sm uppercase tracking-widest hover:bg-gta-gold/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-whisper text-xs mt-6">
          Family access only — unauthorized login will be logged
        </p>
      </div>
    </div>
  )
}
