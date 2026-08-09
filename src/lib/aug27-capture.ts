// Shared copy + dismiss-cookie logic for the August 27 Netflix Extended Look
// capture surfaces (exit-intent/timed popup + sticky bar). See
// gta-6-extended-look-netflix-august-27 for the article both point back to.

export const AUG27_HEADLINE = 'Get our August 27 breakdown the moment it drops'
export const AUG27_BODY =
  "We're watching the Netflix premiere live. You'll get our full breakdown within the hour."
export const AUG27_CTA = 'Notify me'
export const AUG27_SOURCE = 'aug27'

const DISMISS_DAYS = 7

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function isDismissed(cookieName: string): boolean {
  if (typeof document === 'undefined') return true
  return getCookie(cookieName) === '1'
}

export function dismiss(cookieName: string) {
  setCookie(cookieName, '1', DISMISS_DAYS)
}
