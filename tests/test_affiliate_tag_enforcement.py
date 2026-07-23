"""
Coverage for _ensure_amazon_affiliate_tags (src/agents/content/content_agent.py).

Real bug found 2026-07-22: a currently-published article
(best-gaming-monitor-gta-6-ps5) had 5 Amazon links with zero affiliate
tag, because the tag only ever existed if docs/affiliate_products.json's
source url field already had it -- nothing enforced it structurally.
These tests lock in the code-level fix: any amazon.* link in drafted
content gets tag=decodedsix-20 appended if missing, regardless of
article_type, and existing tags/query params are never duplicated or
broken.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.agents.content.content_agent import _ensure_amazon_affiliate_tags


def test_appends_tag_to_a_bare_product_link():
    content = "Check out the [Samsung Odyssey G7](https://www.amazon.com/dp/B0BGVYQ8CC) for GTA 6."
    fixed, auto_tagged = _ensure_amazon_affiliate_tags(content)
    assert "https://www.amazon.com/dp/B0BGVYQ8CC?tag=decodedsix-20" in fixed
    assert len(auto_tagged) == 1


def test_uses_ampersand_when_url_already_has_a_query_string():
    content = "[Browse monitors](https://www.amazon.com/s?k=4k+gaming+monitor+ps5)"
    fixed, _ = _ensure_amazon_affiliate_tags(content)
    assert "https://www.amazon.com/s?k=4k+gaming+monitor+ps5&tag=decodedsix-20" in fixed


def test_already_tagged_link_is_left_untouched_not_double_tagged():
    content = "[Product](https://www.amazon.com/dp/B0BGVYQ8CC?tag=decodedsix-20)"
    fixed, auto_tagged = _ensure_amazon_affiliate_tags(content)
    assert fixed == content
    assert auto_tagged == []


def test_multiple_links_all_get_fixed_independently():
    content = (
        "[Monitor A](https://www.amazon.com/dp/AAAAAAAAAA) and "
        "[Monitor B](https://www.amazon.com/dp/BBBBBBBBBB?tag=decodedsix-20) and "
        "[Monitor C](https://www.amazon.com/dp/CCCCCCCCCC)"
    )
    fixed, auto_tagged = _ensure_amazon_affiliate_tags(content)
    assert "AAAAAAAAAA?tag=decodedsix-20" in fixed
    assert "BBBBBBBBBB?tag=decodedsix-20" in fixed  # untouched, already correct
    assert "CCCCCCCCCC?tag=decodedsix-20" in fixed
    assert len(auto_tagged) == 2  # only A and C needed fixing


def test_non_amazon_links_are_never_touched():
    content = "[Secretlab chair](https://secretlab.co) and [NordVPN](https://nordvpn.com)"
    fixed, auto_tagged = _ensure_amazon_affiliate_tags(content)
    assert fixed == content
    assert auto_tagged == []


def test_content_with_no_links_at_all_passes_through_unchanged():
    content = "Just a plain paragraph about GTA 6 with no links."
    fixed, auto_tagged = _ensure_amazon_affiliate_tags(content)
    assert fixed == content
    assert auto_tagged == []


def test_matches_the_exact_real_bug_shape_from_the_live_article():
    # The actual content shape found in best-gaming-monitor-gta-6-ps5
    # before the fix -- 4 specific products sharing one generic,
    # untagged search URL.
    content = (
        '- **Best overall:** [Samsung Odyssey G7 28" 4K 144Hz](https://www.amazon.com/s?k=4k+gaming+monitor+ps5) , HDMI 2.1\n'
        '- **Best budget:** [LG 27GP850-B 27" 1440p 165Hz](https://www.amazon.com/s?k=4k+gaming+monitor+ps5) , 1440p'
    )
    fixed, auto_tagged = _ensure_amazon_affiliate_tags(content)
    assert fixed.count("tag=decodedsix-20") == 2
    assert len(auto_tagged) == 2
