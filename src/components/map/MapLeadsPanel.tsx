'use client'

import { useState } from 'react'
import type { MapLead } from '@/lib/map-leads'
import { CATEGORY_LABEL_BY_KEY, CATEGORY_COLOR_BY_KEY } from '@/lib/map-categories'

const STATUS_STYLE: Record<MapLead['status'], { label: string; color: string }> = {
  open: { label: 'SEARCHING', color: '#5a96ff' },
  evidence_found: { label: 'EVIDENCE FOUND', color: '#3fd17a' },
  closed: { label: 'CLOSED', color: '#6b6585' },
}

function ago(iso: string | null) {
  if (!iso) return 'never'
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60) return `${m}m ago`
  if (m < 48 * 60) return `${Math.round(m / 60)}h ago`
  return `${Math.round(m / 1440)}d ago`
}

// /dashboard/map Leads: things we know exist but can't place yet. Name,
// category, area -- never coordinates. The scraper searches open leads first
// each cycle; a lead is never evidence and never publishes anything.
export function MapLeadsPanel({ initial }: { initial: MapLead[] }) {
  const [leads, setLeads] = useState(initial)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [lineErrors, setLineErrors] = useState<{ line: number; text: string; error: string }[]>([])
  const [showClosed, setShowClosed] = useState(false)

  async function reload() {
    const r = await fetch('/api/map-leads', { cache: 'no-store' })
    if (r.ok) setLeads((await r.json()).leads)
  }

  async function add() {
    if (!text.trim()) return
    setBusy(true); setNote(null); setLineErrors([])
    try {
      const r = await fetch('/api/map-leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      })
      const d = await r.json()
      if (!r.ok) { setNote(d.error ?? 'failed'); return }
      setLineErrors(d.errors ?? [])
      setNote(`Added ${d.added} lead${d.added === 1 ? '' : 's'}${d.parsed > d.added ? ` (${d.parsed - d.added} already listed)` : ''}.`)
      if (!d.errors?.length) setText('')
      await reload()
    } finally { setBusy(false) }
  }

  async function setStatus(id: string, status: 'open' | 'closed') {
    const r = await fetch('/api/map-leads', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }),
    })
    if (r.ok) {
      const { lead } = await r.json()
      setLeads(list => list.map(l => l.id === id ? lead : l))
    }
  }

  const visible = leads
    .filter(l => showClosed || l.status !== 'closed')
    .sort((a, b) => (a.status === 'evidence_found' ? 0 : 1) - (b.status === 'evidence_found' ? 0 : 1))
  const counts = leads.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.status]: (acc[l.status] ?? 0) + 1 }), {})

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="rounded-xl border border-white/[0.08] bg-panel p-4 flex flex-col gap-3">
        <label htmlFor="lead-paste" className="text-xs font-mono text-quiet">
          One per line: <span className="text-bright">name | category | area</span> (or paste spreadsheet rows). Category and area are optional. No coordinates.
        </label>
        <textarea id="lead-paste" value={text} onChange={e => setText(e.target.value)} rows={7}
          placeholder={'Hidden briefcase | money_spot | Port Gellhorn\nPawn shop | Fences | Little Cuba\nTattoo parlor on Ocean Beach'}
          className="w-full rounded-lg bg-black/40 border border-white/[0.1] p-3 font-mono text-xs text-bright placeholder:text-whisper focus:outline-none focus:border-gta-gold/60" />
        <div className="flex items-center gap-3">
          <button onClick={add} disabled={busy || !text.trim()}
            className="min-h-[44px] px-5 rounded-lg bg-gta-gold/15 text-gta-gold border border-gta-gold/40 text-sm font-semibold disabled:opacity-40">
            {busy ? 'Adding…' : 'Add leads'}
          </button>
          {note && <span className="text-xs font-mono text-quiet" role="status">{note}</span>}
        </div>
        {lineErrors.length > 0 && (
          <ul className="text-[11px] font-mono text-flame space-y-1">
            {lineErrors.map((e, i) => <li key={i}>{e.line ? `line ${e.line}: ` : ''}{e.error}{e.text ? ` — ${e.text}` : ''}</li>)}
          </ul>
        )}
        <p className="text-[11px] text-whisper">
          Each scraper cycle searches open leads first. A lead is never a source: it can&apos;t place or publish a pin.
          Pins that real sources produce for a lead go to the top of the pin queue.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-panel p-4">
        <div className="flex items-center justify-between mb-3 text-[11px] font-mono">
          <span className="text-quiet">
            {counts.open ?? 0} searching · <span className="text-[#3fd17a]">{counts.evidence_found ?? 0} evidence found</span> · {counts.closed ?? 0} closed
          </span>
          <button onClick={() => setShowClosed(v => !v)} className="text-ice hover:underline">
            {showClosed ? 'hide closed' : 'show closed'}
          </button>
        </div>
        {visible.length === 0 ? (
          <div className="text-sm text-quiet py-6">No leads yet. Paste names of things you know are in the game but can&apos;t place.</div>
        ) : (
          <ul className="divide-y divide-white/[0.06] max-h-[420px] overflow-y-auto">
            {visible.map(l => {
              const st = STATUS_STYLE[l.status]
              return (
                <li key={l.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-bright text-sm font-semibold truncate">{l.name}</div>
                    <div className="text-[11px] font-mono mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      {l.category && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLOR_BY_KEY[l.category] ?? '#9b94b8' }} />
                          <span className="text-quiet">{CATEGORY_LABEL_BY_KEY[l.category] ?? l.category}</span>
                        </span>
                      )}
                      {l.area && <span className="text-whisper">{l.area}</span>}
                      <span className="text-whisper">searched {l.search_count}× · {ago(l.last_searched_at)}</span>
                      {l.matched_marker_ids.length > 0 && <span className="text-[#3fd17a]">{l.matched_marker_ids.length} pin{l.matched_marker_ids.length === 1 ? '' : 's'} in queue</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                      style={{ color: st.color, borderColor: `${st.color}55` }}>{st.label}</span>
                    <button onClick={() => setStatus(l.id, l.status === 'closed' ? 'open' : 'closed')}
                      className="text-[11px] font-mono text-quiet hover:text-bright min-h-[32px] px-1">
                      {l.status === 'closed' ? 'reopen' : 'close'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
