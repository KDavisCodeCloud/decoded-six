# DecodedSix Affiliate Image Library

A local Amazon Associates product library for DecodedSix. Pulse (the
content agent) calls `article_lookup.py` to pull a pre-formatted,
ready-to-embed product card into an article by category or keyword — no
live API calls, no broken images while an article is being drafted.

Associate tag: `decodedsix-20`. Every affiliate link follows
`https://www.amazon.com/dp/{ASIN}?tag=decodedsix-20`.

## How it fits together

```
affiliate/
├── build_library.py     downloads every product image, run this first
├── article_lookup.py    Pulse calls this to embed a product card
├── products.json         the product data — this is what you edit by hand
└── README.md             this file

public/affiliate/images/  {ASIN}.jpg files live here (NOT affiliate/images/)
```

**Why the images live under `public/affiliate/images/` and not
`affiliate/images/`:** Next.js only serves static files that live inside
`public/` at a matching URL. An image downloaded to `public/affiliate/
images/B0CL5KNB9M.jpg` is servable on the live site at
`/affiliate/images/B0CL5KNB9M.jpg` — a plain `<img src="...">` tag in an
article just works. `products.json`, the two scripts, and this README
stay at the repo-root `affiliate/` directory so Pulse can cleanly
`from affiliate.article_lookup import lookup_products` (repo-root-relative
imports are already the convention this codebase uses everywhere else).

---

## Step 1 — Fill in the blank ASINs and image URLs

`products.json` ships with 20 products seeded (title, category, CTA,
description, link/img_local templates) but `asin`, `price`, and `img_url`
are blank. For each product:

1. Search the product title on amazon.com.
2. Open the real product page. The ASIN is the 10-character code in the
   URL right after `/dp/` — e.g. `amazon.com/dp/B0CL5KNB9M/...` → ASIN is
   `B0CL5KNB9M`.
3. Right-click the main product image → **Copy Image Address**. That's
   `img_url`. Use the largest version available (Amazon image URLs
   usually have a size suffix like `._AC_SL1500_.jpg` — a higher number
   there is a bigger image; you can often bump it manually).
4. Copy the current price as plain text (e.g. `"$499.99"`) into `price`.
5. Leave `img_local` and `link` exactly as seeded (`affiliate/images/
   .jpg` and the tag-only URL) — **don't hand-edit these two fields.**
   `build_library.py` derives both from `asin` automatically every time
   it runs, so they can never drift out of sync with a typo.

This is a ~30 minute one-time task for the 20 seed products. Do all 20 in
one sitting if you can — `build_library.py` only downloads what has a
filled-in `asin` + `img_url`, so partial progress is fine too, just run
the script again after adding more.

## Step 2 — Run build_library.py

```bash
python affiliate/build_library.py
```

This downloads every product's image to `public/affiliate/images/
{ASIN}.jpg`, verifies each download actually succeeded (real HTTP 200,
real image bytes, not an error page), and writes the derived
`img_local`/`link` fields back into `products.json`. It prints a clean
downloaded/skipped/failed summary and exits non-zero if anything failed,
so you'll notice.

Safe to re-run any time — already-downloaded images are left alone
unless you pass `--force` (re-downloads everything):

```bash
python affiliate/build_library.py --force
```

## Step 3 — Pulse calls article_lookup.py

**As a Python import** (the normal path — from `src/agents/content/
content_agent.py` or wherever Pulse drafts articles):

```python
from affiliate.article_lookup import lookup_products, get_embed_block

# Get the ready-to-paste HTML directly for the single best match:
html = get_embed_block("headset", limit=1)
if html:
    article_content += "\n\n" + html

# Or get the full structured match(es), including html_card and every
# raw field (title, price, link, asin, ...), if you need more than just
# the HTML:
matches = lookup_products("Controllers", limit=2)
```

Matching is forgiving on purpose — it works with a category name
(`"Controllers"`), a loose keyword (`"headset"`, `"PS5"`), or a partial
product title. It checks category name, title, and description, plus a
small alias table (`ps5` → `playstation 5`, `headset`/`headphones` →
`headsets`, etc. — see `_ALIASES` in `article_lookup.py`) so common
shorthand still matches. Returns `[]` if nothing matches — always check
for that before assuming a card exists; a missing product shouldn't crash
an article draft.

**As a CLI** (for manually testing what a query returns):

```bash
python affiliate/article_lookup.py "headset" --limit 2
python affiliate/article_lookup.py "PS5"
```

Every card includes an Amazon Associates disclosure line
("As an Amazon Associate, DecodedSix earns from qualifying purchases.")
— required by the Amazon Associates Operating Agreement and FTC
endorsement guidelines. It's baked into every card, not left to each
article to remember, so it can never accidentally go missing. Don't
strip it out.

## Adding a new product

Append a new entry to `products.json` following the existing shape:

```json
{
  "asin": "",
  "title": "Product Name",
  "category": "Category Name",
  "price": "",
  "img_url": "",
  "img_local": "affiliate/images/.jpg",
  "link": "https://www.amazon.com/dp/?tag=decodedsix-20",
  "cta": "Get Yours Today",
  "desc": "One or two sentences, written the way the rest of the library talks about GTA 6 relevance."
}
```

Fill in `asin`/`price`/`img_url` per Step 1 above, then run
`build_library.py` again — only the new entry gets downloaded, everything
else is left alone.

If you add a genuinely new category, consider adding a matching alias to
`_ALIASES` in `article_lookup.py` (e.g. if you add a "Flight Sticks"
category, add `"flight stick": "flight sticks"`) so Pulse's loose keyword
matching still finds it.

## When the Amazon Product Advertising (PA) API activates

The manual fill-in step (Step 1) disappears — `build_library.py` gets
updated so its data-loading step pulls `asin`/`img_url`/live `price` from
the PA API instead of reading them out of `products.json` by hand. The
download-and-verify logic, the `public/affiliate/images/` output
location, and `article_lookup.py` all stay exactly the same — only where
the product data itself comes from changes.
