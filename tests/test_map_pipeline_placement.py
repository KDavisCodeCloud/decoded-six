"""Gazetteer placement + scraper cadence (pure, no network)."""
from datetime import datetime, timezone

from src.agents.map.placement import Gazetteer
from src.agents.map import scheduler

ROWS = [
    {"name": "Vice City Stadium", "area_name": "Downtown, Vice City", "x": 100, "y": 200},
    {"name": "Unnamed hotel", "area_name": "Washington Beach, Vice Beach", "x": 1400, "y": 2800},
    {"name": "Unnamed residential", "area_name": "Washington Beach, Vice Beach", "x": 1500, "y": 2600},
    {"name": "Unnamed retail", "area_name": "Washington Beach, Vice Beach", "x": 1450, "y": 2700},
    {"name": "Gas Station", "area_name": "Hamlet, Mariana County", "x": -2000, "y": -4000},
    {"name": "Twin Pier", "area_name": "Hamlet", "x": 0, "y": 0},
    {"name": "Twin Pier", "area_name": "Port Gellhorn", "x": -6000, "y": 3000},
]


def test_landmark_anchor_beats_district_and_uses_150m():
    g = Gazetteer.from_rows(ROWS)
    p = g.place(["Vice City Stadium"], "Ammu-Nation", "two blocks from the stadium in Washington Beach")
    assert (p.x, p.y, p.radius_m, p.method) == (100, 200, 150, "gazetteer_landmark")


def test_district_centroid_with_800m_radius():
    g = Gazetteer.from_rows(ROWS)
    p = g.place([], "Safehouse", "on the north end of Washington Beach")
    assert p.method == "gazetteer_district" and p.radius_m == 800
    assert round(p.x) == 1450 and round(p.y) == 2700


def test_generic_and_ambiguous_names_never_place():
    g = Gazetteer.from_rows(ROWS)
    assert g.place(["Gas Station"], "Gas Station", "") is None       # generic
    assert g.place(["Twin Pier"], "x", "") is None                   # same name, two places
    assert g.place([], "Mariana County", "somewhere in Mariana County") is None  # county = no pin


def test_cadence_15_then_30_then_240_minutes():
    at = lambda s: datetime.fromisoformat(s).replace(tzinfo=timezone.utc)
    assert scheduler.scrape_interval(at("2026-11-19T00:00:00")).total_seconds() == 15 * 60
    assert scheduler.scrape_interval(at("2026-11-22T00:00:00")).total_seconds() == 30 * 60
    assert scheduler.scrape_interval(at("2026-11-28T00:00:00")).total_seconds() == 240 * 60
    assert scheduler.scrape_interval(at("2026-11-19T00:00:00"), "*=5").total_seconds() == 300


def test_model_reply_parser_tolerates_fences_and_trailing_text():
    from src.agents.map.ds_map_scrape import _parse_json
    assert _parse_json('{"claims": []}\n\nNote: speculation only') == {"claims": []}
    assert _parse_json('```json\n{"claims": [{"name": "x"}]}\n```') == {"claims": [{"name": "x"}]}


# ------------------------------------------------------------ VOD + leads
def test_quote_time_finds_the_spoken_moment():
    from src.agents.map.sources import quote_time
    segs = [(0.0, "welcome back everyone"), (12.5, "so if you head south of maroon key"),
            (15.0, "you'll find a van stuck in the mud"), (300.0, "anyway that's it")]
    assert quote_time("south of Maroon Key you'll find a van", segs) == 12.5
    assert quote_time("nothing like this was said here", segs) is None


def test_lead_matching_is_name_and_category_based():
    from src.agents.map.ds_map_scrape import lead_for_claim, leads_mentioned
    leads = [{"id": "L1", "name": "Pawn shop in Port Gellhorn", "category": "fence"},
             {"id": "L2", "name": "Hidden Briefcase", "category": None}]
    assert [ld["id"] for ld in leads_mentioned("Found the hidden briefcase behind the pier!", leads)] == ["L2"]
    assert lead_for_claim({"name": "Hidden Briefcase", "category": "money_spot"}, leads)["id"] == "L2"
    assert lead_for_claim({"name": "Pawn shop in Port Gellhorn", "category": "store"}, leads) is None  # category differs
    assert lead_for_claim({"name": "Gym", "category": "gym"}, leads) is None


def test_extraction_drops_unquoted_hint_copied_anchors_and_generic_claims():
    import json as _json
    from types import SimpleNamespace
    from src.agents.map.ds_map_scrape import extract_claims
    from src.agents.map.sources import SourceItem
    reply = {"claims": [
        {"category": "money_spot", "name": "Hidden Briefcase", "location_description": "Port Gellhorn pier",
         "anchor_landmarks": ["Port Gellhorn"], "evidence_quote": "the briefcase is under the pier"},
        {"category": "store", "name": "Ammu-Nation", "location_description": "any Ammu-Nation store",
         "anchor_landmarks": [], "evidence_quote": "visit any Ammu-Nation store"},
        {"category": "gym", "name": "Gym", "location_description": "x", "anchor_landmarks": [],
         "evidence_quote": "this quote was never said in the source"},
    ]}
    ai = SimpleNamespace(messages=SimpleNamespace(create=lambda **k: SimpleNamespace(
        content=[SimpleNamespace(type="text", text=_json.dumps(reply))])))
    item = SourceItem(key="k", source_id="s", source_kind="reddit", url="u", domain="reddit.com", author="a",
                      title="found it", text="", published_at=None)
    rejects: dict = {}
    out = extract_claims(ai, item, "the briefcase is under the pier. also visit any Ammu-Nation store",
                         watch_for=["Hidden Briefcase"], rejects=rejects)
    assert [c["name"] for c in out] == ["Hidden Briefcase"]
    assert out[0]["anchor_landmarks"] == []          # "Port Gellhorn" never appears in the source
    assert rejects == {"generic": 1, "quote_not_in_source": 1}


def test_city_label_is_not_a_landmark_and_wide_areas_are_not_districts():
    from src.agents.map.placement import Gazetteer
    rows = [{"name": "Vice City", "area_name": "Vice City, Vice-Dale County", "x": 0, "y": 0}]
    rows += [{"name": f"Shop {i}", "area_name": "Vice City", "x": i * 900, "y": i * 700} for i in range(-4, 5)]
    rows += [{"name": f"Bar {i}", "area_name": "Little Cuba", "x": 100 + i * 50, "y": 200} for i in range(4)]
    g = Gazetteer.from_rows(rows)
    assert g.lookup("Vice City") is None              # label point + spread-out "area" -> neither
    assert g.is_area("Vice City")
    assert g.lookup("Little Cuba").kind == "district"


def test_hashtag_gtaonline_is_not_gta_online():
    from src.agents.map.ds_map_scrape import _HASHTAG, _ONLINE
    assert not _ONLINE.search(_HASHTAG.sub(" ", "GTA 6 In A Nutshell #gta6 #gtavi #gtaonline"))
    assert _ONLINE.search(_HASHTAG.sub(" ", "Best GTA Online heist payouts"))
