import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Excludes the internal dashboard, auth, login, and API routes entirely
  // (family-only tooling and machine endpoints never need translating —
  // see CLAUDE.md's dashboard design rules), plus Next.js internals and
  // any request for a file with an extension (images, robots.txt, etc.).
  matcher: ['/((?!api|auth|dashboard|login|_next|_vercel|.*\\..*).*)'],
}
