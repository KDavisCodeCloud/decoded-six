'use client'

import { Link } from '@/i18n/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { TranslateButton } from './TranslateButton'
import { Aug27StickyBar } from './Aug27StickyBar'

export function Header() {
  const t = useTranslations('nav')
  const [open, setOpen] = useState(false)

  const NAV = [
    { label: t('news'), href: '/news' },
    { label: t('map'), href: '/map' },
    { label: t('guides'), href: '/guides' },
    { label: t('vehicles'), href: '/vehicles' },
    { label: t('characters'), href: '/characters' },
    { label: t('rumors'), href: '/rumors' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-void/90 backdrop-blur-md border-b border-white/[0.06]">
      <Aug27StickyBar />
      <div className="container">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-white font-heading font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #ec1272, #7c3aed)' }}
            >
              D6
            </div>
            <span className="font-heading font-extrabold text-[17px] tracking-tight text-bright">
              Decoded Six
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className="px-4 py-2 text-sm font-medium text-quiet hover:text-bright transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Translate + Subscribe CTA */}
          <div className="flex items-center gap-2">
            <TranslateButton />
            <div className="hidden md:block">
              <Link
                href="/subscribe"
                className="px-4 py-2 rounded-lg text-sm font-bold text-white"
                style={{ background: '#ec1272' }}
              >
                {t('subscribe')}
              </Link>
            </div>

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
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-white/[0.06] py-3">
            {NAV.map(n => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center px-4 py-3 text-sm font-medium text-quiet hover:text-bright"
                onClick={() => setOpen(false)}
              >
                {n.label}
              </Link>
            ))}
            <div className="px-4 pt-3 pb-1">
              <Link
                href="/subscribe"
                className="block w-full text-center py-2.5 rounded-lg text-sm font-bold text-white"
                style={{ background: '#ec1272' }}
              >
                {t('subscribe')}
              </Link>
            </div>
          </div>
        )}
      </div>
      {/* 3px gradient divider bar */}
      <div className="gradient-bar" />
    </header>
  )
}
