'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type OverlayType = 'mission-passed' | 'wasted' | 'big-score' | 'wanted'

interface GTAOverlayProps {
  type: OverlayType | null
  onDismiss: () => void
}

const CONFIGS = {
  'mission-passed': {
    bg: 'from-yellow-950/95 to-dash-bg/95',
    text: 'MISSION PASSED!',
    sub: null,
    textColor: 'text-gta-gold',
    accent: '#C8A84B',
  },
  wasted: {
    bg: 'from-red-950/95 to-dash-bg/95',
    text: 'WASTED',
    sub: 'Article rejected',
    textColor: 'text-red-400',
    accent: '#ef4444',
  },
  'big-score': {
    bg: 'from-emerald-950/95 to-dash-bg/95',
    text: 'THE BIG SCORE',
    sub: 'Gate cleared',
    textColor: 'text-emerald-400',
    accent: '#10b981',
  },
  wanted: {
    bg: 'from-orange-950/95 to-dash-bg/95',
    text: 'COMPLIANCE FLAG',
    sub: 'Manual review required',
    textColor: 'text-orange-400',
    accent: '#f97316',
  },
}

export default function GTAOverlay({ type, onDismiss }: GTAOverlayProps) {
  useEffect(() => {
    if (!type) return
    const t = setTimeout(onDismiss, 2800)
    return () => clearTimeout(t)
  }, [type, onDismiss])

  const config = type ? CONFIGS[type] : null

  return (
    <AnimatePresence>
      {type && config && (
        <motion.div
          key={type}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b ${config.bg} backdrop-blur-sm`}
          onClick={onDismiss}
        >
          <motion.div
            initial={{ y: 40, scale: 0.92 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="text-center select-none"
          >
            {/* Top rule */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="h-0.5 w-64 mx-auto mb-6"
              style={{ background: config.accent }}
            />

            <h1
              className={`font-pricedown text-6xl md:text-8xl tracking-wide leading-none mb-4 ${config.textColor}`}
              style={{ textShadow: `0 0 40px ${config.accent}55` }}
            >
              {config.text}
            </h1>

            {config.sub && (
              <p className="font-heading text-quiet text-lg uppercase tracking-widest">
                {config.sub}
              </p>
            )}

            {/* Bottom rule */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="h-0.5 w-64 mx-auto mt-6"
              style={{ background: config.accent }}
            />

            <p className="text-whisper text-xs mt-6 uppercase tracking-widest">
              Tap to dismiss
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
