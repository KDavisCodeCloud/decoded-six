import type { ReactNode } from 'react'

interface Props {
  src: string
  credit?: string
  minHeight?: string
  children: ReactNode
}

/**
 * Full-width cinematic hero: background image + bottom-heavy gradient for
 * text readability + credit badge. Extracted from the pattern already
 * shipped inline in src/app/news/[slug]/page.tsx — same visual treatment,
 * reusable for category pages too.
 */
export function HeroImage({ src, credit = '© Rockstar Games', minHeight = '55vh', children }: Props) {
  return (
    <section className="relative overflow-hidden" style={{ minHeight }}>
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `url('${src}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.6) 55%, rgba(10,10,10,0.97) 100%)' }}
      />
      {credit && (
        <span className="absolute top-2 right-3 text-[9px] text-white/30 select-none">
          {credit}
        </span>
      )}
      <div className="container relative z-10 flex items-end pb-10" style={{ minHeight }}>
        {children}
      </div>
    </section>
  )
}
