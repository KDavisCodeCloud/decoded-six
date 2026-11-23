import { supabase } from '@/lib/supabase'
import { CATEGORY_LABELS } from '@/components/map/MarkerPopup'
import type { Article } from '@/lib/types'

// Launch-guide page blocks (2026-11-23). Server components, data from Supabase.
// Hub/spoke/sibling links are built here from guide_group, and only list
// PUBLISHED guides. A guide approved later appears in every sibling's nav on
// that sibling's next revalidation (review/route.ts revalidates the whole
// group on approve), so no page ever links to an unpublished draft (a 404).

type SeriesRow = Pick<Article, 'id' | 'slug' | 'title' | 'article_type'>

export async function getGuideSeries(group: string | null | undefined): Promise<SeriesRow[]> {
  if (!group) return []
  const { data } = await supabase
    .from('articles')
    .select('id, slug, title, article_type')
    .eq('status', 'published')
    .eq('category', 'guide')
    .eq('guide_group', group)
    .order('published_at', { ascending: true })
  const rows = (data as SeriesRow[] | null) ?? []
  return [...rows.filter(r => r.article_type === 'guide_hub'), ...rows.filter(r => r.article_type !== 'guide_hub')]
}

const GROUP_LABEL: Record<string, string> = {
  missables: 'Missables & Points of No Return',
  robberies: 'Robberies',
  weapons: 'Unique Weapons',
  vehicles: 'Rare Cars',
}

export function GuideSeriesNav({ series, currentId, group, prefix }: {
  series: SeriesRow[]; currentId: string; group: string; prefix: string
}) {
  const others = series.filter(s => s.id !== currentId)
  if (others.length === 0) return null
  return (
    <nav aria-label="Guides in this series" className="mt-10 rounded-xl border border-white/[0.06] p-5" style={{ background: '#0d0d0d' }}>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: '#f5a623' }}>
        GTA 6 {GROUP_LABEL[group] ?? 'Guides'}: the full series
      </p>
      <ul className="space-y-2">
        {others.map(s => (
          <li key={s.id}>
            <a href={`${prefix}/guides/${s.slug}`} className="text-flame hover:underline underline-offset-2">
              {s.article_type === 'guide_hub' ? `${s.title} (start here)` : s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

type PinRow = { id: string; name: string; category: string; area_name: string | null }

export async function getLinkedPins(articleId: string): Promise<PinRow[]> {
  const { data } = await supabase
    .from('map_markers')
    .select('id, name, category, area_name')
    .eq('linked_article_id', articleId)
    .eq('status', 'published')
    .order('name')
    .limit(12)
  return (data as PinRow[] | null) ?? []
}

export function OnTheMap({ pins, prefix }: { pins: PinRow[]; prefix: string }) {
  return (
    <section className="mt-10 rounded-xl border p-5" style={{ background: '#0b1120', borderColor: 'rgba(90,150,255,0.25)' }}>
      <h2 className="mb-2 font-heading text-xl font-bold text-bright">On the map</h2>
      {pins.length > 0 ? (
        <>
          <p className="mb-3 text-sm text-quiet">Every spot in this guide is pinned on the DecodedSix interactive map of Leonida.</p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {pins.map(p => (
              <li key={p.id}>
                <a href={`${prefix}/map?marker=${p.id}`} className="text-sm hover:underline" style={{ color: '#5a96ff' }}>
                  {p.name}
                </a>
                <span className="ml-2 font-mono text-[10px] uppercase text-whisper">
                  {CATEGORY_LABELS[p.category] ?? p.category}{p.area_name ? ` · ${p.area_name}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-quiet">
          We add pins only after confirming them, so the spots in this guide appear on the{' '}
          <a href={`${prefix}/map`} className="hover:underline" style={{ color: '#5a96ff' }}>DecodedSix Leonida map</a>{' '}
          as each one is verified.
        </p>
      )}
    </section>
  )
}

export function SourcesList({ sources }: { sources: NonNullable<Article['sources']> }) {
  if (!sources.length) return null
  return (
    <section className="mt-10 border-t border-white/[0.06] pt-6">
      <h2 className="mb-3 font-heading text-lg font-bold text-bright">Sources</h2>
      <p className="mb-3 text-xs text-whisper">Every location, unlock and payout above was checked against at least two of these.</p>
      <ul className="space-y-1.5 text-sm">
        {sources.map(s => (
          <li key={s.url} className="text-quiet">
            <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-flame hover:underline">
              {s.outlet || new URL(s.url).hostname.replace(/^www\./, '')}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
