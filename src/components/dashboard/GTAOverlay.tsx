'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type OverlayType = 'mission-passed' | 'wasted' | 'big-score' | 'wanted'

interface GTAOverlayProps {
  type: OverlayType | null
  reward?: string
  onDismiss: () => void
}

const DISMISS_MS: Record<OverlayType, number> = {
  'mission-passed': 4000,
  'wasted':         3500,
  'big-score':      4000,
  'wanted':         3000,
}

export default function GTAOverlay({ type, reward, onDismiss }: GTAOverlayProps) {
  useEffect(() => {
    if (!type) return
    const t = setTimeout(onDismiss, DISMISS_MS[type])
    return () => clearTimeout(t)
  }, [type, onDismiss])

  return (
    <AnimatePresence>
      {type === 'wasted' && (
        <motion.div
          key="wasted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={onDismiss}
        >
          {/* Desaturate/darken layer */}
          <div
            className="absolute inset-0"
            style={{ backdropFilter: 'grayscale(0.85) brightness(0.45)' }}
          />

          <motion.div
            className="relative text-center select-none"
            initial={{ y: -120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.2 }}
          >
            <motion.div
              className="mx-auto mb-5"
              style={{ height: '2px', background: '#FFD700', width: '340px' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.1, duration: 0.45 }}
            />
            <h1
              className="font-pricedown leading-none"
              style={{
                fontSize: 'clamp(80px, 12vw, 120px)',
                color: '#FFD700',
                textShadow: '0 0 60px rgba(255,40,40,0.9), 0 0 120px rgba(200,0,0,0.5)',
              }}
            >
              WASTED
            </h1>
            <motion.div
              className="mx-auto mt-5"
              style={{ height: '2px', background: '#FFD700', width: '340px' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.18, duration: 0.45 }}
            />
            <p
              className="font-pricedown mt-5 uppercase tracking-widest"
              style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)' }}
            >
              tap to dismiss
            </p>
          </motion.div>
        </motion.div>
      )}

      {(type === 'mission-passed' || type === 'big-score') && (
        <motion.div
          key={type}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={onDismiss}
        >
          <motion.div
            className="w-full text-center py-10 select-none"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: 'rgba(0,0,0,0.9)',
              borderTop: '3px solid #C8A84B',
              borderBottom: '3px solid #C8A84B',
            }}
          >
            <motion.h1
              className="font-pricedown leading-none"
              style={{
                fontSize: 'clamp(52px, 8vw, 80px)',
                color: '#C8A84B',
                textShadow: '0 0 40px rgba(200,168,75,0.7)',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              {type === 'big-score' ? 'THE BIG SCORE' : 'MISSION PASSED'}
            </motion.h1>
            <motion.p
              className="font-pricedown mt-3"
              style={{ fontSize: 'clamp(20px, 3vw, 30px)', color: 'rgba(255,255,255,0.75)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.35 }}
            >
              {reward ?? 'RESPECT +'}
            </motion.p>
          </motion.div>
        </motion.div>
      )}

      {type === 'wanted' && (
        <motion.div
          key="wanted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(0,0,0,0.82)' }}
          onClick={onDismiss}
        >
          <motion.div
            className="text-center select-none"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
          >
            <h1
              className="font-pricedown leading-none"
              style={{
                fontSize: 'clamp(60px, 9vw, 96px)',
                color: '#f97316',
                textShadow: '0 0 40px rgba(249,115,22,0.7)',
              }}
            >
              COMPLIANCE FLAG
            </h1>
            <p
              className="font-pricedown mt-4 uppercase tracking-widest"
              style={{ fontSize: '20px', color: 'rgba(255,255,255,0.5)' }}
            >
              Manual review required
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
