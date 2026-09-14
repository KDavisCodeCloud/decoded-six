'use client'

import { useState } from 'react'

interface DayPoint { date: string; views: number; visitors: number }

interface Props {
  daily7: DayPoint[]
  daily28: DayPoint[]
}

const WIDTH = 800
const HEIGHT = 180
const PADDING = 24

// No chart library in this repo (per CLAUDE.md: don't add one without
// being asked) -- lightweight inline SVG, two overlaid bar series.
export function DailyChart({ daily7, daily28 }: Props) {
  const [range, setRange] = useState<'7' | '28'>('7')
  const points = range === '7' ? daily7 : daily28

  const maxViews = Math.max(1, ...points.map(p => p.views))
  const barWidth = (WIDTH - PADDING * 2) / points.length
  const chartHeight = HEIGHT - PADDING * 2

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-whisper uppercase tracking-widest">
          Daily Visitors &amp; Pageviews
        </div>
        <div className="flex gap-1">
          {(['7', '28'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{ minHeight: 32 }}
              className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                range === r
                  ? 'border-gta-gold/60 text-gta-gold bg-gta-gold/10'
                  : 'border-dash-border text-quiet hover:text-bright'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: 180 }}>
        {/* Baseline */}
        <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} stroke="#2a2438" strokeWidth={1} />

        {points.map((p, i) => {
          const x = PADDING + i * barWidth
          const viewsH = (p.views / maxViews) * chartHeight
          const visitorsH = (p.visitors / maxViews) * chartHeight
          const barGap = 2
          const halfW = (barWidth - barGap * 3) / 2

          return (
            <g key={p.date}>
              <rect
                x={x + barGap}
                y={HEIGHT - PADDING - viewsH}
                width={halfW}
                height={viewsH}
                fill="#C8A84B"
                opacity={0.85}
              >
                <title>{p.date}: {p.views} pageviews</title>
              </rect>
              <rect
                x={x + barGap * 2 + halfW}
                y={HEIGHT - PADDING - visitorsH}
                width={halfW}
                height={visitorsH}
                fill="#00f0ff"
                opacity={0.85}
              >
                <title>{p.date}: {p.visitors} visitors</title>
              </rect>
              {(points.length <= 7 || i % Math.ceil(points.length / 7) === 0) && (
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT - 4}
                  fontSize={9}
                  fill="#5a5270"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {p.date.slice(5)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div className="flex items-center gap-4 mt-2 text-[10px] text-whisper">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#C8A84B' }} /> Pageviews
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: '#00f0ff' }} /> Visitors
        </span>
      </div>
    </div>
  )
}
