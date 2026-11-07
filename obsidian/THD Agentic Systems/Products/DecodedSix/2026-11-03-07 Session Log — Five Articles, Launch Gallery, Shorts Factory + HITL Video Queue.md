## Context
A long session that ran Nov 3–7, 2026, in three blocks:
1. Five commissioned articles, then fixing their images, SEO and word count.
2. A Launch Gallery article (Rockstar's 39 new screenshots, Kodak Black), with the images added to the archive.
3. A short-form video pipeline: a countdown Shorts factory, a HITL video queue in Mission Control, an approvals folder on Kelvin's PC, music and voice levels, and a second "discovery" track (Phase B1).

## 1. Five Commissioned Articles (Nov 3)
All five were written through the real DSX-CA1 pipeline and **published by Kelvin** after review.

| Article | Slug | Body words (FAQ excluded) |
|---|---|---|
| Justice original score | `gta-6-justice-original-score-release-date-vinyl-tracks` | 1,361 |
| File size + Nov 10 pre-load | `gta-6-file-size-212gb-preload-november-10` | 1,025 ⚠ |
| Map: free download + $0.99 poster | `gta-6-leonida-map-free-download-rockstar-store-poster` | 1,726 |
| Rockstar Store Vice City merch | `gta-6-vice-city-merch-rockstar-store-prices-stock` | 1,480 |
| Miami HEAT Vice City night, Nov 18 | `miami-heat-gta-6-night-vice-city-november-18` | 1,380 |

- **Premise corrections from research.** The articles state these; they are not what was originally assumed:
  - **Pre-load:** Nov 10 is confirmed. Rockstar did **not** say the early date is because of the file size. Size is "up to 212 GB."
  - **Map:** the $0.99 item is a double-sided poster, shipping shortly after launch. A free printable map comes Nov 19.
  - **Justice:** the score album (Dec 11) is separate from The Album and the radio.
  - **HEAT night:** the uniform is new and not yet revealed. The roof sign has been lit since Oct 1. There is **no** themed dance team.
- **Image credits:** the HEAT article uses Miami HEAT press images credited "Miami HEAT". That is an editorial judgment call.
- **Images 404'd at first** because they were never deployed. Fixed in `283363c`: 33 webp files, all 200 live.
- **Open items:**
  - The size/pre-load article went out at **1,025 body words**, under the 1,200 the SEO check expects. It also still has 10 humanizer " , " artifacts.
  - `gta-6-preload-guide-november-12-launch-day` still says **Nov 12** and needs a correction note.
- **Humanizer bug:** em dashes become " , ", and `_body_word_count()` counts each stray comma as a word. This inflates word counts sitewide. Cleaned per article with `re.sub(r' , ', ', ', c)`; the humanizer itself is not fixed.

## 2. Launch Gallery Article (Nov 6)
- Rockstar published a 39-image **Launch Gallery** on Nov 5 at rockstargames.com/VI/launch-gallery. We counted 39 from Rockstar's own file names, matching TweakTown. Other outlets said 35–38.
- **Archive:** all 39 4K originals went into `public/images/tier1/` using Rockstar's numbering:
  - Vice City 13–27
  - Jason 11–19
  - Lucia 11–14
  - Grassrivers 07–08, Leonida Keys 07, Port Gellhorn 07
  - Jason & Lucia 14–20, in a new `characters/jason-and-lucia/` folder registered in `CHARACTER_META`

  Commit `02c09cf`.
- **Article** `5e5f9b8f-89d6-4c97-acf6-abcd9459d7bc`, "GTA 6 Launch Gallery: 39 New Screenshots and Kodak Black":
  - 1,960 body words. SEO 100, AEO 100.
  - 14 web-sized highlights; the Kodak Black shot (Vice_City_25) is the hero.
- **Kodak Black is NOT confirmed by Rockstar.** The shot shows an "1800" pendant and a "J&H" (Jack of Hearts) cup. The article says "the character fans say is Kodak Black."
- `src/lib/rockstar-images.ts` (the frontend mirror) is hand-listed and stale versus the disk. Not updated.

## 3. Shorts Factory + HITL Video Queue (Nov 7)
### Factory (`video-factory/`)
- Kelvin's `decodedsix-video-factory.zip`: `make_videos.py` (ffmpeg + edge-tts, $0) and `scripts.csv` (30 countdown scripts, Nov 8 – Dec 7).
- **Footage is never committed.** These are gitignored:
  - `trailers/`: read-only symlinks to the four `GTAVI_*.mp4` files in Downloads
  - `trailers/press/`: 8 character clips plus cover art. **The character clips are 1–1.5s loops, not real clips.**
  - `music/`, `voice/`, `output/`, `.venv/`
- **CSV fact fixes:**
  - Pre-load moved to **Nov 10**, citing the PlayStation Blog (Nov 3): "a minimum of 212GB". Day 3 is now "PRELOAD IS LIVE"; days 4–5 are download reminders.
  - Day 26 now says "seven languages", because `en` and `en-GB` are both English.
  - Day 29 no longer mentions PC.
- **Days 12–30 are `held`.** They promise map categories (money spots, vehicle spawns, etc.). On Nov 19, check the real marker counts and rewrite any row that promises an empty category.
- **Look:**
  - 5-second end card: the hi-res D6 logo (`public/images/branded/decodedsix-logo-1254.png`) on pure black, so there is no box.
  - Impact captions. Videos run 25s.
- **Audio:**
  - Kelvin's two tracks (`welcome_to_vice_city`, `showdown_remix`) are normalized to -16 LUFS and alternate between videos, starting at a random point.
  - Music is ducked -18 dB under the voice and comes back up for the end card, with 0.5s fades.
  - Voice is normalized to **-14 LUFS**. Whole video lands at about -15.4 LUFS; it was -18.1.
  - Trailer audio is 0.
- **Reliability:**
  - edge-tts randomly returns `NoAudioReceived`, so voice generation retries 3 times with backoff.
  - On a failed render, the row returns to its previous status with the error in `reviewer_notes`.
  - Every render writes `audit_log`.

### Database (migrations 025, 026; applied via `supabase db query --linked -f`)
- **Don't use `supabase db push`.** Remote migration history only records 007 and 008, so a push would replay 001–024.
- **Tables:**
  - `ds_shorts`, `ds_short_accounts` (handles only, never credentials) and `ds_short_sources`
  - a private `shorts` Storage bucket
  - `audit_log.short_id`
  - `ds_shorts.local_delivered_at` / `local_path` (026)
- **All service-role only.** Tested with 30 rows present: anon reads return `[]`, anon inserts are refused by RLS, and the bucket is private.
- **Kelvin's `024_page_views_rollup.sql` is untouched and uncommitted, on request.**

### Mission Control → Shorts (`/dashboard/shorts`)
- Same mechanics as the article queue:
  - **Approve:** pick or add the TikTok account.
  - **Revise:** edit hook, voiceover, caption, hashtags, plus a note; this sets `needs_revision` and the factory re-renders.
  - **Reject:** note required.
  - **Mark posted:** per platform. One platform is `scheduled`; both is `posted`.
- 30-day calendar strip with gaps marked, and a nav badge.
- All writes go through `/api/shorts/*` behind the Supabase session. `force-dynamic` and `no-store` are set, so there is no stale-cache repeat of Sep 24.
- **Tested end to end on a real session:**
  - The full flow: approve with and without an account, reject with and without a note, revise, re-render back to pending, and mark posted on both platforms.
  - Bad inputs get 400/409, and logged-out requests get 401.
  - Test data was reset afterwards.

### Approvals folder
- On approval, `video-factory/approvals_sync.py` downloads the mp4 plus a caption `.txt` to `C:\Users\Kelvin\Videos\DecodedSix\approvals` and opens the folder in Explorer.
- It runs on Kelvin's PC, polling every 30s. It starts hidden at Windows login from `Startup\DecodedSix Approvals Sync.vbs`; a copy is in the repo.
- Videos approved while the PC is off arrive when it next starts.

### Track B: Discovery Shorts, Phase B1 (`discovery.py`, `scenes.py`)
- **`scenes.py`:** scene-cut detection, cached per file.
- **`discovery.py`:**
  - 4–6 shot montage, cutting on sentence breaks
  - freeze-frame zoom with a pink box and label, in vertical or widescreen mode
  - hook text on screen from 0.0s, plus a persistent search-title label
  - 1.5s end card, +12% voice speed, pink/cyan caption highlight
- **Two samples** in `discovery_samples.csv`, both verified:
  - Trailer 1 at 1:05: the "Mega Noticias" Spanish-language news logo
  - Release date, using the trailer's own Nov 19, 2026 end card
- **Awaiting Kelvin's review before B2:**
  - B2 adds the DB columns, the two-slot calendar, 48h stats and the track comparison panel.

## Decisions / Flags for Kelvin
- **Voice sample `D6_2_voiceover.mp3` not found** in `OneDrive\Desktop\D6 social campaign\` or anywhere else on the Desktop. `video-factory/voice/reference/` is waiting for it.
- **Sudo password was shared in chat.** Change it with `passwd`. It is not stored anywhere.
- **Countdown look items still open:**
  - Day 1's opening clip is dark and slow (Extended Look at 6s).
  - Phase 2 (smarter clip picking) is not built for Track A.
- **Not built yet:**
  - the official-footage watcher
  - the 14-day storage retention sweep
  - weekly script generation
  - `/shorts-*` slash commands
- **CLAUDE.md says decodedsix.com.** The live site is www.thedecodedsix.com (the apex redirects). Not changed.

## Verification
- Production build passes, and `tsc` is clean.
- Live checks: `/api/shorts` returns 401 and `/dashboard/shorts` redirects to /login.
- The D6 logo and all article images serve 200.
- Countdown days 1–11 were re-rendered with the logo end card, music and voice level, and returned to the queue as `pending_review`.
- Commits:
  - `283363c`, `02c09cf`: articles and images
  - `d754f38`, `77e1d88`: factory and queue
  - `75869bf`: approvals folder
  - `fe8c05e`: Track B1
  - `ce5ed81`: music
  - plus this session's final commit for the voice level
