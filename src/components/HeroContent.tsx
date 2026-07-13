'use client'

import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { Countdown } from '@/components/Countdown'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

const shadow = '0 2px 24px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.8)'
const subtleShadow = '0 1px 12px rgba(0,0,0,0.8)'

export function HeroContent({ launchDate }: { launchDate: string }) {
  return (
    <motion.div className="max-w-xl" variants={container} initial="hidden" animate="show">
      {/* Eyebrow */}
      <motion.p
        variants={item}
        className="font-ibm text-[11px] font-bold uppercase tracking-[0.12em] mb-5"
        style={{ color: '#ec1272', textShadow: subtleShadow }}
      >
        Countdown to Vice City
      </motion.p>

      {/* H1 */}
      <motion.h1
        variants={item}
        className="font-heading font-black leading-[0.93] tracking-[-0.02em]"
        style={{ fontSize: 'clamp(60px, 8vw, 84px)', textShadow: shadow }}
      >
        <span className="block text-bright">GTA VI</span>
        <span className="block gradient-text">DECODED</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        variants={item}
        className="text-[rgba(255,255,255,0.85)] text-[15px] leading-relaxed max-w-md mt-6"
        style={{ textShadow: subtleShadow }}
      >
        Confirmed locations, vehicle stats, heist intel, and every rumor worth tracking — updated daily.
      </motion.p>

      {/* Countdown */}
      <motion.div variants={item} className="mt-8">
        <Countdown targetDate={launchDate} />
      </motion.div>

      {/* CTAs */}
      <motion.div variants={item} className="mt-8 flex items-center gap-3">
        <Link
          href="/map"
          className="px-5 py-2.5 rounded-lg text-sm font-bold text-white"
          style={{ background: 'linear-gradient(90deg, #ec1272, #7c3aed)' }}
        >
          Explore the Map
        </Link>
        <Link
          href="/news"
          className="px-5 py-2.5 rounded-lg text-sm font-bold text-bright border border-white/40 hover:border-white/70 transition-colors backdrop-blur-sm"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          Latest Rumors
        </Link>
      </motion.div>
    </motion.div>
  )
}
