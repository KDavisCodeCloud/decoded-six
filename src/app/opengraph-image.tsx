import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function SiteOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          backgroundColor: '#070910',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '4px',
            backgroundColor: '#f5a623',
          }}
        />

        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '4px',
            backgroundColor: '#f5a623',
            opacity: 0.4,
          }}
        />

        {/* Logo text */}
        <div
          style={{
            color: '#f5a623',
            fontSize: '88px',
            fontWeight: 900,
            letterSpacing: '0.06em',
            lineHeight: 1,
            marginBottom: '24px',
          }}
        >
          DECODED SIX
        </div>

        {/* Tagline */}
        <div
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '22px',
            fontWeight: 400,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
        >
          GTA 6 News · Maps · Guides · Stats
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            color: 'rgba(255,255,255,0.2)',
            fontSize: '16px',
            letterSpacing: '0.08em',
          }}
        >
          thedecodedsix.com
        </div>
      </div>
    ),
    { ...size },
  )
}
