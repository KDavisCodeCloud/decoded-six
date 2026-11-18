// Map Phase 3b -- Leads. A lead is a name we know exists in the game but
// can't place yet: name, category, area. Never coordinates. It steers what the
// scraper searches for; it is never a source, never sets a position and
// never publishes anything alone.

export interface MapLead {
  id: string
  name: string
  category: string | null
  area: string | null
  notes: string | null
  status: 'open' | 'evidence_found' | 'closed'
  search_count: number
  last_searched_at: string | null
  evidence_found_at: string | null
  matched_marker_ids: string[]
  created_at: string
}

export interface ParsedLead { name: string; category: string | null; area: string | null }
export interface LeadParseResult { leads: ParsedLead[]; errors: { line: number; text: string; error: string }[] }

export const MAX_LEADS_PER_PASTE = 200

const COORD_RE = /-?\d{2,6}(\.\d+)?\s*[,/ ]\s*-?\d{2,6}(\.\d+)?/

/**
 * Bulk paste: one lead per line, fields split by "|" or a tab (a pasted
 * spreadsheet row). Commas stay inside the name ("Ammu-Nation, Little Cuba").
 *   Hidden briefcase | money_spot | Port Gellhorn
 *   Pawn shop<TAB>Fences<TAB>Little Cuba
 *   Tattoo parlor on Ocean Beach            (name only)
 * Category matches a key or a label, case-insensitive. Anything that looks
 * like coordinates is refused: leads never carry a position.
 */
export function parseLeadLines(
  text: string,
  categories: { key: string; label: string }[],
): LeadParseResult {
  const byName = new Map<string, string>()
  for (const c of categories) {
    byName.set(c.key.toLowerCase(), c.key)
    byName.set(c.label.toLowerCase(), c.key)
    byName.set(c.key.replace(/_/g, ' ').toLowerCase(), c.key)
  }
  const out: LeadParseResult = { leads: [], errors: [] }
  const seen = new Set<string>()
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (!line || line.startsWith('#')) return
    const parts = line.split(/\s*\|\s*|\t+/).map(p => p.trim())
    const [name, cat = '', area = ''] = parts
    const err = (error: string) => out.errors.push({ line: i + 1, text: line.slice(0, 120), error })
    if (parts.length > 3) return err('too many fields (name | category | area)')
    if (!name || name.length < 2 || name.length > 200) return err('name must be 2–200 characters')
    if (COORD_RE.test(`${name} ${area}`)) return err('looks like coordinates — leads never carry a position')
    let category: string | null = null
    if (cat) {
      category = byName.get(cat.toLowerCase()) ?? null
      if (!category) return err(`unknown category "${cat.slice(0, 40)}"`)
    }
    const key = `${name.toLowerCase()}|${category ?? ''}|${area.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    out.leads.push({ name, category, area: area ? area.slice(0, 200) : null })
  })
  if (out.leads.length > MAX_LEADS_PER_PASTE) {
    out.errors.push({ line: 0, text: '', error: `only the first ${MAX_LEADS_PER_PASTE} leads were taken` })
    out.leads = out.leads.slice(0, MAX_LEADS_PER_PASTE)
  }
  return out
}
