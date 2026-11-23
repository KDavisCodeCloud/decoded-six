// IndexNow (Bing, Yandex, Seznam, Naver): tell search engines a URL changed
// the moment a guide is published or updated, instead of waiting for a crawl.
// Free, no account. Google does not use IndexNow, so every pinged URL is also
// logged to audit_log ('indexnow_ping') for Kelvin to submit in GSC URL
// Inspection. The key is public by design; it lives in INDEXNOW_KEY and is
// served at the site root as /indexnow-key.txt (rewritten to /api/indexnow-key;
// a key file only covers URLs at or below its own directory).
import type { SupabaseClient } from '@supabase/supabase-js'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thedecodedsix.com'

export async function pingIndexNow(sb: SupabaseClient, urls: string[], articleId?: string): Promise<void> {
  const key = process.env.INDEXNOW_KEY
  const host = new URL(siteUrl).host
  let result = 'skipped'
  let error: string | null = null
  if (!key) {
    error = 'INDEXNOW_KEY unset -- ping skipped; submit these URLs in GSC by hand'
  } else {
    try {
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key, keyLocation: `${siteUrl}/indexnow-key.txt`, urlList: urls }),
      })
      result = res.ok || res.status === 202 ? 'success' : 'failure'
      if (result === 'failure') error = `IndexNow returned ${res.status}`
    } catch (e) {
      result = 'failure'
      error = `IndexNow unreachable: ${String(e)}`
    }
  }
  if (error) console.error(`[indexnow] ${error}`)
  await sb.from('audit_log').insert({
    agent_id: 'dsx-hitl-dashboard',
    action: 'indexnow_ping',
    article_id: articleId ?? null,
    result,
    error: JSON.stringify({ urls, gsc_submit: urls, note: error }),
  })
}
