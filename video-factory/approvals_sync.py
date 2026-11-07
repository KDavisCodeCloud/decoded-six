#!/usr/bin/env python3
"""
Approvals folder sync: approved Shorts land on this PC, ready to post by hand.

Approving a short in /dashboard/shorts happens on the website, which can't
write to this computer. This runs locally instead: it polls ds_shorts for
approved videos that haven't been delivered yet, downloads each one into the
approvals folder with a caption .txt beside it, opens the folder in Windows
Explorer, and stamps local_delivered_at so each cut is delivered once.

Usage (from the repo root):
  video-factory/.venv/bin/python video-factory/approvals_sync.py --watch   # keep running, check every 30s
  video-factory/.venv/bin/python video-factory/approvals_sync.py --once    # one check, then exit

Starts automatically at Windows login via the Startup-folder launcher
(DecodedSix Approvals Sync.vbs). Folder: APPROVALS_DIR below.
"""
import argparse, fcntl, os, re, subprocess, sys, time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
APPROVALS_DIR = Path(os.environ.get("DS_APPROVALS_DIR", "/mnt/c/Users/Kelvin/Videos/DecodedSix/approvals"))
BUCKET = "shorts"
POLL_SECONDS = 30
LOG = ROOT / "output" / "approvals_sync.log"


def log(msg):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(line, flush=True)
    LOG.parent.mkdir(exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_env():
    """Read Supabase settings from the repo's .env.local (never hardcoded)."""
    env_file = REPO / ".env.local"
    if env_file.exists():
        for raw in env_file.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$", raw)
            if m and m.group(1) not in os.environ:
                os.environ[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    for k in ("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        if not os.environ.get(k):
            sys.exit(f"{k} is not set (expected in {env_file}).")


def client():
    from supabase import create_client
    return create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def slug(text):
    return re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-")[:40] or "short"


def caption_file(s, handle):
    return (
        f"POST DATE: {s['post_date']}\n"
        f"TIKTOK ACCOUNT: {handle or '(not set)'}\n"
        f"HOOK: {s['hook']}\n\n"
        f"CAPTION (paste into TikTok and YouTube):\n"
        f"{' '.join(x for x in (s.get('post_caption'), s.get('hashtags')) if x)}\n\n"
        f"YOUTUBE TITLE:\n{s['hook']} #Shorts\n\n"
        f"After posting, click 'Mark posted' in Mission Control > Shorts.\n"
    )


def open_folder(path):
    """Pop the folder open in Windows Explorer (explorer.exe exits 1 even on success)."""
    try:
        win = subprocess.run(["wslpath", "-w", str(path)], capture_output=True, text=True).stdout.strip()
        subprocess.run(["explorer.exe", win], capture_output=True)
    except FileNotFoundError:
        log("explorer.exe not available; open the folder manually")


def sync_once(sb):
    rows = (sb.table("ds_shorts")
              .select("id, day_number, post_date, hook, post_caption, hashtags, storage_path, tiktok_account:ds_short_accounts(handle)")
              .eq("status", "approved")
              .is_("local_delivered_at", "null")
              .not_.is_("storage_path", "null")
              .order("post_date")
              .execute().data)
    delivered = 0
    for s in rows:
        handle = (s.get("tiktok_account") or {}).get("handle")
        base = f"{s['post_date']}_day{s['day_number']:02d}_{slug(s['hook'])}"
        mp4, txt = APPROVALS_DIR / f"{base}.mp4", APPROVALS_DIR / f"{base}.txt"
        try:
            APPROVALS_DIR.mkdir(parents=True, exist_ok=True)
            data = sb.storage.from_(BUCKET).download(s["storage_path"])
            tmp = mp4.with_suffix(".part")
            tmp.write_bytes(data)
            tmp.replace(mp4)                                   # never leave a half-written .mp4 to post
            txt.write_text(caption_file(s, handle), encoding="utf-8")
            sb.table("ds_shorts").update({
                "local_delivered_at": datetime.now(timezone.utc).isoformat(),
                "local_path": str(mp4),
            }).eq("id", s["id"]).execute()
            sb.table("audit_log").insert({
                "agent_id": "dsx-shorts-approvals-sync", "action": "short_delivered_locally",
                "short_id": s["id"], "result": f"success: day {s['day_number']} -> {mp4.name} ({len(data)} bytes)",
            }).execute()
            log(f"delivered day {s['day_number']} -> {mp4}")
            delivered += 1
        except Exception as e:                                 # one bad row must not block the rest
            log(f"FAILED day {s['day_number']}: {e.__class__.__name__}: {e}")
            sb.table("audit_log").insert({
                "agent_id": "dsx-shorts-approvals-sync", "action": "short_delivered_locally",
                "short_id": s["id"], "result": "failure", "error": f"{e.__class__.__name__}: {e}"[:800],
            }).execute()
    if delivered:
        open_folder(APPROVALS_DIR)
    return delivered


def main():
    ap = argparse.ArgumentParser(description="Download approved Shorts into the local approvals folder")
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--watch", action="store_true", help=f"keep running, check every {POLL_SECONDS}s")
    mode.add_argument("--once", action="store_true", help="check once and exit")
    args = ap.parse_args()
    load_env()

    # One watcher at a time, or two would race to deliver the same video.
    lock = open(ROOT / "output" / ".approvals_sync.lock", "w") if (ROOT / "output").is_dir() else None
    if args.watch and lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            sys.exit("approvals_sync is already running.")

    sb = client()
    if args.once:
        n = sync_once(sb)
        log(f"checked once: {n} delivered")
        return
    log(f"watching for approvals every {POLL_SECONDS}s -> {APPROVALS_DIR}")
    while True:
        try:
            sync_once(sb)
        except Exception as e:                                 # network blips: log, keep watching
            log(f"check failed: {e.__class__.__name__}: {e}")
            sb = client()
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
