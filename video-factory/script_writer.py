"""
New-subject countdown scripts for rejected shorts (Track A).

When a short is rejected with "new subject", shorts_worker.py calls
write_new_subject(). Claude Haiku (the repo's existing cheap route, same model
as dedup_gate.py) writes a replacement for the same day from a fixed bank of
confirmed facts plus our own published articles, then every content rule is
re-checked in code. An LLM instruction alone is not the control:
validate() is.
"""
import json, os, re, sys
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
from src.agents.content.content_agent import _is_blocked_topic, shield  # noqa: E402

MODEL = "claude-haiku-4-5"
LAUNCH = date(2026, 11, 19)
SIGN_OFF = "The Decoded Six dot com."
MIN_WORDS, MAX_WORDS = 30, 45

# Confirmed facts only, each with its source. Scripts may use nothing else
# except the titles of our own (fact-checked) published articles.
FACTS = """\
- GTA 6 launches November 19, 2026 on PS5 and Xbox Series X|S. (Rockstar)
- Digital pre-loading opened November 10 for digital pre-orders: PS5 at local midnight, Xbox at 12am GMT. (PlayStation Blog, Rockstar Newswire)
- Sony says to clear at least 212GB on PS5; Rockstar says up to 212GB depending on device. (PlayStation Blog, Rockstar)
- Physical copies contain a download code, not a disc. (Rockstar Store)
- The two playable leads are Jason Duval and Lucia Caminos. The game is set in the state of Leonida, which includes Vice City. (Rockstar)
- Rockstar released a 39-screenshot Launch Gallery on November 5. (Rockstar)
- The original score is by Justice; the score album releases December 11. GTA VI: The Album releases November 19. (Rockstar)
- A free printable Leonida map comes on rockstargames.com on November 19; a $0.99 double-sided poster comes to the Rockstar Store after launch. (Rockstar)
- Miami HEAT host a GTA 6 Vice City night against the Bucks on November 18. (Miami HEAT)
- The Decoded Six has GTA 6 news, guides, and an interactive map that goes live on launch day, in seven languages. (our site)
"""

RULES = """\
- Use ONLY the facts above and the article titles listed. Do not invent features, prices, times, or characters.
- Nothing about GTA Online. Nothing implying a PC version. Never use the name "King Kelz".
- Before November 19 the interactive map is "going live on launch day"; never say it is live.
- voiceover: {min}-{max} words, spoken, short sentences, readable in under 20 seconds. Numbers written as words where natural.
- voiceover MUST end with exactly: "{sign_off}"
- hook: ALL CAPS, at most 5 words not counting a "•" separator. {hook_rule}
- post_caption: one or two short lines, includes thedecodedsix.com, no hashtags.
- hashtags: 3 to 5, space-separated, first one #GTA6.
- Pick a subject clearly different from every existing hook listed.
"""


def hook_rule(post_date):
    left = (LAUNCH - post_date).days
    if left >= 2:
        return f'It must start with "{left} DAYS".'
    if left == 1:
        return 'It must start with "TOMORROW" or "1 DAY".'
    return "Launch has happened: no countdown."


def anthropic_key():
    """ANTHROPIC_API_KEY from the environment, else from DS_ANTHROPIC_ENV_FILE (default: aug27-pipeline/.env)."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return os.environ["ANTHROPIC_API_KEY"]
    f = Path(os.environ.get("DS_ANTHROPIC_ENV_FILE", "/mnt/c/Users/Kelvin/projects/aug27-pipeline/.env"))
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^\s*ANTHROPIC_API_KEY\s*=\s*(.+?)\s*$", line)
            if m:
                return m.group(1).strip().strip('"').strip("'")
    raise RuntimeError(f"ANTHROPIC_API_KEY not set and not found in {f}")


def _words(text):
    return set(re.findall(r"[a-z0-9']+", text.lower()))


def validate(s, post_date, other_rows, article_slugs):
    """Every rule, checked in code. Returns a list of problems (empty = OK)."""
    errs = []
    hook, vo = s.get("hook", "").strip(), s.get("voiceover", "").strip()
    cap, tags = s.get("post_caption", "").strip(), s.get("hashtags", "").strip()
    all_text = " ".join([hook, vo, cap, tags])
    n = len(vo.split())
    if not MIN_WORDS <= n <= MAX_WORDS:
        errs.append(f"voiceover is {n} words; needs {MIN_WORDS}-{MAX_WORDS}")
    if not vo.endswith(SIGN_OFF):
        errs.append(f'voiceover must end with "{SIGN_OFF}"')
    if hook != hook.upper() or not hook:
        errs.append("hook must be ALL CAPS")
    if len([w for w in hook.split() if w != "•"]) > 5:
        errs.append("hook is over 5 words")
    left = (LAUNCH - post_date).days
    if left >= 2 and not hook.startswith(f"{left} DAYS"):
        errs.append(f'hook must start with "{left} DAYS"')
    if left == 1 and not (hook.startswith("TOMORROW") or hook.startswith("1 DAY")):
        errs.append('hook must start with "TOMORROW" or "1 DAY"')
    if _is_blocked_topic(all_text):
        errs.append("mentions GTA Online (blackout)")
    if re.search(r"\bking\s*kelz\b", all_text, re.I):
        errs.append('uses "King Kelz"')
    if re.search(r"\bPC\b|\bSteam\b|\bWindows\b", all_text):
        errs.append("implies a PC version")
    if left > 0 and re.search(r"map (is|now) live|live now|map is out", vo, re.I):
        errs.append("says the map is live before launch")
    if "thedecodedsix.com" not in cap.lower():
        errs.append("caption must include thedecodedsix.com")
    t = tags.split()
    if not 3 <= len(t) <= 5 or not all(x.startswith("#") for x in t) or (t and t[0].lower() != "#gta6"):
        errs.append("hashtags: 3-5, first #GTA6")
    if left > 0 and re.search(r"\b(out (today|now)|available (today|now)|releases? today|drops? today|is here)\b", vo + " " + cap, re.I):
        errs.append("claims something is out/available today; only the facts' own dates are allowed")
    slug = s.get("linked_article_slug") or ""
    if slug and slug not in article_slugs:
        errs.append(f"linked_article_slug '{slug}' is not a published article")
    for o in other_rows:
        if o["hook"].strip().upper() == hook.upper():
            errs.append(f'hook duplicates day {o["day_number"]}')
        a, b = _words(vo), _words(o["voiceover"])
        if a and b and len(a & b) / len(a | b) > 0.55:
            errs.append(f'voiceover too similar to day {o["day_number"]}')
    return errs


def fact_check(client, s, articles, post_date):
    """Second, independent pass: every claim must be backed by FACTS or an article title. Returns problems."""
    prompt = (
        f"Today is {post_date:%B %d, %Y}. Fact-check this short-video script strictly.\n\n"
        f"CONFIRMED FACTS:\n{FACTS}\nPUBLISHED ARTICLE TITLES (also confirmed):\n"
        + "\n".join(f"- {a['title']}" for a in articles) +
        f"\n\nSCRIPT:\nHOOK: {s.get('hook')}\nVOICEOVER: {s.get('voiceover')}\nCAPTION: {s.get('post_caption')}\n\n"
        "List every factual claim in the script (dates, numbers, durations, availability, features, prices, "
        "what is out or coming). A claim is SUPPORTED only if the facts or titles state it; a date relative to "
        "today must match the facts (e.g. something releasing Dec 11 is not 'out today'). Countdown phrasing "
        "('two days until launch') and the site sign-off are fine.\n"
        'Reply with JSON only: {"unsupported": ["claim ...", ...]} (empty list if every claim is supported).'
    )
    resp = client.messages.create(model=MODEL, max_tokens=400, messages=[{"role": "user", "content": prompt}])
    text = resp.content[0].text
    try:
        bad = json.loads(text[text.index("{"):text.rindex("}") + 1]).get("unsupported", [])
    except ValueError:
        return ["fact-check reply was not valid JSON"]
    return [f"unsupported claim: {c}" for c in bad]


def write_new_subject(sb, row, note=""):
    """Replacement script for row's day. Returns dict(hook, voiceover, post_caption, hashtags, linked_article_id)."""
    import anthropic
    post_date = date.fromisoformat(row["post_date"])
    others = [o for o in sb.table("ds_shorts").select("day_number, hook, voiceover").neq("id", row["id"]).execute().data]
    articles = (sb.table("articles").select("id, slug, title").eq("status", "published")
                  .order("published_at", desc=True).limit(25).execute().data)
    by_slug = {a["slug"]: a for a in articles}
    prompt = (
        f"Write ONE replacement script for a 20-second vertical GTA 6 countdown short posting {post_date:%A, %B %d, %Y}.\n\n"
        f"CONFIRMED FACTS (the only facts you may use):\n{FACTS}\n"
        "OUR PUBLISHED ARTICLES (you may build the script around one; pick its slug as linked_article_slug):\n"
        + "\n".join(f"- {a['slug']}: {a['title']}" for a in articles) + "\n\n"
        f"REJECTED SCRIPT (write about something different):\nHOOK: {row['hook']}\nVOICEOVER: {row['voiceover']}\n"
        f"REVIEWER NOTE: {shield.sanitize(note) or '(none)'}\n\n"
        "EXISTING HOOKS ON OTHER DAYS (do not repeat these subjects):\n"
        + "\n".join(f"- day {o['day_number']}: {o['hook']}" for o in others) + "\n\n"
        "RULES:\n" + RULES.format(min=MIN_WORDS, max=MAX_WORDS, sign_off=SIGN_OFF, hook_rule=hook_rule(post_date)) +
        '\nReply with JSON only: {"hook": "...", "voiceover": "...", "post_caption": "...", '
        '"hashtags": "#GTA6 ...", "linked_article_slug": "slug or empty"}'
    )
    client = anthropic.Anthropic(api_key=anthropic_key())
    problems = []
    for _ in range(3):
        msg = prompt if not problems else prompt + "\n\nYour last attempt broke these rules, fix them:\n- " + "\n- ".join(problems)
        resp = client.messages.create(model=MODEL, max_tokens=600, messages=[{"role": "user", "content": msg}])
        text = re.sub(r"^```(?:json)?|```$", "", resp.content[0].text.strip(), flags=re.M).strip()
        try:
            s = json.loads(text[text.index("{"):text.rindex("}") + 1])
        except ValueError:
            problems = ["reply was not valid JSON"]
            continue
        problems = validate(s, post_date, others, set(by_slug))
        if not problems:
            problems = fact_check(client, s, articles, post_date)
        if not problems:
            slug = s.get("linked_article_slug") or ""
            return {
                "hook": s["hook"].strip(), "voiceover": s["voiceover"].strip(),
                "post_caption": s["post_caption"].strip(), "hashtags": s["hashtags"].strip(),
                "linked_article_id": by_slug[slug]["id"] if slug else None,
            }
    raise RuntimeError("new-subject script failed validation 3 times: " + "; ".join(problems))
