"""Body word count + launch-guide gates (Kelvin, 2026-11-23). No network, no DB."""
import pytest

from src.agents.content import content_agent as ca
from src.agents.content.ds_humanizer import _body_word_count as humanizer_count
from src.agents.content.ds_humanizer import _mechanical_pass


def words(n, w="word"):
    return " ".join([w] * n)


BODY = f"The Infernus is in the garage.\n\n## Where to Go\n\n{words(50)}\n"


def test_faq_excluded():
    assert ca._body_word_count(BODY + f"\n## Frequently Asked Questions\n\n{words(500)}\n") == ca._body_word_count(BODY)


def test_sources_toc_map_and_related_sections_excluded():
    extra = (f"\n## Table of Contents\n\n- {words(20)}\n\n## Sources\n\n- https://x.com {words(30)}\n"
             f"\n### On the map\n\n{words(10)}\n\n## Related guides\n\n{words(10)}\n")
    assert ca._body_word_count(BODY + extra) == ca._body_word_count(BODY)


def test_captions_credits_markers_updates_excluded():
    extra = ("\n![Infernus in the garage](/a.webp)\n*Image credit: Rockstar Games*\n*Video: Channel on YouTube*\n"
             "*Screenshot: DecodedSix*\n{{screenshot:gta-6-infernus-garage.webp}}\n{{video:1}}\n"
             "> **Update — November 23, 2026:** new things were found here today\nUpdated November 23, 2026\n")
    assert ca._body_word_count(BODY + extra) == ca._body_word_count(BODY)


def test_markdown_syntax_tokens_never_count_but_table_text_does():
    table = "| Car | Where |\n|---|---|\n| Infernus | Crosstown |\n"
    assert ca._body_word_count(table) == 4
    assert ca._body_word_count("## Steps\n\n- one — two") == 3


def test_section_after_excluded_section_still_counts():
    md = f"## Sources\n\n{words(40)}\n\n## How to Rob a Store\n\n{words(7)}"
    assert ca._body_word_count(md) == 5 + 7


def test_humanizer_uses_the_same_counter():
    md = BODY + "\n## Sources\n\n- a b c\n\n{{video:1}}\n"
    assert humanizer_count(md) == ca._body_word_count(md)


def test_humanizer_keeps_ultimate_edition_and_markers():
    out = _mechanical_pass("GTA 6 Ultimate Edition cars. {{screenshot:gta-6-ultimate-edition-cars.webp}}")
    assert "Ultimate Edition" in out and "{{screenshot:gta-6-ultimate-edition-cars.webp}}" in out


def _guide_state(body_words, article_type="guide", **over):
    content = (
        "The Infernus is parked on level 7.\n\n## Quick Reference\n\n| Car | Where |\n|---|---|\n| Infernus | Crosstown |\n\n"
        f"## How to Get It\n\n{words(body_words)}\n\n{{{{screenshot:gta-6-infernus-garage.webp}}}}\n\n"
        "## Tips\n\nKeep it.\n\n## After\n\nDone.\n\n## Extra\n\nMore.\n\n## Last\n\nEnd.\n\n"
        f"## Frequently Asked Questions\n\n{words(900)}\n"
    )
    st = {
        "article_type": article_type, "title": "GTA 6 Pegassi Infernus Location", "slug": "gta-6-infernus-location",
        "excerpt": "x" * 150, "content": content, "word_count": ca._body_word_count(content),
        "faq_pairs": [{"question": "q", "answer": "a"}] * 3,
        "guide_spec": {"sources": [{"url": "a"}, {"url": "b"}],
                       "screenshot_slots": [{"filename": "gta-6-infernus-garage.webp"}], "videos": []},
    }
    st.update(over)
    return st


def test_guide_below_floor_is_rejected_even_with_long_faq():
    st = _guide_state(900)
    assert st["word_count"] < 1200
    with pytest.raises(ca.ContentAgentError, match="below the 1200-word"):
        ca._node_validator(st)


def test_guide_at_floor_passes():
    ca._node_validator(_guide_state(1200))


def test_hub_floor_is_1800():
    with pytest.raises(ca.ContentAgentError, match="below the 1800-word"):
        ca._node_validator(_guide_state(1500, article_type="guide_hub"))
    ca._node_validator(_guide_state(1800, article_type="guide_hub"))


def test_guide_gates_table_markers_sources():
    st = _guide_state(1300)
    st["content"] = st["content"].replace("|---|---|", "").replace("{{screenshot:gta-6-infernus-garage.webp}}",
                                                                    "{{screenshot:gta-6-made-up.webp}}\n{{video:2}}")
    st["guide_spec"]["sources"] = [{"url": "a"}]
    msg = str(pytest.raises(ca.ContentAgentError, ca._node_validator, st).value)
    for part in ("quick-reference markdown table", "unknown screenshot markers", "video markers out of range",
                 "fewer than 2 research sources"):
        assert part in msg


def test_guide_requires_spec():
    with pytest.raises(ValueError, match="requires guide_spec"):
        ca.run_content_agent("guide", topic_seed="x", supabase_client=object(), anthropic_client=object())


class _FakeAI:
    def __init__(self, text):
        self.text = text
        self.messages = self

    def create(self, **kw):
        class B:
            type = "text"
        b = B(); b.text = self.text

        class R:
            content = [b]
        return R()


def test_expander_grows_short_guide_and_never_touches_other_types():
    st = _guide_state(300)
    longer = st["content"].replace(words(300), words(1300))
    out = ca._node_expander(dict(st), _FakeAI(longer))
    assert out["word_count"] >= 1200
    news = {"article_type": "news", "word_count": 10, "content": "short"}
    assert ca._node_expander(dict(news), None) == news


def test_faq_extract_input_reaches_late_faq():
    md = words(3000) + "\n\n## Frequently Asked Questions\n\n**Where?** Here."
    assert ca._faq_extract_input(md).startswith("## Frequently Asked Questions")


def test_humanizer_dash_replacement_keeps_spacing_and_table_cells():
    out = _mechanical_pass("a sequence—Tourist Trap—then more. | Cash | — | Bank |\n|---|---|---|")
    assert "sequence, Tourist Trap, then" in out and "| n/a |" in out and "|---|" in out


class _FakeSB:
    def __init__(self, rows):
        self.rows, self.audits = rows, []

    def table(self, name):
        sb = self

        class Q:
            def select(self, *a): return self
            def in_(self, *a): return self
            def insert(self, row): sb.audits.append(row); return self
            def execute(self):
                class R: data = sb.rows
                return R()
        return Q()


def test_series_exemption_only_inside_the_same_guide_group():
    gate = {"verdict": "DUPLICATE", "matched_slugs": ["gta-6-chapter-1-missables-tourist-trap"], "reason": "r"}
    st = {"topic": "hub", "guide_spec": {"group": "missables"}}
    same = _FakeSB([{"slug": "gta-6-chapter-1-missables-tourist-trap", "guide_group": "missables"}])
    assert ca._series_exempt_gate(gate, st, same)["verdict"] == "CLEAR" and same.audits
    other = _FakeSB([{"slug": "gta-6-chapter-1-missables-tourist-trap", "guide_group": None}])
    assert ca._series_exempt_gate(gate, st, other)["verdict"] == "DUPLICATE"
    assert ca._series_exempt_gate(gate, {"topic": "x"}, same)["verdict"] == "DUPLICATE"
