export interface ScreenshotSlotData {
  filename: string
  shot?: string
  alt: string
  status: 'needed' | 'filled'
  url?: string | null
  width?: number | null
  height?: number | null
}

// A {{screenshot:<filename>}} marker in a guide body. Filled slots are Kelvin's
// own console captures (credited DecodedSix). Unfilled slots render NOTHING on
// the public page, never a broken image or a visible placeholder. The shot
// list in the dashboard is where unfilled slots show up.
export function ScreenshotSlot({ slot }: { slot?: ScreenshotSlotData }) {
  if (!slot || slot.status !== 'filled' || !slot.url) return null
  return (
    <figure className="my-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slot.url}
        alt={slot.alt}
        width={slot.width ?? 1600}
        height={slot.height ?? 900}
        loading="lazy"
        decoding="async"
        className="h-auto w-full rounded-lg bg-black/20"
      />
      <figcaption className="mt-2 text-center text-sm text-whisper">
        {slot.alt}
        <span className="mt-0.5 block text-xs opacity-70">Screenshot: DecodedSix (GTA 6 © Rockstar Games)</span>
      </figcaption>
    </figure>
  )
}
