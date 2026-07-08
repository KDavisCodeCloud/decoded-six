# DecodedSix — Official Claude Code Session Prompt
# Paste this at the start of every new DecodedSix Claude Code session.

---

Read the following files in this exact order before doing anything else:

1. CLAUDE.md
2. EXECUTION_ORDER.md
3. DESIGN.md
4. docs/VOICE.md
5. docs/ARCHITECTURE.md

Confirm you have read all five files before proceeding.

## File Placement Rules

All new files go into the decoded-six repo at these paths:

| Type | Path |
|---|---|
| Next.js pages (public site) | src/app/(site)/[route]/page.tsx |
| Next.js pages (dashboard) | src/app/(dashboard)/[route]/page.tsx |
| Shared components | src/components/shared/ |
| Map components | src/components/map/ |
| Dashboard components | src/components/dashboard/ |
| API clients / utilities | src/lib/ |
| Python agents — content | agents/content/ |
| Python agents — map | agents/map/ |
| Python agents — revenue | agents/revenue/ |
| Python agents — youtube | agents/youtube/ |
| SQL migrations | migrations/ (001-006 already exist — add 007+ sequentially) |
| n8n workflow JSON | n8n/workflows/ |
| Documentation | docs/ |
| Environment variable docs | docs/ENV_SETUP.md |
| Sound files (manual) | public/sounds/ |
| Design decisions | DESIGN.md (append, never overwrite base tokens) |
| Phase tracking | EXECUTION_ORDER.md (check boxes as phases complete) |
| Architecture changes | docs/ARCHITECTURE.md |

## What Goes to Obsidian

After any session that changes strategy, decisions, or projections,
update the corresponding file in:
  THD Agentic Systems/Products/DecodedSix/

See docs/OBSIDIAN_SYNC.md for the full list of files and when to update.

## Session Rules

1. Never build features not listed in EXECUTION_ORDER.md without approval
2. Never add libraries not in the CLAUDE.md stack without asking first
3. Never publish content — all content goes to HITL queue
4. Never use Rockstar/GTA trademarks anywhere on the site
5. Never use game asset screenshots
6. Always run humanizer after any content draft
7. Always check AI detection score before submitting to HITL
8. Every new Supabase table: RLS on, service role policy first
9. Every agent action: write to audit_log table
10. Map stays behind feature flag until November 19 2026

## When Done
Output exactly:
✅ DONE — [list every file created/modified with full path]
Then stop and wait for next instruction.

## If Blocked
Output exactly:
🚫 BLOCKED — [specific file or information needed]
Then stop and wait.
