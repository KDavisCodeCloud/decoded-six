import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Locale-aware Link/useRouter/usePathname -- automatically adds/keeps the
// right locale prefix. Used by TranslateButton and anything else that
// needs to navigate while switching or preserving the current locale.
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } = createNavigation(routing)
