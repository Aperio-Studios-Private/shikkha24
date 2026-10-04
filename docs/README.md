# Documentation Index — Shikkha24

**Created:** 2026-10-04 · **Status:** the entry point for this directory.
**Last full audit:** 2026-10-04, immediately after the first production deploy.

If you are an agent or a new contributor and you are about to change something about deployment,
read these three files in this order:

1. **`deployment-runbook.md`** — how the site is actually deployed, and how not to break it
2. **`hosting-and-deployment.md`** — why it works this way, and what is *not* automated
3. **`cms-deployment.md`** — the CMS, which ships far less often

---

## Status labels used in this index

| Label | Meaning |
|---|---|
| ✅ **LIVE** | Describes the current, deployed reality. Trust it. |
| ⚠️ **STALE** | Still useful, but contains a claim that the 2026-10-04 deploy proved wrong. |
| 📦 **REFERENCE** | Deliberately **not** a build input. Read only for background. |

⚠️ **Nothing in this repository is auto-generated.** If a document disagrees with
`deployment-runbook.md`, the runbook is right and the other document is a bug — fix it.

---

## Start here

| Document | Status | What it is for |
|---|---|---|
| **`deployment-runbook.md`** | ✅ LIVE | The day-to-day deploy. Frontend by hand, CMS updates, seeding, verification, and the traps that have each cost a failed deploy. |
| **`hosting-and-deployment.md`** | ✅ LIVE | Why CI exists, the real pipeline, the cPanel API mechanism, quotas, and the unresolved Node-version question. |
| **`cms-deployment.md`** | ✅ LIVE | Full first-time CMS setup: subdomain, Node app, standalone bundle, schema bootstrap, seeding, updates. |

## Operations and incident response

| Document | Status | What it is for |
|---|---|---|
| `reliability.md` | ⚠️ STALE | Failure modes, error pages, restart procedure, incident playbook. Still the best incident doc; check its deploy claims against the runbook. |
| `backup-and-recovery.md` | ✅ LIVE | The daily dump, restore runbook, RPO/RTO, DR scenarios. |
| `dianahost-provisioning-checklist.md` | ⚠️ STALE | What to obtain from DianaHost, in dependency order. Its Node-version conclusion is disputed — see `hosting-and-deployment.md` §5. |

## Quality and correctness

| Document | Status | What it is for |
|---|---|---|
| `testing-and-qa.md` | ✅ LIVE | Quality gates, test strategy, WCAG AA, browser matrix, Bengali render audit. |
| `performance-budget.md` | ✅ LIVE | Lighthouse/Web Vitals budgets, per-asset byte budgets, the CI gate. |
| `image-optimization.md` | ✅ LIVE | AVIF/WebP via `<picture>`, `srcset`, zero-CLS dimensions, LCP `fetchpriority`. |
| `qa-deploy-status-2026-10-02.md` | 📦 REFERENCE | A point-in-time QA sweep from 2026-10-02. Superseded by this index and by `.sps/handoff.md`. |
| `security-audit-2026-10-01.md` | 📦 REFERENCE | A point-in-time security audit from 2026-10-01. |

## Security

| Document | Status | What it is for |
|---|---|---|
| `security.md` | ⚠️ STALE | Threat model, attack surface, auth, headers/CSP, rate limiting, PII, supply chain. **Its "largest unmitigated issue is Node 20 being EOL" claim is now disputed** — see `hosting-and-deployment.md` §5. |
| `audit-third-party.md` | 📦 REFERENCE | Independent adversarial audit of the docs (2026-09-11) + remediation status. |

## Product and content

| Document | Status | What it is for |
|---|---|---|
| `education-feature-inventory.md` | ✅ LIVE | ✅ APPROVED — the 8-category tree, level filter, 10 education features. |
| `education-competitors.md` | ✅ LIVE | Education competitor landscape and where Shikkha24 can win. |
| `feature-register.md` | ✅ LIVE | Every feature, with status. |
| `feature-batch-2.md` | ✅ LIVE | The second feature batch. |
| `seo-plan.md` | ✅ LIVE | Per-template metadata, schema matrix, sitemaps, keyword clusters. |
| `university-directory.md` | ✅ LIVE | 📋 PROPOSED, awaiting approval — the university directory spec. |
| `gpa-calculator-landscape.md` | ✅ LIVE | Every grade-calculation tool found, and where `/gpa` and `/cgpa` sit. |
| `data-sources.md` | ✅ LIVE | Every live-data widget: provider, free-tier terms, rate limits, fallbacks. |
| `assets-prompt.md` | ✅ LIVE | AI visual-asset prompt library. Never put text in generated images. |

## Reference — not build inputs

⚠️ These were written for a **general-news** portal, before the project became an education
portal. They are retained for background only. **Building from them will build the wrong product.**

| Document | Status | Note |
|---|---|---|
| `master-plan.md` | 📦 REFERENCE | 87-feature *general-news* inventory. Never a build input. |
| `competitive-analysis.md` | 📦 REFERENCE | General-news competitor set. Never a build input. |
| `task-checklist-original.md` | 📦 REFERENCE | The original 198-item checklist from plan approval. |
| `team-leader-proposal-review.md` | 📦 REFERENCE | Proposal review for the team. |
| `stack-research.md` | ✅ LIVE | Stack versions verified 2026-09-11. Re-verify before relying on a version. |
| `presentation-deck.html` | 📦 REFERENCE | The 18-slide deck for team/board approval. |
| `presentation-deck.html` assets | — | see `docs/assets/` |

---

## Project memory (`.sps/`, outside this directory)

`.sps/` is the workflow's own memory and follows the `/sps` rules in `CLAUDE.md`.

| File | Purpose |
|---|---|
| `.sps/plan.md` | **the approved implementation plan — single source of truth** |
| `.sps/profile.md` | project identity, rules, approvals, rejections, open decisions |
| `.sps/task.md` | the S0→S12 checklist with blocking gates |
| `.sps/handoff.md` | current state and session memory (older entries are rotated to `.sps/handoff-archive/`) |
| `.sps/mistakes.md` | the do-not-repeat list |
| `.sps/content-model.md` | CMS collection inventory |
| `.sps/agent.md` | the `/sps` agent identity |
| `.sps/deployment-readiness.md` | owner-action checklist |
| `.sps/cloudflare-removal-plan.md` | the 2026-09-14 Cloudflare removal |

---

## The three claims that were wrong for the longest time

Recorded because they are the kind of thing that is confidently repeated until someone tests it.

1. **"The site deploys over SSH / rsync."** DianaHost has no SSH. `deploy.yml` ended in `rsync`
   and `scp` and had therefore **never worked**, despite being written months earlier.
2. **"Pushing to GitHub deploys the site."** `deploy.yml` has **no `push:` trigger**. Its triggers
   are `repository_dispatch` and `workflow_dispatch` only.
3. **"The host runs Node 20.18.2, end-of-life."** Nine documents say this. The live app runs under
   `nodevenv/shikkha24-cms/**24**/`, which suggests Node 24. **Still unconfirmed** — see
   `hosting-and-deployment.md` §5 for the one command that settles it.

---

## Keeping this index honest

If you change how the site deploys, update **in this order**:

1. `deployment-runbook.md` — the procedure
2. `hosting-and-deployment.md` — the reasoning and the automation status
3. `.sps/handoff.md` — what changed and why
4. this index, if a status label changed

Then commit. CLAUDE.md rule 13 requires the docs to be updated **before** the implementation, not
after.