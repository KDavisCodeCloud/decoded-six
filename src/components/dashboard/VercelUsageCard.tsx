'use client'

import { useEffect, useState } from 'react'

interface Metric { key: string; label: string; used: number; limit: number; unit: string; window: string; pct: number }
interface Check {
  id: string; checked_at: string; trigger: string; threshold_pct: number; metrics: Metric[]
  unavailable: { label: string; limit: string }[]; alerts: Metric[]; max_pct: number | null
  error: string | null; acknowledged_at: string | null
}

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`
}
const fmt = (n: number) => n >= 1000 ? Math.round(n).toLocaleString() : String(Math.round(n * 100) / 100)

// Mission Control: Vercel usage vs Hobby limits, checked twice a day.
// Amber at the alert threshold (70%), pink at/over the limit.
export function VercelUsageCard() {
  const [c, setC] = useState<Check | null | undefined>(undefined)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    try {
      const r = await fetch('/api/dashboard/vercel-usage', { cache: 'no-store' })
      const d = await r.json()
      if (d.error) setErr(d.error); else setC(d.latest)
    } catch (e) { setErr(String(e)) }
  }
  useEffect(() => { load(); const t = setInterval(load, 5 * 60000); return () => clearInterval(t) }, [])

  async function ack(id: string) {
    await fetch('/api/dashboard/vercel-usage', { method: 'POST', body: JSON.stringify({ id }) })
    load()
  }

  const colour = (pct: number, threshold: number) => pct >= 100 ? '#FF2D6B' : pct >= threshold ? '#f5a623' : '#3fd17a'
  const alerting = c && !c.acknowledged_at && (c.alerts.length > 0 || c.error)

  return (
    <div className="dash-vc-card mb-5" style={alerting ? { borderColor: '#FF2D6B' } : undefined}>
      <div className="flex items-center justify-between">
        <div className="dash-vc-label">VERCEL USAGE · HOBBY LIMITS</div>
        {c && <span className="text-xs font-mono text-quiet">checked {ago(c.checked_at)} · twice daily · alert at {c.threshold_pct}%</span>}
      </div>
      {err && <div className="text-sm" style={{ color: '#FF2D6B' }}>{err}</div>}
      {c === undefined && !err && <div className="dash-vc-stat" style={{ fontSize: 22 }}>LOADING…</div>}
      {c === null && <div className="text-sm text-whisper mt-2">No check has run yet.</div>}
      {c && (
        <>
          {alerting && (
            <div className="flex items-start justify-between gap-3 text-xs border-l-2 pl-2 my-3" style={{ borderColor: '#FF2D6B' }}>
              <span className="text-bright">
                {c.error ? `Check failed: ${c.error}` : `${c.alerts.length} metric${c.alerts.length === 1 ? '' : 's'} at or over ${c.threshold_pct}%: ${c.alerts.map(a => `${a.label} ${a.pct}%`).join(', ')}`}
              </span>
              <button onClick={() => ack(c.id)} className="text-whisper hover:text-bright min-h-[44px] px-2">ACK</button>
            </div>
          )}
          <ul className="space-y-2 mt-3">
            {c.metrics.map(m => {
              const col = colour(m.pct, c.threshold_pct)
              return (
                <li key={m.key}>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-quiet">{m.label} <span className="text-whisper">({m.window})</span></span>
                    <span style={{ color: col }}>{fmt(m.used)} / {fmt(m.limit)} {m.unit} · {m.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] mt-1 overflow-hidden" role="meter"
                    aria-valuenow={m.pct} aria-valuemin={0} aria-valuemax={100} aria-label={m.label}>
                    <div className="h-full rounded-full" style={{ width: `${Math.min(m.pct, 100)}%`, background: col }} />
                  </div>
                </li>
              )
            })}
          </ul>
          {c.unavailable.length > 0 && (
            <div className="text-[11px] text-whisper mt-3">
              Not exposed by Vercel&apos;s API on Hobby (check the Usage page): {c.unavailable.map(u => `${u.label} (${u.limit})`).join(' · ')}
            </div>
          )}
        </>
      )}
    </div>
  )
}
