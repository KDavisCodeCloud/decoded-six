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

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats>({ published: 0, pending: 0, errors: 0, agentRuns: 0 })
  const [overlay, setOverlay] = useState<{ type: OverlayType; reward?: string } | null>(null)

  const daysToLaunch = Math.ceil(
    (new Date('2027-11-19T00:00:00Z').getTime() - Date.now()) / 86400000
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
  }, [])

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

        {/* Phase tracker */}
        <div className="dash-vc-card mb-5">
          <div className="dash-vc-label mb-4">BUILD PHASE</div>
          <div className="space-y-3">
            {[
              { phase: 'Phase 1 — Foundation',           done: true },
              { phase: 'Phase 2 — Public Site Shell',    done: true },
              { phase: 'Phase 3 — Content Pipeline',     done: false, active: true },
              { phase: 'Phase 4 — Internal Dashboard',   done: false },
              { phase: 'Phase 5 — Interactive Map',      done: false },
              { phase: 'Phase 6 — YouTube System',       done: false },
              { phase: 'Phase 7 — Revenue Intelligence', done: false },
              { phase: 'Phase 8 — Launch Day Nov 19 2027', done: false },
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
