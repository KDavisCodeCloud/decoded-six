'use client'

const PRESETS = [0, 10000, 25000, 50000, 100000]

interface MoneyFilterProps {
  minPayout: number
  onChange: (value: number) => void
}

export function MoneyFilter({ minPayout, onChange }: MoneyFilterProps) {
  return (
    <div className="bg-panel border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-quiet uppercase tracking-widest">
          Min Payout/hr
        </span>
        <span className="text-[10px] font-mono text-green">
          {minPayout > 0 ? `$${(minPayout / 1000).toFixed(0)}K+` : 'Any'}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100000}
        step={5000}
        value={minPayout}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 appearance-none bg-raised rounded-full cursor-pointer accent-green mb-3"
      />

      <div className="flex justify-between">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`text-[9px] font-mono transition-colors ${
              minPayout === p ? 'text-green' : 'text-whisper hover:text-quiet'
            }`}
          >
            {p === 0 ? 'Any' : `$${p / 1000}K`}
          </button>
        ))}
      </div>
    </div>
  )
}
