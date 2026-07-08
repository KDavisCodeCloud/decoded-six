'use client'

import { CATEGORY_COLORS } from './MarkerPopup'

const CATEGORIES = [
  { key: 'money_spot',     label: 'Money Spots' },
  { key: 'vehicle_spawn',  label: 'Vehicles' },
  { key: 'property',       label: 'Properties' },
  { key: 'heist',          label: 'Heists' },
  { key: 'mission_start',  label: 'Missions' },
  { key: 'weapon_pickup',  label: 'Weapons' },
  { key: 'health_armor',   label: 'Health / Armor' },
  { key: 'collectible',    label: 'Collectibles' },
  { key: 'landmark',       label: 'Landmarks' },
  { key: 'daily_location', label: 'Daily' },
]

interface CategoryFilterProps {
  selected: Set<string>
  onToggle: (category: string) => void
  onClearAll: () => void
}

export function CategoryFilter({ selected, onToggle, onClearAll }: CategoryFilterProps) {
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

      <div className="flex flex-col gap-1">
        {CATEGORIES.map(cat => {
          const active = !hasFilter || selected.has(cat.key)
          const color = CATEGORY_COLORS[cat.key] ?? '#ffffff'
          return (
            <button
              key={cat.key}
              onClick={() => onToggle(cat.key)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-all ${
                active
                  ? 'text-bright hover:bg-white/[0.04]'
                  : 'text-whisper opacity-40 hover:opacity-60'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: active ? color : '#5a5270' }}
              />
              {cat.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
