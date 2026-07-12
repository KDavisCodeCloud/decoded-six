import { ImageResponse } from 'next/og'
import { supabase } from '@/lib/supabase'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CAT_COLOR: Record<string, string> = {
  news: '#5a96ff',
  rumor: '#f5a623',
  guide: '#3fd17a',
  event: '#f5a623',
  update: '#5a96ff',
}

export default async function ArticleOgImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const { data } = await supabase
    .from('articles')
    .select('title, category')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  const title = data?.title ?? 'DecodedSix'
  const category = (data?.category ?? 'news') as string
  const catLabel = category.toUpperCase()
  const accentColor = CAT_COLOR[category] ?? '#5a96ff'

  // Scale font size to avoid overflow on long titles
  const titleSize = title.length > 90 ? 38 : title.length > 60 ? 46 : title.length > 40 ? 52 : 60

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          backgroundColor: '#070910',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '6px',
            height: '100%',
            backgroundColor: accentColor,
          }}
        />

        {/* Bottom accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '100%',
            height: '3px',
            backgroundColor: accentColor,
            opacity: 0.4,
          }}
        />

        {/* Site name */}
        <div
          style={{
            color: accentColor,
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '0.25em',
            marginBottom: '28px',
          }}
        >
          DECODED SIX
        </div>

        {/* Category badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: `${accentColor}22`,
            border: `1px solid ${accentColor}55`,
            borderRadius: '6px',
            padding: '5px 14px',
            color: accentColor,
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            marginBottom: '32px',
            width: 'fit-content',
          }}
        >
          {catLabel}
        </div>

        {/* Title */}
        <div
          style={{
            color: '#ffffff',
            fontSize: `${titleSize}px`,
            fontWeight: 800,
            lineHeight: 1.2,
            flex: 1,
            display: 'flex',
            alignItems: 'flex-start',
          }}
        >
          {title}
        </div>

        {/* Footer */}
        <div
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: '15px',
            marginTop: '32px',
            letterSpacing: '0.05em',
          }}
        >
          thedecodedsix.com
        </div>
      </div>
    ),
    { ...size },
  )
}
