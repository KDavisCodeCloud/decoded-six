# DecodedSix — Sound Files

These files must be added manually. Do not commit copyrighted audio.
Source GTA-style sounds from royalty-free libraries only.
Recommended: Pixabay, Freesound.org, or commission original sounds.

## Required Files

| Filename | Used When | Notes |
|---|---|---|
| money-collect.mp3 | Revenue metric updates | Coin/cash pickup sound |
| mission-passed.mp3 | Article approved + published | Victory fanfare |
| wasted.mp3 | Article rejected | Failure/rejection sound |
| big-score.mp3 | Gate cleared | Triumphant achievement sound |
| wanted.mp3 | HITL urgent item | Alert/alarm sound |
| ui-click.mp3 | Any button click | Clean UI click |
| cash-register.mp3 | Affiliate conversion logged | Cash register ding |

## Implementation
All sounds loaded via lib/sounds.ts SoundManager.
See lib/sounds.ts for the SoundEvents enum and play() method.
Never reference external audio URLs — files must be local.

## Sound Toggle
Dashboard has a sound on/off toggle in the top bar.
State persisted in localStorage under key: ds-sound-enabled
Default: true (sound on)
