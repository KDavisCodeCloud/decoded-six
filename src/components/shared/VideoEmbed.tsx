'use client'

import { useState } from 'react'

export interface VideoEmbedData {
  video_id: string
  start_seconds?: number | null
  channel_name: string
  channel_url?: string | null
  title?: string | null
  status?: 'ok' | 'broken' | null
}

const VIDEO_ID_RE = /^[\w-]{11}$/

// Lite YouTube facade (launch guides, 2026-11-23): a static thumbnail in a
// fixed 16:9 box until the reader clicks, then the youtube-nocookie iframe
// replaces it at the same size. No third-party JS or cookies before
// consent-by-click, and no layout shift (the box is sized before anything
// loads). Starts at the step-relevant timestamp. The video supports the
// written steps; it never replaces them.
export function VideoEmbed({ video }: { video: VideoEmbedData }) {
  const [playing, setPlaying] = useState(false)
  if (!VIDEO_ID_RE.test(video.video_id)) return null

  const start = Math.max(0, Math.floor(video.start_seconds ?? 0))
  const label = video.title ? `${video.title} (${video.channel_name})` : `Video from ${video.channel_name}`
  const src = `https://www.youtube-nocookie.com/embed/${video.video_id}?autoplay=1&rel=0&start=${start}`
  const thumb = `https://i.ytimg.com/vi/${video.video_id}/hqdefault.jpg`
  const mmss = `${Math.floor(start / 60)}:${String(start % 60).padStart(2, '0')}`

  return (
    <figure className="my-8">
      <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9' }}>
        {playing ? (
          <iframe
            src={src}
            title={label}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play: ${label}${start ? `, from ${mmss}` : ''}`}
            className="group absolute inset-0 h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt=""
              width={480}
              height={360}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity duration-200 group-hover:opacity-100"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <span
              className="absolute left-1/2 top-1/2 flex h-14 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
              style={{ background: '#f5a623' }}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M8 5v14l11-7z" fill="#070910" /></svg>
            </span>
            {start > 0 && (
              <span className="absolute bottom-3 left-3 rounded px-2 py-0.5 font-mono text-xs text-white" style={{ background: 'rgba(7,9,16,0.8)' }}>
                Starts at {mmss}
              </span>
            )}
          </button>
        )}
      </div>
      <figcaption className="mt-2 text-center text-xs text-whisper">
        Video:{' '}
        {video.channel_url ? (
          <a href={video.channel_url} target="_blank" rel="noopener noreferrer" className="text-flame hover:underline">
            {video.channel_name}
          </a>
        ) : (
          video.channel_name
        )}{' '}
        on YouTube
      </figcaption>
    </figure>
  )
}
