# DecodedSix — Obsidian Sync Guide

## Vault Location
THD Agentic Systems/Products/DecodedSix/

## Files in This Vault Folder
DecodedSix Master Reference.md  — single source of truth overview
Architecture.md                 — mirrors docs/ARCHITECTURE.md
Content Voice File.md           — mirrors docs/VOICE.md
Gate System.md                  — mirrors docs/GATES.md
Affiliate Registry.md           — mirrors docs/AFFILIATE.md
YouTube Strategy.md             — YouTube system spec and projections
Revenue Projections.md          — full revenue model
Map Specification.md            — interactive map full spec
Agent Roster.md                 — mirrors docs/AGENTS.md
Dashboard Design.md             — GTA dashboard design spec
Launch Checklist.md             — mirrors EXECUTION_ORDER.md

## When to Update Obsidian
After any session that changes strategy or decisions:
1. Update the relevant Obsidian file
2. Update DecodedSix Master Reference.md if the change is significant
3. Update EXECUTION_ORDER.md in repo to match

After any gate is cleared:
1. Update Gate System.md status
2. Update Revenue Projections.md if projections change
3. Update Launch Checklist.md checkbox

## What Obsidian Does NOT Contain
- Application code (lives in repo only)
- SQL migrations (lives in repo only)
- Environment variables (lives in .env.local only)
- Design tokens (lives in DESIGN.md in repo)

## Link Structure
Each Obsidian file uses [[WikiLink]] format to connect to related files.
Example in Master Reference:
  → [[Agent Roster]]
  → [[Gate System]]
  → [[YouTube Strategy]]
