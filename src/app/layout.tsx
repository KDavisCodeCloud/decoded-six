import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { getLocale } from 'next-intl/server'
import { Archivo, IBM_Plex_Mono } from 'next/font/google'
import PageviewBeacon from '@/components/shared/PageviewBeacon'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-archivo',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-ibm-plex-mono',
})

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Decoded Six'
// Must match sitemap.ts/robots.ts/news/[slug]/page.tsx's fallback (www) --
// this was previously the one place still defaulting to the apex domain,
// which the domain's own 308 redirect sends to www. Since metadataBase
// resolves every relative `alternates.canonical` below, that mismatch was
// silently emitting canonical tags pointing at a URL that immediately
// redirects -- a real cause of Google's "duplicate content" / indexing
// errors on a site with no other canonical mismatch left.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thedecodedsix.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | GTA 6 News, Maps & Guides`,
    template: `%s | ${siteName}`,
  },
  description:
    'The definitive independent source for GTA 6 news, rumors, interactive maps, vehicle stats, and weekly event guides.',
  keywords: ['GTA 6', 'Grand Theft Auto 6', 'GTA 6 map', 'GTA 6 news', 'GTA 6 release date'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@decodedsix',
    title: `${siteName} | GTA 6 News, Maps & Guides`,
    description: 'The definitive independent source for GTA 6 news, rumors, interactive maps, vehicle stats, and weekly event guides.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

// This is the ONE true root layout (renders <html>/<body> for every route
// in the app, including src/app/[locale]/** AND the unlocalized
// dashboard/login/api routes). getLocale() correctly resolves to the
// current public-site locale for [locale] routes (via middleware.ts) and
// falls back to the default ('en') for dashboard/login, which never go
// through locale routing at all -- see src/i18n/request.ts's fallback.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale} className={`${archivo.variable} ${ibmPlexMono.variable}`}>
      <head>
        {/* Impact.com affiliate network site verification — CDKeys + Green Man Gaming.
            Uses value= (non-standard, not content=) intentionally: the verifier
            checks for the literal attribute it issued this tag with. React's
            meta types only recognize content=, so this is spread as `any` to
            bypass that and render value= literally rather than being coerced. */}
        <meta {...({ name: 'impact-site-verification', value: '0df4b2cc-c4bc-4d85-a090-01f7f92145bd' } as any)} />
        {/* Google AdSense site verification (client ca-pub-5317430228631558) —
            rendered server-side in <head> on every route (this is the one
            true root layout) so Google's verification crawler finds it
            without needing to execute client JS. */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5317430228631558"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-body antialiased bg-void text-bright">
        <Suspense fallback={null}>
          <PageviewBeacon />
        </Suspense>
        {children}
      </body>
    </html>
  )
}
