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
