'use client'

import { useState, useEffect, useCallback } from 'react'
import GTAOverlay, { type OverlayType } from '@/components/dashboard/GTAOverlay'
import { soundManager, SoundEvents } from '@/lib/sounds'
import type { HitlQueueItem } from '@/lib/types'

const TYPE_LABEL: Record<string, string> = {
  news: 'NEWS',
  evergreen: 'EVERGREEN',
  conversion: 'CONVERSION',
}

const TYPE_CLASS: Record<string, string> = {
  news: 'border-ice/30 text-ice',
  evergreen: 'border-gta-gold/30 text-gta-gold',
  conversion: 'border-neon-pink/30 text-neon-pink',
}

// NEXT_PUBLIC_-prefixed because this is a 'use client' component — Next.js
// strips non-NEXT_PUBLIC_ vars from the browser bundle, so the server-only
// DECODEDSIX_API_URL/DECODEDSIX_API_KEY (used by n8n, see n8n/README.md)
// aren't reachable here. See .env.example.
const API_URL = process.env.NEXT_PUBLIC_DECODEDSIX_API_URL
const API_KEY = process.env.NEXT_PUBLIC_DECODEDSIX_API_KEY

function apiHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`
  return headers
}

export default function QueuePage() {
  const [items, setItems] = useState<HitlQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<{ type: OverlayType; reward?: string } | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [holdNotes, setHoldNotes] = useState<Record<string, string>>({})

  const fetchQueue = useCallback(async () => {
    if (!API_URL) {
      setError('NEXT_PUBLIC_DECODEDSIX_API_URL is not configured')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/api/hitl-queue`, { headers: apiHeaders() })
      if (!res.ok) throw new Error(await res.text())
      const data: HitlQueueItem[] = await res.json()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  // PATCH /api/hitl-queue/{id} — the sole write path for approve/reject/hold.
  // Approving ALSO fires the separate FastAPI publish endpoint first: the
  // hitl_queue PATCH only ever touches the hitl_queue row (see
  // api/routes/hitl_queue.py's update_hitl_queue_item — it never writes to
  // `articles`), so without this the article itself would never actually go
  // live. Preserved from the pre-hitl_queue flow rather than dropped, since
  // dropping it would silently break publishing.
  const patchQueueItem = useCallback(async (id: string, body: { status: string; action: string; notes?: string }) => {
    const res = await fetch(`${API_URL}/api/hitl-queue/${id}`, {
      method: 'PATCH',
      headers: apiHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await res.text())
  }, [])

  const handleApprove = useCallback(async (item: HitlQueueItem) => {
    setProcessing(item.id)
    try {
      const publishRes = await fetch(`${API_URL}/agents/decodedsix/publish/${item.article_id}`, {
        method: 'POST',
        headers: apiHeaders(),
      })
      if (!publishRes.ok) throw new Error(await publishRes.text())

      await patchQueueItem(item.id, { status: 'approved', action: 'approve' })

      soundManager.play(SoundEvents.ARTICLE_APPROVED)
      setOverlay({ type: 'mission-passed', reward: 'ARTICLE SECURED' })
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed')
    } finally {
      setProcessing(null)
    }
  }, [patchQueueItem])

  const handleHold = useCallback(async (item: HitlQueueItem) => {
    const notes = holdNotes[item.id]?.trim()
    if (!notes) return
    setProcessing(item.id)
    try {
      await patchQueueItem(item.id, { status: 'held', action: 'hold', notes })
      // status='held' — GET /api/hitl-queue only returns status='pending'
      // rows, so this item drops out of the visible queue once held.
      setItems(prev => prev.filter(i => i.id !== item.id))
      setHoldNotes(prev => { const n = { ...prev }; delete n[item.id]; return n })
      setExpanded(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hold failed')
    } finally {
      setProcessing(null)
    }
  }, [holdNotes, patchQueueItem])

  const handleReject = useCallback(async (item: HitlQueueItem) => {
    setProcessing(item.id)
    try {
      await patchQueueItem(item.id, { status: 'rejected', action: 'reject' })
      soundManager.play(SoundEvents.ARTICLE_REJECTED_SOFT, { volume: 0.4 })
      setOverlay({ type: 'wasted' })
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed')
    } finally {
      setProcessing(null)
    }
  }, [patchQueueItem])

  return (
    <>
      <GTAOverlay type={overlay?.type ?? null} reward={overlay?.reward} onDismiss={() => setOverlay(null)} />

      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-pricedown text-gta-gold text-3xl leading-none">HITL QUEUE</h1>
            <p className="text-quiet text-sm mt-1">
              {loading ? 'Loading...' : `${items.length} pending review`}
            </p>
          </div>
          <button
            onClick={fetchQueue}
            className="text-xs text-quiet hover:text-bright border border-dash-border rounded-lg px-3 py-2 transition-colors"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="dash-card p-4 mb-4 border-l-2 border-l-neon-pink text-neon-pink text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="dash-card p-8 text-center text-quiet text-sm">Loading queue...</div>
        )}

        {!loading && items.length === 0 && !error && (
          <div className="dash-card p-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-heading font-bold text-bright mb-2">Queue is empty</h2>
            <p className="text-quiet text-sm">No articles awaiting review.</p>
          </div>
        )}

        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="dash-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {item.articles?.article_type && (
                      <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                        TYPE_CLASS[item.articles.article_type] ?? 'border-quiet/30 text-quiet'
                      }`}>
                        {TYPE_LABEL[item.articles.article_type] ?? item.articles.article_type}
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading font-bold text-bright text-base mb-2 leading-snug">
                    {item.articles?.title ?? '(article not found)'}
                  </h3>

                  {item.notes && (
                    <div className="text-xs text-neon-pink bg-neon-pink/5 border border-neon-pink/20 rounded p-2 mb-2">
                      <span className="font-bold">Notes:</span> {item.notes}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={processing === item.id}
                    className="dash-btn-approve disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    disabled={processing === item.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gta-gold/40 text-gta-gold hover:bg-gta-gold/10 transition-colors"
                  >
                    {expanded === item.id ? 'Cancel' : 'Hold'}
                  </button>
                  <button
                    onClick={() => handleReject(item)}
                    disabled={processing === item.id}
                    className="dash-btn-reject disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {expanded === item.id && (
                <div className="mt-4 pt-4 border-t border-dash-border">
                  <textarea
                    value={holdNotes[item.id] ?? ''}
                    onChange={e => setHoldNotes(prev => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="Why is this on hold? Be specific — the agent reads this on the next run."
                    rows={3}
                    className="w-full bg-transparent border border-dash-border rounded-lg p-3 text-sm text-quiet placeholder:text-whisper focus:outline-none focus:border-gta-gold/40 resize-none"
                  />
                  <button
                    onClick={() => handleHold(item)}
                    disabled={!holdNotes[item.id]?.trim() || processing === item.id}
                    className="mt-2 text-xs px-4 py-2 rounded-lg bg-gta-gold/20 text-gta-gold border border-gta-gold/30 hover:bg-gta-gold/30 disabled:opacity-40 transition-colors"
                  >
                    Put on Hold
                  </button>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-dash-border text-xs text-whisper">
                Created {new Date(item.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
