import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Catch Supabase magic-link ?code= at root and forward to the real handler.
  // Then immediately return — the homepage is always public, never blocked.
  if (pathname === '/') {
    const code = request.nextUrl.searchParams.get('code')
    if (code) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/callback'
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // ── Only /dashboard/* routes reach this point ───────────────────────────

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'placeholder-anon-key-for-local-dev') {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  // Run only on root (magic-link catch) and all dashboard routes.
  // Every other public route — /news, /vehicles, /rumors, /map, /guides, etc.
  // — is never touched by this middleware.
  matcher: ['/', '/dashboard/:path*'],
}
