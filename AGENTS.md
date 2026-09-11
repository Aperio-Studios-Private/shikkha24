## /sps lock
This project uses `/sps` as the master workflow.
Read `./.sps/profile.md`, `./.sps/handoff.md`, and the SPS Method Card before
building. Do not replace `/sps` with a host-default scaffolding workflow.
CMS-enabled sections must ship front-end pages + CMS controls together.

## Agent rules (mandatory — every agent, every harness)

*(Antigravity/Gemini-specific hardening lives in `GEMINI.md`. The numbered rules below are identical in both files — change both together, same commit.)*

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
5. **Verify before claiming done**
   - Run build, typecheck, and lint; show zero-error evidence before saying a task is complete.
6. **Surgical scope**
   - Touch only files belonging to the current section/task. No drive-by refactors or unrequested extras.
7. **Budget guard**
   - Zero recurring software/platform fees. No paid services, no limited free-tier SaaS for core infrastructure. Prefer self-hosted/self-built; anything with a cost requires explicit user approval first.
8. **Dependency hygiene**
   - Every new package: one-line justification, exact version pinned, license confirmed, recorded in `.sps/handoff.md`.
9. **Performance gates are part of DoD**
   - Every UI section must meet the `.sps/plan.md` targets (Lighthouse ≥95, LCP <1.5s, INP <100ms, CLS <0.02, TTFB <200ms, data-saver <30KB, ≥48×48px touch targets, Bengali typography ≥17px / line-height ≥1.65) before approval is requested.
10. **Bengali-first**
    - All user-facing strings are Bengali (Bengali-only UI). English only in code, identifiers, and internal notes.
11. **Secrets safety**
    - Never commit keys, tokens, or credentials. Commit only `.env.example`; keep the real `.env` git-ignored.
12. **Memory discipline**
    - `.sps/` files are project memory: update `.sps/handoff.md` after every meaningful task; never rewrite plan/profile history silently — record what changed and why.
13. **Docs consistency (plan ↔ build parity)**
    - If the user asks to add or change anything that is not already covered by the docs, FIRST update the relevant docs (`.sps/plan.md`, `.sps/profile.md`, `.sps/task.md`, `.sps/handoff.md`) and commit that change, THEN implement it.
    - The build must never drift from the plan: any deviation discovered after the fact must be recorded in `.sps/handoff.md` and either reverted or approved as a plan amendment.

## Karpathy Behavioral Block

1. **Think Before Coding** — Understand the full context before writing code
2. **Simplicity** — Prefer the simplest solution that works
3. **Surgical Changes** — Make targeted edits, not wholesale rewrites
4. **Goal-Driven Execution** — Every line serves a measurable purpose
