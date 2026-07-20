"""
build_library.py — downloads every product image in products.json to
affiliate/images/{ASIN}.jpg and writes back the derived img_local /
affiliate link fields so they can never drift out of sync with asin.

Usage:
    python affiliate/build_library.py

Safe to re-run any time — already-downloaded images are skipped unless
--force is passed, and products missing an asin or img_url are skipped
with a clear log line rather than treated as failures.

When the Amazon Product Advertising (PA) API activates, only
_fetch_product_data() below needs to change (pull asin/img_url/price
live instead of reading them from products.json) — download_image(),
the verification, and the products.json write-back all stay the same.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

import requests

AFFILIATE_DIR = Path(__file__).parent
REPO_ROOT = AFFILIATE_DIR.parent
# Images are downloaded into public/affiliate/images/, NOT affiliate/images/
# -- Next.js only serves static files from public/ at a matching URL path.
# Storing them at repo-root affiliate/images/ would make every embedded
# card's <img src="/affiliate/images/{asin}.jpg"> 404 on the live site,
# the same class of bug just fixed for the Rockstar press images
# (2026-07-19). Scripts and products.json stay at repo-root affiliate/ for
# clean Python imports from src/agents/content/*.
IMAGES_DIR = REPO_ROOT / "public" / "affiliate" / "images"
PRODUCTS_JSON = AFFILIATE_DIR / "products.json"

# Amazon's image CDN (m.media-amazon.com) returns 403 for requests with no
# User-Agent or an obviously non-browser one -- a real, generic browser
# User-Agent avoids that failure mode entirely.
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}
_TIMEOUT = 15
_MIN_VALID_BYTES = 512  # a real product photo is always far larger than this; anything smaller is an error page, not an image


def load_products() -> list[dict]:
    if not PRODUCTS_JSON.exists():
        raise FileNotFoundError(f"{PRODUCTS_JSON} not found")
    return json.loads(PRODUCTS_JSON.read_text())


def save_products(products: list[dict]) -> None:
    PRODUCTS_JSON.write_text(json.dumps(products, indent=2, ensure_ascii=False) + "\n")


def download_image(url: str, dest: Path) -> tuple[bool, str]:
    """Download url to dest. Returns (success, message)."""
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=_TIMEOUT, stream=True)
    except requests.RequestException as exc:
        return False, f"request failed: {exc}"

    if resp.status_code != 200:
        return False, f"HTTP {resp.status_code}"

    content = resp.content
    if len(content) < _MIN_VALID_BYTES:
        return False, f"response too small to be a real image ({len(content)} bytes) -- likely an error page"

    # Cheap magic-byte check -- JPEG starts with FF D8 FF. Amazon serves
    # some product images as PNG/WEBP too; those still load fine as a
    # {asin}.jpg file in a browser/markdown renderer (the file extension
    # doesn't have to match the true format for that to work), but this at
    # least confirms we got real image bytes back, not an HTML error body.
    is_image = content[:3] == b"\xff\xd8\xff" or content[:8] == b"\x89PNG\r\n\x1a\n" or content[:4] == b"RIFF"
    if not is_image:
        return False, "response body doesn't look like an image (no valid image magic bytes)"

    dest.write_bytes(content)
    return True, f"saved {len(content):,} bytes"


def build_library(force: bool = False) -> dict:
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    products = load_products()

    downloaded, skipped, failed = [], [], []

    for product in products:
        title = product.get("title", "(untitled)")
        asin = (product.get("asin") or "").strip()
        img_url = (product.get("img_url") or "").strip()

        if not asin or not img_url:
            skipped.append((title, "no asin/img_url filled in yet"))
            continue

        dest = IMAGES_DIR / f"{asin}.jpg"
        # Relative to public/ -- becomes the URL path /affiliate/images/{asin}.jpg
        canonical_local = f"affiliate/images/{asin}.jpg"
        canonical_link = f"https://www.amazon.com/dp/{asin}?tag=decodedsix-20"

        if dest.exists() and not force:
            # Already downloaded -- still self-heal the derived fields in
            # case someone hand-edited asin without updating them.
            product["img_local"] = canonical_local
            product["link"] = canonical_link
            skipped.append((title, f"already downloaded ({dest.name}), use --force to redownload"))
            continue

        ok, message = download_image(img_url, dest)
        if ok:
            product["img_local"] = canonical_local
            product["link"] = canonical_link
            downloaded.append((title, message))
        else:
            failed.append((title, message))

    save_products(products)

    print(f"\n{'='*60}")
    print("BUILD LIBRARY RESULTS")
    print(f"{'='*60}")
    print(f"\nDownloaded ({len(downloaded)}):")
    for title, msg in downloaded:
        print(f"  ✓ {title} — {msg}")
    print(f"\nSkipped ({len(skipped)}):")
    for title, reason in skipped:
        print(f"  - {title} — {reason}")
    print(f"\nFailed ({len(failed)}):")
    for title, reason in failed:
        print(f"  ✗ {title} — {reason}")
    print(f"\n{len(downloaded)} downloaded, {len(skipped)} skipped, {len(failed)} failed.")

    return {"downloaded": downloaded, "skipped": skipped, "failed": failed}


def main() -> None:
    parser = argparse.ArgumentParser(description="Download DecodedSix affiliate product images.")
    parser.add_argument("--force", action="store_true", help="Re-download images that already exist locally.")
    args = parser.parse_args()

    result = build_library(force=args.force)
    if result["failed"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
