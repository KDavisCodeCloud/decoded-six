"""
One-time backfill: translates every currently-published article into all
7 supported locales (Kelvin, 2026-08-07). Future articles get this
automatically via POST /api/translate/{id}, fired by the HITL approve
action (src/app/api/articles/[id]/review/route.ts) — this script exists
only to cover the back-catalog that predates that wiring.

Run with real credentials via Railway (matches this repo's own local-dev
convention — ANTHROPIC_API_KEY/SUPABASE_SERVICE_ROLE_KEY live there, not
necessarily in a local .env.local):

    railway run --service decoded-six python3 scripts/backfill_translations.py
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from supabase import create_client

from src.agents.content.ds_translate import SUPPORTED_LOCALES, translate_article


def main() -> None:
    sb = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    articles = sb.table("articles").select("id, slug").eq("status", "published").execute().data or []
    print(f"Backfilling {len(articles)} published articles x {len(SUPPORTED_LOCALES)} locales "
          f"= {len(articles) * len(SUPPORTED_LOCALES)} translations")

    # Skip anything already completed (safe to re-run after a partial failure).
    existing = sb.table("article_translations").select("article_id, locale").eq("translation_status", "completed").execute().data or []
    done = {(row["article_id"], row["locale"]) for row in existing}

    total_ok, total_failed = 0, 0
    for article in articles:
        for locale in SUPPORTED_LOCALES:
            if (article["id"], locale) in done:
                continue
            try:
                translate_article(article["id"], locale, supabase_client=sb)
                print(f"  OK    {article['slug']} -> {locale}")
                total_ok += 1
            except Exception as exc:  # noqa: BLE001 — one failure must never stop the batch
                print(f"  FAIL  {article['slug']} -> {locale}: {exc}")
                total_failed += 1

    print(f"\nDone. {total_ok} succeeded, {total_failed} failed.")


if __name__ == "__main__":
    main()
