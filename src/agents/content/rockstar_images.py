"""
Rockstar Games official press image registry for DecodedSix.
Used by DSX-CA1 to inject contextually relevant images into article content.

As of 2026-07-23: character, location, and key art images are now LOCAL
files under public/images/tier1/ (Kelvin downloaded the official public
press kit -- screenshots + artwork/wallpapers -- and they were organized
into the existing Tier 1 structure from docs/VISUAL_STRATEGY.md). This
replaces hotlinking rockstargames.com's CDN for those categories, which
carried real risk: a Rockstar site reorg or filename change would have
silently 404'd any article referencing it, with no local fallback.

Ultimate Edition and Vintage Vice City Pack images remain hotlinked --
no local copies exist for those yet (not part of the July 2026 press kit
download). If/when local copies are added, follow the same pattern as
CHARACTER_META/LOCATION_META/KEYART_META below rather than hand-listing
individual dicts.

Entries are built by SCANNING the real files on disk at import time, not
hand-typed -- adding more screenshots to a character/location folder
later makes them available here automatically, no code change needed.
Only the "landscape" variant of multi-format artwork/postcard/keyart
sets is registered (the other 5 aspect-ratio crops are the same shot,
duplicating them would just dilute get_images_by_tags()'s scoring) --
all distinct numbered screenshots ARE registered individually, since
those are genuinely different shots and the existing tag-matching
design already relied on picking among several per subject.
"""

from __future__ import annotations

from pathlib import Path
from typing import TypedDict

REPO_ROOT = Path(__file__).resolve().parents[3]
TIER1_IMAGES_ROOT = REPO_ROOT / "public" / "images" / "tier1"
BASE = "https://www.rockstargames.com/VI/_next/static/media"  # hotlinked fallback, Ultimate Edition / Vintage Vice City Pack only


class RockstarImage(TypedDict):
    url: str
    caption: str
    category: str
    tags: list[str]


CHARACTER_META: dict[str, dict] = {
    "jason-duval":     {"caption": "Jason Duval",     "category": "characters", "tags": ["jason", "jason duval", "character", "protagonist"]},
    "lucia-caminos":   {"caption": "Lucia Caminos",   "category": "characters", "tags": ["lucia", "lucia caminos", "character", "protagonist"]},
    "cal-hampton":     {"caption": "Cal Hampton",     "category": "characters", "tags": ["cal hampton", "character", "supporting"]},
    "boobie-ike":      {"caption": "Boobie Ike",      "category": "characters", "tags": ["boobie ike", "character", "supporting"]},
    "drequan-priest":  {"caption": "Dre'Quan Priest", "category": "characters", "tags": ["drequan", "dre'quan priest", "character", "supporting"]},
    "real-dimez":      {"caption": "Real Dimez",      "category": "characters", "tags": ["real dimez", "character", "supporting"]},
    "raul-bautista":   {"caption": "Raul Bautista",   "category": "characters", "tags": ["raul bautista", "character", "supporting"]},
    "brian-heder":     {"caption": "Brian Heder",     "category": "characters", "tags": ["brian heder", "character", "supporting"]},
}

LOCATION_META: dict[str, dict] = {
    "vice-city":     {"caption": "Vice City",               "category": "vice_city",     "tags": ["vice city", "city", "map", "location", "zone", "downtown", "beach"]},
    "leonida-keys":  {"caption": "Leonida Keys",             "category": "leonida_keys",  "tags": ["leonida keys", "islands", "keys", "water", "map", "location"]},
    "port-gellhorn": {"caption": "Port Gellhorn",            "category": "port_gellhorn", "tags": ["port gellhorn", "port", "industrial", "heist", "map", "location"]},
    "grassrivers":   {"caption": "Grassrivers",              "category": "grassrivers",   "tags": ["grassrivers", "swamp", "rural", "map", "location"]},
    "ambrosia":      {"caption": "Ambrosia",                 "category": "ambrosia",      "tags": ["ambrosia", "map", "location"]},
    "mount-kalaga":  {"caption": "Mount Kalaga National Park", "category": "mount_kalaga", "tags": ["mount kalaga", "kalaga", "national park", "mountain", "wilderness", "map", "location"]},
}

KEYART_META: dict[str, dict] = {
    "jason-lucia-01":            {"caption": "Jason and Lucia",              "category": "keyart", "tags": ["jason", "lucia", "artwork", "protagonists", "duo", "key art"]},
    "jason-lucia-01-with-logos": {"caption": "Jason and Lucia (with logos)", "category": "keyart", "tags": ["jason", "lucia", "artwork", "protagonists", "duo", "key art", "logo"]},
    "jason-lucia-02":            {"caption": "Jason and Lucia",              "category": "keyart", "tags": ["jason", "lucia", "artwork", "protagonists", "duo", "key art"]},
    "jason-lucia-02-with-logos": {"caption": "Jason and Lucia (with logos)", "category": "keyart", "tags": ["jason", "lucia", "artwork", "protagonists", "duo", "key art", "logo"]},
    "jason-lucia-03":            {"caption": "Jason and Lucia",              "category": "keyart", "tags": ["jason", "lucia", "artwork", "protagonists", "duo", "key art"]},
    "jason-lucia-03-with-logos": {"caption": "Jason and Lucia (with logos)", "category": "keyart", "tags": ["jason", "lucia", "artwork", "protagonists", "duo", "key art", "logo"]},
    "jason-lucia-motel":         {"caption": "Jason and Lucia — Motel",      "category": "keyart", "tags": ["jason", "lucia", "motel", "scene", "artwork", "key art", "story"]},
    "official-cover-art":        {"caption": "GTA VI Official Cover Art",    "category": "keyart", "tags": ["cover art", "official", "artwork", "jason", "lucia", "gta 6", "release", "key art"]},
}


def _scan_screenshots(slug_dir: Path, caption: str, category: str, tags: list[str], url_prefix: str) -> list[RockstarImage]:
    entries = []
    for f in sorted(slug_dir.glob("screenshot-*.jpg")):
        entries.append(RockstarImage(
            url=f"{url_prefix}/{f.name}",
            caption=caption,
            category=category,
            tags=tags,
        ))
    return entries


def _scan_landscape_variant(slug_dir: Path, prefix: str, caption: str, category: str, tags: list[str], url_prefix: str) -> list[RockstarImage]:
    matches = sorted(slug_dir.glob(f"{prefix}*landscape*.jpg"))
    if not matches:
        return []
    return [RockstarImage(url=f"{url_prefix}/{matches[0].name}", caption=caption, category=category, tags=tags)]


def _build_local_registry() -> list[RockstarImage]:
    images: list[RockstarImage] = []

    for slug, meta in CHARACTER_META.items():
        slug_dir = TIER1_IMAGES_ROOT / "characters" / slug
        if not slug_dir.is_dir():
            continue
        url_prefix = f"/images/tier1/characters/{slug}"
        images.extend(_scan_screenshots(slug_dir, meta["caption"], meta["category"], meta["tags"], url_prefix))
        images.extend(_scan_landscape_variant(slug_dir, "artwork-", meta["caption"], meta["category"], meta["tags"] + ["artwork"], url_prefix))

    for slug, meta in LOCATION_META.items():
        slug_dir = TIER1_IMAGES_ROOT / "locations" / slug
        if not slug_dir.is_dir():
            continue
        url_prefix = f"/images/tier1/locations/{slug}"
        images.extend(_scan_screenshots(slug_dir, meta["caption"], meta["category"], meta["tags"], url_prefix))
        images.extend(_scan_landscape_variant(slug_dir, "postcard-", f"{meta['caption']} Postcard", meta["category"], meta["tags"] + ["postcard", "artwork"], url_prefix))

    for slug, meta in KEYART_META.items():
        slug_dir = TIER1_IMAGES_ROOT / "keyart" / slug
        if not slug_dir.is_dir():
            continue
        url_prefix = f"/images/tier1/keyart/{slug}"
        images.extend(_scan_landscape_variant(slug_dir, "", meta["caption"], meta["category"], meta["tags"], url_prefix))

    return images


# Ultimate Edition + Vintage Vice City Pack -- no local copies exist yet,
# stay hotlinked. Remove from here the moment local files are added,
# following the _build_local_registry() pattern instead.
#
# This list was found to be stale vs. src/lib/rockstar-images.ts (the
# frontend mirror) while reconciling the two for this pass -- the TS
# file had 22 Ultimate Edition + 8 Vintage Vice City Pack entries the
# Python side had silently never picked up (only 7 + 3). Restored from
# the TS file's fuller set rather than the other way around, so this
# pass doesn't regress data that already existed correctly on one side.
_HOTLINKED_IMAGES: list[RockstarImage] = [
    {"url": f"{BASE}/ULTIMATE_EDITION_01.16qc1xq5nigg1.jpg", "caption": "GTA 6 Ultimate Edition", "category": "ultimate_edition", "tags": ["ultimate edition", "pre-order", "dlc"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_02.0q-6.nrtf~jj0.jpg", "caption": "GTA 6 Ultimate Edition", "category": "ultimate_edition", "tags": ["ultimate edition", "pre-order", "dlc"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_GROTTI_CHEETAH_01.0a.wy3s_ogjey.jpg", "caption": "'95 Grotti Cheetah", "category": "ultimate_edition", "tags": ["grotti cheetah", "vehicle", "car", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_GROTTI_CHEETAH_02.0rkrlsu_dg~ww.jpg", "caption": "'95 Grotti Cheetah", "category": "ultimate_edition", "tags": ["grotti cheetah", "vehicle", "car", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_HAWK_AND_LITTLE_MORGAN_REVOLVERS_01.0~3pdc~~sing4.jpg", "caption": "Hawk & Little Morgan Revolvers", "category": "ultimate_edition", "tags": ["revolver", "weapon", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_HAWK_AND_LITTLE_MORGAN_REVOLVERS_02.04e_9jco7lluf.jpg", "caption": "Hawk & Little Morgan Revolvers", "category": "ultimate_edition", "tags": ["revolver", "weapon", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_WEAPON_VARIANTS_01.12licq0_o7mb5.jpg", "caption": "Personalized Weapon Variants", "category": "ultimate_edition", "tags": ["weapon", "pistol", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_VICE_CITY_STYLE_01.0.u1gt~99yzks.jpg", "caption": "Vice City Style", "category": "ultimate_edition", "tags": ["outfit", "style", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_VICE_CITY_STYLE_02.0c-r4s-x7srt5.jpg", "caption": "Vice City Style", "category": "ultimate_edition", "tags": ["outfit", "style", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_VAPID_GANADO_RETRO_BUILD_01.062dgvkwdynw5.jpg", "caption": "Ganado Retro Build", "category": "ultimate_edition", "tags": ["ganado", "truck", "vehicle", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_SQUALO_01.0cim7hj58ypb1.jpg", "caption": "Shitzu Squalo Watercraft", "category": "ultimate_edition", "tags": ["squalo", "boat", "watercraft", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_VAPID_BUGGY_01.0jxfiql~371ik.jpg", "caption": "'67 Vapid Dominator Buggy", "category": "ultimate_edition", "tags": ["buggy", "off-road", "vehicle", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_VAPID_BUGGY_02.0tf15jp~61bkj.jpg", "caption": "'67 Vapid Dominator Buggy", "category": "ultimate_edition", "tags": ["buggy", "off-road", "vehicle", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_ELECTRIC_FANG_01.04tsytu7qp2b-.jpg", "caption": "Electric Fang Tattoo Shop", "category": "ultimate_edition", "tags": ["tattoo", "electric fang", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_WYMAN_CAR_COLLECTION_01.0swhrm__iu~6b.jpg", "caption": "Classic Car Collection", "category": "ultimate_edition", "tags": ["classic cars", "vehicles", "ultimate edition", "wyman"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_WYMAN_CAR_COLLECTION_02.0_biiqjqkpg2b.jpg", "caption": "Classic Car Collection", "category": "ultimate_edition", "tags": ["classic cars", "vehicles", "ultimate edition", "wyman"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_RIDEOUT_CUSTOMS_01.065-ms8~k8vbq.jpg", "caption": "Rideout Customs Mod Shop", "category": "ultimate_edition", "tags": ["rideout customs", "mod shop", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_SARAS_SALON_01.0gn7dwlvcgz17.jpg", "caption": "Sara's Unisex Salon", "category": "ultimate_edition", "tags": ["sara's salon", "hair", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_STOCK_305_01.0vuq0m5_1j-17.jpg", "caption": "Stock 305 Clothing Store", "category": "ultimate_edition", "tags": ["stock 305", "clothing", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_GOODTIME_GEAR_01.0t7de8dow381q.jpg", "caption": "Goodtime Gear", "category": "ultimate_edition", "tags": ["goodtime gear", "apparel", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_PTT_STORE_01.0seuocb~7b1-q.jpg", "caption": "PTT YOUNGIN$ Compound", "category": "ultimate_edition", "tags": ["ptt", "gang", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_ONE_EYED_WILLIE_01.0n7-__or5f.b6.jpg", "caption": "One-Eyed Willie's Mod Shop", "category": "ultimate_edition", "tags": ["one-eyed willie", "mod shop", "off-road", "ultimate edition"]},
    {"url": f"{BASE}/VINTAGE_VICE_CITY_PACK_01.05zaof7o1uz.3.jpg", "caption": "Vintage Vice City Pack", "category": "vintage_vice_city", "tags": ["vintage vice city", "pre-order", "pack"]},
    {"url": f"{BASE}/VINTAGE_VICE_CITY_PACK_02.14mvx9a15z8jv.jpg", "caption": "Vintage Vice City Pack", "category": "vintage_vice_city", "tags": ["vintage vice city", "pre-order", "pack"]},
    {"url": f"{BASE}/VINTAGE_VICE_CITY_PACK_VAPID_STANIER_01.004m_8d1~qngy.jpg", "caption": "'55 Vapid Stanier", "category": "vintage_vice_city", "tags": ["vapid stanier", "car", "vehicle", "vintage vice city"]},
    {"url": f"{BASE}/VINTAGE_VICE_CITY_PACK_VAPID_STANIER_02.0s2wun4_vzld2.jpg", "caption": "'55 Vapid Stanier", "category": "vintage_vice_city", "tags": ["vapid stanier", "car", "vehicle", "vintage vice city"]},
    {"url": f"{BASE}/VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_01.15zo0h-xdm91b.jpg", "caption": "Vintage Vice City Outfits & Hairstyles", "category": "vintage_vice_city", "tags": ["outfit", "hairstyle", "style", "vintage vice city"]},
    {"url": f"{BASE}/VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_02.12udfnroe-lah.jpg", "caption": "Vintage Vice City Outfits & Hairstyles", "category": "vintage_vice_city", "tags": ["outfit", "hairstyle", "style", "vintage vice city"]},
    {"url": f"{BASE}/VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_03.0au1tphsftqm5.jpg", "caption": "Vintage Vice City Outfits & Hairstyles", "category": "vintage_vice_city", "tags": ["outfit", "hairstyle", "style", "vintage vice city"]},
    {"url": f"{BASE}/VINTAGE_VICE_CITY_WEAPON_PATTERN_01.0gybtumgwdcoi.jpg", "caption": "Vintage Vice City Weapon Pattern", "category": "vintage_vice_city", "tags": ["weapon", "pattern", "vintage vice city"]},
]

ROCKSTAR_IMAGES: list[RockstarImage] = _build_local_registry() + _HOTLINKED_IMAGES

# Canonical fallbacks when no tags match — generic Vice City images cover most articles
_FALLBACK_IMAGES = [img for img in ROCKSTAR_IMAGES if img["category"] == "vice_city"][:2]


def get_images_by_tags(keywords: list[str], limit: int = 3) -> list[dict]:
    """Return up to `limit` images whose tags best match the provided keywords."""
    lower = [k.lower() for k in keywords]
    scored: list[tuple[int, dict]] = []
    for img in ROCKSTAR_IMAGES:
        score = sum(
            1 for tag in img["tags"]
            if any(k in tag or tag in k for k in lower)
        )
        if score > 0:
            scored.append((score, img))
    scored.sort(key=lambda x: x[0], reverse=True)
    results = [img for _, img in scored[:limit]]
    if not results:
        results = _FALLBACK_IMAGES[:limit]
    return results


def extract_article_keywords(topic: str, article_type: str, scraped_context: str = "") -> list[str]:
    """
    Extract image-matching keywords from article metadata.
    Combines topic words with article-type signals.
    """
    import re as _re

    # Known GTA 6 entities to look for (multi-word first so they match before single words)
    entities = [
        "vice city", "leonida keys", "port gellhorn", "grassrivers", "mount kalaga", "ambrosia",
        "ultimate edition", "vintage vice city",
        "jason duval", "lucia caminos", "cal hampton", "boobie ike", "drequan priest",
        "real dimez", "raul bautista", "brian heder",
        "jason", "lucia", "character",
    ]

    text = (topic + " " + scraped_context[:400]).lower()
    keywords: list[str] = []

    for entity in entities:
        if entity in text:
            keywords.append(entity)

    # Add single meaningful words from topic (4+ chars)
    topic_words = _re.findall(r'\b[a-z]{4,}\b', topic.lower())
    keywords.extend(topic_words)

    # Article-type specific boosts
    if article_type == "conversion":
        keywords.extend(["ultimate edition", "pre-order"])

    return list(dict.fromkeys(keywords))  # deduplicate preserving order
