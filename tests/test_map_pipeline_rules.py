"""Map pin pipeline rules: blocklist, independence, confidence routing,
editorial-only auto-publish block, meter-based dedup."""
from src.agents.map import rules
from src.agents.map.rules import Evidence, MarkerRef


def ev(kind, author, domain, x=None, y=None, r=None, url=None):
    return Evidence(kind=kind, url=url or f"https://{domain}/{author}", domain=domain, author=author,
                    x=x, y=y, radius_m=r)


# ---------------------------------------------------------------- blocklist
def test_blocklist_hits_domains_subdomains_and_ign_maps_only():
    assert rules.blocked_reason("https://www.gtabase.com/gta-6/map") == "gtabase.com"
    assert rules.blocked_reason("https://vimap.saamexe.com/x") == "vimap.saamexe.com"
    assert rules.blocked_reason("https://gtadb.net/map") == "gtadb.net"
    assert rules.blocked_reason("https://map.gtadb.org") is None          # .org is allowed
    assert rules.blocked_reason("https://www.ign.com/maps/gta-6/leonida") == "ign.com/maps"
    assert rules.blocked_reason("https://www.ign.com/articles/gta-6-gas-stations") is None
    assert rules.blocked_reason("https://notgtamap.io.example.com") is None


def test_blocked_links_inside_post_text_including_bare_domains():
    text = "All the gas stations are on https://gtamap.io/pins and also check mapgenie.io, ign.com/maps/gta-6"
    assert rules.blocked_links_in(text) == ["gtamap.io", "mapgenie.io", "ign.com/maps"]
    assert rules.blocked_links_in("found it next to the pier, screenshot https://i.redd.it/abc.png") == []


# ------------------------------------------------------------- independence
def test_same_author_or_same_domain_is_not_independent():
    a = ev("reddit", "u1", "reddit.com")
    assert rules.independent_count([a, ev("reddit", "u2", "reddit.com")]) == 1      # same domain
    assert rules.independent_count([a, ev("youtube", "u1", "youtube.com")]) == 1     # same author
    assert rules.independent_count([a, ev("youtube", "chanA", "youtube.com")]) == 2
    assert rules.independent_count([a, ev("youtube", "chanA", "youtube.com"),
                                    ev("editorial", "powerpyx", "powerpyx.com")]) == 3


# --------------------------------------------------------- confidence/route
def test_single_source_never_auto_publishes():
    s = [ev("reddit", "u1", "reddit.com", 0, 0, 25)]
    c = rules.confidence(s, "screenshot_match")
    assert c < rules.AUTO_PUBLISH_MIN_CONFIDENCE
    assert rules.route(c, s, placed=True) == "pending"


def test_two_independent_with_screenshot_auto_publishes_as_community_reported():
    s = [ev("reddit", "u1", "reddit.com", 0, 0, 25), ev("youtube", "chanA", "youtube.com", 10, 5, 25)]
    c = rules.confidence(s, "screenshot_match")
    assert c >= 0.85
    assert rules.route(c, s, placed=True) == "community_reported"


def test_three_independent_promotes_to_verified():
    s = [ev("reddit", "u1", "reddit.com", 0, 0, 150), ev("youtube", "chanA", "youtube.com", 20, 0, 150),
         ev("editorial", "powerpyx", "powerpyx.com", 0, 30, 150)]
    c = rules.confidence(s, "gazetteer_landmark")
    assert rules.route(c, s, placed=True) == "verified"


def test_editorial_only_can_never_auto_publish_even_at_high_confidence():
    s = [ev("editorial", "powerpyx", "powerpyx.com", 0, 0, 25), ev("editorial", "gamespot", "gamespot.com", 0, 0, 25),
         ev("editorial", "ign", "ign.com", 0, 0, 25)]
    c = rules.confidence(s, "screenshot_match")
    assert c >= 0.85
    assert rules.route(c, s, placed=True) == "pending"


def test_low_confidence_is_held_and_unplaced_goes_to_hitl():
    s = [ev("reddit", "u1", "reddit.com")]
    c = rules.confidence(s, None)
    assert c < 0.5
    assert rules.route(c, s, placed=True) == "held"
    assert rules.route(c, s, placed=False) == "pending"   # "needs placement"


def test_disagreeing_positions_cost_confidence():
    agree = [ev("reddit", "u1", "reddit.com", 0, 0, 150), ev("youtube", "c", "youtube.com", 50, 0, 150)]
    disagree = [ev("reddit", "u1", "reddit.com", 0, 0, 150), ev("youtube", "c", "youtube.com", 2000, 0, 150)]
    assert rules.confidence(disagree, "gazetteer_landmark") < rules.confidence(agree, "gazetteer_landmark")


def test_route_remembers_rejections_and_never_downgrades():
    s = [ev("reddit", "u1", "reddit.com", 0, 0, 25)]
    assert rules.route(0.99, s, placed=True, current_status="rejected") == "rejected"
    assert rules.route(0.1, s, placed=True, current_status="community_reported") == "community_reported"


# -------------------------------------------------------------------- dedup
def test_dedup_uses_max_radius_in_meters_and_category():
    existing = [MarkerRef("a", "fuel_station", 100, 100, 25), MarkerRef("b", "store", 100, 100, 800)]
    # 120 m away: outside a's 25 m but inside the new claim's 150 m -> merge into a
    assert rules.find_duplicate("fuel_station", 220, 100, 150, existing).id == "a"
    # 120 m away with both radii 25 m -> new marker
    assert rules.find_duplicate("fuel_station", 220, 100, 25, existing) is None
    # different category at the same spot never merges
    assert rules.find_duplicate("clothing", 100, 100, 25, existing) is None
    # store b has an 800 m radius, so a claim 600 m away merges into it
    assert rules.find_duplicate("store", 700, 100, 25, existing).id == "b"


def test_unplaced_claims_dedup_on_normalized_name():
    existing = [MarkerRef("u", "safehouse", None, None, None, name="Jason's Safehouse (Hamlet)")]
    assert rules.find_duplicate("safehouse", None, None, None, existing, name="jasons safehouse").id == "u"
