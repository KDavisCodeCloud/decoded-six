import { createHash } from 'crypto'

// Server-only. Never imported from a 'use client' file -- computes the
// privacy-safe session id and does UA/referrer classification for
// /api/track. No IP address is ever written to the database; it only ever
// exists transiently inside the hash input for this one request.

const SITE_HOSTS = ['thedecodedsix.com', 'www.thedecodedsix.com']

/**
 * SHA-256(secret + UTC date + IP + UA). The date component means this
 * value can never be used to correlate the same visitor across two
 * different days, even if someone had both hashes and the secret --
 * there's no reverse path from "same person" to "same hash" that survives
 * midnight UTC. IP/UA are never persisted; only this hash is.
 */
export function computeSessionId(ip: string, userAgent: string): string {
  const secret = process.env.ANALYTICS_SALT_SECRET || 'dev-only-insecure-fallback-salt'
  const utcDate = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return createHash('sha256').update(`${secret}:${utcDate}:${ip}:${userAgent}`).digest('hex')
}

export type Device = 'mobile' | 'desktop' | 'tablet'

export function classifyDevice(userAgent: string): Device {
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet|(android(?!.*mobile))/.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android/.test(ua)) return 'mobile'
  return 'desktop'
}

export type ReferrerSource = 'google' | 'bing' | 'reddit' | 'x' | 'facebook' | 'direct' | 'other'

export function classifyReferrerSource(referrer: string | null | undefined): ReferrerSource {
  if (!referrer) return 'direct'
  let host: string
  try {
    host = new URL(referrer).hostname.toLowerCase()
  } catch {
    return 'other'
  }
  if (SITE_HOSTS.includes(host)) return 'direct' // internal SPA navigation, not a real source
  if (host.includes('google.')) return 'google'
  if (host.includes('bing.')) return 'bing'
  if (host.includes('reddit.')) return 'reddit'
  if (host.includes('x.com') || host.includes('twitter.com') || host.includes('t.co')) return 'x'
  if (host.includes('facebook.') || host.includes('fb.com') || host === 'l.facebook.com') return 'facebook'
  return 'other'
}

// Simple substring match against known crawler UA tokens -- deliberately
// blunt per the brief ("simple list"), not a full bot-detection library.
// Doesn't catch non-JS crawlers that never execute the client beacon at
// all (AhrefsBot, SemrushBot, most SEO tools) -- those never reach this
// route in the first place since nothing runs their JS. This only ever
// sees bots that DO execute page JavaScript (Googlebot's renderer, some
// AI crawlers) or hit the endpoint directly.
const BOT_UA_PATTERNS: Array<[string, string]> = [
  ['googlebot', 'Googlebot'],
  ['bingbot', 'Bingbot'],
  ['ahrefsbot', 'AhrefsBot'],
  ['semrushbot', 'SemrushBot'],
  ['mj12bot', 'MJ12bot'],
  ['dotbot', 'DotBot'],
  ['petalbot', 'PetalBot'],
  ['yandexbot', 'YandexBot'],
  ['duckduckbot', 'DuckDuckBot'],
  ['baiduspider', 'Baiduspider'],
  ['applebot', 'Applebot'],
  ['facebookexternalhit', 'FacebookExternalHit'],
  ['slurp', 'YahooSlurp'],
  ['gptbot', 'GPTBot'],
  ['ccbot', 'CCBot'],
  ['claudebot', 'ClaudeBot'],
  ['perplexitybot', 'PerplexityBot'],
  ['bytespider', 'Bytespider'],
]

export function matchBotName(userAgent: string): string | null {
  const ua = userAgent.toLowerCase()
  for (const [token, name] of BOT_UA_PATTERNS) {
    if (ua.includes(token)) return name
  }
  return null
}
