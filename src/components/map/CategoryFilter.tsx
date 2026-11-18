'use client'

import { CATEGORY_GROUPS, MAP_CATEGORIES } from '@/lib/map-categories'

interface CategoryFilterProps {
  selected: Set<string>
  onToggle: (category: string) => void
  onClearAll: () => void
  /** marker count per category; categories with none are listed but dimmed */
  counts?: Record<string, number>
}

// Grouped Money / Services / Activities / Collectibles / Territory / Landmarks
// (Map Phase 2). Territory has no marker categories -- gang turf is drawn as
// map_areas polygons once the official map lands -- so it only shows when
// something is in it.
export function CategoryFilter({ selected, onToggle, onClearAll, counts }: CategoryFilterProps) {
  const hasFilter = selected.size > 0

  return (
    <div className="bg-panel border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-quiet uppercase tracking-widest">
          Categories
        </span>
        {hasFilter && (
          <button
            onClick={onClearAll}
            className="text-[10px] text-flame hover:text-bright transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {CATEGORY_GROUPS.map(group => {
          const cats = MAP_CATEGORIES.filter(c => c.group === group)
          if (cats.length === 0) return null
          return (
            <div key={group}>
              <div className="text-[9px] font-mono text-whisper uppercase tracking-[0.18em] px-2 mb-1">{group}</div>
              <div className="flex flex-col gap-0.5">
                {cats.map(cat => {
                  const active = !hasFilter || selected.has(cat.key)
                  const n = counts?.[cat.key]
                  return (
                    <button
                      key={cat.key}
                      onClick={() => onToggle(cat.key)}
                      aria-pressed={hasFilter ? selected.has(cat.key) : undefined}
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
