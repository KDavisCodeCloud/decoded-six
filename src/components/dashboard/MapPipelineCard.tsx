'use client'

import { useEffect, useState } from 'react'

interface Run {
  id: string
  trigger: string
  started_at: string
  finished_at: string | null
  status: 'running' | 'ok' | 'failed'
  fetched: number
  new_items: number
  extracted: number
  placed: Record<string, number>
  auto_published: number
  queued: number
  held: number
  merged: number
  dropped: Record<string, number>
  blocklist_hits: number
  source_errors: { source: string; status: number | null; error: string | null }[]
  error: string | null
}
interface Alert { id: string; kind: string; severity: string; title: string; created_at: string }
interface Data { runs: Run[]; alerts: Alert[]; queue: { pending: number; held: number; live: number } }

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`
}

// Mission Control: map pin pipeline run summary + open map alerts.
export function MapPipelineCard() {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    try {
      const r = await fetch('/api/dashboard/map-pipeline', { cache: 'no-store' })
      const d = await r.json()
      if (d.error) setErr(d.error); else setData(d)
    } catch (e) { setErr(String(e)) }
  }
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [])

  async function ack(id: string) {
    await fetch('/api/dashboard/map-pipeline', { method: 'POST', body: JSON.stringify({ id }) })
    load()
  }

  const last = data?.runs[0]
  const dropped = last ? Object.entries(last.dropped).sort((a, b) => b[1] - a[1]) : []

  return (
    <div className="dash-vc-card mb-5">
      <div className="flex items-center justify-between">
        <div className="dash-vc-label">MAP PIN PIPELINE</div>
        {last && (
          <span className="text-xs font-mono" style={{ color: last.status === 'failed' ? '#FF2D6B' : '#00f0ff' }}>
            {last.status.toUpperCase()} · {ago(last.started_at)} · {last.trigger}
          </span>
        )}
      </div>
      {err && <div className="text-sm" style={{ color: '#FF2D6B' }}>{err}</div>}
      {!data && !err && <div className="dash-vc-stat" style={{ fontSize: 22 }}>LOADING…</div>}
      {data && (
        <>
          <div className="grid grid-cols-3 gap-3 my-3 text-center">
            {([['LIVE PINS', data.queue.live, '#3fd17a'], ['UNPLACED', data.queue.pending, '#f5a623'], ['HELD', data.queue.held, '#9b94b8']] as const).map(([l, v, c]) => (
              <div key={l}>
                <div className="font-pricedown text-3xl" style={{ color: c }}>{v}</div>
                <div className="text-[10px] text-whisper tracking-widest">{l}</div>
              </div>
            ))}
          </div>
          {last ? (
            <div className="text-xs font-mono text-quiet space-y-1">
              <div>
                fetched {last.fetched} → new {last.new_items} → extracted {last.extracted} →
                placed {last.placed.screenshot_match ?? 0} screenshot / {last.placed.gazetteer ?? 0} gazetteer / {last.placed.none ?? 0} none
              </div>
              <div>
                auto-published {last.auto_published} · queued {last.queued} · held {last.held} · merged {last.merged} ·
                <span style={{ color: last.blocklist_hits ? '#FF2D6B' : undefined }}> blocklist hits {last.blocklist_hits}</span>
              </div>
              {dropped.length > 0 && <div className="text-whisper">dropped: {dropped.map(([k, v]) => `${k} ${v}`).join(' · ')}</div>}
              {last.source_errors.length > 0 && (
                <div style={{ color: '#f5a623' }}>
                  {last.source_errors.length} source error(s): {last.source_errors.slice(0, 3).map(s => `${s.source} (${s.status ?? s.error})`).join(', ')}
                </div>
              )}
              {last.error && <div style={{ color: '#FF2D6B' }}>{last.error}</div>}
            </div>
          ) : <div className="text-sm text-whisper">No runs yet.</div>}
          {data.alerts.length > 0 && (
            <div className="mt-3 space-y-2">
              {data.alerts.map(a => (
                <div key={a.id} className="flex items-start justify-between gap-3 text-xs border-l-2 pl-2"
                  style={{ borderColor: a.severity === 'critical' ? '#FF2D6B' : a.severity === 'warning' ? '#f5a623' : '#00f0ff' }}>
                  <span className="text-bright">{a.title} <span className="text-whisper">· {ago(a.created_at)}</span></span>
                  <button onClick={() => ack(a.id)} className="text-whisper hover:text-bright min-h-[44px] px-2">ACK</button>
                </div>
              ))}
            </div>
          )}
          <a href="/dashboard/map"><button className="dash-vc-btn-cyan mt-3" style={{ width: '100%' }}>OPEN MAP</button></a>
        </>
      )}
    </div>
  )
}
