#!/usr/bin/env python3
"""
Shorts worker: runs on Kelvin's PC and does what the website can't.

Reviewing happens in /dashboard/shorts on the website, which can't write to
this computer or run ffmpeg. Every 30s this:
  1. APPROVED  -> downloads the video + a caption .txt into the approvals
     folder and opens it in Explorer (manual posting; nothing auto-posts).
  2. REJECTED  -> the dashboard already deleted the video. Removes any local
     approvals copy, then makes a replacement for the same day:
       retry 'same' -> same script, different footage
       retry 'new'  -> new script on a new subject (script_writer.py)
  3. RENDERS   -> any draft / needs_revision rows (make_videos.py --from-db
     --publish), which puts them back in the review queue.

Usage (from the repo root):
  video-factory/.venv/bin/python video-factory/shorts_worker.py --watch   # keep running
  video-factory/.venv/bin/python video-factory/shorts_worker.py --once    # one pass, then exit

Starts hidden at Windows login via Startup\DecodedSix Shorts Worker.vbs.
"""
import argparse, fcntl, os, re, subprocess, sys, time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
APPROVALS_DIR = Path(os.environ.get("DS_APPROVALS_DIR", "/mnt/c/Users/Kelvin/Videos/DecodedSix/approvals"))
BUCKET = "shorts"
POLL_SECONDS = 30
LOG = ROOT / "output" / "shorts_worker.log"
PYTHON = ROOT / ".venv" / "bin" / "python"


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
        f"POSTING ACCOUNT: {handle or '(not set)'}\n"
        f"HOOK: {s['hook']}\n\n"
        f"CAPTION (paste into TikTok and YouTube):\n"
        f"{' '.join(x for x in (s.get('post_caption'), s.get('hashtags')) if x)}\n\n"
        f"YOUTUBE TITLE:\n{s['hook']} #Shorts\n\n"
        f"Upload this video to TikTok and YouTube yourself, then click\n"
        f"'Mark posted' on its card in Mission Control > Shorts.\n"
    )


def open_folder(path):
    """Pop the folder open in Windows Explorer (explorer.exe exits 1 even on success)."""
    try:
        win = subprocess.run(["wslpath", "-w", str(path)], capture_output=True, text=True).stdout.strip()
        subprocess.run(["explorer.exe", win], capture_output=True)
    except FileNotFoundError:
        log("explorer.exe not available; open the folder manually")


def deliver_approved(sb):
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
                "agent_id": "dsx-shorts-worker", "action": "short_delivered_locally",
                "short_id": s["id"], "result": f"success: day {s['day_number']} -> {mp4.name} ({len(data)} bytes)",
            }).execute()
            log(f"delivered day {s['day_number']} -> {mp4}")
            delivered += 1
        except Exception as e:                                 # one bad row must not block the rest
            log(f"FAILED day {s['day_number']}: {e.__class__.__name__}: {e}")
            sb.table("audit_log").insert({
                "agent_id": "dsx-shorts-worker", "action": "short_delivered_locally",
                "short_id": s["id"], "result": "failure", "error": f"{e.__class__.__name__}: {e}"[:800],
            }).execute()
    if delivered:
        open_folder(APPROVALS_DIR)
    return delivered


def audit(sb, short_id, action, result, error=None):
    sb.table("audit_log").insert({"agent_id": "dsx-shorts-worker", "action": action,
                                  "short_id": short_id, "result": result, "error": error}).execute()


def handle_rejected(sb):
    """Rejected shorts: drop the local copy, then queue a replacement for the same day."""
    rows = (sb.table("ds_shorts").select("*").eq("status", "rejected")
              .not_.is_("retry_mode", "null").order("post_date").execute().data)
    for s in rows:
        if s.get("local_path"):
            for f in (Path(s["local_path"]), Path(s["local_path"]).with_suffix(".txt")):
                f.unlink(missing_ok=True)
        base = {"render_attempt": int(s.get("render_attempt") or 0) + 1, "clip_override": None,
                "retry_mode": None, "local_path": None, "local_delivered_at": None}
        if s["retry_mode"] == "same":
            sb.table("ds_shorts").update({**base, "status": "draft"}).eq("id", s["id"]).execute()
            audit(sb, s["id"], "short_retry_queued", f"success: day {s['day_number']} same subject, new footage")
            log(f"day {s['day_number']}: rejected -> retry same subject with new footage")
            continue
        sb.table("ds_shorts").update({"status": "regenerating"}).eq("id", s["id"]).execute()
        note = s.get("reviewer_notes") or ""
        try:
            import script_writer
            new = script_writer.write_new_subject(sb, s, note)
            sb.table("ds_shorts").update({**base, **new, "status": "draft",
                                          "reviewer_notes": f"New subject (was: {s['hook']})"}).eq("id", s["id"]).execute()
            audit(sb, s["id"], "short_new_subject_written", f"success: day {s['day_number']} '{s['hook']}' -> '{new['hook']}'")
            log(f"day {s['day_number']}: new subject '{new['hook']}'")
        except Exception as e:                                 # fall back to a same-subject retry, never leave a gap
            msg = f"{e.__class__.__name__}: {e}"[:600]
            sb.table("ds_shorts").update({**base, "status": "draft",
                                          "reviewer_notes": f"New-subject rewrite failed, made a same-subject retry instead ({msg})"}).eq("id", s["id"]).execute()
            audit(sb, s["id"], "short_new_subject_written", "failure", msg)
            log(f"day {s['day_number']}: new subject FAILED ({msg}); retrying same subject")


def render_pending(sb):
    """Render draft / needs_revision rows back into the review queue."""
    waiting = sb.table("ds_shorts").select("id", count="exact").in_("status", ["draft", "needs_revision"]).execute().count
    if not waiting:
        return
    log(f"rendering {waiting} short(s)...")
    p = subprocess.run([str(PYTHON), str(ROOT / "make_videos.py"), "--from-db", "--publish"],
                       cwd=REPO, capture_output=True, text=True, env=os.environ.copy())
    for line in (p.stdout + p.stderr).splitlines():
        if "done ->" in line or "FAILED" in line or "uploaded" in line:
            log("  " + line.strip())
    if p.returncode:
        log(f"render run exited {p.returncode} (failed rows were reverted with the error noted)")


def run_pass(sb):
    deliver_approved(sb)
    handle_rejected(sb)
    render_pending(sb)


def main():
    ap = argparse.ArgumentParser(description="Shorts worker: approvals folder, reject-and-remake, rendering")
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--watch", action="store_true", help=f"keep running, check every {POLL_SECONDS}s")
    mode.add_argument("--once", action="store_true", help="check once and exit")
    args = ap.parse_args()
    load_env()

    # One watcher at a time, or two would race to deliver the same video.
    lock = open(ROOT / "output" / ".shorts_worker.lock", "w") if (ROOT / "output").is_dir() else None
    if args.watch and lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            sys.exit("shorts_worker is already running.")

    sb = client()
    if args.once:
        run_pass(sb)
        log("one pass done")
        return
    log(f"worker running: every {POLL_SECONDS}s (approvals -> {APPROVALS_DIR}, rejects -> remake, drafts -> render)")
    while True:
        try:
            run_pass(sb)
        except Exception as e:                                 # network blips: log, keep watching
            log(f"check failed: {e.__class__.__name__}: {e}")
            sb = client()
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
