"""
Rockstar Games official press image registry for DecodedSix.
Used by DSX-CA1 to inject contextually relevant images into article content.
All URLs sourced from rockstargames.com/VI official press kit.
"""

from __future__ import annotations

BASE = "https://www.rockstargames.com/VI/_next/static/media"

ROCKSTAR_IMAGES: list[dict] = [
    # Characters — Jason
    {"url": f"{BASE}/Jason_Duval_01.07m377xeb6jhq.jpg", "caption": "Jason Duval", "category": "characters", "tags": ["jason", "character", "protagonist"]},
    {"url": f"{BASE}/Jason_Duval_03.0-1vum7x-3vtp.jpg", "caption": "Jason Duval", "category": "characters", "tags": ["jason", "character", "protagonist"]},
    {"url": f"{BASE}/Jason_Duval_05.0kxp6enhvzqka.jpg", "caption": "Jason Duval", "category": "characters", "tags": ["jason", "character", "protagonist"]},
    # Characters — Lucia
    {"url": f"{BASE}/Lucia_Caminos_01.0a7yqvewctkfp.jpg", "caption": "Lucia Caminos", "category": "characters", "tags": ["lucia", "character", "protagonist"]},
    {"url": f"{BASE}/Lucia_Caminos_03.14xgd2y_ymmeg.jpg", "caption": "Lucia Caminos", "category": "characters", "tags": ["lucia", "character", "protagonist"]},
    {"url": f"{BASE}/Lucia_Caminos_05.0i5b7k6a7_w6p.jpg", "caption": "Lucia Caminos", "category": "characters", "tags": ["lucia", "character", "protagonist"]},
    # Supporting characters
    {"url": f"{BASE}/Cal_Hampton_01.0xlil231_osh4.jpg", "caption": "Cal Hampton", "category": "characters", "tags": ["cal hampton", "character", "supporting"]},
    {"url": f"{BASE}/Boobie_Ike_01.0-wji2pg5anfs.jpg", "caption": "Boobie Ike", "category": "characters", "tags": ["boobie ike", "character", "supporting"]},
    {"url": f"{BASE}/DreQuan_Priest_01.0_0~wi-ipdj35.jpg", "caption": "Dre'Quan Priest", "category": "characters", "tags": ["drequan", "character", "supporting"]},
    {"url": f"{BASE}/Real_Dimez_01.0djwwboo8-glx.jpg", "caption": "Real Dimez", "category": "characters", "tags": ["real dimez", "character", "supporting"]},
    {"url": f"{BASE}/Raul_Bautista_01.0md1ii-yrn96r.jpg", "caption": "Raul Bautista", "category": "characters", "tags": ["raul bautista", "character", "supporting"]},
    {"url": f"{BASE}/Brian_Heder_01.0r.ute88os9k-.jpg", "caption": "Brian Heder", "category": "characters", "tags": ["brian heder", "character", "supporting"]},
    # Vice City
    {"url": f"{BASE}/Vice_City_01.135x56yoeu.6t.jpg", "caption": "Vice City", "category": "vice_city", "tags": ["vice city", "city", "map", "location", "zone", "downtown", "beach"]},
    {"url": f"{BASE}/Vice_City_02.0c5.7qx17u9kl.jpg", "caption": "Vice City", "category": "vice_city", "tags": ["vice city", "city", "map", "location"]},
    {"url": f"{BASE}/Vice_City_04.06evqutgh7624.jpg", "caption": "Vice City", "category": "vice_city", "tags": ["vice city", "city", "map", "location"]},
    {"url": f"{BASE}/Vice_City_06.0_tdmr3u9w84x.jpg", "caption": "Vice City", "category": "vice_city", "tags": ["vice city", "city", "map", "location"]},
    {"url": f"{BASE}/Vice_City_08.0bbg_xp4hqdvz.jpg", "caption": "Vice City", "category": "vice_city", "tags": ["vice city", "city", "map", "location"]},
    # Leonida Keys
    {"url": f"{BASE}/Leonida_Keys_01.0zgz7tveur6y8.jpg", "caption": "Leonida Keys", "category": "leonida_keys", "tags": ["leonida keys", "islands", "keys", "water", "map", "location"]},
    {"url": f"{BASE}/Leonida_Keys_03.0v_3~-9ceyixc.jpg", "caption": "Leonida Keys", "category": "leonida_keys", "tags": ["leonida keys", "islands", "map", "location"]},
    # Port Gellhorn
    {"url": f"{BASE}/Port_Gellhorn_01.0fmisvza-5-cq.jpg", "caption": "Port Gellhorn", "category": "port_gellhorn", "tags": ["port gellhorn", "port", "industrial", "heist", "map", "location"]},
    {"url": f"{BASE}/Port_Gellhorn_03.00c2b0eh7sm~q.jpg", "caption": "Port Gellhorn", "category": "port_gellhorn", "tags": ["port gellhorn", "industrial", "map", "location"]},
    # Grassrivers
    {"url": f"{BASE}/Grassrivers_01.1096rw4lbjur_.jpg", "caption": "Grassrivers", "category": "grassrivers", "tags": ["grassrivers", "swamp", "rural", "map", "location"]},
    {"url": f"{BASE}/Grassrivers_03.14cuv-vg9orw4.jpg", "caption": "Grassrivers", "category": "grassrivers", "tags": ["grassrivers", "swamp", "rural", "map", "location"]},
    # Ambrosia
    {"url": f"{BASE}/Ambrosia_01.0rqphs0gazkm..jpg", "caption": "Ambrosia", "category": "ambrosia", "tags": ["ambrosia", "map", "location"]},
    {"url": f"{BASE}/Ambrosia_03.0vt46a.1s.7-y.jpg", "caption": "Ambrosia", "category": "ambrosia", "tags": ["ambrosia", "map", "location"]},
    # Mount Kalaga
    {"url": f"{BASE}/Mount_Kalaga_National_Park_01.0v5fl0f83hjv_.jpg", "caption": "Mount Kalaga National Park", "category": "mount_kalaga", "tags": ["mount kalaga", "kalaga", "national park", "mountain", "wilderness", "map", "location"]},
    {"url": f"{BASE}/Mount_Kalaga_National_Park_03.037k2s87rwuxc.jpg", "caption": "Mount Kalaga National Park", "category": "mount_kalaga", "tags": ["mount kalaga", "national park", "map", "location"]},
    # Ultimate Edition
    {"url": f"{BASE}/ULTIMATE_EDITION_01.16qc1xq5nigg1.jpg", "caption": "GTA 6 Ultimate Edition", "category": "ultimate_edition", "tags": ["ultimate edition", "pre-order", "dlc", "edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_02.0q-6.nrtf~jj0.jpg", "caption": "GTA 6 Ultimate Edition", "category": "ultimate_edition", "tags": ["ultimate edition", "pre-order", "dlc"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_GROTTI_CHEETAH_01.0a.wy3s_ogjey.jpg", "caption": "'95 Grotti Cheetah", "category": "ultimate_edition", "tags": ["grotti cheetah", "vehicle", "car", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_VAPID_BUGGY_01.0jxfiql~371ik.jpg", "caption": "'67 Vapid Dominator Buggy", "category": "ultimate_edition", "tags": ["buggy", "off-road", "vehicle", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_HAWK_AND_LITTLE_MORGAN_REVOLVERS_01.0~3pdc~~sing4.jpg", "caption": "Hawk & Little Morgan Revolvers", "category": "ultimate_edition", "tags": ["revolver", "weapon", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_VICE_CITY_STYLE_01.0.u1gt~99yzks.jpg", "caption": "Vice City Style", "category": "ultimate_edition", "tags": ["outfit", "style", "fashion", "ultimate edition"]},
    {"url": f"{BASE}/ULTIMATE_EDITION_RIDEOUT_CUSTOMS_01.065-ms8~k8vbq.jpg", "caption": "Rideout Customs Mod Shop", "category": "ultimate_edition", "tags": ["rideout customs", "mod shop", "ultimate edition"]},
    # Vintage Vice City Pack
    {"url": f"{BASE}/VINTAGE_VICE_CITY_PACK_01.05zaof7o1uz.3.jpg", "caption": "Vintage Vice City Pack", "category": "vintage_vice_city", "tags": ["vintage vice city", "pre-order", "pack", "bonus"]},
    {"url": f"{BASE}/VINTAGE_VICE_CITY_PACK_VAPID_STANIER_01.004m_8d1~qngy.jpg", "caption": "'55 Vapid Stanier", "category": "vintage_vice_city", "tags": ["vapid stanier", "car", "vehicle", "vintage vice city"]},
    {"url": f"{BASE}/VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_01.15zo0h-xdm91b.jpg", "caption": "Vintage Vice City Outfits & Hairstyles", "category": "vintage_vice_city", "tags": ["outfit", "hairstyle", "style", "vintage vice city"]},
    # Artwork / General
    {"url": f"{BASE}/Official_Cover_Art_landscape.12.uu2irr.2_a.jpg", "caption": "GTA VI Official Cover Art", "category": "artwork", "tags": ["cover art", "official", "artwork", "jason", "lucia", "gta 6", "release"]},
    {"url": f"{BASE}/Jason_and_Lucia_03_landscape.0419q._86ukpt.jpg", "caption": "Jason and Lucia", "category": "artwork", "tags": ["jason", "lucia", "artwork", "protagonists", "duo"]},
    {"url": f"{BASE}/Vice_City_Postcard_landscape.0v2njmlk2n-qm.jpg", "caption": "Vice City Postcard", "category": "artwork", "tags": ["vice city", "artwork", "postcard", "landscape"]},
]

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
