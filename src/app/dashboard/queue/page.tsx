'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase-browser'
import GTAOverlay, { type OverlayType } from '@/components/dashboard/GTAOverlay'
import { soundManager, SoundEvents } from '@/lib/sounds'
import { ArticleMarkdown } from '@/components/shared/ArticleMarkdown'
import type { Article } from '@/lib/types'

type GenerateStatus = 'idle' | 'running' | 'queued' | 'error'
type ArticleTypeOption = 'news' | 'evergreen' | 'conversion'

type QueueStatus = 'pending_review' | 'needs_revision'

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

const CAT_BADGE: Record<string, string> = {
  news: 'bg-ice/15 text-ice',
  rumor: 'bg-flame/15 text-flame',
  guide: 'bg-gta-gold/15 text-gta-gold',
}


function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

// Full-screen WYSIWYG preview — mirrors the public article page
function ArticlePreview({
  article,
  processing,
  onApprove,
  onReject,
  onRevise,
  onClose,
}: {
  article: Article
  processing: boolean
  onApprove: () => void
  onReject: () => void
  onRevise: (notes: string) => void
  onClose: () => void
}) {
  const [revisionMode, setRevisionMode] = useState(false)
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 z-50 bg-void overflow-y-auto">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-sm border-b border-white/[0.06] px-6 py-3 flex items-center justify-between gap-4">
        <span className="text-xs font-mono text-whisper uppercase tracking-widest">
          Preview — {article.word_count?.toLocaleString()} words
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {revisionMode ? (
            <>
              <input
                autoFocus
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What needs to change?"
                className="text-xs bg-transparent border border-gta-gold/40 rounded-lg px-3 py-1.5 text-quiet placeholder:text-whisper focus:outline-none w-64"
              />
              <button
                onClick={() => { if (notes.trim()) { onRevise(notes); setRevisionMode(false) } }}
                disabled={!notes.trim() || processing}
                className="text-xs px-3 py-1.5 rounded-lg bg-gta-gold/20 text-gta-gold border border-gta-gold/30 hover:bg-gta-gold/30 disabled:opacity-40 transition-colors"
              >
                Send for Revision
              </button>
              <button
                onClick={() => setRevisionMode(false)}
                className="text-xs px-3 py-1.5 border border-dash-border text-quiet rounded-lg hover:text-bright transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onApprove}
                disabled={processing}
                className="text-xs px-4 py-1.5 rounded-lg bg-[#3fd17a]/20 text-[#3fd17a] border border-[#3fd17a]/40 hover:bg-[#3fd17a]/30 disabled:opacity-40 transition-colors font-semibold"
              >
                ✓ Approve
              </button>
              <button
                onClick={() => setRevisionMode(true)}
                disabled={processing}
                className="text-xs px-4 py-1.5 rounded-lg border border-gta-gold/40 text-gta-gold hover:bg-gta-gold/10 transition-colors"
              >
                Revise
              </button>
              <button
                onClick={onReject}
                disabled={processing}
                className="text-xs px-4 py-1.5 rounded-lg bg-neon-pink/10 text-neon-pink border border-neon-pink/30 hover:bg-neon-pink/20 disabled:opacity-40 transition-colors"
              >
                ✕ Reject
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 border border-dash-border text-quiet rounded-lg hover:text-bright transition-colors ml-2"
          >
            ← Back to queue
          </button>
        </div>
      </div>

      {/* Article body — same structure as public news/[slug]/page.tsx */}
      <article className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${CAT_BADGE[article.category] ?? 'bg-white/10 text-quiet'}`}>
              {article.category}
            </span>
            {article.article_type && (
              <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${TYPE_CLASS[article.article_type] ?? 'border-quiet/30 text-quiet'}`}>
                {TYPE_LABEL[article.article_type] ?? article.article_type}
              </span>
            )}
            {article.status === 'needs_revision' && (
              <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-neon-pink/30 text-neon-pink">
                Needs Revision
              </span>
            )}
          </div>

          <h1 className="font-heading font-bold text-4xl md:text-5xl text-bright leading-tight mb-4">
            {article.title}
          </h1>

          <div className="flex items-center gap-4 text-whisper text-sm flex-wrap">
            <time dateTime={article.created_at}>{fmtDate(article.created_at)}</time>
            {article.external_citation && (
              <a
                href={article.external_citation}
                target="_blank"
                rel="noopener noreferrer"
                className="text-flame hover:underline"
              >
                Source →
              </a>
            )}
          </div>
        </div>

        <div className="h-px bg-white/[0.06] mb-8" />

        {article.hitl_notes && (
          <div className="mb-6 text-xs text-neon-pink bg-neon-pink/5 border border-neon-pink/20 rounded p-3">
            <span className="font-bold">Revision notes:</span> {article.hitl_notes}
          </div>
        )}

        {article.excerpt && (
          <p className="text-xl text-quiet leading-relaxed mb-8 font-medium">
            {article.excerpt}
          </p>
        )}

        {article.content && (
          <ArticleMarkdown content={article.content} stripFaq />
        )}

        {article.faq_pairs && article.faq_pairs.length > 0 && (
          <section className="mt-10 border-t border-white/[0.06] pt-8">
            <h2 className="font-heading font-bold text-2xl text-bright mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-5">
              {article.faq_pairs.map((pair, i) => (
                <div key={i} className="border border-white/[0.06] rounded-xl p-5">
                  <h3 className="font-heading font-bold text-base text-bright mb-2">{pair.question}</h3>
                  <p className="text-quiet text-sm leading-relaxed">{pair.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}

export default function QueuePage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [overlay, setOverlay] = useState<{ type: OverlayType; reward?: string } | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [previewArticle, setPreviewArticle] = useState<Article | null>(null)
  const [revisionNotes, setRevisionNotes] = useState<Record<string, string>>({})
  const [statusFilter, setStatusFilter] = useState<'all' | QueueStatus>('all')

  // Article generator panel
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateType, setGenerateType] = useState<ArticleTypeOption>('news')
  const [generateSeed, setGenerateSeed] = useState('')
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>('idle')
  const [generateError, setGenerateError] = useState<string | null>(null)
  const generateSeedRef = useRef<HTMLInputElement>(null)

  async function fetchQueue() {
    const supabase = createClient()
    const { data } = await supabase
      .from('articles')
      .select('*')
      .eq('product_id', 'gta-hub')
      .in('status', ['pending_review', 'needs_revision'])
      .order('created_at', { ascending: true })
    setArticles((data as Article[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchQueue()
    const supabase = createClient()
    const channel = supabase
      .channel('queue-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'articles',
        filter: 'product_id=eq.gta-hub',
      }, () => { fetchQueue() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function callReview(articleId: string, action: 'approve' | 'reject' | 'revise', notes?: string) {
    const res = await fetch(`/api/articles/${articleId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error ?? 'Review action failed')
    }
    return res.json()
  }

  const handleApprove = useCallback(async (article: Article) => {
    setProcessing(article.id)
    try {
      await callReview(article.id, 'approve')
      soundManager.play(SoundEvents.ARTICLE_APPROVED)
      setOverlay({ type: 'mission-passed', reward: 'ARTICLE SECURED' })
      setArticles(prev => prev.filter(a => a.id !== article.id))
      setPreviewArticle(null)
    } catch (err) {
      console.error('Approve failed:', err)
    } finally {
      setProcessing(null)
    }
  }, [])

  const handleRevision = useCallback(async (article: Article, notes: string) => {
    if (!notes.trim()) return
    setProcessing(article.id)
    try {
      await callReview(article.id, 'revise', notes)
      setArticles(prev => prev.map(a =>
        a.id === article.id ? { ...a, status: 'needs_revision', hitl_notes: notes } : a
      ))
      setRevisionNotes(prev => { const n = { ...prev }; delete n[article.id]; return n })
      setExpanded(null)
      setPreviewArticle(null)
    } catch (err) {
      console.error('Revision failed:', err)
    } finally {
      setProcessing(null)
    }
  }, [])

  const handleReject = useCallback(async (article: Article) => {
    setProcessing(article.id)
    try {
      await callReview(article.id, 'reject')
      soundManager.play(SoundEvents.ARTICLE_REJECTED_SOFT, { volume: 0.4 })
      setOverlay({ type: 'wasted' })
      setArticles(prev => prev.filter(a => a.id !== article.id))
      setPreviewArticle(null)
    } catch (err) {
      console.error('Reject failed:', err)
    } finally {
      setProcessing(null)
    }
  }, [])

  const handleGenerate = useCallback(async () => {
    setGenerateStatus('running')
    setGenerateError(null)
    try {
      const res = await fetch('/api/agents/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'dsx-ca1',
          article_type: generateType,
          topic_seed: generateSeed.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error ?? `Agent returned ${res.status}`)
      }
      setGenerateStatus('queued')
      setGenerateSeed('')
      setGenerateType('news')
      // Article will appear via realtime subscription — no manual refresh needed
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Unknown error')
      setGenerateStatus('error')
    }
  }, [generateType, generateSeed])

  const visible = statusFilter === 'all'
    ? articles
    : articles.filter(a => a.status === statusFilter)

  const pending = articles.filter(a => a.status === 'pending_review').length
  const revision = articles.filter(a => a.status === 'needs_revision').length

  return (
    <>
      <GTAOverlay type={overlay?.type ?? null} reward={overlay?.reward} onDismiss={() => setOverlay(null)} />

      {/* Full-screen article preview */}
      {previewArticle && (
        <ArticlePreview
          article={previewArticle}
          processing={processing === previewArticle.id}
          onApprove={() => handleApprove(previewArticle)}
          onReject={() => handleReject(previewArticle)}
          onRevise={(notes) => handleRevision(previewArticle, notes)}
          onClose={() => setPreviewArticle(null)}
        />
      )}

      <div className="p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-pricedown text-gta-gold text-3xl leading-none">HITL QUEUE</h1>
            <p className="text-quiet text-sm mt-1">
              {loading ? 'Loading...' : `${pending} pending review · ${revision} needs revision`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {(['all', 'pending_review', 'needs_revision'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    statusFilter === f
                      ? 'border-gta-gold/60 text-gta-gold bg-gta-gold/10'
                      : 'border-dash-border text-quiet hover:text-bright'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'pending_review' ? 'Pending' : 'Needs Revision'}
                </button>
              ))}
            </div>
            <button
              onClick={fetchQueue}
              className="text-xs text-quiet hover:text-bright border border-dash-border rounded-lg px-3 py-2 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => {
                setGenerateOpen(o => !o)
                setGenerateStatus('idle')
                setGenerateError(null)
              }}
              className={`text-xs px-3 py-2 rounded-lg border transition-colors font-semibold ${
                generateOpen
                  ? 'border-[#3fd17a]/60 text-[#3fd17a] bg-[#3fd17a]/10'
                  : 'border-[#3fd17a]/40 text-[#3fd17a] hover:bg-[#3fd17a]/10'
              }`}
            >
              + Generate Article
            </button>
          </div>
        </div>

        {/* Generate Article panel */}
        {generateOpen && (
          <div className="dash-card p-5 mb-6 border-[#3fd17a]/20">
            <p className="text-xs text-whisper uppercase tracking-widest mb-4 font-semibold">Generate Article Now</p>
            <div className="flex flex-wrap items-end gap-4">
              {/* Article type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-whisper uppercase tracking-wider">Type</label>
                <div className="flex gap-1">
                  {(['news', 'evergreen', 'conversion'] as ArticleTypeOption[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setGenerateType(t)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                        generateType === t
                          ? 'border-gta-gold/60 text-gta-gold bg-gta-gold/10'
                          : 'border-dash-border text-quiet hover:text-bright'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic seed */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                <label className="text-[10px] text-whisper uppercase tracking-wider">
                  Topic Seed <span className="normal-case opacity-60">(optional — agent picks if empty)</span>
                </label>
                <input
                  ref={generateSeedRef}
                  type="text"
                  value={generateSeed}
                  onChange={e => setGenerateSeed(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && generateStatus === 'idle') handleGenerate() }}
                  placeholder="e.g. GTA 6 release date, Lucia character guide..."
                  maxLength={300}
                  disabled={generateStatus === 'running'}
                  className="text-sm bg-transparent border border-dash-border rounded-lg px-3 py-2 text-quiet placeholder:text-whisper focus:outline-none focus:border-gta-gold/40 disabled:opacity-50"
                />
              </div>

              {/* Fire button */}
              <button
                onClick={handleGenerate}
                disabled={generateStatus === 'running'}
                className={`text-sm px-5 py-2 rounded-lg border font-semibold transition-colors shrink-0 ${
                  generateStatus === 'running'
                    ? 'border-[#3fd17a]/30 text-[#3fd17a]/50 cursor-not-allowed'
                    : 'border-[#3fd17a]/60 text-[#3fd17a] bg-[#3fd17a]/10 hover:bg-[#3fd17a]/20'
                }`}
              >
                {generateStatus === 'running' ? 'Running…' : 'Run Agent'}
              </button>
            </div>

            {/* Status feedback */}
            {generateStatus === 'queued' && (
              <p className="mt-3 text-xs text-[#3fd17a]">
                Agent queued. Article will appear in the queue in ~2–3 minutes via realtime.
              </p>
            )}
            {generateStatus === 'error' && generateError && (
              <p className="mt-3 text-xs text-neon-pink">
                Error: {generateError}
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="dash-card p-8 text-center text-quiet text-sm">Loading queue...</div>
        )}

        {!loading && visible.length === 0 && (
          <div className="dash-card p-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-heading font-bold text-bright mb-2">Queue is empty</h2>
            <p className="text-quiet text-sm">No articles awaiting review.</p>
          </div>
        )}

        <div className="space-y-4">
          {visible.map(article => (
            <div key={article.id} className={`dash-card p-6 ${
              article.status === 'needs_revision' ? 'border-l-2 border-l-neon-pink' : ''
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {article.article_type && (
                      <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                        TYPE_CLASS[article.article_type] ?? 'border-quiet/30 text-quiet'
                      }`}>
                        {TYPE_LABEL[article.article_type] ?? article.article_type}
                      </span>
                    )}
                    <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                      article.category === 'news'  ? 'border-ice/30 text-ice' :
                      article.category === 'guide' ? 'border-gta-gold/30 text-gta-gold' :
                      'border-quiet/30 text-quiet'
                    }`}>
                      {article.category}
                    </span>
                    {article.status === 'needs_revision' && (
                      <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-neon-pink/30 text-neon-pink">
                        Needs Revision
                      </span>
                    )}
                    {article.word_count && (
                      <span className="text-[10px] text-whisper font-mono">{article.word_count.toLocaleString()} words</span>
                    )}
                    {article.agent_generated && (
                      <span className="text-[10px] text-whisper">🤖 agent</span>
                    )}
                  </div>

                  <h3 className="font-heading font-bold text-bright text-base mb-2 leading-snug">
                    {article.title}
                  </h3>

                  {article.excerpt && (
                    <p className="text-quiet text-sm leading-relaxed mb-3">
                      {article.excerpt}
                    </p>
                  )}

                  {article.hitl_notes && (
                    <div className="text-xs text-neon-pink bg-neon-pink/5 border border-neon-pink/20 rounded p-2 mb-2">
                      <span className="font-bold">Revision notes:</span> {article.hitl_notes}
                    </div>
                  )}

                  {article.external_citation && (
                    <a
                      href={article.external_citation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-ice hover:underline block truncate mb-3"
                    >
                      Source: {article.external_citation}
                    </a>
                  )}

                  <button
                    onClick={() => setPreviewArticle(article)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gta-gold/40 text-gta-gold hover:bg-gta-gold/10 transition-colors"
                  >
                    Preview Article →
                  </button>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(article)}
                    disabled={processing === article.id}
                    className="dash-btn-approve disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setExpanded(expanded === article.id ? null : article.id)}
                    disabled={processing === article.id}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gta-gold/40 text-gta-gold hover:bg-gta-gold/10 transition-colors"
                  >
                    {expanded === article.id ? 'Cancel' : 'Revise'}
                  </button>
                  <button
                    onClick={() => handleReject(article)}
                    disabled={processing === article.id}
                    className="dash-btn-reject disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {expanded === article.id && (
                <div className="mt-4 pt-4 border-t border-dash-border">
                  <textarea
                    value={revisionNotes[article.id] ?? ''}
                    onChange={e => setRevisionNotes(prev => ({ ...prev, [article.id]: e.target.value }))}
                    placeholder="What needs to change? Be specific — the agent reads this on the next run."
                    rows={3}
                    className="w-full bg-transparent border border-dash-border rounded-lg p-3 text-sm text-quiet placeholder:text-whisper focus:outline-none focus:border-gta-gold/40 resize-none"
                  />
                  <button
                    onClick={() => handleRevision(article, revisionNotes[article.id] ?? '')}
                    disabled={!revisionNotes[article.id]?.trim() || processing === article.id}
                    className="mt-2 text-xs px-4 py-2 rounded-lg bg-gta-gold/20 text-gta-gold border border-gta-gold/30 hover:bg-gta-gold/30 disabled:opacity-40 transition-colors"
                  >
                    Send for Revision
                  </button>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-dash-border text-xs text-whisper">
                Created {new Date(article.created_at).toLocaleString()}
                {article.publish_date && ` · Scheduled ${article.publish_date}`}
                {article.faq_pairs && ` · ${article.faq_pairs.length} FAQ pairs`}
                {article.internal_links_used && ` · ${article.internal_links_used.length} internal links`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
