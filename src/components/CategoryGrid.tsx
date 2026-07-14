import Link from 'next/link'
import { ArticleImage } from '@/components/ArticleImage'
import { getArticleFallbackImage } from '@/lib/article-utils'

interface CategoryTile {
  label: string
  href: string
  tags: string[]
}

// Real site sections only (matches Header.tsx nav) — not the aspirational
// 10-category list in docs/VISUAL_STRATEGY.md, most of which have no route yet.
const CATEGORIES: CategoryTile[] = [
  { label: 'News', href: '/news', tags: ['news'] },
  { label: 'Map & Locations', href: '/map', tags: ['vice_city'] },
  { label: 'Guides', href: '/guides', tags: ['guide'] },
  { label: 'Vehicles', href: '/vehicles', tags: ['vehicles'] },
  { label: 'Rumors', href: '/rumors', tags: ['rumor'] },
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
            src={getArticleFallbackImage(cat.tags)}
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
