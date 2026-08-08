import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Catch Supabase magic-link ?code= at the bare root (this is the fixed
  // redirect URL configured in Supabase's own auth settings, independent
  // of locale) and forward to the real handler before next-intl ever sees
  // the request. Then immediately return — the homepage is always public,
  // never blocked.
  if (pathname === '/') {
    const code = request.nextUrl.searchParams.get('code')
    if (code) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/callback'
      return NextResponse.redirect(url)
    }
  }

  // ── Dashboard: unlocalized, its own Supabase-session auth gate ──────────
  // Every other public route (/, /news, /fr, /fr/news/..., etc.) falls
  // through to next-intl's locale routing below instead.
  if (pathname.startsWith('/dashboard')) {
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

  // ── Everything else: locale routing (Kelvin, 2026-08-07) ────────────────
  return intlMiddleware(request)
}

export const config = {
  // Runs on every route except api/auth/login/_next/_vercel and files with
  // an extension. Dashboard and the root magic-link catch are handled by
  // name inside the function body above rather than excluded here, since
  // they still need this middleware to run (just skipping next-intl).
  matcher: ['/((?!api|auth|login|_next|_vercel|.*\\..*).*)'],
}
