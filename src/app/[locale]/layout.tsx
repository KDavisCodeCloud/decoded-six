import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { localeAlternates } from '@/lib/seo'
import { Aug27Popup } from '@/components/Aug27Popup'

// OG locale tags use underscore region codes, not the URL's hyphenated
// BCP-47 codes (en-GB -> en_GB). 'en' (the site's un-prefixed default)
// still needs a real region for og:locale -- en_US matches the existing
// value this repo already shipped with.
const OG_LOCALE: Record<string, string> = {
  en: 'en_US', 'en-GB': 'en_GB', fr: 'fr_FR', de: 'de_DE',
  ja: 'ja_JP', zh: 'zh_CN', pt: 'pt_BR', es: 'es_ES',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  return {
    alternates: localeAlternates('/', locale),
    openGraph: { locale: OG_LOCALE[locale] },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound()
  }

  // Required by next-intl so static rendering knows which locale is
  // active for this request before any messages are read.
  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
      <Aug27Popup />
    </NextIntlClientProvider>
  )
}
