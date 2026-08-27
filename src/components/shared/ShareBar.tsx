'use client'

import { useState, type CSSProperties } from 'react'

interface ShareBarProps {
  url: string
  title: string
  image?: string
}

function openShareWindow(shareUrl: string) {
  window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500')
}

// Instagram has no web share-intent URL (unlike X/Facebook/Pinterest) --
// every other site's "share to Instagram" button works the same way:
// copy the link, tell the person to paste it in their story or bio.
// Doing that honestly here instead of a dead/fake button.
async function copyLink(url: string, onCopied: () => void) {
  try {
    await navigator.clipboard.writeText(url)
    onCopied()
  } catch {
    // Clipboard API can fail (permissions, non-secure context) -- fall
    // back to a manual prompt rather than silently doing nothing.
    window.prompt('Copy this link:', url)
  }
}

const iconButtonClass =
  'flex items-center justify-center rounded-full transition-colors hover:bg-white/10'
const iconButtonStyle: CSSProperties = {
  width: 40,
  height: 40,
  minWidth: 44,
  minHeight: 44,
  border: '1px solid rgba(255,255,255,0.1)',
}

export function ShareBar({ url, title, image }: ShareBarProps) {
  const [toast, setToast] = useState<string | null>(null)

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 2500)
  }

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // User canceled the native share sheet -- not an error, do nothing.
      }
      return
    }
    await copyLink(url, () => showToast('Link copied to clipboard'))
  }

  function handleX() {
    openShareWindow(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${title} via @decodedsix`)}`)
  }

  function handleFacebook() {
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
  }

  function handlePinterest() {
    const params = new URLSearchParams({ url, description: title })
    if (image) params.set('media', image)
    openShareWindow(`https://pinterest.com/pin/create/button/?${params.toString()}`)
  }

  async function handleInstagram() {
    await copyLink(url, () => showToast('Link copied — paste it in your Instagram story or bio'))
  }

  return (
    <div className="relative flex items-center gap-2 flex-wrap" style={{ minHeight: 44 }}>
      <span className="text-xs font-ibm uppercase tracking-wide mr-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Share
      </span>

      <button
        onClick={handleNativeShare}
        aria-label="Share this article"
        title="Share"
        className={iconButtonClass}
        style={iconButtonStyle}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#f0f0f0' }}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
        </svg>
      </button>

      <button onClick={handleX} aria-label="Share on X" title="Share on X" className={iconButtonClass} style={iconButtonStyle}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#f0f0f0' }}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      <button onClick={handleFacebook} aria-label="Share on Facebook" title="Share on Facebook" className={iconButtonClass} style={iconButtonStyle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#f0f0f0' }}>
          <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.522 1.492-3.915 3.777-3.915 1.094 0 2.238.197 2.238.197v2.476h-1.26c-1.243 0-1.63.775-1.63 1.57v1.888h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94z" />
        </svg>
      </button>

      <button onClick={handleInstagram} aria-label="Share on Instagram" title="Copy link for Instagram" className={iconButtonClass} style={iconButtonStyle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: '#f0f0f0' }}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </button>

      <button onClick={handlePinterest} aria-label="Share on Pinterest" title="Share on Pinterest" className={iconButtonClass} style={iconButtonStyle}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#f0f0f0' }}>
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.868.182-.78 1.172-4.97 1.172-4.97s-.299-.6-.299-1.486c0-1.39.806-2.428 1.809-2.428.853 0 1.265.64 1.265 1.408 0 .858-.546 2.14-.828 3.33-.236.995.499 1.807 1.48 1.807 1.777 0 3.144-1.874 3.144-4.58 0-2.395-1.72-4.07-4.176-4.07-2.845 0-4.515 2.135-4.515 4.34 0 .859.331 1.781.744 2.281a.3.3 0 0 1 .069.288c-.076.317-.246.995-.279 1.134-.044.183-.145.222-.334.134-1.249-.581-2.03-2.407-2.03-3.874 0-3.154 2.292-6.052 6.608-6.052 3.469 0 6.165 2.472 6.165 5.776 0 3.447-2.173 6.22-5.19 6.22-1.013 0-1.966-.526-2.292-1.148l-.623 2.378c-.226.869-.836 1.958-1.244 2.622.937.29 1.931.446 2.962.446 5.523 0 10-4.477 10-10S17.523 2 12 2z" />
        </svg>
      </button>

      {toast && (
        <span
          className="absolute left-0 top-full mt-2 text-xs font-ibm px-3 py-2 rounded-lg z-10"
          style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', color: '#f0f0f0', whiteSpace: 'nowrap' }}
        >
          {toast}
        </span>
      )}
    </div>
  )
}
