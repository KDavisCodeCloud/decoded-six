import { pinHtml } from '@/lib/map-icons'

/** The same icon badge the map draws for a pin, for legends and lists.
 *  Markup is our own static SVG from src/lib/map-icons.ts (no user input). */
export function CategoryBadge({ category, size = 18, muted = false }: { category: string; size?: number; muted?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex flex-shrink-0 ${muted ? 'grayscale opacity-60' : ''}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: pinHtml(category, size) }}
    />
  )
}
