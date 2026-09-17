'use client'

import { useState } from 'react'
import { soundManager, SoundEvents } from '@/lib/sounds'

export interface TopicCandidate {
  id: string
  topic: string
  angle: string
  source_urls: string[]
  score: number
  suggested_article_type: string | null
  suggested_template_variant: string | null
  update_of: string | null
  created_at: string
}

interface Props {
  candidates: TopicCandidate[]
}

const TYPE_LABEL: Record<string, string> = {
  news: 'NEWS', breaking_news: 'BREAKING', feature: 'FEATURE',
  evergreen: 'EVERGREEN', conversion: 'CONVERSION', exclusive: 'EXCLUSIVE', deep_dive: 'DEEP DIVE',
}

export function TopicQueueSection({ candidates: initial }: Props) {
  const [candidates, setCandidates] = useState(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedTopic, setEditedTopic] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  async function review(id: string, action: 'approve' | 'reject', editedTopicValue?: string) {
    setProcessing(id)
    try {
      const res = await fetch(`/api/discovery/candidates/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, edited_topic: editedTopicValue }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? 'Review failed')
      }
      soundManager.play(action === 'approve' ? SoundEvents.ARTICLE_APPROVED : SoundEvents.ARTICLE_REJECTED_SOFT, { volume: 0.5 })
      setCandidates(prev => prev.filter(c => c.id !== id))
      setEditingId(null)
    } catch (err) {
      console.error('Topic review failed:', err)
    } finally {
      setProcessing(null)
    }
  }

  if (candidates.length === 0) return null

  return (
    <div className="px-8 pt-8">
      <div className="dash-card p-5 mb-2 border-gta-gold/20">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="font-pricedown text-gta-gold text-xl leading-none">TOPIC QUEUE</h2>
            <p className="text-quiet text-xs mt-1">
              {candidates.length} proposed from discovery — approve before generation, not after
            </p>
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{ minHeight: 44 }}
            className="text-xs text-quiet hover:text-bright border border-dash-border rounded-lg px-3 py-2 transition-colors"
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        </div>

        {!collapsed && (
          <div className="space-y-3 mt-4">
            {candidates.map(c => (
              <div key={c.id} className="rounded-xl border border-dash-border p-4" style={{ background: '#0d0d0d' }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gta-gold">score {c.score.toFixed(1)}</span>
                    {c.suggested_article_type && (
                      <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-ice/30 text-ice">
                        {TYPE_LABEL[c.suggested_article_type] ?? c.suggested_article_type}
                      </span>
                    )}
                    {c.suggested_template_variant && (
                      <span className="text-[10px] text-whisper border border-white/[0.06] px-1.5 py-0.5 rounded">
                        template {c.suggested_template_variant}
                      </span>
                    )}
                    {c.update_of && (
                      <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-neon-pink/30 text-neon-pink">
                        update of {c.update_of}
                      </span>
                    )}
                    <span className="text-[10px] text-whisper">{c.source_urls.length} source{c.source_urls.length === 1 ? '' : 's'}</span>
                  </div>
                </div>

                {editingId === c.id ? (
                  <input
                    autoFocus
                    value={editedTopic}
                    onChange={e => setEditedTopic(e.target.value)}
                    style={{ fontSize: 16, minHeight: 44 }}
                    className="w-full bg-transparent border border-gta-gold/40 rounded-lg px-3 py-2 text-bright mb-2 focus:outline-none"
                  />
                ) : (
                  <h3 className="font-heading font-bold text-bright text-base leading-snug mb-1">{c.topic}</h3>
                )}

                <p className="text-quiet text-sm leading-relaxed mb-2">
                  <span className="text-whisper uppercase text-[10px] tracking-widest mr-1">What&apos;s new:</span>
                  {c.angle}
                </p>

                <div className="flex flex-wrap gap-2 mb-3">
                  {c.source_urls.slice(0, 5).map(url => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-ice hover:underline truncate max-w-[200px]"
                    >
                      {new URL(url).hostname.replace('www.', '')} →
                    </a>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => review(c.id, 'approve', editingId === c.id ? editedTopic : undefined)}
                    disabled={processing === c.id}
                    className="dash-btn-approve disabled:opacity-40"
                  >
                    Approve
                  </button>
                  {editingId === c.id ? (
                    <button
                      onClick={() => setEditingId(null)}
                      style={{ minHeight: 44 }}
                      className="text-xs px-3 py-1.5 border border-dash-border text-quiet rounded-lg hover:text-bright transition-colors"
                    >
                      Cancel edit
                    </button>
                  ) : (
                    <button
                      onClick={() => { setEditingId(c.id); setEditedTopic(c.topic) }}
                      style={{ minHeight: 44 }}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gta-gold/40 text-gta-gold hover:bg-gta-gold/10 transition-colors"
                    >
                      Edit then approve
                    </button>
                  )}
                  <button
                    onClick={() => review(c.id, 'reject')}
                    disabled={processing === c.id}
                    className="dash-btn-reject disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
