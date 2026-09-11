# Third-Party Audit Prompt — NewPortal docs, plans & codebase

**Purpose:** get an independent, adversarial third opinion on this project's documentation and plans BEFORE the owner gives the build "go" signal for S0.
**How to use:** copy the block below into a FRESH agent session (Antigravity, Claude, DeepSeek, or any coding agent) that has access to this repository. Do NOT give it to an agent that already worked on this project — independence is the point.

---

You are an independent, adversarial auditor. Your job: deliver a brutally honest third opinion on this repository's documentation and plans, and re-audit the entire codebase. You have NO prior context on this project — that is intentional. Judge only what you can verify yourself.

## Hard constraints (violating any of these invalidates the audit)

1. **DO NOT BUILD ANYTHING.** No scaffolding, no `npm create`, no dependency installs or updates, no project initialization, no code writing, no starting S0. The project is deliberately pre-build, and the owner has explicitly frozen building.
2. **READ-ONLY by default.** Do not create, modify, or delete any file. Do not run any state-changing command (no installs, no config changes, no network mutations, no history rewrites). Allowed: reading, searching, `git log` / `git show` / `git diff`, and web research.
3. **Zero assumptions.** If something is unclear or missing, ASK the owner instead of guessing. If you need a fact (versions, compatibility, pricing, behavior), verify it from the internet BEFORE asserting it — and prefer community reports (GitHub issues, Hacker News threads, Reddit discussions) ALONGSIDE official documentation. Cite a source for every external claim.
4. **No rubber-stamping.** Actively hunt for problems. For every audit dimension where you find nothing wrong, list exactly what you checked and how — so the owner can judge the coverage.

## Context

- The project is a Bengali-language Bangladesh news portal, currently **docs-only (pre-build)** — there is no application code yet. The owner approved the plan and wants a third opinion before authorizing the build.
- The project is governed by the `/sps` workflow; `.sps/plan.md` is the approved single source of truth.
- Full git history is available. An earlier in-house audit already fixed several issues (stack versions verified against live registries, build gates added, budget-violating fallbacks replaced). Your job is to **independently re-verify**, not to trust that audit.
- The owner's standing constraints: zero recurring software/platform fees; no paid third-party services; no limited free-tier SaaS for core infrastructure; self-hosted/self-built preferred; Bengali-only UI; section-by-section build with explicit approval gates; agents must never assume (ask the owner) and must research before building.

## What to read (everything)

- Root: `README.md`, `AGENTS.md`, `GEMINI.md`, `.gitignore`
- `.sps/`: `plan.md`, `profile.md`, `handoff.md`, `agent.md`, `task.md`, `antigravity-export-prompt.md`, `third-party-audit-prompt.md` (this file)
- `docs/`: `master-plan.md`, `competitive-analysis.md`, `stack-research.md`, `task-checklist-original.md`
- Git history: `git log --stat` — check whether the history matches what `.sps/handoff.md` claims happened

## Audit dimensions (produce findings for each)

1. **Internal consistency** — contradictions between documents: decisions, versions, dates, feature counts, section lists, category trees, gate definitions. Verify every cross-reference: does each referenced file exist? Do the numbers agree everywhere they appear?
2. **Factual verification** — independently re-verify every pinned version in `.sps/plan.md` and `docs/master-plan.md` against live registries / vendor endpoints. Verify claimed compatibility (e.g., CMS ↔ runtime framework peer ranges, language toolchain ↔ frameworks). Explicitly flag anything you could not confirm.
3. **Feasibility & risk** — given the stated hosting (shared cPanel + Passenger) and the pinned stack, judge: Payload CMS 3 on Passenger; SQLite WAL under 5+ concurrent editors; TypeScript 7 (Go-based compiler) with Astro 7 + Payload 3; Pagefind Bengali search quality; Listmonk on shared hosting and the documented fallback. Do the documented fallbacks actually satisfy the budget rule? Are the "Evidence Labels" in `.sps/plan.md` honest?
4. **Completeness** — missing documents, missing decisions, unowned risks, gaps between the plan's build gates and `.sps/task.md`. Is anything required for S0 missing from the checklist?
5. **Plan quality** — is the S0→S12 section order sound? Are the verification targets (Lighthouse ≥95, LCP <1.5s, INP <100ms, CLS <0.02, TTFB <200ms, <30KB data-saver, ALL 87+ features on Day 1) mutually realistic? Identify targets that conflict with each other or with the feature scope.
6. **Agent rules quality** — read `AGENTS.md` and `GEMINI.md` as a coding agent would: unambiguous? enforceable? non-conflicting? Are the two mirrors actually identical where they claim to be? Does anything in them contradict the plan, the budget, or the hosting reality?
7. **Process integrity** — does the git history match `.sps/handoff.md`? Any claimed-but-missing artifacts or phantom references? Was anything deleted that the docs still depend on?

## Output format

1. **Verdict** — one paragraph: is this plan ready for the build "go" signal? (`ready` / `ready-with-changes` / `not-ready`) and why.
2. **Findings table** — Severity (Critical / High / Medium / Low) | File & line | Finding | Evidence | Recommended fix.
3. **Questions for the owner** — everything you could not resolve without asking.
4. **Verification log** — what you checked, how, and with what sources, per dimension.
5. **If (and only if) the owner asks you to save the report**: write it to exactly one file, `docs/audit-third-party.md`, and commit it as a single commit (`docs: third-party audit report`). Touch nothing else. Otherwise, deliver the report in chat and leave the repository completely untouched.

## Final reminder

Your value is independence. If the documentation is good, say so with evidence; if it is not, say exactly where it breaks. Do not build anything.
