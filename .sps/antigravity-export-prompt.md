# Prompt for Antigravity — export planning artifacts to this repo

Copy the block below into the Antigravity session that ran the original `/sps` discovery for this project.

---

You previously ran `/sps` discovery and planning for this project (Bangladesh Bengali news portal; stack Astro 7.3 + Payload CMS 3; plan approved 2026-09-11T20:41+06:00). Your conversation holds planning artifacts that were never written to disk. Export them now, as files, verbatim.

**STRICT RULES:**
- Export ONLY. Do not build, scaffold, install dependencies, or modify any code.
- Do not modify anything in `.sps/` except the single handoff line requested below.
- Do not summarize, shorten, or "improve" the content — write the artifacts out IN FULL.
- Zero assumptions: if an artifact does not exist in your conversation, write `# NOT AVAILABLE — artifact missing from session` in the target file instead of inventing content.
- If anything is ambiguous, ask before writing.

**Write these files at the repository root:**

1. `docs/master-plan.md` — the full master plan (v3): the complete 87+ feature inventory grouped by its 8 categories, the 10 unique innovations with full descriptions, and any feature-priority notes. Include everything.
2. `docs/competitive-analysis.md` — the full competitive analysis: per-portal findings for all 15+ portals analyzed (Prothom Alo, bdnews24, The Daily Star, Samakal, Jugantor, Kaler Kantho, Jago News 24, Bangla Tribune, Ittefaq, BBC, The Guardian, Al Jazeera, CNN, NYT, NHK, NDTV) — strengths, weaknesses, and missing features observed.
3. `docs/stack-research.md` — the Sep 2026 stack research notes (Astro 7, Payload CMS 3, Tailwind 4.3, TypeScript 7, Node 24, Pagefind, Listmonk): what was checked, sources, and any caveats found.
4. `docs/task-checklist-original.md` — the original task checklist you created at plan approval (for reconciliation only; `.sps/task.md` already exists — do NOT overwrite it).
5. Append exactly ONE line to the end of the numbered "Completed" list in `.sps/handoff.md`, using the next number:
   `✅ Artifacts exported from Antigravity to docs/ (master plan, competitive analysis, stack research, original checklist)`

When done: list every file you wrote with its size, then commit immediately: `docs: export planning artifacts from Antigravity session`.
