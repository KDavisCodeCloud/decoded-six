'use client'

import { useEffect, useState } from 'react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calc(target: string): TimeLeft {
  const diff = Math.max(0, new Date(target).getTime() - Date.now())
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

const UNITS = ['Days', 'Hours', 'Min', 'Sec'] as const

export function Countdown({ targetDate }: { targetDate: string }) {
  const [time, setTime] = useState<TimeLeft | null>(null)

  useEffect(() => {
    setTime(calc(targetDate))
    const id = setInterval(() => setTime(calc(targetDate)), 1000)
    return () => clearInterval(id)
  }, [targetDate])

  if (!time) return null

  const launched = Object.values(time).every(v => v === 0)
  if (launched) {
    return (
      <span className="font-heading font-black text-4xl gradient-text">LAUNCHED</span>
    )
  }

  const values = [time.days, time.hours, time.minutes, time.seconds]

  return (
    <div className="flex items-center gap-2">
      {UNITS.map((unit, i) => (
        <div
          key={unit}
          className="flex flex-col items-center justify-center min-w-[64px] px-3 py-3 rounded-lg border"
          style={{
            background: '#15151c',
            borderColor: 'rgba(255,255,255,0.10)',
          }}
        >
          <span
            className="font-heading font-extrabold text-[26px] leading-none tabular-nums"
            style={{ color: i === 3 ? '#2fc4e8' : '#ffffff' }}
          >
            {String(values[i]).padStart(2, '0')}
          </span>
          <span className="font-ibm text-[9px] font-bold uppercase tracking-[0.12em] mt-1.5 text-[rgba(255,255,255,0.35)]">
            {unit}
          </span>
        </div>
      ))}
    </div>
  )
}
