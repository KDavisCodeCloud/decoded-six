'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import type { Article } from '@/lib/types'

// Combined console shot list for every launch guide (2026-11-23), so Kelvin
// can capture everything in one session. Save each capture under the
// filename shown (any extension) and run:
//   python scripts/guide_screenshot_dropin.py <folder>
// Filled slots turn green; queued guides pick them up on approval, published
// ones re-render immediately.

type Row = Pick<Article, 'id' | 'slug' | 'title' | 'status' | 'guide_group' | 'article_type' | 'screenshot_slots'>

const GROUP_ORDER = ['missables', 'robberies', 'weapons', 'vehicles']

export default function ShotListPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    createClient()
      .from('articles')
      .select('id, slug, title, status, guide_group, article_type, screenshot_slots')
      .in('article_type', ['guide', 'guide_hub'])
      .not('status', 'eq', 'archived')
      .then(({ data }) => setRows((data as Row[]) ?? []))
  }, [])

  if (!rows) return <p className="p-6 font-mono text-xs text-whisper">Loading shot list…</p>

  const all = rows.flatMap(r => (r.screenshot_slots ?? []).map(s => ({ ...s, article: r })))
  const todo = all.filter(s => s.status !== 'filled').length
  const groups = GROUP_ORDER.map(g => ({ g, items: rows.filter(r => r.guide_group === g) })).filter(x => x.items.length)

  const copy = (t: string) => { void navigator.clipboard.writeText(t); setCopied(t); setTimeout(() => setCopied(null), 1200) }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="font-heading text-2xl text-gta-gold">Shot List</h1>
        <p className="mt-1 font-mono text-xs text-whisper">
          {todo} of {all.length} screenshots still needed across {rows.length} guides. Name each capture exactly as shown, then run{' '}
          <code className="text-quiet">python scripts/guide_screenshot_dropin.py &lt;folder&gt;</code>
        </p>
      </div>
      {groups.map(({ g, items }) => (
        <section key={g} className="dash-card p-4">
          <h2 className="mb-3 font-heading text-lg uppercase tracking-widest text-bright">{g}</h2>
          <div className="space-y-4">
            {items.map(r => (
              <div key={r.id}>
                <p className="text-sm font-semibold text-bright">
                  {r.title}{' '}
                  <span className="font-mono text-[10px] uppercase text-whisper">{r.status.replace('_', ' ')}</span>
                </p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs">
                  {(r.screenshot_slots ?? []).map(s => (
                    <li key={s.filename} className={s.status === 'filled' ? 'text-[#3fd17a]' : 'text-quiet'}>
                      {s.status === 'filled' ? '✓ ' : ''}{s.shot}{' '}
                      <button onClick={() => copy(s.filename)} className="ml-1 rounded border border-white/10 px-1 font-mono text-[10px] text-whisper hover:text-bright">
                        {copied === s.filename ? 'copied' : s.filename}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
