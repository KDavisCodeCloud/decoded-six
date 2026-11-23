'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Article } from '@/lib/types'

// HITL card block for launch guides (2026-11-23): what Kelvin needs to judge a
// guide before approving -- body vs FAQ words (FAQ never counts), floor
// pass/fail, the 2-source check per key claim, single-source flags, video picks,
// screenshot slots (the per-article shot list), internal links, map pins.

const FLOORS: Record<string, number> = { guide: 1200, guide_hub: 1800 }

function words(s: string) {
  return s.split(/\s+/).filter(t => /[\p{L}\p{N}]/u.test(t)).length
}

function mmss(sec?: number | null) {
  const s = Math.max(0, Math.floor(sec ?? 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function GuideReviewPanel({ article, compact = false }: { article: Article; compact?: boolean }) {
  const [pins, setPins] = useState<{ id: string; name: string; category: string }[] | null>(null)
  const isGuide = article.article_type === 'guide' || article.article_type === 'guide_hub'

  useEffect(() => {
    if (!isGuide || compact) return
    createClient()
      .from('map_markers')
      .select('id, name, category')
      .eq('linked_article_id', article.id)
      .then(({ data }) => setPins(data ?? []))
  }, [article.id, isGuide, compact])

  if (!isGuide) return null

  const floor = FLOORS[article.article_type ?? 'guide']
  const body = article.word_count ?? 0
  const faqWords = (article.faq_pairs ?? []).reduce((n, p) => n + words(`${p.question} ${p.answer}`), 0)
  const claims = article.claim_verification ?? []
  const verified = claims.filter(c => c.status === 'verified')
  const single = claims.filter(c => c.status === 'single_source')
  const conflicts = claims.filter(c => c.status === 'conflict')
  const slots = article.screenshot_slots ?? []
  const filled = slots.filter(s => s.status === 'filled').length
  const videos = article.video_embeds ?? []
  const pass = body >= floor

  const chip = (ok: boolean) => (ok ? 'border-[#3fd17a]/40 text-[#3fd17a]' : 'border-neon-pink/40 text-neon-pink')

  return (
    <div className="mb-3 space-y-3 rounded-lg border border-gta-gold/20 bg-gta-gold/[0.03] p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2 font-mono">
        <span className={`rounded border px-1.5 py-0.5 ${chip(pass)}`}>
          BODY {body.toLocaleString()} / {floor.toLocaleString()} {pass ? 'PASS' : 'FAIL'}
        </span>
        <span className="rounded border border-white/10 px-1.5 py-0.5 text-whisper">FAQ {faqWords} (not counted)</span>
        <span className={`rounded border px-1.5 py-0.5 ${chip(verified.length >= 8)}`}>{verified.length} claims 2-source</span>
        <span className={`rounded border px-1.5 py-0.5 ${chip(single.length === 0)}`}>{single.length} single-source</span>
        {conflicts.length > 0 && <span className="rounded border border-gta-gold/40 px-1.5 py-0.5 text-gta-gold">{conflicts.length} conflicts</span>}
        <span className="rounded border border-white/10 px-1.5 py-0.5 text-quiet">{videos.length} videos</span>
        <span className={`rounded border px-1.5 py-0.5 ${chip(filled === slots.length)}`}>shots {filled}/{slots.length}</span>
        <span className="rounded border border-white/10 px-1.5 py-0.5 text-quiet">{(article.sources ?? []).length} sources</span>
      </div>

      {!compact && (
        <>
          {(single.length > 0 || conflicts.length > 0) && (
            <div>
              <p className="mb-1 font-bold text-neon-pink">Check before approving: these appear labeled as unverified or disputed</p>
              <ul className="list-disc space-y-1 pl-4 text-quiet">
                {[...single, ...conflicts].map((c, i) => (
                  <li key={i}>
                    <span className="uppercase text-whisper">[{c.status.replace('_', ' ')}]</span> {c.claim}{' '}
                    {c.sources.map((u, j) => <a key={j} href={u} target="_blank" rel="noopener noreferrer" className="text-ice hover:underline">[{j + 1}]</a>)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <details>
            <summary className="cursor-pointer text-gta-gold">Verified claims ({verified.length})</summary>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-quiet">
              {verified.map((c, i) => (
                <li key={i}>{c.claim}{' '}
                  {c.sources.map((u, j) => <a key={j} href={u} target="_blank" rel="noopener noreferrer" className="text-ice hover:underline">[{j + 1}]</a>)}
                </li>
              ))}
            </ul>
          </details>

          {videos.length > 0 && (
            <div>
              <p className="mb-1 font-bold text-gta-gold">Video picks (embedded at the timestamp)</p>
              <ul className="space-y-1 text-quiet">
                {videos.map((v, i) => (
                  <li key={i}>
                    {i + 1}.{' '}
                    <a href={`https://www.youtube.com/watch?v=${v.video_id}&t=${Math.floor(v.start_seconds ?? 0)}s`} target="_blank" rel="noopener noreferrer" className="text-ice hover:underline">
                      {v.title || v.video_id}
                    </a>{' '}
                    · {v.channel_name} · starts {mmss(v.start_seconds)}
                    {v.status === 'broken' && <span className="ml-1 text-neon-pink">BROKEN</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {slots.length > 0 && (
            <div>
              <p className="mb-1 font-bold text-gta-gold">Shot list ({slots.length - filled} to capture)</p>
              <ol className="list-decimal space-y-1 pl-4 text-quiet">
                {slots.map(s => (
                  <li key={s.filename}>
                    <span className={s.status === 'filled' ? 'text-[#3fd17a]' : ''}>{s.shot}</span>{' '}
                    <code className="text-whisper">{s.filename}</code>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-quiet">
            <span>Internal links: {(article.internal_links_used ?? []).join(', ') || 'none (series nav renders hub/sibling links)'}</span>
            <span>Hub: {article.hub_slug ?? (article.article_type === 'guide_hub' ? 'this is the hub' : 'none')}</span>
            <span>Map pins linked: {pins === null ? '…' : pins.length ? pins.map(p => p.name).join(', ') : 'none yet'}</span>
          </div>

          <details>
            <summary className="cursor-pointer text-gta-gold">Sources ({(article.sources ?? []).length})</summary>
            <ul className="mt-1 space-y-0.5">
              {(article.sources ?? []).map(s => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-ice hover:underline">{s.outlet || s.url}</a> <span className="text-whisper">{s.published}</span></li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  )
}
