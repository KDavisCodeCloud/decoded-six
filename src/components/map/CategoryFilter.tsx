'use client'

import { CATEGORY_GROUPS, MAP_CATEGORIES } from '@/lib/map-categories'

interface CategoryFilterProps {
  /** categories switched OFF; everything else is drawn */
  hidden: Set<string>
  onToggle: (category: string) => void
  onShowAll: () => void
  onHideAll: () => void
  /** marker count per category; categories with none are listed but dimmed */
  counts?: Record<string, number>
  /** public map: leave out categories with no pins yet (they appear on their first pin); the dashboard lists all */
  hideEmpty?: boolean
}

// Grouped Money / Services / Activities / Collectibles / Territory / Landmarks
// (Map Phase 2). Territory has no marker categories -- gang turf is drawn as
// map_areas polygons once the official map lands -- so it only shows when
// something is in it.
export function CategoryFilter({ hidden, onToggle, onShowAll, onHideAll, counts, hideEmpty }: CategoryFilterProps) {

  return (
    <div className="bg-panel border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-quiet uppercase tracking-widest">
          Categories
        </span>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <button onClick={onShowAll} className="text-quiet hover:text-bright transition-colors">All on</button>
          <span className="text-whisper">·</span>
          <button onClick={onHideAll} className="text-quiet hover:text-bright transition-colors">All off</button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {CATEGORY_GROUPS.map(group => {
          const cats = MAP_CATEGORIES.filter(c => c.group === group && (!hideEmpty || (counts?.[c.key] ?? 0) > 0))
          if (cats.length === 0) return null
          return (
            <div key={group}>
              <div className="text-[9px] font-mono text-whisper uppercase tracking-[0.18em] px-2 mb-1">{group}</div>
              <div className="flex flex-col gap-0.5">
                {cats.map(cat => {
                  const active = !hidden.has(cat.key)
                  const n = counts?.[cat.key]
                  return (
                    <button
                      key={cat.key}
                      onClick={() => onToggle(cat.key)}
                      role="switch"
                      aria-checked={active}
                      title={active ? `Hide ${cat.label}` : `Show ${cat.label}`}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-all ${
                        active
                          ? 'text-bright hover:bg-white/[0.04]'
                          : 'text-whisper opacity-40 hover:opacity-60'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: active ? cat.color : '#5a5270' }}
                      />
                      <span className="flex-1">{cat.label}</span>
                      {counts && (
                        <span className={`font-mono text-[10px] ${n ? 'text-quiet' : 'text-whisper/50'}`}>{n ?? 0}</span>
                      )}
                      <span aria-hidden className={`relative w-6 h-3.5 rounded-full transition-colors flex-shrink-0 ${active ? '' : 'bg-white/10'}`}
                        style={active ? { backgroundColor: `${cat.color}66` } : undefined}>
                        <span className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all"
                          style={{ left: active ? 12 : 2, backgroundColor: active ? cat.color : '#5a5270' }} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
