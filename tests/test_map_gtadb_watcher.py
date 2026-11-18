"""gtadb watcher + landmark import: pure helpers (no network, no DB)."""
import importlib.util
from pathlib import Path

from src.agents.map.gtadb_watcher import diff_landmarks, summarize_changes

_spec = importlib.util.spec_from_file_location(
    "import_gtadb_landmarks", Path(__file__).resolve().parents[1] / "scripts" / "import_gtadb_landmarks.py")
imp = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(imp)


def test_summarize_changes_groups_tile_sets_and_landmarks():
    out = summarize_changes("M\tmaps/tiles/6/yanis,19/0/0,0,0.jpg\nA\tmaps/tiles/6/yanis,19/1/1,1,1.jpg\n"
                            "M\tmap/data/6/landmarks.json\nM\tREADME.md")
    assert out == {"tile_sets": {"yanis,19": 2}, "landmarks_changed": True, "other_files": 1}


def test_diff_landmarks_counts_added_moved_renamed():
    old = {"L1": ["A", [0, 0]], "L2": ["B", [5, 5]], "L3": ["C", []]}
    new = {"L1": ["A", [0, 0]], "L2": ["B2", [9, 9]], "L3": ["C", [1, 1]], "L4": ["D", [2, 2]]}
    d = diff_landmarks(old, new)
    assert (d["added"], d["removed"], d["moved"], d["renamed"]) == (1, 0, 2, 1)
    assert d["newly_positioned"] == 2  # L3 gained a position, L4 is new and positioned


def test_import_category_and_county_rules():
    assert imp.category_for(["#gas", "retail"]) == "fuel_station"
    assert imp.category_for(["residential"]) == "landmark"
    assert imp.explicit_county("Farm, Kelly County") == "Kelly"
    assert imp.explicit_county("?, Downtown, Vice City") is None
    assert imp.visible_tags(["//pink", "l4", "#gas", "hotel"]) == ["#gas", "hotel"]


def test_import_skips_nothing_it_was_given_and_never_invents_positions():
    recs = {"L1": ["Pier, Vice Beach", [10.0, 20.0], [], "", [], [], ["landmark"], "x", []],
            "L2": ["?, Hamlet, Mariana County", [1.0, 2.0], [], "", [], [], ["#gas"], "x", []]}
    rows = imp.build_rows(recs, "8b1dc4f06")
    assert [(r["x"], r["y"]) for r in rows] == [(10.0, 20.0), (1.0, 2.0)]
    assert rows[1]["name"] == "Unnamed gas" and rows[1]["county"] == "Mariana"
    assert all(r["status"] == "approved" and r["source_type"] == "gtadb_import" for r in rows)
