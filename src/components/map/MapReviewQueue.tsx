'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { MapLayer } from '@/lib/map-layers'
import { CATEGORY_LABEL_BY_KEY, CATEGORY_COLOR_BY_KEY } from '@/lib/map-categories'

const QueuePinMap = dynamic(() => import('./QueuePinMap').then(m => m.QueuePinMap), { ssr: false })

export interface QueueSource {
  url: string
  source_kind: string
  author_id: string | null
  evidence_quote: string | null
  screenshot_url: string | null
}
export interface QueueItem {
  id: string
  name: string
  category: string
  description: string | null
  county: string | null
  x: number | null
  y: number | null
  accuracy_radius_m: number | null
  confidence: number | null
  independent_source_count: number
  placement_method: string | null
  created_at: string
  lead: { id: string; name: string } | null
  sources: QueueSource[]
}

type Action = 'approve' | 'reject' | 'move'

// /dashboard/map HITL queue for scraper pins (confidence 0.5-0.85, or
// "needs placement"). Approve / Drag-to-move / Reject. Rejections stay in the
// DB as status 'rejected' so the scraper never re-creates them.
export function MapReviewQueue({ items: initial, layer, onDone }: {
  items: QueueItem[]
  layer: MapLayer | null
  onDone?: (action: 'approve' | 'reject') => void
}) {
  const [items, setItems] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Record<string, string>>({})

  async function act(id: string, action: Action, x?: number, y?: number) {
    setBusy(id)
    try {
      const r = await fetch(`/api/map-markers/${id}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, x, y }),
      })
      const d = await r.json()
      if (!r.ok) { setMsg(m => ({ ...m, [id]: d.error ?? 'failed' })); return }
      if (action === 'move') {
        setItems(list => list.map(i => i.id === id ? { ...i, x: x!, y: y!, placement_method: 'hitl_manual', accuracy_radius_m: 50 } : i))
        setMsg(m => ({ ...m, [id]: `moved to ${x}, ${y}` }))
      } else {
        setItems(list => list.filter(i => i.id !== id))
        onDone?.(action)
      }
    } finally { setBusy(null) }
  }

  if (items.length === 0) {
    return <div className="text-sm text-quiet py-6">Nothing waiting. Scraper pins at 0.5–0.85 confidence, and pins that still need placing, land here.</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map(item => {
        const shot = item.sources.find(s => s.screenshot_url && /^https?:\/\/[^#]+\.(png|jpe?g|webp)/i.test(s.screenshot_url))
        return (
          <article key={item.id} className="rounded-xl border border-white/[0.08] bg-panel p-4 flex flex-col gap-3">
            <header className="flex items-start justify-between gap-2">
              <div>
                <div className="text-bright font-semibold leading-tight">{item.name}</div>
                <div className="text-[11px] font-mono mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLOR_BY_KEY[item.category] ?? '#9b94b8' }} />
                  <span className="text-quiet">{CATEGORY_LABEL_BY_KEY[item.category] ?? item.category}</span>
                  {item.county && <span className="text-whisper">· {item.county}</span>}
                </div>
              </div>
              <div className="text-right font-mono text-[11px]">
                <div className="text-gta-gold">{item.confidence?.toFixed(2) ?? '—'}</div>
                <div className="text-whisper">{item.independent_source_count} src</div>
              </div>
            </header>

            {item.lead && (
              <div className="text-[11px] font-mono text-[#3fd17a]">LEAD · {item.lead.name} — a real source matched this lead (the lead itself is not evidence)</div>
            )}
            {item.x == null && (
              <div className="text-[11px] font-mono text-flame">NEEDS PLACEMENT — click the map to drop the pin</div>
            )}
            {layer && (
              <QueuePinMap layer={layer} x={item.x} y={item.y} radiusM={item.accuracy_radius_m}
                onMove={(x, y) => act(item.id, 'move', x, y)} />
            )}
            {item.description && <p className="text-xs text-quiet">{item.description}</p>}

            <ul className="space-y-2">
              {item.sources.map(s => (
                <li key={s.url} className="text-xs">
                  {s.evidence_quote && <q className="text-bright/90 italic">{s.evidence_quote}</q>}
                  <div className="mt-0.5">
                    <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-ice hover:underline break-all">
                      {s.source_kind} · {s.author_id ?? new URL(s.url).hostname}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
            {shot?.screenshot_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shot.screenshot_url} alt="Source map screenshot (evidence only, never published)" loading="lazy"
                className="rounded-lg border border-white/[0.08] max-h-40 object-cover" />
            )}

            {msg[item.id] && <div className="text-[11px] font-mono text-whisper">{msg[item.id]}</div>}
            <div className="mt-auto flex gap-2">
              <button disabled={busy === item.id || item.x == null} onClick={() => act(item.id, 'approve')}
                className="flex-1 min-h-[44px] rounded-lg bg-[#3fd17a]/15 text-[#3fd17a] border border-[#3fd17a]/30 text-sm font-semibold disabled:opacity-40">
                Approve
              </button>
              <button disabled={busy === item.id} onClick={() => act(item.id, 'reject')}
                className="flex-1 min-h-[44px] rounded-lg bg-[#FF2D6B]/10 text-[#FF2D6B] border border-[#FF2D6B]/30 text-sm font-semibold disabled:opacity-40">
                Reject
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
