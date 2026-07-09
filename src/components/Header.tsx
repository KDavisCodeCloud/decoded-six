'use client'

import Link from 'next/link'
import { useState } from 'react'

const NAV = [
  { label: 'News', href: '/news', live: true },
  { label: 'Maps', href: '/maps', live: false },
  { label: 'Vehicles', href: '/vehicles', live: false },
  { label: 'Events', href: '/events', live: false },
  { label: 'Guides', href: '/guides', live: true },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Decoded Six'

  return (
    <header className="sticky top-0 z-50 bg-void/90 backdrop-blur-md border-b border-white/[0.06]">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-pink to-ice flex items-center justify-center text-white font-heading font-bold text-sm shrink-0">
              D6
            </div>
            <span className="font-heading font-bold text-xl tracking-wide text-bright group-hover:text-flame transition-colors">
              {siteName}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(n =>
              n.live ? (
                <Link
                  key={n.label}
                  href={n.href}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-quiet hover:text-bright hover:bg-white/5 transition-colors"
                >
                  {n.label}
                </Link>
              ) : (
                <span
                  key={n.label}
                  className="relative px-4 py-2 rounded-lg text-sm font-medium text-whisper cursor-default select-none"
                >
                  {n.label}
                  <span className="absolute -top-0.5 -right-0.5 text-[9px] bg-gold/20 text-gold px-1 py-px rounded uppercase tracking-wider leading-none">
                    Soon
                  </span>
                </span>
              )
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-quiet"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-white/[0.06] py-3">
            {NAV.map(n => (
              <Link
                key={n.label}
                href={n.live ? n.href : '#'}
                className={`flex items-center justify-between px-4 py-3 text-sm font-medium ${n.live ? 'text-quiet hover:text-bright' : 'text-whisper'}`}
                onClick={() => setOpen(false)}
              >
                {n.label}
                {!n.live && (
                  <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Soon
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, #FF2D6B44, #00d2ff44)' }} />
    </header>
  )
}
