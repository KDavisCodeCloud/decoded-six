"""
Coverage for _node_schema_generator (src/agents/content/content_agent.py).

Real bug found 2026-07-25 auditing live JSON-LD output on a published
article: datePublished/dateModified were literal null in production.
state.get("publish_date", default) only uses `default` when the key is
missing -- an earlier node explicitly sets state["publish_date"] = None
(true publish date isn't known until HITL approval, after this node
runs), so .get() returned that None instead of falling back. These
tests lock in the `or` fix, which catches both "key missing" and "key
present but falsy".
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.agents.content.content_agent import _node_schema_generator


def _base_state(**overrides):
    state = {
        "title": "GTA 6 Vice City: Every Location Detail",
        "excerpt": "Every confirmed location detail from official trailers.",
        "slug": "gta-6-vice-city-location-details",
        "faq_pairs": [],
    }
    state.update(overrides)
    return state


def test_publish_date_none_falls_back_to_a_real_timestamp_not_null():
    # This is the exact real-world shape: key present, value explicitly None.
    state = _base_state(publish_date=None)
    result = _node_schema_generator(state)

    assert result["schema_article"]["datePublished"] is not None
    assert result["schema_article"]["dateModified"] is not None


def test_publish_date_missing_key_also_falls_back():
    state = _base_state()
    assert "publish_date" not in state
    result = _node_schema_generator(state)

    assert result["schema_article"]["datePublished"] is not None


def test_real_publish_date_is_used_when_present():
    state = _base_state(publish_date="2026-07-25T18:22:54.420Z")
    result = _node_schema_generator(state)

    assert result["schema_article"]["datePublished"] == "2026-07-25T18:22:54.420Z"
    assert result["schema_article"]["dateModified"] == "2026-07-25T18:22:54.420Z"


def test_schema_article_url_uses_www_canonical_domain():
    state = _base_state(publish_date="2026-07-25T18:22:54.420Z")
    result = _node_schema_generator(state)

    assert result["schema_article"]["url"].startswith("https://www.thedecodedsix.com")
    assert result["schema_article"]["publisher"]["url"].startswith("https://www.thedecodedsix.com")


def test_breadcrumb_uses_www_canonical_domain():
    state = _base_state(publish_date="2026-07-25T18:22:54.420Z")
    result = _node_schema_generator(state)

    for item in result["schema_breadcrumb"]["itemListElement"]:
        assert item["item"].startswith("https://www.thedecodedsix.com")
