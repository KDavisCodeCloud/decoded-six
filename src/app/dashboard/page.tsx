'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import GTAOverlay, { type OverlayType } from '@/components/dashboard/GTAOverlay'
import { soundManager, SoundEvents } from '@/lib/sounds'

interface Stats {
  published: number
  pending: number
  errors: number
  agentRuns: number
}

interface HealthCheck {
  name: string
  up: boolean
  statusCode: number | null
  responseMs: number | null
  error: string | null
}

interface TrafficStats {
  trackingStarted: string
  pageviewsToday: number
  uniqueSessionsToday: number
  pageviewsThisWeek: number
  uniqueSessionsThisWeek: number
  topPages: { path: string; views: number }[]
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats>({ published: 0, pending: 0, errors: 0, agentRuns: 0 })
  const [overlay, setOverlay] = useState<{ type: OverlayType; reward?: string } | null>(null)
  const [health, setHealth] = useState<{ checkedAt: string; checks: HealthCheck[] } | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [traffic, setTraffic] = useState<TrafficStats | null>(null)

  const daysToLaunch = Math.ceil(
    (new Date(process.env.NEXT_PUBLIC_LAUNCH_DATE || '2026-11-19T00:00:00Z').getTime() - Date.now()) / 86400000
  )

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [articles, audit] = await Promise.all([
        supabase.from('articles').select('id, status').eq('product_id', 'gta-hub'),
        supabase.from('audit_log').select('id, error, created_at')
          .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
      ])
      const data = articles.data ?? []
      const logs = audit.data ?? []
      setStats({
        published: data.filter(a => a.status === 'published').length,
        pending:   data.filter(a => a.status === 'pending_review').length,
        errors:    logs.filter(l => l.error).length,
        agentRuns: logs.length,
      })
    }
    load().catch(() => {})

    fetch('/api/dashboard/traffic')
      .then(r => r.json())
      .then(d => { if (!d.error) setTraffic(d) })
      .catch(() => {})
  }, [])

  async function runHealthCheck() {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/dashboard/health', { cache: 'no-store' })
      const data = await res.json()
      setHealth(data)
    } catch {
      setHealth({ checkedAt: new Date().toISOString(), checks: [] })
    } finally {
      setHealthLoading(false)
    }
  }

  function triggerMission(reward: string) {
    soundManager.play(SoundEvents.REVENUE_MILESTONE)
    setOverlay({ type: 'mission-passed', reward })
  }

  function triggerWasted() {
    soundManager.play(SoundEvents.ARTICLE_REJECTED)
    setOverlay({ type: 'wasted' })
  }

  function pickupSound() {
    soundManager.play(SoundEvents.ARTICLE_APPROVED)
  }

  return (
    <>
      <GTAOverlay
        type={overlay?.type ?? null}
        reward={overlay?.reward}
        onDismiss={() => setOverlay(null)}
      />

      <div className="dash-stripe-bg min-h-screen p-8">
        {/* Vice City header */}
        <div className="mb-6 pb-4" style={{ borderBottom: '2px solid #FF2D6B' }}>
          <div className="flex items-center justify-between">
            <h1 className="font-pricedown text-4xl italic leading-none">
              <span className="text-white">VICE CITY </span>
              <span style={{ color: '#00f0ff' }}>STATS</span>
            </h1>
            <span className="font-pricedown italic" style={{ color: '#C8A84B', fontSize: '18px' }}>
              EST. 1986
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {/* Total Cash → Published articles */}
          <div className="dash-vc-card">
            <div className="dash-vc-label">TOTAL CA$H</div>
            <div className="dash-vc-stat">{stats.published} ART</div>
            <button
              className="dash-vc-btn-cyan"
              onClick={() => triggerMission(`${stats.published} ARTICLES SECURED`)}
            >
              COMPLETE MILESTONE
            </button>
          </div>

          {/* Days to launch */}
          <div className="dash-vc-card">
            <div className="dash-vc-label">DAYS TO LAUNCH</div>
            <div className="dash-vc-stat">{daysToLaunch}</div>
            <button className="dash-vc-btn-cyan" onClick={pickupSound}>
              PICKUP SOUND ONLY
            </button>
          </div>

          {/* Queue */}
          <div className="dash-vc-card">
            <div className="dash-vc-label">HITL QUEUE</div>
            <div className="dash-vc-stat">{stats.pending} PENDING</div>
            <a href="/dashboard/queue">
              <button className="dash-vc-btn-cyan" style={{ width: '100%' }}>
                OPEN QUEUE
              </button>
            </a>
          </div>

          {/* Critical incidents */}
          <div className="dash-vc-card">
            <div className="dash-vc-label">CRITICAL INCIDENTS</div>
            <div className="dash-vc-stat-error">{stats.errors} ERRORS</div>
            <button className="dash-vc-btn-pink" onClick={triggerWasted}>
              SIMULATE ERROR
            </button>
          </div>
        </div>

        {/* Site health + traffic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="dash-vc-card">
            <div className="dash-vc-label">SITE HEALTH</div>
            {!health ? (
              <div className="dash-vc-stat" style={{ fontSize: '22px' }}>NOT CHECKED YET</div>
            ) : (
              <div className="mb-4 space-y-2">
                {health.checks.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-sm font-heading">
                    <span className="text-whisper">{c.name}</span>
                    <span style={{ color: c.up ? '#00f0ff' : '#FF2D6B' }} className="font-semibold">
                      {c.up ? `UP · ${c.responseMs}ms` : `DOWN${c.error ? ` · ${c.error}` : ''}`}
                    </span>
                  </div>
                ))}
                <div className="text-xs text-whisper opacity-60">
                  Checked {new Date(health.checkedAt).toLocaleTimeString()}
                </div>
              </div>
            )}
            <button className="dash-vc-btn-cyan" onClick={runHealthCheck} disabled={healthLoading}>
              {healthLoading ? 'CHECKING…' : 'CHECK NOW'}
            </button>
          </div>

          <div className="dash-vc-card">
            <div className="dash-vc-label">TRAFFIC</div>
            {!traffic ? (
              <div className="dash-vc-stat" style={{ fontSize: '22px' }}>LOADING…</div>
            ) : (
              <>
                <div className="dash-vc-stat" style={{ fontSize: '38px' }}>
                  {traffic.pageviewsToday} VIEWS TODAY
                </div>
                <div className="text-sm font-heading text-whisper mb-3 space-y-1">
                  <div>{traffic.uniqueSessionsToday} unique visitors today</div>
                  <div>{traffic.pageviewsThisWeek} pageviews / {traffic.uniqueSessionsThisWeek} visitors this week</div>
                  {traffic.topPages.length > 0 && (
                    <div className="pt-1">
                      {traffic.topPages.map(p => (
                        <div key={p.path} className="flex justify-between">
                          <span className="truncate">{p.path}</span>
                          <span>{p.views}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-xs opacity-50 pt-1">
                    Tracking started {traffic.trackingStarted} — low numbers reflect that, not a bug
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Phase tracker */}
        <div className="dash-vc-card mb-5">
          <div className="dash-vc-label mb-4">BUILD PHASE</div>
          <div className="space-y-3">
            {[
              { phase: 'Phase 1 — Foundation',           done: true },
              { phase: 'Phase 2 — Public Site Shell',    done: true },
              { phase: 'Phase 3 — Content Pipeline',     done: false, active: true, note: '7/20 articles — Gate 1' },
              { phase: 'Phase 4 — Internal Dashboard',   done: true },
              { phase: 'Phase 5 — Interactive Map',      done: true, note: 'built, gated until launch' },
              { phase: 'Phase 6 — YouTube System',       done: false, note: 'gated behind AdSense' },
              { phase: 'Phase 7 — Revenue Intelligence', done: false, note: 'gated behind 25K sessions/mo' },
              { phase: 'Phase 8 — Launch Day Nov 19 2026', done: false },
            ].map(p => (
              <div key={p.phase} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  p.done ? 'bg-green-400' : p.active ? 'animate-pulse' : 'bg-dash-border'
                }`} style={p.active ? { background: '#00f0ff' } : {}} />
                <span className={`text-sm font-heading ${
                  p.done
                    ? 'line-through text-whisper'
                    : p.active
                    ? 'font-semibold'
                    : 'text-whisper'
                }`} style={p.active ? { color: '#00f0ff' } : {}}>
                  {p.phase}
                </span>
                {p.note && (
                  <span className="text-xs text-whisper opacity-60">— {p.note}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Agent runs today */}
        <div className="dash-vc-card">
          <div className="dash-vc-label">AGENT RUNS — LAST 24H</div>
          <div className="dash-vc-stat">{stats.agentRuns}</div>
          <a href="/dashboard/agents">
            <button className="dash-vc-btn-cyan" style={{ width: '100%' }}>
              VIEW ROSTER
            </button>
          </a>
        </div>
      </div>
    </>
  )
}
