import Link from 'next/link'

export function Footer() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Decoded Six'

  return (
    <footer className="border-t border-white/[0.06] mt-20">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="font-heading font-bold text-lg text-bright mb-1">{siteName}</div>
            <p className="text-whisper text-sm max-w-sm">
              Independent fan site covering GTA 6. Not affiliated with Rockstar Games or Take-Two Interactive.
            </p>
          </div>
          <nav className="flex items-center gap-6 text-sm text-whisper">
            <Link href="/news" className="hover:text-quiet transition-colors">News</Link>
            <Link href="/guides" className="hover:text-quiet transition-colors">Guides</Link>
            <Link href="/about" className="hover:text-quiet transition-colors">About</Link>
            <Link href="/privacy" className="hover:text-quiet transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-quiet transition-colors">Contact</Link>
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-white/[0.04] text-center text-whisper text-xs">
          &copy; {new Date().getFullYear()} {siteName}. GTA 6, Grand Theft Auto, and related marks are trademarks of Take-Two Interactive Software.
        </div>
      </div>
    </footer>
  )
}
