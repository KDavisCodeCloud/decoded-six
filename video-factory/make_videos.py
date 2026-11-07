#!/usr/bin/env python3
"""
DecodedSix Video Factory
Turns GTA 6 trailers + a CSV of scripts into vertical 9:16 short videos:
  20s trailer clip (blurred-fill vertical) + AI voiceover + burned captions
  + countdown hook text + logo end card.  Free: ffmpeg + edge-tts.

Usage:
  python make_videos.py                  # render every row in scripts.csv
  python make_videos.py --only 1         # render just day 1 (preview one first)
  python make_videos.py --only 1-3       # render days 1 to 3
  python make_videos.py --list-voices    # print available English voices
  python make_videos.py --make-test-footage   # creates fake trailers to test with

Folders (next to this script):
  trailers/   your downloaded trailer .mp4/.mov/.mkv files
  voice/      OPTIONAL: your own voiceover files named 01.mp3, 02.mp3 ... (e.g. ElevenLabs)
              If a file exists for a day it is used instead of the free AI voice.
  logo.png    your logo (transparent PNG best). Missing = text-only end card.
  output/     finished videos + review.html (open in a browser to preview everything)
"""
import argparse, asyncio, csv, html, json, math, os, random, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# ---------------- SETTINGS (edit these) ----------------
VOICE = "en-US-AndrewNeural"      # run --list-voices to see options (e.g. en-US-GuyNeural, en-US-ChristopherNeural)
VOICE_RATE = "+8%"                # speed up/down the voice
CLIP_SECONDS = 20                 # trailer footage length per video
END_CARD_SECONDS = 5              # logo end card length (owner: logo on screen for the last 5s)
TRAILER_VOLUME = 0                # trailer audio muted: the music bed below replaces it
SKIP_START, SKIP_END = 6, 12      # seconds to skip at start/end of each trailer (logos, credits)
SITE_TEXT = "thedecodedsix.com"
WIDTH, HEIGHT, FPS = 1080, 1920, 30
FONT = "Impact"                   # any font installed on your computer (Impact / Bebas Neue look great)
LOGO = ROOT.parent / "public" / "images" / "branded" / "decodedsix-logo-1254.png"   # hi-res D6 logo, black background
END_CARD_BG = "0x000000"          # pure black so the logo's black background has no visible box
PINK, CYAN = "&H00882EFF", "&H00EED322"   # ASS colors (&HAABBGGRR) Miami Vice pink + cyan
# -------------------------------------------------------

VIDEO_EXT = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}

# ---------------- music bed ----------------
# Owner's own tracks (video-factory/music/, gitignored). Alternated between
# videos, random start per video, normalized once to MUSIC_LUFS, ducked under
# the voice and back up for the end card.
MUSIC_DIR = ROOT / "music"
MUSIC_TRACKS = ["welcome_to_vice_city.mp3", "showdown_remix.mp3"]
MUSIC_LUFS = -16
MUSIC_DUCK_DB = -18               # music level while the voiceover plays
MUSIC_FADE = 0.5                  # fade in at 0s, fade out at the end
MUSIC_RAMP = 0.3                  # duck release when the end card starts
VOICE_LUFS = -14                  # voiceover loudness: sits ~2 dB over the end-card music, platform level


def run(cmd, cwd=None):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit(f"\nffmpeg failed:\n{' '.join(map(str, cmd))}\n\n{p.stderr[-2500:]}")
    return p.stdout


def need(tool):
    if not shutil.which(tool):
        sys.exit(f"'{tool}' not found. Install ffmpeg first (see README.md, step 1).")


def probe(path):
    out = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)])
    j = json.loads(out)
    dur = float(j["format"]["duration"])
    has_audio = any(s["codec_type"] == "audio" for s in j["streams"])
    return dur, has_audio


# ---------------- clip selection ----------------
def build_windows(trailers, length):
    """Non-overlapping windows from every trailer, interleaved so back-to-back videos use different trailers."""
    per = []
    for t in trailers:
        dur, _ = probe(t)
        usable_end = dur - SKIP_END
        starts, s = [], SKIP_START
        while s + length <= usable_end:
            starts.append(round(s, 2)); s += length + 2
        if not starts and dur > length:            # short trailer: use the middle
            starts = [max(0, (dur - length) / 2)]
        per.append([(t, st) for st in starts])
    windows = []
    for i in range(max((len(p) for p in per), default=0)):
        for p in per:
            if i < len(p):
                windows.append(p[i])
    return windows


def parse_clip_override(value):
    """'trailer2.mp4@01:05' -> (Path, 65.0)"""
    name, _, ts = value.partition("@")
    secs = 0.0
    for part in ts.split(":"):
        secs = secs * 60 + float(part or 0)
    path = ROOT / "trailers" / name.strip()
    if not path.exists():
        sys.exit(f"clip override not found: {path}")
    return path, secs


# ---------------- voiceover ----------------
async def _edge(text, mp3, voice=None, rate=None):
    import edge_tts
    try:
        com = edge_tts.Communicate(text, voice or VOICE, rate=rate or VOICE_RATE, boundary="WordBoundary")
    except TypeError:                                   # older edge-tts
        com = edge_tts.Communicate(text, voice or VOICE, rate=rate or VOICE_RATE)
    words = []
    with open(mp3, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                start = ch["offset"] / 1e7
                words.append((ch["text"], start, start + ch["duration"] / 1e7))
    return words


def even_timing(text, duration):
    """Caption timing when we only have an audio file (ElevenLabs etc.): spread words by length."""
    toks = text.split()
    weights = [len(re.sub(r"\W", "", w)) + 2 for w in toks]
    total, t, out = sum(weights), 0.15, []
    span = max(duration - 0.3, 0.5)
    for w, wt in zip(toks, weights):
        d = span * wt / total
        out.append((w, t, t + d)); t += d
    return out


def make_voice(day, text, work, voice=None, rate=None, custom_prefix=""):
    """custom_prefix separates tracks' own voice files (Track B: voice/b01.mp3)."""
    custom = next((p for p in (ROOT / "voice").glob(f"{custom_prefix}{int(day):02d}.*")), None) if (ROOT / "voice").exists() else None
    if custom:
        dur, _ = probe(custom)
        return normalize_voice(custom, work), even_timing(text, dur), dur
    mp3 = work / "vo.mp3"
    # edge-tts intermittently returns NoAudioReceived for text that succeeds
    # seconds later (seen 2026-11-07 on 2 of 10 back-to-back renders), so
    # retry with backoff before failing the row.
    for attempt in range(3):
        try:
            words = asyncio.run(_edge(text, mp3, voice, rate))
            break
        except Exception as e:
            if attempt == 2:
                sys.exit(f"\nFree AI voice failed after 3 tries ({e.__class__.__name__}: {e}).\n"
                         f"Check your internet connection, or drop your own voice file at voice/{int(day):02d}.mp3")
            __import__("time").sleep(4 * (attempt + 1))
    dur, _ = probe(mp3)
    if not words:
        words = even_timing(text, dur)
    return normalize_voice(mp3, work), words, dur


def normalize_voice(src, work):
    """Two-pass loudnorm to VOICE_LUFS. WAV out (no AAC priming delay) so word timings still line up."""
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af",
                        f"loudnorm=I={VOICE_LUFS}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = json.loads(p.stderr[p.stderr.rindex("{"):p.stderr.rindex("}") + 1])
    out = work / "vo_norm.wav"
    run(["ffmpeg", "-y", "-i", str(src), "-af",
         f"loudnorm=I={VOICE_LUFS}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
         f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true",
         "-ar", "44100", "-ac", "2", str(out)])
    return out


# ---------------- captions (ASS) ----------------
def ass_time(t):
    t = max(t, 0)
    h, rem = divmod(t, 3600); m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def esc(s):
    return s.replace("\\", "").replace("{", "(").replace("}", ")")


def write_ass(path, hook, words, body_len):
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {WIDTH}
PlayResY: {HEIGHT}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hook,{FONT},104,&H00FFFFFF,&H00FFFFFF,{PINK},&H96000000,1,0,0,0,100,100,2,0,1,7,3,8,60,60,230,1
Style: Cap,{FONT},86,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,1,0,1,6,2,2,70,70,470,1
Style: Site,{FONT},58,{CYAN},&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,3,0,1,4,2,8,60,60,1450,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = [f"Dialogue: 1,{ass_time(0)},{ass_time(body_len)},Hook,,0,0,0,,{{\\fad(250,0)}}{esc(hook.upper())}"]
    # 3-word caption chunks, current chunk highlighted pink on its last word for punch
    chunk = 3
    for i in range(0, len(words), chunk):
        grp = words[i:i + chunk]
        start = grp[0][1]
        end = words[i + chunk][1] if i + chunk < len(words) else min(grp[-1][2] + 0.4, body_len)
        text = " ".join(esc(w[0]) for w in grp).upper()
        ev.append(f"Dialogue: 0,{ass_time(start)},{ass_time(end)},Cap,,0,0,0,,{{\\fscx92\\fscy92\\t(0,90,\\fscx100\\fscy100)}}{text}")
    path.write_text(header + "\n".join(ev) + "\n", encoding="utf-8")


def write_end_ass(path, seconds=END_CARD_SECONDS, tagline=True):
    path.write_text(f"""[Script Info]
ScriptType: v4.00+
PlayResX: {WIDTH}
PlayResY: {HEIGHT}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Site,{FONT},76,{CYAN},&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,3,0,1,3,0,8,60,60,1340,1
Style: Sub,{FONT},48,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,1,0,0,0,100,100,6,0,1,2,0,8,60,60,1450,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,{ass_time(seconds)},Site,,0,0,0,,{{\\fad(200,0)}}{SITE_TEXT}
""" + (f"Dialogue: 0,0:00:00.20,{ass_time(seconds)},Sub,,0,0,0,,{{\\fad(300,0)}}MAP • GUIDES • NEWS\n" if tagline else ""), encoding="utf-8")


# ---------------- rendering ----------------
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2", "-movflags", "+faststart"]


def render_body(trailer, start, length, vo, work):
    _, has_audio = probe(trailer)
    vf = (f"[0:v]split[a][b];"
          f"[a]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT},boxblur=24:2,eq=brightness=-0.08[bg];"
          f"[b]scale={WIDTH}:-2[fg];"
          f"[bg][fg]overlay=(W-w)/2:(H-h)/2,ass=subs.ass,fps={FPS},format=yuv420p[v]")
    cmd = ["ffmpeg", "-y", "-ss", str(start), "-t", str(length), "-i", str(trailer), "-i", str(vo)]
    if has_audio and TRAILER_VOLUME > 0:
        af = (f"[0:a]volume={TRAILER_VOLUME},afade=t=out:st={length-1.2}:d=1.2[m];"
              f"[1:a]apad[vo];[m][vo]amix=inputs=2:duration=first:normalize=0[aout]")
    else:
        af = "[1:a]apad[aout]"
    cmd += ["-filter_complex", vf + ";" + af, "-map", "[v]", "-map", "[aout]", "-t", str(length)] + ENC + ["body.mp4"]
    run(cmd, cwd=work)


def render_end(work, seconds=END_CARD_SECONDS, tagline=True):
    write_end_ass(work / "end.ass", seconds, tagline)
    logo = LOGO
    cmd = ["ffmpeg", "-y", "-f", "lavfi", "-i", f"color=c={END_CARD_BG}:s={WIDTH}x{HEIGHT}:d={seconds}:r={FPS}",
           "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo"]
    if logo.exists():
        cmd += ["-loop", "1", "-i", str(logo)]
        vf = (f"[2:v]scale=960:-1,format=rgba,fade=t=in:st=0:d=0.4:alpha=1[l];"
              f"[0:v][l]overlay=(W-w)/2:(H-h)/2-260:shortest=1,ass=end.ass,format=yuv420p[v]")
    else:
        vf = "[0:v]ass=end.ass,format=yuv420p[v]"
    cmd += ["-filter_complex", vf, "-map", "[v]", "-map", "1:a", "-t", str(seconds)] + ENC + ["end.mp4"]
    run(cmd, cwd=work)


def concat(work, out):
    (work / "list.txt").write_text("file 'body.mp4'\nfile 'end.mp4'\n")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", str(out)], cwd=work)


# ---------------- music ----------------
def normalized_track(name):
    """Two-pass loudnorm to MUSIC_LUFS, cached next to the source (re-run if the mp3 changes)."""
    src = MUSIC_DIR / name
    cache = MUSIC_DIR / ".norm" / (src.stem + f"_{abs(MUSIC_LUFS)}lufs.m4a")
    if cache.exists() and cache.stat().st_mtime >= src.stat().st_mtime:
        return cache
    cache.parent.mkdir(exist_ok=True)
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af",
                        f"loudnorm=I={MUSIC_LUFS}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    m = json.loads(p.stderr[p.stderr.rindex("{"):p.stderr.rindex("}") + 1])
    run(["ffmpeg", "-y", "-i", str(src), "-af",
         f"loudnorm=I={MUSIC_LUFS}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
         f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true",
         "-ar", "44100", "-ac", "2", "-c:a", "aac", "-b:a", "192k", str(cache)])
    return cache


def pick_music(day, salt=""):
    """(track Path, start offset) -- tracks alternate by day, offset is random but repeatable per video."""
    tracks = [t for t in MUSIC_TRACKS if (MUSIC_DIR / t).exists()]
    if not tracks:
        return None, 0.0
    name = tracks[(int(day) + (1 if salt else 0)) % len(tracks)]
    return normalized_track(name), random.Random(f"{name}{day}{salt}").random()


def add_music(video, voice_end, day, salt=""):
    """Mix the music bed into a finished video in place: ducked until voice_end, full on the end card."""
    track, frac = pick_music(day, salt)
    if not track:
        return None
    total, _ = probe(video)
    tdur, _ = probe(track)
    start = round(frac * max(0.0, tdur - total - 1), 2)
    duck = 10 ** (MUSIC_DUCK_DB / 20)
    gain = (f"volume='if(lt(t,{voice_end}),{duck:.4f},"
            f"if(lt(t,{voice_end + MUSIC_RAMP}),{duck:.4f}+(1-{duck:.4f})*(t-{voice_end})/{MUSIC_RAMP},1))':eval=frame")
    af = (f"[1:a]atrim=start={start}:duration={total},asetpts=PTS-STARTPTS,{gain},"
          f"afade=t=in:st=0:d={MUSIC_FADE},afade=t=out:st={total - MUSIC_FADE:.3f}:d={MUSIC_FADE}[m];"
          f"[0:a][m]amix=inputs=2:duration=first:normalize=0[a]")
    tmp = Path(video).with_suffix(".music.mp4")
    run(["ffmpeg", "-y", "-i", str(video), "-i", str(track), "-filter_complex", af,
         "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
         "-movflags", "+faststart", str(tmp)])
    tmp.replace(video)
    return f"{track.stem.replace(f'_{abs(MUSIC_LUFS)}lufs', '')}@{start:.0f}s"


# ---------------- review page ----------------
def write_review(rows, outdir):
    cards = []
    for r in rows:
        f = outdir / r["_file"]
        if not f.exists():
            continue
        cards.append(f"""<div class="card"><video src="{html.escape(r['_file'])}" controls preload="metadata"></video>
<div class="meta"><b>Day {html.escape(r['day'])}</b> · {html.escape(r.get('post_date',''))}<br><span class="hook">{html.escape(r['hook'])}</span>
<textarea readonly onclick="this.select()">{html.escape(r.get('post_caption',''))}</textarea></div></div>""")
    (outdir / "review.html").write_text(f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DecodedSix Review</title><style>
body{{background:#0b0b14;color:#eee;font-family:system-ui,sans-serif;margin:0;padding:16px}}
h1{{color:#ff2e88;font-size:22px}} .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}}
.card{{background:#15152a;border-radius:12px;overflow:hidden}} video{{width:100%;aspect-ratio:9/16;background:#000;display:block}}
.meta{{padding:10px;font-size:14px}} .hook{{color:#22d3ee}} textarea{{width:100%;height:70px;margin-top:8px;background:#0b0b14;color:#ddd;border:1px solid #333;border-radius:6px;font-size:12px}}
</style><h1>DecodedSix — review before posting ({len(cards)} videos)</h1><p>Watch each one. Click a caption box to select it, then copy into TikTok / YouTube.</p>
<div class="grid">{''.join(cards)}</div>""", encoding="utf-8")


# ---------------- test footage ----------------
def make_test_footage():
    tdir = ROOT / "trailers"; tdir.mkdir(exist_ok=True)
    for i, (c1, c2) in enumerate([("0xFF2E88", "0x22D3EE"), ("0xF59E0B", "0x7C3AED")], 1):
        out = tdir / f"TEST_trailer_{i}.mp4"
        run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"gradients=s=1920x1080:c0={c1}:c1={c2}:speed=0.02:d=90:r=30",
             "-f", "lavfi", "-i", "sine=f=110:d=90", "-vf",
             "drawtext=text='TEST FOOTAGE %{eif\\:t\\:d}s':fontcolor=white:fontsize=90:x=(w-tw)/2:y=(h-th)/2",
             "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", "-shortest", str(out)])
        print("made", out)
    print("Done. Delete the TEST_ files from trailers/ before your real run.")


def parse_only(s):
    if not s:
        return None
    sel = set()
    for part in s.split(","):
        a, _, b = part.partition("-")
        sel.update(range(int(a), int(b or a) + 1))
    return sel


# ---------------- Supabase queue (--from-db / --publish) ----------------
# Same env vars and service-role client as the content agent
# (src/agents/content/content_agent.py::_supabase). Never hardcoded.
DB_RENDERABLE = ("draft", "needs_revision")
BUCKET = "shorts"


def db_client():
    from supabase import create_client
    url, key = os.environ.get("NEXT_PUBLIC_SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. Run: set -a; . ./.env.local; set +a")
    return create_client(url, key)


def db_rows(sb, only):
    """ds_shorts rows waiting on a render, shaped like scripts.csv rows."""
    q = sb.table("ds_shorts").select("*").in_("status", list(DB_RENDERABLE)).order("day_number")
    out = []
    for d in q.execute().data:
        if only and d["day_number"] not in only:
            continue
        out.append({
            "day": str(d["day_number"]), "post_date": d["post_date"], "hook": d["hook"],
            "voiceover": d["voiceover"], "clip": d.get("clip_override") or "",
            "post_caption": " ".join(x for x in (d.get("post_caption"), d.get("hashtags")) if x),
            "_id": d["id"], "_prev_status": d["status"], "_notes": d.get("reviewer_notes") or "",
        })
    return out


def db_audit(sb, short_id, action, result, error=None):
    """Every factory action on a queue row lands in audit_log (project rule)."""
    sb.table("audit_log").insert({
        "agent_id": "dsx-shorts-factory", "action": action, "short_id": short_id,
        "result": result, "error": error,
    }).execute()


def db_publish(sb, r, outfile, trailer, start, body_len):
    """Upload the render and put the row in the HITL queue as pending_review."""
    path = f"{r['post_date']}/day{int(r['day']):02d}.mp4"
    with open(outfile, "rb") as fh:
        sb.storage.from_(BUCKET).upload(path, fh.read(), {"content-type": "video/mp4", "upsert": "true"})
    dur, _ = probe(outfile)
    sb.table("ds_shorts").update({
        "storage_path": path, "duration_s": round(dur, 2), "status": "pending_review",
        "clip_start": round(start, 2), "clip_end": round(start + body_len, 2),
        "clip_override": r["clip"] or None,
        # a successful render clears an earlier render-failure note, but keeps
        # a reviewer's revision note so it stays visible next to the new cut
        **({"reviewer_notes": None} if r["_notes"].startswith("Render failed") else {}),
    }).eq("id", r["_id"]).execute()
    db_audit(sb, r["_id"], "short_rendered",
             f"success: day {r['day']} {r['_prev_status']} -> pending_review, {trailer.name}@{start:.1f}s, {dur:.1f}s")
    return path


def main():
    ap = argparse.ArgumentParser(description="DecodedSix Video Factory")
    ap.add_argument("--csv", default="scripts.csv")
    ap.add_argument("--only", help="day numbers to render, e.g. 1 or 1-3 or 1,5,9")
    ap.add_argument("--list-voices", action="store_true")
    ap.add_argument("--make-test-footage", action="store_true")
    ap.add_argument("--include-held", action="store_true", help="also render rows marked held_until_launch")
    ap.add_argument("--from-db", action="store_true", help="render ds_shorts rows in draft/needs_revision instead of the CSV")
    ap.add_argument("--publish", action="store_true", help="with --from-db: upload to Storage and set pending_review")
    ap.add_argument("--track", choices=["countdown", "discovery"], default="countdown",
                    help="countdown = Track A (default); discovery = Track B montage/zoom shorts")
    args = ap.parse_args()
    need("ffmpeg"); need("ffprobe")
    if args.publish and not args.from_db:
        sys.exit("--publish needs --from-db (CSV rows have no queue row to update).")

    if args.make_test_footage:
        return make_test_footage()
    if args.list_voices:
        import edge_tts
        for v in asyncio.run(edge_tts.list_voices()):
            if v["Locale"].startswith("en-"):
                print(f'{v["ShortName"]:34} {v["Gender"]}')
        return

    if args.track == "discovery":
        import discovery
        if args.from_db:
            sys.exit("--track discovery --from-db arrives with Phase B2 (queue columns); use a CSV for now.")
        csv_name = args.csv if args.csv != "scripts.csv" else "discovery_samples.csv"
        discovery.main(args, discovery.csv_rows(csv_name))
        return

    trailers = sorted(p for p in (ROOT / "trailers").glob("*") if p.suffix.lower() in VIDEO_EXT)
    if not trailers:
        sys.exit("No videos in trailers/. Put your trailer files there (or run --make-test-footage).")
    only = parse_only(args.only)
    sb = db_client() if args.from_db else None
    rows = db_rows(sb, only) if sb else list(csv.DictReader(open(ROOT / args.csv, encoding="utf-8-sig")))
    outdir = ROOT / "output"; outdir.mkdir(exist_ok=True)
    windows = build_windows(trailers, CLIP_SECONDS + 6)   # +6s headroom for longer voiceovers
    if not windows:
        sys.exit("Trailers are too short to cut clips from.")
    print(f"{len(trailers)} trailer(s), {len(windows)} unique clip windows, {len(rows)} scripts")

    failures = 0
    for r in rows:
        day = int(r["day"])
        idx = day - 1                                       # window by day, so DB and CSV pick the same clip
        r["_file"] = f"day{day:02d}_{r.get('post_date','').strip() or 'video'}.mp4"
        if only and day not in only:
            continue
        if r.get("status", "").strip() == "held_until_launch" and not args.include_held:
            print(f"[day {day:02d}] held until launch day, skipped (map categories unverified)")
            continue
        if sb:
            sb.table("ds_shorts").update({"status": "rendering"}).eq("id", r["_id"]).execute()
        try:
            work = ROOT / "output" / ".work" / f"{day:02d}"
            work.mkdir(parents=True, exist_ok=True)
            print(f"[day {day:02d}] voice...", end="", flush=True)
            vo, words, vo_dur = make_voice(day, r["voiceover"], work)
            body_len = round(max(CLIP_SECONDS, vo_dur + 0.7), 2)
            if r.get("clip", "").strip():
                trailer, start = parse_clip_override(r["clip"])
            else:
                trailer, start = windows[idx % len(windows)]
                if idx >= len(windows):                     # reuse pass: shift start so it isn't identical
                    start += (CLIP_SECONDS / 2) * (idx // len(windows))
            tdur, _ = probe(trailer)
            start = max(0, min(start, tdur - SKIP_END - body_len))   # never run past the end of the trailer
            write_ass(work / "subs.ass", r["hook"], words, body_len)
            print(f" clip {trailer.name}@{int(start)}s...", end="", flush=True)
            render_body(trailer, start, body_len, Path(vo).resolve(), work)
            render_end(work)
            concat(work, outdir / r["_file"])
            music = add_music(outdir / r["_file"], body_len, day)
            print(f" done -> output/{r['_file']} ({body_len + END_CARD_SECONDS:.0f}s{', music ' + music if music else ''})")
            if args.publish:
                path = db_publish(sb, r, outdir / r["_file"], trailer, start, body_len)
                print(f"           uploaded -> {BUCKET}/{path}, status pending_review")
            elif sb:
                sb.table("ds_shorts").update({"status": r["_prev_status"]}).eq("id", r["_id"]).execute()
        except (Exception, SystemExit) as e:                # run()/make_voice() exit via SystemExit
            failures += 1
            msg = str(e).strip()[-800:] or e.__class__.__name__
            print(f"\n[day {day:02d}] FAILED: {msg}")
            if sb:
                sb.table("ds_shorts").update({
                    "status": r["_prev_status"],
                    "reviewer_notes": f"Render failed {__import__('datetime').date.today()}: {msg}",
                }).eq("id", r["_id"]).execute()
                db_audit(sb, r["_id"], "short_rendered", "failure", msg)

    write_review(rows, outdir)
    shutil.rmtree(ROOT / "output" / ".work", ignore_errors=True)
    print(f"\nOpen output/review.html in your browser to watch everything before posting.")
    if failures:
        sys.exit(f"{failures} render(s) failed; see messages above (DB rows reverted with the error in reviewer_notes).")


if __name__ == "__main__":
    main()
