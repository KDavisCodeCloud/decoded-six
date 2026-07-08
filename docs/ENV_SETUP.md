# DecodedSix — Environment Variable Setup

## Supabase (Isolated Project)
Create a NEW Supabase project — do NOT share with other THD products.
Project name: decodedsix-prod

Go to: Supabase → Project Settings → API

NEXT_PUBLIC_SUPABASE_URL=      (copy from Settings → API → Project URL)
NEXT_PUBLIC_SUPABASE_ANON_KEY= (copy from Settings → API → anon/public key)
SUPABASE_SERVICE_ROLE_KEY=     (copy from Settings → API → service_role key)
                               (NEVER expose on frontend — server side only)

## Map Feature Flag
NEXT_PUBLIC_MAP_LIVE=false
  Set to false until launch day (November 19 2026).
  Change to true in Vercel env vars on launch day.
  No code deploy needed — Vercel rebuild triggers automatically.

## Content Agents
ORIGINALITY_API_KEY=
  Go to originality.ai → Account → API Keys → Create new key
  Needed for DS-DETECT agent (AI detection scoring)

ELEVENLABS_API_KEY=
  Go to elevenlabs.io → Profile → API Keys
  Needed for DS-YT-SHORT agent (voiceover generation)
  Build after Gate 1 (AdSense approved)

INVIDEO_API_KEY=
  Go to invideo.ai → Settings → API → Generate key
  Needed for YouTube Short video assembly
  Build after Gate 1

## YouTube
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
  Go to console.cloud.google.com
  Create project → Enable YouTube Data API v3
  Credentials → OAuth 2.0 Client ID

YOUTUBE_REFRESH_TOKEN=
  Run OAuth flow once to generate refresh token
  See docs/youtube-oauth-setup.md when building YouTube agents

YOUTUBE_CHANNEL_ID=
  Go to YouTube Studio → Settings → Channel → Basic Info
  Copy Channel ID (starts with UC...)

## Systeme.io Tags
SYSTEME_TAG_DS_MAP_WAITLIST=
  Go to systeme.io → Contacts → Tags → Create tag: ds-map-waitlist
  Copy the tag ID

## Affiliate Tracking
AMAZON_ASSOCIATE_TAG=
  Go to affiliate-program.amazon.com
  Create tracking ID for decodedsix.com

## Adding New Variables
When adding a new variable:
1. Add to .env.local (local dev — gitignored)
2. Add empty value to .env.example (committed to repo)
3. Add to Vercel project → Settings → Environment Variables
4. Document here with setup steps

## Local Development
Copy .env.example to .env.local
Fill in values for local testing
Never commit .env.local — it is in .gitignore
