## Context
Kelvin brought a new logo for the site: a "D6" lettermark with a sunset, palm tree, and skyline inside the letters, and "THE DECODED SIX" underneath in white and neon pink. He asked for two things:
1. Replace the old header logo (the pink-to-purple "D6" box with "Decoded Six" text) with the new one.
2. Rewrite the email popup that appears on entry so it's about the **November 19 launch** and signing up for **early access to the interactive map**.

## Header Logo
- Source saved as `public/images/branded/decodedsix-logo.png` (717×722). A 256×258 copy, `decodedsix-logo-256.png`, is what the header loads through `next/image` with `priority`.
- `src/components/Header.tsx`: the gradient badge and the "Decoded Six" text are replaced by the image (`alt="The Decoded Six"`, link `aria-label` "The Decoded Six — home"). It shows at 52px tall.
- The header row grew from `h-14` to `h-16` (56px to 64px) so the logo fits. Nothing on the public site was offset by the old height; checked with grep before changing it.
- **Known tradeoff:** at 52px, the "THE DECODED SIX" lettering inside the logo is small. If it reads poorly on mobile, the options are a taller header, or the icon plus a text wordmark.
- Kelvin described the logo's position as "top right." In the code it is on the top **left**, where the old logo was. That position was kept.

## Popup: Aug 27 Replaced by Nov 19 Map Early Access
- `Aug27Popup.tsx` was renamed to `src/components/MapLaunchPopup.tsx` and wired into `src/app/[locale]/layout.tsx`.
- Copy:
  - **Tag:** November 19 · Launch day (amber `#f5a623`)
  - **Headline:** Get early access to the GTA 6 interactive map
  - **Body:** GTA 6 launches November 19, and our interactive map of Leonida goes live with it. Sign up for early access and we'll email you the moment it opens.
  - **CTA:** Get early access
  - **After signup:** You're in. Watch your inbox on November 19.
- Triggers are unchanged: a 10-second timer, or exit intent.
- **New dismiss cookie `ds_nov19_map_popup_dismissed`.** The old `ds_aug27_popup_dismissed` cookie lasted 7 days. Reusing it would have hidden the new ask from anyone who closed the Aug 27 popup recently.
- **New systeme.io source `nov19_map` → `decodedsix_nov19_map_early_access`**, added to the `SOURCES` allowlist in `src/app/api/newsletter/subscribe/route.ts`. Map early-access signups are now their own segment. This is the list to email when `NEXT_PUBLIC_MAP_LIVE` flips on launch day.

## Decisions / Flags for Kelvin
- **"Early access" is worded as a notification, not a head start.** The map flag (`NEXT_PUBLIC_MAP_LIVE`) turns on for everyone at once. The copy promises an email "the moment it opens," which we can deliver. A real subscriber-only head start would need gating on the map itself, which was not built.
- **`Aug27StickyBar` is still live and stale.** It still says "Get our August 27 breakdown…". It was not in scope, so it was left alone. It should switch to the Nov 19 map message or be removed.
- **Domain:** Kelvin referred to the site as thedecodedsix.com, but CLAUDE.md says decodedsix.com. No domain references were changed.

## Verification
- `tsc --noEmit` passes.
- Dev server: the header `<img>` renders, and `/images/branded/decodedsix-logo-256.png` returns 200.
- **Not visually verified.** Playwright's headless Chromium can't launch in this WSL setup because `libnspr4.so` is missing. Eyeball the logo size and the popup on the live site after deploy.
