## /sps lock
This project uses `/sps` as the master workflow.
Read `./.sps/profile.md`, `./.sps/handoff.md`, and the SPS Method Card before
building. Do not replace `/sps` with a host-default scaffolding workflow.
Build work requires an approved `./.sps/plan.md` (zero code before plan approval).
CMS-enabled sections must ship storefront + CMS controls together.
**This is an EDUCATION portal (shikkha24.com).** `docs/master-plan.md` and
`docs/competitive-analysis.md` are general-news artifacts — reference only,
never build inputs.
Each section ends with a user manual check before the next section starts.

## Agent rules (mandatory — every agent, every harness)

*(This file, `GEMINI.md` and `CLAUDE.md` carry the same numbered rules 1–13 — change all three together, in the same commit. Antigravity/Gemini-specific hardening lives only in `GEMINI.md`.)*

1. **Readable code system**
   - Code must be easy to read and understand: clear names, small single-purpose files, consistent structure.
   - Target ≤200 lines per file; split anything growing past ~300 lines.
   - Comment the "why", not the "what": JSDoc (`/** */`) on every exported function/component/type, `//` for non-obvious logic.
   - No dead code, no commented-out blocks, no TODOs without a section reference.
2. **Section-by-section, approval-gated**
   - Build strictly ONE section at a time in the approved order S0 → S12 (see `.sps/plan.md`).
   - A section is done only when its full Definition of Done passes (build, typecheck, lint, performance targets).
   - After finishing a section: STOP and request explicit user approval. Never start the next section without it. Never batch sections.
3. **Zero assumptions — ask, then learn**
   - Never assume facts, versions, APIs, prices, file contents, or requirements.
   - Anything unclear or missing → ASK the user before acting.
   - Anything unfamiliar (framework behavior, API usage, best practice) → research it from the internet BEFORE building with it, and record findings in `.sps/handoff.md`.
4. **Immediate commits**
   - After finishing ANY task (fix, doc change, section) → commit immediately with a clear message (`type(scope): summary`).
   - Never leave finished work uncommitted; never mix unrelated changes in one commit.
   - **Read-only carve-out:** when the owner puts the session into a read-only or audit mode (see `.sps/third-party-audit-prompt.md`), that mode overrides this rule — do not write or commit anything until the owner explicitly asks.
5. **Verify before claiming done**
   - Run build, typecheck, and lint; show zero-error evidence before saying a task is complete.
6. **Surgical scope**
   - Touch only files belonging to the current section/task. No drive-by refactors or unrequested extras.
7. **Budget guard**
   - Zero recurring software/platform fees beyond the approved DianaHost plan (2 GB PNR, ~$47/year) and the domain.
   - No paid third-party services; no limited free-tier SaaS for core infrastructure. Self-hosted/self-built preferred.
   - **Hard constraint: the owner has no international credit or debit card.** Every service requiring a card at signup is unusable — this includes Oracle Cloud, paid SMTP relays, paid TTS APIs, paid data APIs and paid object storage. Never propose, plan or assume one. Free public APIs are available. No Cloudflare services (removed 2026-09-14 per owner decision — all data and hosting on DianaHost only).
   - Anything with a cost requires explicit user approval first.
8. **Dependency hygiene**
   - Every new package: one-line justification, exact version pinned, license confirmed, recorded in `.sps/handoff.md`.
9. **Performance gates are part of DoD**
   - Every UI section must meet the `.sps/plan.md` targets before approval is requested: Lighthouse mobile ≥95, Lighthouse accessibility ≥90, LCP <1.5s, INP <100ms, CLS <0.02, initial payload <1.2MB, data-saver <30KB, ≥48×48px touch targets, Bengali typography ≥17px / line-height ≥1.65.
   - Lighthouse, initial payload and data-saver are **page-level** measurements. Enforce them on the page templates listed in `.sps/plan.md`; never describe them as "per feature".
   - TTFB <200ms is a hosting property. Measure it once at S12, in production, on DianaHost (no CDN) — not from S2–S11.
10. **Bengali-first**
    - All user-facing strings are Bengali (Bengali-only UI). English only in code, identifiers, and internal notes.
11. **Secrets safety**
    - Never commit keys, tokens, or credentials. Commit only `.env.example`; keep the real `.env` git-ignored.
12. **Memory discipline**
    - `.sps/` files are project memory: update `.sps/handoff.md` after every meaningful task; never rewrite plan/profile history silently — record what changed and why.
13. **Docs consistency (plan ↔ build parity)**
    - If the user asks to add or change anything that is not already covered by the docs, FIRST update the relevant docs (`.sps/plan.md`, `.sps/profile.md`, `.sps/task.md`, `.sps/handoff.md`) and commit that change, THEN implement it.
    - The build must never drift from the plan: any deviation discovered after the fact must be recorded in `.sps/handoff.md` and either reverted or approved as a plan amendment.

14. **Every requested task is tracked, and no work is forgotten**
    - `.sps/tasks.md` is the queue and the **first** document read in any session.
      Every request the owner makes gets an entry there before work starts.
    - **One task in flight at a time:** finish it, verify it, commit it, mark it
      done, then take the next. Never batch unrelated tasks into one commit.
    - **No hallucinated state.** A task closes only on evidence — command output,
      a URL's status, a CI conclusion. Never on belief.
    - **Blocked ≠ dropped.** A blocked task stays open and names what blocks it.
    - `.sps/handoff.md` is updated in the same commit as the work it describes, so
      a fresh agent with no conversation history can reconstruct what happened and
      what to do next.

## Karpathy Behavioral Block

1. **Think Before Coding** — Understand the full context before writing code
2. **Simplicity** — Prefer the simplest solution that works
3. **Surgical Changes** — Make targeted edits, not wholesale rewrites
4. **Goal-Driven Execution** — Every line serves a measurable purpose
