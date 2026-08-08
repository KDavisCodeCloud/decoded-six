'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'

// Flag + native name per locale. UK flag deliberately used for en-GB per
// Kelvin's explicit ask (2026-08-07) even though English itself isn't
// "translated" for that entry -- ds_translate.py still runs a real
// American -> British English pass (spelling/terminology) for articles.
const LOCALE_META: Record<Locale, { flag: string; name: string }> = {
  en: { flag: '🇺🇸', name: 'English (US)' },
  'en-GB': { flag: '🇬🇧', name: 'English (UK)' },
  fr: { flag: '🇫🇷', name: 'Français' },
  de: { flag: '🇩🇪', name: 'Deutsch' },
  ja: { flag: '🇯🇵', name: '日本語' },
  zh: { flag: '🇨🇳', name: '中文' },
  pt: { flag: '🇧🇷', name: 'Português' },
  es: { flag: '🇪🇸', name: 'Español' },
}

export function TranslateButton() {
  const t = useTranslations('translate')
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function selectLocale(next: Locale) {
    setOpen(false)
    router.replace(pathname, { locale: next })
  }

  const current = LOCALE_META[locale]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('label')}
        title={t('label')}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium text-quiet hover:text-bright hover:bg-white/[0.06] transition-colors"
      >
        <span className="text-base leading-none" aria-hidden="true">{current.flag}</span>
        <span className="hidden sm:inline">{t('label')}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('menuLabel')}
          className="absolute right-0 mt-2 w-48 rounded-xl border border-white/[0.08] bg-[#0d0d0d] shadow-xl overflow-hidden z-50"
        >
          {routing.locales.map((l) => (
            <button
              key={l}
              role="option"
              aria-selected={l === locale}
              onClick={() => selectLocale(l)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                l === locale ? 'text-bright bg-white/[0.06]' : 'text-quiet hover:text-bright hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-base leading-none" aria-hidden="true">{LOCALE_META[l].flag}</span>
              <span>{LOCALE_META[l].name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
