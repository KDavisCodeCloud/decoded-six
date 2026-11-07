#!/usr/bin/env python3
"""
Track B: Discovery Shorts (the second daily post).

Built for reach and search rather than as an ad:
  - multi-cut montage: 4-6 shots of ~3-4s, starting on scene cuts, changing on
    sentence boundaries where possible
  - "spotted it" freeze-frame zoom with a pink box + label, first or second shot
  - spoken hook = first sentence, shown large from 0.0s
  - search_title label at the top for the whole video (said AND shown)
  - 1.5s loop-friendly end card (logo + site, no tagline, no voice)
  - +12% voice, caption highlight colour alternates pink/cyan per video

Run through make_videos.py:  make_videos.py --track discovery [--only 1,2] [--csv discovery_samples.csv]
Row fields: day, post_date, voiceover, search_title, zoom (file@MM:SS.s|x,y,w,h),
zoom_label, zoom_at (1|2), shots (file@MM:SS;file@MM:SS...), voice, post_caption.
"""
import csv, math, random, re, shutil, sys
from pathlib import Path

import make_videos as mv
import scenes

ROOT = mv.ROOT
W, H, FPS = mv.WIDTH, mv.HEIGHT, mv.FPS
VOICE_RATE_B = "+12%"
END_SECONDS_B = 1.5
ZOOM_SECONDS = 2.5
ZOOM_EASE_SECONDS = 1.0          # zoom finishes, then the box + label appear
SHOT_MIN, SHOT_MAX = 2.6, 4.2
TAIL_PAD = 0.35                  # silence after the last word before the end card
IMPACT = Path.home() / ".fonts" / "impact.ttf"
# ASS &HAABBGGRR
HILITE = {"pink": "&H00882EFF", "cyan": "&H00EED322"}
DRAW_PINK = "0xFF2E88"


# ---------------- parsing ----------------
def parse_ts(ts):
    secs = 0.0
    for part in ts.split(":"):
        secs = secs * 60 + float(part or 0)
    return secs


def source_path(name):
    p = ROOT / "trailers" / name.strip()
    if not p.exists():
        sys.exit(f"footage not found: {p}")
    return p


def parse_zoom(value):
    """'trailer_1.mp4@01:05.5|0.84,0.78,0.11,0.15' -> (Path, 65.5, (x, y, w, h))"""
    src, _, region = value.partition("|")
    name, _, ts = src.partition("@")
    x, y, w, h = (float(v) for v in region.split(","))
    if not (0 <= x < 1 and 0 <= y < 1 and 0 < w <= 1 and 0 < h <= 1):
        sys.exit(f"zoom region must be fractions 0-1: {value}")
    return source_path(name), parse_ts(ts), (x, y, w, h)


def parse_shots(value):
    out = []
    for part in filter(None, (p.strip() for p in (value or "").split(";"))):
        name, _, ts = part.partition("@")
        out.append((source_path(name), parse_ts(ts or "0")))
    return out


def sentence_spans(text, words):
    """[(start, end)] per sentence, from edge-tts word timings."""
    sentences = [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]
    counts = [len(s.split()) for s in sentences]
    if sum(counts) != len(words):        # tokenisation drift: scale proportionally
        scale = len(words) / max(sum(counts), 1)
        counts = [max(1, round(c * scale)) for c in counts]
        counts[-1] = max(1, len(words) - sum(counts[:-1]))
    spans, i = [], 0
    for c in counts:
        grp = words[i:i + c] or words[-1:]
        spans.append((grp[0][1], grp[-1][2]))
        i += c
    return sentences, spans


# ---------------- shot planning ----------------
def plan_durations(body_len, zoom_len, sentence_ends):
    """Plain-shot lengths that fill body_len - zoom_len, 3-5 shots, cut on sentence ends when close."""
    rest = body_len - zoom_len
    n = min(5, max(3, math.ceil(rest / 4.0)))     # keeps shots <= ~4s
    target = rest / n
    cuts, t = [], zoom_len
    for i in range(n - 1):
        want = t + target
        near = [e for e in sentence_ends if abs(e - want) <= 0.7 and SHOT_MIN <= e - t <= SHOT_MAX]
        cut = min(near, key=lambda e: abs(e - want)) if near else want
        cuts.append(cut); t = cut
    bounds = [zoom_len] + cuts + [body_len]
    lengths = [round(b - a, 3) for a, b in zip(bounds, bounds[1:])]
    if max(lengths) > SHOT_MAX + 0.1:          # snapping left a long remainder: space evenly instead
        lengths = [round(target, 3)] * (n - 1) + [round(rest - target * (n - 1), 3)]
    return lengths


def auto_shots(n, seed, exclude):
    """n (path, start) picks starting just after a scene cut, mixed across sources, seeded per video."""
    rng = random.Random(seed)
    pool = []
    for src in scenes.footage():
        if src.parent.name == "press":           # 1s character loops / cover art: manual picks only
            continue
        dur = scenes.duration(src)
        for a, b in scenes.shots(src, min_len=2.5):
            if a < 8 or b > dur - 14:            # ratings card, logos, end slates
                continue
            pool.append((src, round(a + 0.3, 2)))
    if len(pool) < n:
        sys.exit("Not enough detected shots; run video-factory/scenes.py first.")
    rng.shuffle(pool)
    picked, used_src = [], []
    for src, st in pool:                          # prefer a different source each shot
        if (src, st) in exclude:
            continue
        if used_src and src == used_src[-1] and len(set(p[0] for p in pool)) > 1:
            continue
        picked.append((src, st)); used_src.append(src)
        if len(picked) == n:
            break
    return picked


# ---------------- segments ----------------
SEG_ENC = ["-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-r", str(FPS)]


def vertical_fill(label_in="0:v"):
    """Blurred full-bleed background + sharp full-width foreground (same look as Track A)."""
    return (f"[{label_in}]split[a][b];"
            f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=24:2,eq=brightness=-0.08[bg];"
            f"[b]scale={W}:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fps={FPS},format=yuv420p[v]")


def render_shot(src, start, length, out):
    loop = ["-stream_loop", "-1"] if scenes.duration(src) < length + start + 0.1 else []
    mv.run(["ffmpeg", "-y", *loop, "-ss", f"{start:.3f}", "-i", str(src), "-t", f"{length:.3f}",
            "-filter_complex", vertical_fill(), "-map", "[v]", *SEG_ENC, str(out)])


def render_zoom(src, ts, region, label, length, out, work):
    """Freeze at ts, ease-zoom into region, then draw a pink box + label."""
    frame = work / "zoom_frame.png"
    mv.run(["ffmpeg", "-y", "-ss", f"{ts:.3f}", "-i", str(src), "-frames:v", "1", str(frame)])
    rx, ry, rw, rh = region
    frames = int(round(length * FPS))
    ease = int(ZOOM_EASE_SECONDS * FPS)
    p = f"min(on/{ease},1)"
    smooth = f"({p}*{p}*(3-2*{p}))"
    strip_w = 9 / 16 * 9 / 16                     # 9:16 strip width as a fraction of a 16:9 frame
    vertical = rw <= strip_w * 0.85

    if vertical:
        # Full-screen 9:16 window centred on the region; zoom until it fills ~65%.
        sx = min(max(rx + rw / 2 - strip_w / 2, 0), 1 - strip_w)
        lx, lw = (rx - sx) / strip_w, rw / strip_w   # region in strip-fraction coords
        ly, lh = ry, rh
        Z = max(1.0, min(0.65 / lw, 0.65 / lh, 4.0))
        IW, IH = 2160, 3840                           # upscale before zoompan to avoid jitter
        cx, cy = (lx + lw / 2) * IW, (ly + lh / 2) * IH
        pre = f"[0:v]crop=iw*{strip_w:.5f}:ih:iw*{sx:.5f}:0,scale={IW}:{IH},setsar=1"
        zp = (f"zoompan=z='1+({Z:.3f}-1)*{smooth}':x='max(0,min(iw-iw/zoom,{cx:.1f}-iw/zoom/2))':"
              f"y='max(0,min(ih-ih/zoom,{cy:.1f}-ih/zoom/2))':d={frames}:s={W}x{H}:fps={FPS}")
        # final window (fractions) -> box in output pixels
        x0 = min(max(lx + lw / 2 - 0.5 / Z, 0), 1 - 1 / Z)
        y0 = min(max(ly + lh / 2 - 0.5 / Z, 0), 1 - 1 / Z)
        bx, by = (lx - x0) * Z * W, (ly - y0) * Z * H
        bw, bh = lw * Z * W, lh * Z * H
        oy = 0
        graph = f"{pre},{zp}[z]"
        base = "[z]"
    else:
        # Wide region: zoom the 16:9 picture as the foreground over a blurred fill.
        Z = max(1.0, min(0.85 / rw, 0.85 / rh, 3.0))
        IW, IH = 3840, 2160
        FW, FH = W, int(W * 9 / 16)
        cx, cy = (rx + rw / 2) * IW, (ry + rh / 2) * IH
        zp = (f"zoompan=z='1+({Z:.3f}-1)*{smooth}':x='max(0,min(iw-iw/zoom,{cx:.1f}-iw/zoom/2))':"
              f"y='max(0,min(ih-ih/zoom,{cy:.1f}-ih/zoom/2))':d={frames}:s={FW}x{FH}:fps={FPS}")
        x0 = min(max(rx + rw / 2 - 0.5 / Z, 0), 1 - 1 / Z)
        y0 = min(max(ry + rh / 2 - 0.5 / Z, 0), 1 - 1 / Z)
        oy = (H - FH) // 2
        bx, by = (rx - x0) * Z * FW, (ry - y0) * Z * FH + oy
        bw, bh = rw * Z * FW, rh * Z * FH
        graph = (f"[0:v]scale={IW}:{IH},setsar=1,split[s1][s2];"
                 f"[s1]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=24:2,eq=brightness=-0.15,"
                 f"loop=loop={frames}:size=1,fps={FPS}[bg];"
                 f"[s2]{zp}[fg];[bg][fg]overlay=0:{oy}:shortest=1[z]")
        base = "[z]"

    pad = 18
    bx, by, bw, bh = int(bx - pad), int(by - pad), int(bw + 2 * pad), int(bh + 2 * pad)
    on = f"gte(t,{ZOOM_EASE_SECONDS:.2f})"
    label = (label or "").upper().replace("'", "").replace(":", " ")[:40]
    if vertical:
        ly_txt = by - 110 if by - 110 > 560 else by + bh + 24     # above the box unless it would hit the hook
    else:
        ly_txt = oy - 120                                         # just above the picture, never over the art
    draw = (f"drawbox=x={bx}:y={by}:w={bw}:h={bh}:color={DRAW_PINK}@1:t=10:enable='{on}'")
    if label:
        draw += (f",drawtext=fontfile={IMPACT}:text='{label}':fontsize=68:fontcolor=white:"
                 f"box=1:boxcolor={DRAW_PINK}@0.95:boxborderw=16:x=(w-text_w)/2:y={ly_txt}:enable='{on}'")
    graph += f";{base}{draw},trim=duration={length:.3f},format=yuv420p[v]"
    mv.run(["ffmpeg", "-y", "-i", str(frame), "-filter_complex", graph, "-map", "[v]",
            "-t", f"{length:.3f}", *SEG_ENC, str(out)])
    return {"mode": "vertical" if vertical else "landscape", "zoom": round(Z, 2)}


# ---------------- text layer ----------------
def write_ass(path, search_title, hook, hook_end, words, hook_word_count, body_len, hilite):
    t = mv.ass_time
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Search,{mv.FONT},50,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,3,0,3,14,0,8,80,80,90,1
Style: Hook,{mv.FONT},104,&H00FFFFFF,&H00FFFFFF,{hilite},&H96000000,1,0,0,0,100,100,1,0,1,8,3,8,70,70,250,1
Style: Cap,{mv.FONT},86,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,1,0,0,0,100,100,1,0,1,6,2,2,70,70,470,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = [f"Dialogue: 2,{t(0)},{t(body_len)},Search,,0,0,0,,{mv.esc(search_title.upper())}"]
    # The hook is on screen from frame one, before the voice gets there.
    ev.append(f"Dialogue: 1,{t(0)},{t(hook_end + 0.25)},Hook,,0,0,0,,{mv.esc(hook.upper())}")
    rest = words[hook_word_count:]
    for i in range(0, len(rest), 3):
        grp = rest[i:i + 3]
        start = grp[0][1]
        end = rest[i + 3][1] if i + 3 < len(rest) else min(grp[-1][2] + 0.4, body_len)
        toks = [mv.esc(w[0]).upper() for w in grp]
        toks[-1] = f"{{\\c{hilite}}}{toks[-1]}{{\\c&H00FFFFFF&}}"
        ev.append(f"Dialogue: 0,{t(start)},{t(end)},Cap,,0,0,0,,{{\\fscx92\\fscy92\\t(0,90,\\fscx100\\fscy100)}}{' '.join(toks)}")
    path.write_text(header + "\n".join(ev) + "\n", encoding="utf-8")


# ---------------- one video ----------------
def render_one(r, outdir, seed_exclude=()):
    day = int(r["day"])
    work = ROOT / "output" / ".work" / f"b{day:02d}"
    shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True)
    text = r["voiceover"].strip()
    search_title = (r.get("search_title") or "").strip()
    if not search_title:
        sys.exit(f"[B day {day:02d}] search_title is required for Track B")

    print(f"[B day {day:02d}] voice...", end="", flush=True)
    vo, words, vo_dur = mv.make_voice(day, text, work, voice=(r.get("voice") or "").strip() or None,
                                      rate=VOICE_RATE_B, custom_prefix="b")
    sentences, spans = sentence_spans(text, words)
    hook, hook_end = sentences[0], spans[0][1]
    body_len = round(vo_dur + TAIL_PAD, 2)

    zoom = r.get("zoom", "").strip()
    zoom_len = ZOOM_SECONDS if zoom else 0.0
    zoom_at = 2 if str(r.get("zoom_at", "")).strip() == "2" else 1
    sentence_ends = [e for _, e in spans[:-1]]
    if zoom and zoom_at == 2:
        # a plain shot first (covers the hook), then the zoom
        first = min(max(hook_end, SHOT_MIN), SHOT_MAX)
        tail = plan_durations(body_len - first, zoom_len, [e - first for e in sentence_ends])
        lengths = [first, zoom_len] + tail
    else:
        lengths = plan_durations(body_len, zoom_len, sentence_ends)
        if zoom:
            lengths = [zoom_len] + lengths
    n_plain = len(lengths) - (1 if zoom else 0)
    manual = parse_shots(r.get("shots", ""))
    plain = (manual + auto_shots(max(0, n_plain - len(manual)), seed=f"B{day}{r.get('post_date')}", exclude=set(seed_exclude)))[:n_plain]

    segs, plan, pi = [], [], 0
    print(" shots...", end="", flush=True)
    for i, length in enumerate(lengths):
        out = work / f"seg{i:02d}.mp4"
        is_zoom = zoom and ((zoom_at == 1 and i == 0) or (zoom_at == 2 and i == 1))
        if is_zoom:
            zsrc, zts, region = parse_zoom(zoom)
            info = render_zoom(zsrc, zts, region, r.get("zoom_label", ""), length, out, work)
            plan.append(f"ZOOM {zsrc.relative_to(ROOT / 'trailers')}@{zts:.1f}s {info['mode']} x{info['zoom']} ({length:.1f}s)")
        else:
            src, st = plain[pi]; pi += 1
            render_shot(src, st, length, out)
            plan.append(f"{src.relative_to(ROOT / 'trailers')}@{st:.1f}s ({length:.1f}s)")
        segs.append(out)

    (work / "segs.txt").write_text("".join(f"file '{s.name}'\n" for s in segs))
    mv.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "segs.txt", "-c", "copy", "montage.mp4"], cwd=work)

    hilite = HILITE["pink" if day % 2 else "cyan"]
    hook_words = len(hook.split())
    write_ass(work / "subs.ass", search_title, hook, hook_end, words, hook_words, body_len, hilite)
    mv.run(["ffmpeg", "-y", "-i", "montage.mp4", "-i", str(Path(vo).resolve()),
            "-filter_complex", "[0:v]ass=subs.ass,format=yuv420p[v];[1:a]apad[a]",
            "-map", "[v]", "-map", "[a]", "-t", f"{body_len:.3f}", *mv.ENC, "body.mp4"], cwd=work)
    mv.render_end(work, seconds=END_SECONDS_B, tagline=False)
    mv.concat(work, outdir / r["_file"])
    music = mv.add_music(outdir / r["_file"], body_len, day, salt="B")   # salt: slot 2 gets the other track
    total = body_len + END_SECONDS_B
    print(f" done -> output/{r['_file']} ({total:.1f}s, {len(lengths)} shots{', music ' + music if music else ''})")
    return {"duration": total, "shots": len(lengths), "plan": plan, "hook_end": hook_end,
            "clips": [(str(s), st) for s, st in plain]}


def main(args, rows):
    outdir = ROOT / "output"; outdir.mkdir(exist_ok=True)
    only = mv.parse_only(args.only)
    results = []
    for r in rows:
        day = int(r["day"])
        r["_file"] = f"b{day:02d}_{r.get('post_date', '').strip() or 'video'}.mp4"
        if only and day not in only:
            continue
        info = render_one(r, outdir)
        for line in info["plan"]:
            print(f"           {line}")
        results.append((r, info))
    shutil.rmtree(ROOT / "output" / ".work", ignore_errors=True)
    return results


def csv_rows(name):
    return list(csv.DictReader(open(ROOT / name, encoding="utf-8-sig")))
