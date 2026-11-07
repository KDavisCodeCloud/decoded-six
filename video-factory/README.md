# DecodedSix Video Factory

30 vertical countdown videos from your trailers. One command. $0.

Each video: ~20s trailer clip (blurred vertical fill) → AI voiceover → burned-in captions → countdown hook at top → 3s logo end card (thedecodedsix.com · MAP • GUIDES • NEWS).

```
decodedsix-video-factory/
├── make_videos.py     the generator
├── scripts.csv        30 scripts (edit freely)
├── logo.png           ← YOUR logo goes here (transparent PNG)
├── trailers/          ← YOUR trailer files go here
├── voice/             optional: your own ElevenLabs files (01.mp3, 02.mp3 …)
└── output/            finished videos + review.html
```

---

## One-time setup (10 minutes)

**1. Install ffmpeg**
- Windows: open PowerShell → `winget install Gyan.FFmpeg` → close and reopen PowerShell
- Mac: `brew install ffmpeg`

**2. Install Python 3.10+** (python.org — on Windows tick "Add Python to PATH")

**3. Install the free voice engine**
```
pip install edge-tts
```

**4. Check it works**
```
ffmpeg -version
python make_videos.py --list-voices
```

---

## Workflow

### Step 1 — Load your assets
- Copy your downloaded trailers into `trailers/`
- Replace `logo.png` with your real logo
- **Delete** `trailers/TEST_trailer_*.mp4`, the `voice/` test files, and anything in `output/`

### Step 2 — Preview ONE video first
```
python make_videos.py --only 1
```
Open `output/review.html` in your browser. Check the voice, captions, clip, and end card.

Don't like something? Change it at the top of `make_videos.py`:
| Want to change | Setting |
|---|---|
| Voice | `VOICE` (see `--list-voices`; try `en-US-GuyNeural`, `en-US-ChristopherNeural`) |
| Voice speed | `VOICE_RATE` (`+8%`, `+15%`, `-5%`) |
| Trailer music volume | `TRAILER_VOLUME` (0 = mute, 0.3 = louder) |
| Font | `FONT` (Impact or Bebas Neue look great if installed) |
| Clip length | `CLIP_SECONDS` |

### Step 3 — Pick a specific clip (optional)
The script auto-picks a different trailer section for each video. To force a moment, fill the `clip` column in `scripts.csv`:
```
trailer2.mp4@01:05
```
(file name in `trailers/` + start time)

### Step 4 — Render all 30
```
python make_videos.py
```
Takes roughly 1–2 minutes per video on a normal laptop. Start it and walk away.
Re-render specific days anytime: `--only 4` or `--only 4-9` or `--only 2,7,15`.

### Step 5 — Review before posting
Open `output/review.html`. Every video plays in a grid with its post caption + hashtags underneath — click the caption box to select, copy, paste into TikTok/YouTube.

Reject one? Edit that row in `scripts.csv` and run `--only <day>`.

### Step 6 — Schedule (free, native)
- **TikTok:** desktop web (tiktok.com/upload) → upload → "Schedule" → set date from the filename. Schedules up to 10 days ahead, so do it in 3 batches.
- **YouTube Shorts:** YouTube Studio → upload → Visibility → Schedule. Can schedule all 30 at once.

Files are named `day01_2026-11-08.mp4` so the post date is always in front of you.

---

## Using ElevenLabs instead of the free voice
Generate each script in ElevenLabs and save as `voice/01.mp3`, `voice/02.mp3`, etc. Any day with a file there uses it automatically; captions are timed to the audio. Mix and match freely.

## After launch (Nov 19+)
Days 13–30 work with trailer footage, but they'll perform better with **your own gameplay**. Record with PS5/Xbox capture, drop the files in `trailers/`, and point those rows' `clip` column at them.

## Content rules baked into the scripts
- Only confirmed facts (Nov 19 launch, PS5/Xbox Series, Nov 10 digital preload, at least 212 GB on PS5, Jason & Lucia, Leonida/Vice City).
  Preload source: PlayStation Blog, Nov 3 2026, "Pre-download timing will be available to those who pre-order starting at November 10 local midnight" and "clearing a minimum of 212GB of storage space on your PS5" (https://blog.playstation.com/2026/11/03/grand-theft-auto-vi-pre-download-begins-november-10/). Nov 12 was the original date (Take-Two, Jun 24 2026) and is now wrong.
- Days 12-30 are `held_until_launch` (status column). They promise map categories that may not exist yet; on Nov 19 check real marker counts and rewrite any row that promises an empty category. `--include-held` renders them anyway.
- No GTA Online claims
- Every video ends on a site CTA rotating map / guides / news
- Pre-launch scripts say the map goes live on launch day (MAP_LIVE flips Nov 19)

---

## DecodedSix setup (Mission Control queue + approvals folder)

**End card:** the last 5 seconds of every short are the D6 logo
(`public/images/branded/decodedsix-logo-1254.png`) on pure black, with
thedecodedsix.com and MAP • GUIDES • NEWS. Videos run 25s.

**Daily:**
1. Mission Control → **Shorts** → watch each pending video.
2. **Approve** (pick the TikTok account it goes to), **Revise** (edit the script + note; the next factory run re-renders it), or **Reject** (note required).
3. Approved videos download automatically to
   `C:\Users\Kelvin\Videos\DecodedSix\approvals` and the folder pops open.
   Each `.mp4` has a `.txt` beside it with the post date, TikTok account,
   caption + hashtags and a YouTube title.
4. Post by hand on TikTok and YouTube, then click **Mark posted** in the dashboard.

**Approvals sync** (`approvals_sync.py`) starts hidden at Windows login from
`Startup\DecodedSix Approvals Sync.vbs` (copy in this folder:
`approvals_sync_startup.vbs`). It checks every 30s. Log:
`output/approvals_sync.log`. Run by hand: `video-factory/.venv/bin/python
video-factory/approvals_sync.py --once`. To stop autostart, delete the .vbs
from the Startup folder.

**Render from the queue:** `set -a; . ./.env.local; set +a` then
`video-factory/.venv/bin/python video-factory/make_videos.py --from-db --publish`
renders every `draft` and `needs_revision` row and puts it back in review.
