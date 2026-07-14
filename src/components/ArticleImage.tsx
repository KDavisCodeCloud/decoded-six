interface Props {
  src: string
  alt: string
  tier?: 1 | 2 | 3
  credit?: string
  priority?: boolean
  className?: string
}

const DEFAULT_CREDIT: Record<number, string> = {
  1: '© Rockstar Games',
  2: 'DecodedSix',
}

/**
 * General-purpose credit-aware image. Tier 1/2 render a small credit badge
 * bottom-right; tier 3 (original DecodedSix assets) renders none.
 * Doesn't replace RockstarImage (still used by ArticleCard) — this is the
 * primitive for new usage (HeroImage, CategoryGrid).
 */
export function ArticleImage({ src, alt, tier = 1, credit, priority, className }: Props) {
  const label = credit ?? DEFAULT_CREDIT[tier]
  return (
    <figure className={`relative overflow-hidden ${className ?? ''}`}>
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        className="w-full h-full object-cover"
        style={{ background: '#1a1a1a' }}
      />
      {label && (
        <span className="absolute bottom-1 right-2 text-[8px] text-white/50 select-none pointer-events-none">
          {label}
        </span>
      )}
    </figure>
  )
}
