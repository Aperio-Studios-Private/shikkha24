# NewPortal — Bangladesh Bengali News Portal

Production-grade, Bengali-first news portal. **Status: planning approved — PRE-BUILD. Nothing has been built yet; do not build until the user says "go" for S0.**

## Documentation map

| File | Purpose |
|---|---|
| `.sps/plan.md` | ✅ **THE approved implementation plan — single source of truth** |
| `.sps/profile.md` | Project identity, rules, explicit approvals/rejections |
| `.sps/handoff.md` | Session memory: what's done, key decisions, what's next |
| `.sps/task.md` | S0→S12 task checklist with blocking gates |
| `.sps/agent.md` | SPS agent identity |
| `.sps/antigravity-export-prompt.md` | Prompt to recover planning artifacts from the prior Antigravity session |
| `.sps/third-party-audit-prompt.md` | Prompt for an independent adversarial audit of docs & plans (read-only, no building) |
| `AGENTS.md` / `GEMINI.md` | **Mandatory agent rules** (synced mirrors — read before any task) |
| `docs/` | Exported planning artifacts: master plan (87 features), competitive analysis, stack research, original checklist |

## Status notes

- **Stack versions verified** against live registries on 2026-09-11 (Astro 7.3.2, Payload 3.89.0, Tailwind 4.3.3, TS 7.0.2, Vite 8.3.0, Pagefind 1.5.2, Node 24 LTS, PostgreSQL 18.6, SQLite 3.53.4, Listmonk 6.2.0).
- The old Strapi-based root plan document was **deleted (user-approved 2026-09-11)** — `.sps/plan.md` is the only plan. The original is preserved in git history (baseline commit).
- **Master plan received** (2026-09-11): `docs/master-plan.md` — 87 numbered features, 10 innovations, competitive intel (exported from Antigravity). Still awaiting: competitive-analysis & stack-research exports — prompt at `.sps/antigravity-export-prompt.md`.
- Blocking gates before/during build: Antigravity artifact export (S1 entry), portal name + logo + domain (S2 entry), Payload-on-cPanel-Passenger smoke test + TS 7 toolchain validation (S0 exit).

## Workflow (summary — full rules in AGENTS.md)

1. One section at a time (S0 → S12), each ending with evidence + explicit user approval.
2. Zero assumptions: ask the user; research from the internet before building with anything unfamiliar.
3. Commit immediately after every finished task.
4. Zero recurring fees; no paid services, no limited free-tier SaaS — self-hosted/self-built preferred.
