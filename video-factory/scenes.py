#!/usr/bin/env python3
"""
Scene-cut detection for the footage library, cached per file.

ffmpeg's scene filter on a downscaled decode; cuts are cached in
output/.scenes/<file>.json keyed by size+mtime, so a 27-minute 4K source is
scanned once. Montage shots (Track B) start on a cut so nothing begins
mid-shot.

  video-factory/.venv/bin/python video-factory/scenes.py            # scan everything in trailers/ (+ press/)
  video-factory/.venv/bin/python video-factory/scenes.py FILE ...   # scan specific files
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TRAILERS = ROOT / "trailers"
CACHE = ROOT / "output" / ".scenes"
THRESHOLD = 0.35
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".webm", ".m4v"}


def footage():
    """Every source: top-level trailers plus trailers/press/ (official press clips)."""
    return sorted(p for p in list(TRAILERS.glob("*")) + list(TRAILERS.glob("press/*"))
                  if p.suffix.lower() in VIDEO_EXT)


def _key(path):
    st = path.stat()
    return f"{st.st_size}-{int(st.st_mtime)}"


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True).stdout.strip()
    return float(out or 0)


def scene_cuts(path):
    """Sorted cut times in seconds, always including 0.0. Cached."""
    path = Path(path)
    CACHE.mkdir(parents=True, exist_ok=True)
    cache = CACHE / f"{path.relative_to(TRAILERS).as_posix().replace('/', '__')}.json"
    if cache.exists():
        data = json.loads(cache.read_text())
        if data.get("key") == _key(path):
            return data["cuts"]
    p = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path),
         "-vf", f"scale=320:-2,select='gt(scene,{THRESHOLD})',showinfo", "-an", "-f", "null", "-"],
        capture_output=True, text=True)
    cuts = sorted({0.0, *(round(float(t), 2) for t in re.findall(r"pts_time:([0-9.]+)", p.stderr))})
    cache.write_text(json.dumps({"key": _key(path), "duration": duration(path), "cuts": cuts}))
    return cuts


def shots(path, min_len=3.0):
    """(start, end) spans between consecutive cuts that are at least min_len long."""
    cuts = scene_cuts(path)
    ends = cuts[1:] + [duration(path)]
    return [(a, b) for a, b in zip(cuts, ends) if b - a >= min_len]


if __name__ == "__main__":
    targets = [Path(a) for a in sys.argv[1:]] or footage()
    for f in targets:
        c = scene_cuts(f)
        print(f"{f.relative_to(TRAILERS)}: {len(c)} cuts, {len(shots(f))} shots >= 3s", flush=True)
