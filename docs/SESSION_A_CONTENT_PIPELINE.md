# Session A — Content Pipeline Agents (Phase 3)

Paste this prompt into Claude Code from `/mnt/c/Users/Kelvin/projects/decoded-six`.
Walk away — no input needed.

---

Read CLAUDE.md, EXECUTION_ORDER.md, docs/ARCHITECTURE.md in that order.

Build Phase 3 — Content Pipeline agents. All files go in src/agents/content/.

Agents to build (all use claude-sonnet-4-6, all write to audit_log):

1. ds_draft.py — DS-DRAFT
   - Takes a topic string + category (news/rumor/guide/event)
   - DataSanitizationShield strips PII before any LLM call
   - Calls Anthropic API with voice rules from .claude/product-marketing-context.md
   - Returns: {title, excerpt, content, slug, category}
   - Inserts row into articles table (status='draft', agent_generated=true)
   - Writes audit_log entry on success and failure

2. ds_humanizer.py — DS-HUM
   - Takes article_id
   - Reads the draft from articles table
   - Applies humanizer pass (10 VOICE.md rules — no AI tells, no em dashes, etc.)
   - Updates articles.content in place
   - Writes audit_log entry

3. ds_detect.py — DS-DETECT
   - Takes article_id
   - Placeholder implementation: logs that Originality.ai key is needed
   - Reads ORIGINALITY_API_KEY from os.getenv()
   - If key present: calls Originality.ai API, stores score in articles metadata
   - If score > 30%: flags article for manual review, does NOT advance to HITL queue
   - Writes audit_log entry with score

4. ds_copyright.py — DS-COPYRIGHT
   - Takes article_id
   - Checks title + content for: "Rockstar", "GTA®", "Grand Theft Auto®", and a list of 20 trademark phrases
   - Uses regex — no LLM call needed
   - Flags article if any match found
   - Writes audit_log entry

5. pipeline.py — orchestrator
   - Runs DRAFT → HUM → DETECT → COPYRIGHT in sequence
   - Stops pipeline if any stage fails
   - Returns final article_id and status
   - Uses try/except on each stage, writes audit_log on each failure
   - Runs as: python -m src.agents.content.pipeline --topic "..." --category news

Environment: reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, ORIGINALITY_API_KEY from os.getenv(). No hardcoded values.

Create src/agents/__init__.py and src/agents/content/__init__.py.
Create requirements-agents.txt with: anthropic, supabase, python-dotenv, requests, python-slugify.

Run: python -c "from src.agents.content.pipeline import run_pipeline; print('OK')" to verify no import errors.

Output ✅ DONE or 🚫 BLOCKED then stop.
