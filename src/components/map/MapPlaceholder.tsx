'use client'

import { motion } from 'framer-motion'
import { WaitlistSignup } from '@/components/WaitlistSignup'

const CATEGORIES = [
  { label: 'Money Spots', color: '#3fd17a' },
  { label: 'Vehicles', color: '#5a96ff' },
  { label: 'Properties', color: '#C8A84B' },
  { label: 'Heists', color: '#f5a623' },
  { label: 'Missions', color: '#e6358a' },
]

export function MapPlaceholder() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.06]" style={{ minHeight: 480 }}>
      {/* Animated caution tape */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-[-50%]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              #ffcc00 0px,
              #ffcc00 18px,
              #07050d 18px,
              #07050d 36px
            )`,
            backgroundSize: '51px 51px',
            opacity: 0.07,
          }}
          animate={{ backgroundPosition: ['0px 0px', '51px 51px'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-void/50 via-void/75 to-void" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center py-16 px-6 gap-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="text-gold text-[11px] font-mono uppercase tracking-widest">
              Launching with GTA 6
            </span>
          </div>
          <h3 className="font-heading font-bold text-3xl md:text-4xl text-bright mb-2">
            Interactive Map
          </h3>
          <p className="text-quiet text-sm max-w-md mx-auto">
            Every confirmed location, money spot, vehicle spawn, and mission start —
            plotted the moment GTA 6 drops. Join the waitlist to get access first.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map(c => (
            <div
              key={c.label}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-panel border border-white/[0.05] text-xs text-quiet"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </div>
          ))}
        </div>

        <div className="w-full max-w-lg">
          <WaitlistSignup />
        </div>
      </div>
    </div>
  )
}
