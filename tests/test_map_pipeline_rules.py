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
def test_different_authors_are_independent_regardless_of_domain():
    a = ev("reddit", "u1", "reddit.com")
    assert rules.independent_count([a, ev("reddit", "u2", "reddit.com")]) == 2      # two Reddit users
    assert rules.independent_count([ev("youtube", "UCa", "youtube.com"), ev("youtube", "UCb", "youtube.com")]) == 2
    assert rules.independent_count([a, ev("youtube", "chanA", "youtube.com"),
                                    ev("editorial", "powerpyx", "powerpyx.com")]) == 3


def test_same_author_anywhere_counts_once():
    a = ev("reddit", "u1", "reddit.com")
    assert rules.independent_count([a, ev("youtube", "u1", "youtube.com")]) == 1
    # YouTube id differs, but the display name matches the Reddit username
    yt = Evidence("youtube", "https://youtube.com/watch?v=x", "youtube.com", "UCzzz", author_name="DarkViperAU")
    rd = Evidence("reddit", "https://reddit.com/r/GTA6/comments/abc", "reddit.com", "darkviperau",
                  author_name="darkviperau")
    assert rules.independent_count([yt, rd]) == 1


def test_crossposts_reposts_and_one_thread_count_once():
    t1 = Evidence("reddit", "https://reddit.com/r/GTA6/comments/aaa", "reddit.com", "u1", thread_key="reddit:aaa")
    xpost = Evidence("reddit", "https://reddit.com/r/GTA/comments/bbb", "reddit.com", "u2", thread_key="reddit:aaa")
    repost = Evidence("reddit", "https://reddit.com/r/GTA6/comments/ccc", "reddit.com", "u3",
                      thread_key="reddit:ccc", content_key="i.redd.it/x.png")
    orig_img = Evidence("reddit", "https://reddit.com/r/GTA6/comments/ddd", "reddit.com", "u4",
                        thread_key="reddit:ddd", content_key="i.redd.it/x.png")
    assert rules.independent_count([t1, xpost]) == 1
    assert rules.independent_count([repost, orig_img]) == 1
    assert rules.independent_count([t1, xpost, repost, orig_img]) == 2


def test_crosspost_inherits_original_thread_key():
    from src.agents.map.sources import reddit_thread_key
    own = "https://www.reddit.com/r/GTA/comments/bbb/x/"
    assert reddit_thread_key("t3_bbb", own, ["https://www.reddit.com/r/GTA6/comments/AAA/orig/"]) == "reddit:aaa"
    assert reddit_thread_key("t3_bbb", own, [own, "https://i.redd.it/x.png"]) == "reddit:bbb"


def test_two_reddit_users_with_screenshots_can_now_auto_publish():
    s = [ev("reddit", "u1", "reddit.com", 0, 0, 25), ev("reddit", "u2", "reddit.com", 10, 0, 25)]
    c = rules.confidence(s, "screenshot_match")
    assert rules.route(c, s, placed=True) == "community_reported"


# --------------------------------------------------------- confidence/route
def test_single_placed_source_publishes_without_hitl():
    s = [ev("reddit", "u1", "reddit.com", 0, 0, 25)]
    assert rules.route(rules.confidence(s, "screenshot_match"), s, placed=True) == "community_reported"


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


def test_a_single_guide_article_publishes():
    s = [ev("editorial", "powerpyx", "powerpyx.com", 0, 0, 150)]
    assert rules.route(rules.confidence(s, "gazetteer_landmark"), s, placed=True) == "community_reported"


def test_screenshot_plus_second_source_is_verified():
    a = Evidence("reddit", "https://r/1", "reddit.com", "u1", 0, 0, 25, "screenshot_match")
    b = ev("youtube", "chanA", "youtube.com", 10, 0, 150)
    assert rules.route(0.9, [a, b], placed=True) == "verified"


def test_low_confidence_is_held_and_unplaced_goes_to_hitl():
    s = [ev("reddit", "u1", "reddit.com")]
    c = rules.confidence(s, None)
    assert c < 0.5
    assert rules.route(c, s, placed=True) == "community_reported"   # no held tier any more
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


# ------------------------------------------------------------ claim quality
KNOWN = {"vice beach", "little cuba", "maroon key", "port gellhorn"}
known = lambda n: rules.normalize_name(n) in KNOWN  # noqa: E731


def claim(name, desc="", anchors=(), quote=""):
    return {"name": name, "location_description": desc, "anchor_landmarks": list(anchors), "evidence_quote": quote}


def test_generic_claims_are_dropped():
    assert rules.claim_reject_reason(claim("Ammu-Nation", "Any Ammu-Nation store in Leonida"), known) == "generic"
    assert rules.claim_reject_reason(claim("Coffee Shop", "A location Lucia needs to return to"), known) == "generic"
    assert rules.claim_reject_reason(claim("Gas station", "every gas station sells snacks"), known) == "generic"
    assert rules.claim_reject_reason(claim("Gym"), known) == "generic"


def test_specific_claims_survive():
    assert rules.claim_reject_reason(claim("Ammu-Nation, Little Cuba", "on the corner in Little Cuba",
                                           ["Little Cuba"]), known) is None
    assert rules.claim_reject_reason(claim("Gym", "on the boardwalk", ["Vice Beach"]), known) is None
    assert rules.claim_reject_reason(claim("Three Sheets Liquor Store"), known) is None
    assert rules.claim_reject_reason(claim("Van Stuck in Mud", "south of Maroon Key", ["Maroon Key"]), known) is None


def test_real_world_names_are_dropped_unless_leonida_uses_them():
    assert rules.claim_reject_reason(claim("Key West", "a location the player mentions"), known) == "real_world"
    assert rules.claim_reject_reason(claim("Miami"), known) == "real_world"
    assert rules.claim_reject_reason(claim("Hidden cash", "somewhere in Miami", ["Miami"]), known) == "real_world"
    assert rules.claim_reject_reason(claim("Marathon"), lambda n: rules.normalize_name(n) == "marathon") is None


def test_quote_must_be_in_source():
    body = "so this is Three Sheets liquor, I mean I probably should put my gun away before going in"
    assert rules.quote_in_source("Three sheets liquor. I mean, I probably", body)
    assert rules.quote_in_source("three sheets liquor i mean i probly", body)          # caption drift
    assert not rules.quote_in_source("the gym is next to the pier in Vice Beach", body)
    assert not rules.quote_in_source("", body)


def test_site_and_its_youtube_channel_are_one_author():
    from src.agents.map.sources import site_name
    site = Evidence("editorial", "https://www.powerpyx.com/gta-6-x/", "powerpyx.com", "powerpyx.com",
                    author_name=site_name("https://www.powerpyx.com/gta-6-x/"))
    yt = Evidence("youtube", "https://youtube.com/watch?v=a", "youtube.com", "UCWBA1-H9A5IldSb3tNwQmtQ",
                  author_name="PowerPyx")
    assert rules.independent_count([site, yt]) == 1


def test_landmark_dedup_needs_a_name_match():
    vc = MarkerRef("1", "landmark", 0, 0, 150, "pending", "Vice City International Airport")
    assert rules.find_duplicate("landmark", 20, 0, 150, [vc], name="VCIA terminal") is None
    assert rules.find_duplicate("landmark", 20, 0, 150, [vc], name="Vice City Airport") is vc
    gas = MarkerRef("2", "fuel_station", 0, 0, 150, "pending", "Xoomer")
    assert rules.find_duplicate("fuel_station", 20, 0, 150, [gas], name="gas station by the pier") is gas
