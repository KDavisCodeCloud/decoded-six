# Session G — DSX-CA1 DecodedSix Content Agent
# Terminal: 1
# Wave: 2
# Depends on: Session 12 (FastAPI routes) complete + Supabase live + Vercel deployed
# Output: /src/agents/decodedsix/content_agent.py
#         /n8n/decodedsix_content_workflow.json
#         /supabase/migrations/005_articles_agent_fields.sql  ← NOT 007 — see schema note below
#         /src/app/dashboard/decodedsix/article-queue/page.tsx

---

## SCHEMA DECISION — READ BEFORE BUILDING

The spec defines a new `decodedsix_articles` table. DO NOT create it.
An `articles` table already exists in supabase/migrations/001_schema.sql and is
already queried by the live frontend (news/page.tsx, news/[slug]/page.tsx, ArticleCard).

Creating a second table breaks the frontend. The correct approach is to ADD
the new agent-only columns to the existing `articles` table via ALTER TABLE.

**Column mapping — spec → existing table:**

| Spec column         | Existing column     | Action                          |
|---------------------|--------------------|---------------------------------|
| title               | title               | exists                          |
| slug                | slug                | exists                          |
| meta_description    | excerpt             | exists (same purpose, diff name)|
| body_html           | content             | exists (store HTML here)        |
| category            | category            | exists — use 'news'/'guide' etc |
| status              | status              | exists                          |
| agent_generated     | agent_generated     | exists                          |
| ai_detect_score     | ai_detect_score     | exists (added in 002 migration) |
| published_at        | published_at        | exists                          |
| created_at          | created_at          | exists                          |
| product_id          | product_id          | exists                          |

**New columns to ADD via migration (005_articles_agent_fields.sql):**

| Spec column         | Type    | Notes                                      |
|---------------------|---------|--------------------------------------------|
| article_type        | text    | 'news' / 'evergreen' / 'conversion'        |
| publish_date        | date    | scheduled publish date (agent plans ahead) |
| faq_pairs           | jsonb   | [{question, answer}] array                 |
| internal_links_used | text[]  | slugs of linked articles                   |
| external_citation   | text    | URL of official source cited               |
| affiliate_links     | jsonb   | [{product_name, url, placement}]           |
| schema_article      | jsonb   | JSON-LD Article schema                     |
| schema_faq          | jsonb   | JSON-LD FAQPage schema                     |
| schema_breadcrumb   | jsonb   | JSON-LD BreadcrumbList schema              |
| word_count          | integer |                                            |
| hitl_reviewer       | text    |                                            |
| hitl_reviewed_at    | timestamptz |                                        |
| hitl_notes          | text    |                                            |
| page_views          | integer DEFAULT 0                          |
| affiliate_clicks    | integer DEFAULT 0                          |

Also add 'pending_review' and 'needs_revision' to the articles.status CHECK constraint
(currently only allows: draft, published, archived).

Migration file: supabase/migrations/005_articles_agent_fields.sql
(004 is map schema — 005 is next in sequence)

---

## What This Agent Does

Produces 3 published-ready articles per week for decodedsix.com.
Runs on a weekly cron schedule via n8n.
Each article goes through HITL approval (wife reviews) before publish.
No human writes these. Wife approves. Agent publishes.

**Agent Code:** DSX-CA1
**Cadence:** Tuesday / Thursday / Saturday
**Trigger:** n8n scheduled workflow
**LLM:** claude-sonnet-4-6 via existing providers router

---

## Weekly Article Mix (3 types — all 3 every week)

### Tuesday — News / Update (1,200–1,500 words)
Rockstar announcements, trailer breakdowns, leak analysis,
community developments, preorder updates, GTA Online transition.
Keyword intent: Informational. Monetization: Ad impressions.
Topic seed: Agent scrapes Rockstar Newswire + r/GTA6 + GamesRadar RSS.

### Thursday — Evergreen Reference (1,500–2,500 words)
Character guides, map location breakdowns, mechanic explainers,
Leonida location deep-dives, Jason/Lucia story analysis,
GTA 6 vs GTA 5 comparisons, FAQ articles.
Keyword intent: Informational / navigational. Monetization: Ads + internal links.
Topic seed: Pre-loaded keyword list from GTA 6 search data.

### Saturday — Conversion Intent (1,200–2,000 words)
Best GTA 6 gaming setup, PS5 vs Xbox Series X for GTA 6,
best gaming chairs 2026, where to preorder GTA 6,
best controllers, gaming headsets for open world games,
GTA 6 PC release — what to buy while you wait.
Keyword intent: Commercial / transactional. Monetization: Amazon Associates + Fanatical + CDKeys.
Topic seed: Pre-loaded product/affiliate list with live URLs.

---

## Article Structure (enforced in agent prompt — every type)

1. **Hook (first 100 words):** Answer search intent directly. No preamble.
   Pattern: [Direct answer] → [Why it matters] → [What this covers]

2. **Body:** H2 + H3 throughout. Minimum 3 internal links. Minimum 1 official citation.
   Conversion articles: affiliate links in "Quick Picks" section before detailed breakdown.

3. **FAQ Section:** Minimum 3 questions. H3 question → 2–4 sentence answer.
   Written as real search queries (People Also Ask framing). Becomes FAQPage schema.

4. **Conclusion + CTA:** 2–3 sentence summary. Link to one related article.
   Conversion articles: repeat primary affiliate link with clear CTA.

---

## Content Quality Rules (10 rules — agent enforces all)

1. First paragraph answers the search intent. No preamble.
2. No "In this article we will explore" or similar meta-commentary.
3. No unsubstantiated claims. Speculative content labeled "reportedly" or "according to leakers."
4. Every conversion article has affiliate links in first 300 words AND conclusion.
5. Every article links to at least 3 other DecodedSix articles by slug.
6. Every article cites at least 1 official source by URL.
7. FAQ section has minimum 3 questions written as real search queries.
8. Meta description is 150–160 characters, includes primary keyword, no mid-word truncation.
9. Slug is lowercase, hyphenated, includes primary keyword, max 60 characters.
10. Word count floor: 1,200 words. No exceptions.

---

## E-E-A-T Requirements

- Author byline: "DecodedSix Editorial Team" on every article
- Publication date + last updated date on every article
- Internal links: minimum 3 per article
- External citation: minimum 1 official source (Rockstar, Take-Two, IGN, GamesRadar)
- Speculative content labeled "reportedly" or "according to leakers"

---

## Agent Inputs

```python
inputs = {
    "article_type": "news | evergreen | conversion",  # set by n8n day-of-week logic
    "topic_seed": str,          # keyword, topic, or product name
    "publish_date": date,       # scheduled publish date
    "existing_articles": list,  # pulled from Supabase for internal linking
    "affiliate_products": list, # for conversion articles only
}
```

---

## Agent Outputs (stored in articles table)

```python
outputs = {
    "title": str,
    "slug": str,
    "excerpt": str,             # meta_description — 150-160 chars
    "content": str,             # body_html — full article HTML
    "article_type": str,
    "faq_pairs": list[dict],    # [{question, answer}]
    "internal_links_used": list,
    "external_citation": str,
    "affiliate_links": list[dict],
    "schema_article": dict,
    "schema_faq": dict,
    "schema_breadcrumb": dict,
    "word_count": int,
    "status": "pending_review", # always — never skips HITL
}
```

---

## HITL Approval Flow

1. Agent writes article → status = `pending_review`
2. Supabase Realtime fires → CEO Decoded dashboard surfaces draft in Article Queue
3. Wife receives notification
4. Wife reads full article in dashboard preview pane
5. Wife approves / requests revision / rejects
6. On approve → status = `approved` → FastAPI /agents/decodedsix/publish/{article_id} fires
7. Article updates to status = `published` → Vercel ISR revalidates → live on decodedsix.com

Dashboard route: `/dashboard/decodedsix/article-queue`

---

## n8n Workflow (decodedsix_content_workflow.json)

```
Schedule Trigger (Tue/Thu/Sat 9am MST)
  → Set article_type: Tue=news, Thu=evergreen, Sat=conversion
  → Fetch topic seed (RSS for news / keyword list / product list)
  → Fetch existing_articles from Supabase (internal linking)
  → POST to FastAPI /agents/decodedsix/content
  → FastAPI → LangGraph DSX-CA1 agent
  → Agent returns article JSON
  → INSERT to articles table (status: pending_review)
  → Send notification to wife
```

---

## FastAPI Routes to Build

POST /agents/decodedsix/content
  → Triggers DSX-CA1, inserts article to Supabase

POST /agents/decodedsix/publish/{article_id}
  → Fires on HITL approval: sets status=published, sets published_at=now()

---

## LangGraph Agent Nodes

1. topic_picker_node — selects topic seed based on article_type
2. news_scraper_node — Rockstar Newswire + r/GTA6 RSS (news type only)
3. writer_node — claude-sonnet-4-6, enforces all 10 quality rules
4. faq_generator_node — extracts 3+ FAQ pairs from draft
5. schema_generator_node — builds Article + FAQPage + Breadcrumb JSON-LD
6. internal_link_injector_node — queries articles table, inserts 3+ slug links
7. affiliate_link_injector_node — injects affiliate links (conversion type only)
8. validator_node — word count, FAQ count, schema check. Fails → re-prompt writer
9. output_formatter_node — builds final dict matching articles table columns

---

## Pre-Launch Content Gate

Target: 48 articles live by November 19, 2026.
Start: July 15, 2026.
Rate: 3 per week × 18 weeks = 54 articles (buffer for rejections).

AdSense: Apply at 15 articles live (do not wait for 20).
Ezoic: Switch immediately at 10,000 monthly pageviews.

Affiliate programs — sign up BEFORE first conversion article publishes:
- Amazon Associates
- Fanatical
- CDKeys
- Green Man Gaming

---

## Revenue Context

GTA 6 launched November 19, 2026. GTA Online has 8.5M weekly active players.
Sites indexed and ranking BEFORE launch capture the traffic wave.
Sites that publish ON launch day miss it.
48 articles across news, evergreen, conversion = indexed, ranked, ready.

---

## Schema Markup (agent generates, article page already renders JSON-LD)

Article schema, FAQPage schema, BreadcrumbList schema — see news/[slug]/page.tsx.
The page already has a <script type="application/ld+json"> block for articleJsonLd.
The agent's schema_article output feeds this directly.
FAQPage and Breadcrumb schemas need to be added to news/[slug]/page.tsx in Session G.
