import type { Metadata } from 'next'
import { Rajdhani, Inter } from 'next/font/google'
import './globals.css'

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-rajdhani',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Decoded Six'
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://decodedsix.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | GTA 6 News, Maps & Guides`,
    template: `%s | ${siteName}`,
  },
  description:
    'The definitive independent source for GTA 6 news, rumors, interactive maps, vehicle stats, and weekly event guides. Agent-powered and updated around the clock.',
  keywords: ['GTA 6', 'Grand Theft Auto 6', 'GTA 6 map', 'GTA 6 news', 'GTA 6 release date'],
  openGraph: {
    type: 'website',
    siteName,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@decodedsix',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${rajdhani.variable} ${inter.variable}`}>
      <body className="font-body antialiased bg-void text-bright">{children}</body>
    </html>
  )
}
