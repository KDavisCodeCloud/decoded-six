# DecodedSix — Design System

## Base Tokens (Never Override)
--ds-bg:        #070910
--ds-blue:      #5a96ff
--ds-amber:     #f5a623
--ds-green:     #3fd17a
--ds-font-head: 'Space Grotesk', sans-serif
--ds-font-body: 'IBM Plex Sans', sans-serif
--ds-font-mono: 'JetBrains Mono', monospace

## Public Site Surface
Amber (#f5a623) is the PRIMARY accent on the public site.
Expanded use vs other THD products where amber = alerts only.
Blue (#5a96ff) used for navigation elements and data display only.
Motion: Expressive throughout — Framer Motion on everything.
Layout: Dark editorial magazine grid.
Feel: ESPN dark mode crossed with The Verge.

## Internal Dashboard Surface
--ds-dash-bg:   #0D0014   (Vice City dark — replaces base bg)
--ds-dash-gold: #C8A84B   (GTA gold — primary accent in dashboard)
--ds-dash-pink: #FF2D6B   (neon pink — alerts and warnings)
--ds-dash-font: 'Pricedown', display   (headers only, never public site)

All other tokens (body font, mono font, green, base blue) carry over
from the public site design system unchanged.

## Typography
Public site:
  Headings: Space Grotesk 700/800
  Body: IBM Plex Sans 400/500
  Data/stats: JetBrains Mono 600/700
  Stat values: Large, monospace, amber

Dashboard:
  Page titles: Pricedown (GTA font) — headers only
  All other text: inherits public site tokens
  Never use Pricedown on public site

## GTA Overlay States (Dashboard Only)
MISSION PASSED:
  bg: #070910, text: #C8A84B
  Entry: scale(0.8) → scale(1) spring, 400ms

WASTED:
  bg: #1A0000, text: #FF2D6B
  Entry: shake + fade in, red vignette

BIG SCORE:
  bg: gradient #C8A84B → #8B6914
  Entry: scale up + confetti burst

WANTED:
  bg: #CC0000, text: #FFFFFF
  Entry: fast flash 3x then hold

## Motion Rules — Public Site
Map marker pin drop: spring physics on page load
Map popup: slide up from marker with spring
Sidebar filter: slide in from left, spring
Area overlay polygon: fade in/out on hover/click
Map flyTo: Leaflet smooth animation (not Framer)
Caution tape placeholder: Framer Motion loop (slow)
Article cards: subtle fade in on scroll into view
Tier lists: staggered entrance animation, 50ms delay each row
Hero section: section-by-section reveal on load

## Motion Rules — Dashboard
GTA overlays: per variant specs above
Status updates: subtle pulse only
Sound icon: bounce on trigger
Everything else: static — no decorative motion in dashboard

## Map Marker Colors (by category)
money_spot:       #3fd17a  (green — money)
vehicle_spawn:    #5a96ff  (blue — vehicles)
property:         #C8A84B  (gold — real estate)
heist:            #f5a623  (amber — big opportunity)
mission_start:    #FF2D6B  (pink — action)
weapon_pickup:    #e05d5d  (red — combat)
health_armor:     #3fd17a  (green — survival)
collectible:      #9aa2ab  (gray — exploration)
landmark:         #aab4bd  (light gray — discovery)
daily_location:   #f5a623  (amber — time-sensitive)

## Component Reference

### Article Card (public site)
Background: #141a22 (slight lift from page bg)
Border: 1px solid #1c222b
Radius: 12px
Tag: amber pill, mono 10px
Title: Space Grotesk 600, 16px
Excerpt: IBM Plex Sans 400, 13px, muted
On hover: border lifts to amber, 200ms

### Stat Card (public site)
Large mono number in amber
Small label below in muted
Minimal border, high contrast number

### Tier List Row
Colored tier label (S/A/B/C/D) left aligned
Item name center
Staggered Framer Motion entrance
Each tier has a distinct amber shade (S = brightest)

## Banned Defaults (Never Use)
- Fonts: Inter, Roboto, Arial
- Colors: generic purple gradients, white backgrounds
- Layouts: hero → features → pricing without design intent
- Game screenshots or Rockstar official assets
- Generic shadcn defaults without design token customization
