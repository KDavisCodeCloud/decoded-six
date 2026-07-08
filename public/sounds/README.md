# DecodedSix — Internal Dashboard Sounds

**Internal use only — family dashboard.**
If this ever becomes a distributed product,
replace all files with licensed alternatives before any public release.

Source: myinstants.com

| File | Source | Fires On |
|---|---|---|
| pickup.mp3 | GTA pickup sound | Article/marker approved |
| wasted.mp3 | GTA V wasted/busted | Article/marker rejected |
| mission-passed.mp3 | GTA SA mission passed | Gate cleared, milestones |
| ui-notification.mp3 | GTA V notification | New HITL queue item |
| wanted-stars.mp3 | GTA V death sound | Compliance flag, copyright flag |

## Downloads Used
gta-pick-up.mp3 → pickup.mp3
gta-san-andreas-mission-complete-sound-hq.mp3 → mission-passed.mp3
gta-v-wastedbusted-sound-effect_GcEdnlM.mp3 → wasted.mp3
gta-v-notification-better-version_WAYpogU.mp3 → ui-notification.mp3
gta-v-death-sound-effect-102.mp3 → wanted-stars.mp3

## Adding More Sounds
1. Download from myinstants.com
2. Add to this directory with descriptive name
3. Add to sounds object in src/lib/sounds.ts
4. Add to SoundEvents mapping
5. Add a row to this README

## Volume Notes
- ARTICLE_REJECTED_SOFT plays at 0.4 volume
- All other sounds play at user preference (default 0.7)
- Volume persists in localStorage: ds-sound-volume
- Sound on/off persists in localStorage: ds-sound-enabled
