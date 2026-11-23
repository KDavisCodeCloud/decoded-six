"""Swap Kelvin's console captures into launch-guide screenshot slots.

    python scripts/guide_screenshot_dropin.py <folder-of-captures> [--dry-run]

Name each capture after its slot (the filename in the dashboard shot list),
with any extension, e.g. gta-6-infernus-crosstown-garage.png. For each match
the script:
  1. center-crops to 16:9, resizes to 1600x900 (never upscales below that
     width: smaller captures keep their size), and encodes WebP q82;
  2. uploads to the public `guide-images` bucket at <slug>/<slot filename>;
  3. marks the slot filled (url, width, height) on the article -- the alt
     text already in the slot is what renders;
  4. if the guide is PUBLISHED: bumps date_modified (a real content edit) and
     calls /api/revalidate so the live page re-renders and IndexNow is pinged.
     Queued guides just pick it up when approved.
Unmatched files are listed and left alone. Every applied file writes an
audit_log row. Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
DECODEDSIX_API_KEY (revalidate), NEXT_PUBLIC_SITE_URL.
"""
from __future__ import annotations

import argparse
import io
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx
from PIL import Image

BUCKET = "guide-images"
TARGET_W, TARGET_H = 1600, 900
SITE = os.getenv("NEXT_PUBLIC_SITE_URL", "https://www.thedecodedsix.com")


def to_webp(path: Path) -> tuple[bytes, int, int]:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    want = 16 / 9
    if w / h > want:            # too wide: trim sides
        nw = int(h * want)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    elif w / h < want:          # too tall: trim top/bottom
        nh = int(w / want)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    if im.width > TARGET_W:
        im = im.resize((TARGET_W, TARGET_H), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=82, method=6)
    return buf.getvalue(), im.width, im.height


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", type=Path)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    from supabase import create_client
    sb = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    rows = (sb.table("articles").select("id, slug, status, screenshot_slots")
            .in_("article_type", ["guide", "guide_hub"]).execute().data or [])
    by_stem = {}
    for row in rows:
        for slot in row.get("screenshot_slots") or []:
            by_stem[Path(slot["filename"]).stem] = (row, slot)

    files = [p for p in sorted(args.folder.iterdir()) if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp", ".bmp")]
    touched: dict[str, dict] = {}
    unmatched = []
    for f in files:
        hit = by_stem.get(f.stem)
        if not hit:
            unmatched.append(f.name)
            continue
        row, slot = hit
        data, w, h = to_webp(f)
        key = f"{row['slug']}/{slot['filename']}"
        print(f"{f.name} -> {key} ({w}x{h}, {len(data) // 1024} KB)")
        if args.dry_run:
            continue
        sb.storage.from_(BUCKET).upload(key, data, {"content-type": "image/webp", "upsert": "true",
                                                    "cache-control": "31536000"})
        url = sb.storage.from_(BUCKET).get_public_url(key).rstrip("?")
        slot.update({"status": "filled", "url": url, "width": w, "height": h})
        touched[row["id"]] = row

    for row in touched.values():
        update = {"screenshot_slots": row["screenshot_slots"]}
        if row["status"] == "published":
            update["date_modified"] = datetime.now(timezone.utc).isoformat()
        sb.table("articles").update(update).eq("id", row["id"]).execute()
        sb.table("audit_log").insert({"agent_id": "dsx-guide-dropin", "action": "guide_screenshots_filled",
                                      "article_id": row["id"], "result": "success", "error": None}).execute()
        if row["status"] == "published":
            r = httpx.post(f"{SITE}/api/revalidate", json={"slug": row["slug"]}, timeout=30,
                           headers={"Authorization": f"Bearer {os.environ.get('DECODEDSIX_API_KEY', '')}"})
            if r.status_code != 200:
                raise SystemExit(f"revalidate failed for {row['slug']}: {r.status_code} {r.text[:200]}")
            print(f"revalidated /guides/{row['slug']}")

    if unmatched:
        print("No slot matches (rename to a shot-list filename):", ", ".join(unmatched))
    return 0


if __name__ == "__main__":
    sys.exit(main())
