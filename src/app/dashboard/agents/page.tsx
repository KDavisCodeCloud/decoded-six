'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

const KNOWN_AGENTS = [
  { id: 'dsx-ca1',       name: 'DSX-CA1',       desc: 'Content agent (news/evergreen/conversion)', schedule: 'Tue/Thu/Sat 9am', canFire: true },
  { id: 'ds_humanizer',  name: 'DS-HUM',         desc: 'Humanizer',                                schedule: 'Per draft',        canFire: false },
  { id: 'ds_aeo',        name: 'DS-AEO',         desc: 'AEO structure check',                      schedule: 'Per draft',        canFire: false },
  { id: 'ds_seo',        name: 'DS-SEO',         desc: 'SEO rules check',                          schedule: 'Per draft',        canFire: false },
  { id: 'ds_detect',     name: 'DS-DETECT',      desc: 'AI detection (Originality)',               schedule: 'Per draft',        canFire: false },
  { id: 'DS-MAP-SCRAPE', name: 'DS-MAP-SCRAPE',  desc: 'Reddit/Discord scraper',                   schedule: 'Daily 6am',        canFire: false },
  { id: 'DS-YT-SHORT',   name: 'DS-YT-SHORT',    desc: 'Weekly challenge Short',                   schedule: 'Thu 6am',          canFire: false },
]

interface AuditRow {
  id: string
  agent_id: string
  action: string
  result: string | null
  error: string | null
  created_at: string
}

type ArticleType = 'news' | 'evergreen' | 'conversion'

function FirePanel({ onClose, onSuccess }: { onClose: () => void; onSuccess: (type: ArticleType) => void }) {
  const [articleType, setArticleType] = useState<ArticleType>('news')
  const [topicSeed, setTopicSeed] = useState('')
  const [firing, setFiring] = useState(false)
  const [error, setError] = useState('')

  async function fire() {
    setFiring(true)
    setError('')
    try {
      const res = await fetch('/api/agents/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: 'dsx-ca1', article_type: articleType, topic_seed: topicSeed }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? res.statusText)
      onSuccess(articleType)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trigger failed')
    } finally {
      setFiring(false)
    }
  }

  return (
    <div className="dash-card border border-gta-gold/30 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-bright text-sm">Fire DSX-CA1 — Manual Run</h3>
        <button onClick={onClose} className="text-xs text-whisper hover:text-bright transition-colors">✕ Cancel</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {(['news', 'evergreen', 'conversion'] as ArticleType[]).map(type => (
          <button
            key={type}
            onClick={() => setArticleType(type)}
            className={`text-xs py-2 px-3 rounded-lg border transition-colors capitalize ${
              articleType === type
                ? 'border-gta-gold/60 bg-gta-gold/15 text-gta-gold'
                : 'border-dash-border text-quiet hover:text-bright'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={topicSeed}
        onChange={e => setTopicSeed(e.target.value)}
        placeholder={
          articleType === 'news'       ? 'Optional — headline or source URL (leave blank for RSS pick)' :
          articleType === 'evergreen'  ? 'Optional — keyword or topic (leave blank for keyword rotation)' :
                                         'Optional — product name (leave blank for affiliate list rotation)'
        }
        className="w-full bg-transparent border border-dash-border rounded-lg px-3 py-2 text-sm text-quiet placeholder:text-whisper focus:outline-none focus:border-gta-gold/40 mb-4"
      />

      {error && (
        <p className="text-xs text-neon-pink mb-3">{error}</p>
      )}

      <button
        onClick={fire}
        disabled={firing}
        className="dash-btn-approve disabled:opacity-40 w-full text-sm"
      >
        {firing ? 'Firing agent…' : '▶ Run Agent Now'}
      </button>

      <p className="text-xs text-whisper mt-3 text-center">
        Agent runs async — Slack HITL notification fires when article is ready (~60–90 sec)
      </p>
    </div>
  )
}

export default function AgentsPage() {
  const [logs, setLogs] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showFirePanel, setShowFirePanel] = useState(false)
  const [lastFired, setLastFired] = useState<{ type: ArticleType; at: Date } | null>(null)

  async function fetchLogs() {
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from('audit_log')
        .select('id, agent_id, action, result, error, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
      setLogs((data as AuditRow[]) ?? [])
    } catch { /* audit_log not yet seeded */ }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
    const supabase = createClient()
    const channel = supabase
      .channel('agents-audit')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_log' },
        () => fetchLogs())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const lastRun = new Map<string, AuditRow>()
  logs.forEach(log => { if (!lastRun.has(log.agent_id)) lastRun.set(log.agent_id, log) })

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-pricedown text-gta-gold text-3xl leading-none">AGENT ROSTER</h1>
          <p className="text-quiet text-sm mt-1">{KNOWN_AGENTS.length} agents registered</p>
        </div>
        <button
          onClick={() => setShowFirePanel(v => !v)}
          className="dash-btn-approve text-sm px-5 py-2"
        >
          {showFirePanel ? '✕ Close' : '▶ Run Agent Now'}
        </button>
      </div>

      {showFirePanel && (
        <FirePanel
          onClose={() => setShowFirePanel(false)}
          onSuccess={(type) => {
            setShowFirePanel(false)
            setLastFired({ type, at: new Date() })
          }}
        />
      )}

      {lastFired && (
        <div className="mb-6 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <span>✓</span>
          <span>
            <strong>{lastFired.type}</strong> article queued at {lastFired.at.toLocaleTimeString()}.
            Watch Slack for HITL notification, then check the Review Queue.
          </span>
          <button onClick={() => setLastFired(null)} className="ml-auto text-green-400/60 hover:text-green-400">✕</button>
        </div>
      )}

      {/* Agent status grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
        {KNOWN_AGENTS.map(agent => {
          const last = lastRun.get(agent.id)
          const statusColor =
            !last               ? 'bg-dash-border' :
            last.error          ? 'bg-neon-pink' :
            last.result === 'success' ? 'bg-green-400' :
            'bg-gta-gold animate-pulse'

          return (
            <div key={agent.name} className="dash-card p-4 flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColor}`} />
              <div className="flex-1 min-w-0">
                <div className="font-heading font-semibold text-bright text-sm">{agent.name}</div>
                <div className="text-quiet text-xs">{agent.desc}</div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-3">
                <div>
                  <div className="text-[10px] text-whisper">{agent.schedule}</div>
                  {last ? (
                    <div className="text-[10px] text-whisper mt-0.5">
                      {new Date(last.created_at).toLocaleDateString()}
                    </div>
                  ) : (
                    <div className="text-[10px] text-whisper">Never run</div>
                  )}
                </div>
                {agent.canFire && (
                  <button
                    onClick={() => setShowFirePanel(true)}
                    className="text-[10px] px-2 py-1 rounded border border-gta-gold/30 text-gta-gold hover:bg-gta-gold/10 transition-colors"
                  >
                    ▶ Fire
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent audit log */}
      <div className="dash-card">
        <div className="px-6 py-4 border-b border-dash-border flex items-center justify-between">
          <h2 className="font-heading font-bold text-bright text-sm uppercase tracking-widest">
            Recent Activity
          </h2>
          <button onClick={fetchLogs} className="text-xs text-whisper hover:text-bright transition-colors">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-quiet text-sm">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-3xl mb-3">🤖</div>
            <p className="text-quiet text-sm">No agent activity yet.</p>
            <p className="text-whisper text-xs mt-1">Runs will appear here once agents are active.</p>
          </div>
        ) : (
          <div className="divide-y divide-dash-border">
            {logs.slice(0, 50).map(log => (
              <div key={log.id} className="px-6 py-3 flex items-center gap-4">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  log.error ? 'bg-neon-pink' :
                  log.result === 'success' ? 'bg-green-400' : 'bg-quiet'
                }`} />
                <span className="text-gta-gold text-xs font-mono w-32 shrink-0">{log.agent_id}</span>
                <span className="text-quiet text-xs flex-1 truncate">{log.action}</span>
                {log.error && (
                  <span className="text-neon-pink text-[10px] truncate max-w-[160px]">{log.error}</span>
                )}
                <span className="text-whisper text-xs shrink-0">
                  {new Date(log.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
