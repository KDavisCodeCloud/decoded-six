import { Link } from '@/i18n/navigation'
import { ArticleImage } from '@/components/ArticleImage'

interface CategoryTile {
  label: string
  href: string
  img: string
}

// Real site sections only (matches Header.tsx nav) — not the aspirational
// 10-category list in docs/VISUAL_STRATEGY.md, most of which have no route yet.
//
// Each tile gets an explicitly assigned image rather than a tag-guessed one.
// Confirmed live 2026-07-26: 'news'/'guide'/'rumor' don't match any tag in the
// registry, so all three silently fell through to the same COVER_ART fallback
// -- three tiles with the identical background image. Hardcoding a specific,
// distinct image per tile removes that guesswork entirely for a fixed set
// this small.
const CATEGORIES: CategoryTile[] = [
  { label: 'News', href: '/news', img: '/images/tier1/locations/leonida-keys/screenshot-Leonida_Keys_01.jpg' },
  { label: 'Map & Locations', href: '/map', img: '/images/tier1/locations/vice-city/screenshot-Vice_City_03.jpg' },
  { label: 'Guides', href: '/guides', img: '/images/tier1/locations/mount-kalaga/screenshot-Mount_Kalaga_National_Park_01.jpg' },
  { label: 'Vehicles', href: '/vehicles', img: 'https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_VAPID_BUGGY_02.0tf15jp~61bkj.jpg' },
  { label: 'Rumors', href: '/rumors', img: '/images/tier1/locations/ambrosia/screenshot-Ambrosia_01.jpg' },
  { label: 'Characters', href: '/characters', img: '/images/tier1/keyart/jason-lucia-01/Jason_and_Lucia_01_landscape.jpg' },
]

/**
 * 2-column (1-column on mobile) category tile grid — thumbnail background
 * + label, hover brightens. Matches docs/VISUAL_STRATEGY.md's Task 3 spec,
 * scoped to real routes.
 */
export function CategoryGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {CATEGORIES.map(cat => (
        <Link
          key={cat.href}
          href={cat.href}
          className="group relative block h-40 overflow-hidden rounded-xl border border-white/[0.06] hover:border-flame/25 transition-all duration-300"
        >
          <ArticleImage
            src={cat.img}
            alt={cat.label}
            className="absolute inset-0 w-full h-full brightness-[0.55] group-hover:brightness-[0.75] transition-[filter] duration-300"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(7,9,16,0.9) 0%, transparent 60%)' }}
          />
          <span className="absolute bottom-3 left-4 font-heading font-extrabold text-lg text-bright uppercase tracking-wide transition-transform duration-300 group-hover:-translate-y-1">
            {cat.label}
          </span>
        </Link>
      ))}
    </div>
  )
}
