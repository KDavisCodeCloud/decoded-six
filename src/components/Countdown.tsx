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

export function Countdown({ targetDate, label }: { targetDate: string; label: string }) {
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
      <div className="text-center">
        <span className="font-heading font-bold text-4xl gradient-text">LAUNCHED</span>
      </div>
    )
  }

  const units = [
    { label: 'Days',    value: time.days },
    { label: 'Hours',   value: time.hours },
    { label: 'Minutes', value: time.minutes },
    { label: 'Seconds', value: time.seconds },
  ]

  return (
    <div>
      <p className="text-whisper text-xs uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-center gap-2">
        {units.map(({ label, value }, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="bg-raised border border-white/[0.06] rounded-xl px-4 py-3 text-center min-w-[64px]">
              <div className="font-heading font-bold text-3xl text-bright tabular-nums leading-none">
                {String(value).padStart(2, '0')}
              </div>
              <div className="text-whisper text-[10px] uppercase tracking-widest mt-1">{label}</div>
            </div>
            {i < units.length - 1 && (
              <span className="text-whisper font-bold text-xl leading-none mb-4">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
