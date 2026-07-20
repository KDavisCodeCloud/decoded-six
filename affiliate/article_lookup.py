"""
article_lookup.py — what the Pulse content agent calls to find and embed
an affiliate product card while drafting an article.

As a Python import (the normal path from src/agents/content/*.py):

    from affiliate.article_lookup import lookup_products, get_embed_block

    matches = lookup_products("headset", limit=1)
    html = matches[0]["html_card"] if matches else None

    # or, if you just want the ready-to-paste HTML directly:
    html = get_embed_block("PS5", limit=1)

As a CLI (for manual testing):

    python affiliate/article_lookup.py "headset"
    python affiliate/article_lookup.py "PS5" --limit 2

Matching is deliberately forgiving -- category name, product title, or a
loose keyword all work ("Controllers", "headset", "PS5" all match
correctly) via a small alias table plus substring scoring, not an exact
match requirement.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Optional

AFFILIATE_DIR = Path(__file__).parent
PRODUCTS_JSON = AFFILIATE_DIR / "products.json"

# Common shorthand a content agent (or a human) is likely to type, mapped
# to the term that actually appears in products.json's title/category/desc
# fields. Extend this as new products/keywords get added.
_ALIASES = {
    "ps5": "playstation 5",
    "ps5 pro": "playstation 5 pro",
    "playstation": "playstation 5",
    "series x": "xbox series x",
    "switch": "nintendo switch",
    "switch 2": "nintendo switch 2",
    "headset": "headsets",
    "headphones": "headsets",
    "controller": "controllers",
    "gamepad": "controllers",
    "monitor": "monitors",
    "screen": "monitors",
    "keyboard": "keyboards",
    "mouse": "mice",
    "chair": "gaming chairs",
    "desk": "gaming desks",
    "ssd": "storage",
    "hard drive": "storage",
    "capture card": "capture cards",
    "streaming": "capture cards",
    "mic": "microphones",
    "microphone": "microphones",
    "thumbstick": "accessories",
    "thumbsticks": "accessories",
}


def _load_products() -> list[dict]:
    if not PRODUCTS_JSON.exists():
        return []
    return json.loads(PRODUCTS_JSON.read_text())


def _score(query: str, product: dict) -> int:
    category = (product.get("category") or "").lower()
    title = (product.get("title") or "").lower()
    desc = (product.get("desc") or "").lower()

    if query == category:
        return 100
    if query in category:
        return 60
    if query in title:
        return 40
    if query in desc:
        return 10
    return 0


def render_card(product: dict) -> str:
    """
    Renders one embed-ready HTML card. Inline-styled (not Tailwind
    classes) so it survives being pasted raw into markdown content and
    rendered through react-markdown's rehypeRaw pass, regardless of what
    CSS classes are or aren't in scope there. Matches the public site's
    base design tokens (docs/CLAUDE.md): #070910 background family,
    #f5a623 amber accent, IBM Plex Sans body.

    Includes an affiliate disclosure line on every card, not just once
    per article -- required by the Amazon Associates Operating Agreement
    and FTC endorsement guidelines, and safest to bake in here rather
    than rely on every article remembering a separate disclosure.
    """
    title = product.get("title", "")
    desc = product.get("desc", "")
    price = product.get("price") or ""
    cta = product.get("cta") or "Check Price"
    link = product.get("link") or "#"
    img_local = product.get("img_local") or ""
    img_src = f"/{img_local}" if img_local and not img_local.startswith(("/", "http")) else img_local

    price_html = f'<span style="color:#f5a623;font-weight:700;font-size:15px;">{price}</span>' if price else ""

    return f'''<div style="display:flex;gap:16px;align-items:center;background:#0d0f14;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;margin:24px 0;font-family:'IBM Plex Sans',sans-serif;">
  <img src="{img_src}" alt="{title}" style="width:96px;height:96px;object-fit:contain;border-radius:8px;background:#070910;flex-shrink:0;" loading="lazy" />
  <div style="flex:1;min-width:0;">
    <p style="margin:0 0 4px 0;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;color:#eef2f5;">{title}</p>
    <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#9aa4ad;">{desc}</p>
    {price_html}
    <div style="margin-top:8px;">
      <a href="{link}" target="_blank" rel="nofollow sponsored noopener noreferrer" style="display:inline-block;background:#f5a623;color:#070910;font-weight:700;font-size:13px;padding:8px 16px;border-radius:8px;text-decoration:none;">{cta} →</a>
    </div>
    <p style="margin:8px 0 0 0;font-size:10px;color:#5b6673;">As an Amazon Associate, DecodedSix earns from qualifying purchases.</p>
  </div>
</div>'''


def lookup_products(query: str, limit: int = 3) -> list[dict]:
    """
    Returns up to `limit` matching products, each with an added
    'html_card' key holding the embed-ready HTML block. Empty list if
    nothing matches -- callers should handle that (skip the embed, don't
    crash the article draft over a missing product).
    """
    if not query or not query.strip():
        return []

    q = query.strip().lower()
    expanded = _ALIASES.get(q, q)

    products = _load_products()
    scored = []
    for product in products:
        score = max(_score(q, product), _score(expanded, product))
        if score > 0:
            scored.append((score, product))

    scored.sort(key=lambda x: x[0], reverse=True)

    results = []
    for _, product in scored[:limit]:
        enriched = dict(product)
        enriched["html_card"] = render_card(product)
        results.append(enriched)
    return results


def get_embed_block(query: str, limit: int = 1) -> Optional[str]:
    """Convenience wrapper -- returns the joined HTML for the top match(es)
    directly, or None if nothing matched. This is what most callers want."""
    matches = lookup_products(query, limit=limit)
    if not matches:
        return None
    return "\n\n".join(m["html_card"] for m in matches)


def main() -> None:
    parser = argparse.ArgumentParser(description="Look up DecodedSix affiliate products by category or keyword.")
    parser.add_argument("query", help='Category or keyword, e.g. "Controllers", "headset", "PS5"')
    parser.add_argument("--limit", type=int, default=3)
    args = parser.parse_args()

    matches = lookup_products(args.query, limit=args.limit)
    if not matches:
        print(f"No matches for '{args.query}'.")
        return

    print(f"{len(matches)} match(es) for '{args.query}':\n")
    for m in matches:
        print(f"- {m['title']} ({m.get('category')}) — asin={m.get('asin') or '(not filled in yet)'}")
    print("\n--- Embed-ready HTML (first match) ---\n")
    print(matches[0]["html_card"])


if __name__ == "__main__":
    main()
