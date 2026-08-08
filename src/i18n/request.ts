import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  // Requests to routes outside [locale] (dashboard/login/api) never go
  // through the locale-prefix middleware match, so requestLocale resolves
  // to undefined there -- falling back to the default keeps those routes
  // rendering correctly instead of erroring.
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
