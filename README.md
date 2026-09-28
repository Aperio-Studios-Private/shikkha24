# Shikkha24 — Bangladesh Education News Portal

Production-grade, Bengali-first **education** news portal. Domain: **shikkha24.com**.

> 🎓 Education News | Scholarship | Admission | University | Higher Study
> 🌍 দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ
> 📚 শিক্ষার খবর, সুযোগ ও সম্ভাবনা—এক ঠিকানায়।

**Status: planning approved — PRE-BUILD. Nothing has been built yet. Do not build until the owner says "go" for S0.**

## Documentation map

| File | Purpose |
|---|---|
| `.sps/plan.md` | ✅ **THE approved implementation plan — single source of truth** |
| `.sps/profile.md` | Project identity, rules, explicit approvals/rejections, open decisions |
| `.sps/handoff.md` | Session memory: what's done, key decisions, what's next |
| `.sps/task.md` | S0→S12 task checklist with blocking gates (operative) |
| `.sps/agent.md` | SPS agent identity |
| `.sps/content-model.md` | CMS collection inventory (populated in S1) |
| `.sps/mistakes.md` | Project mistake log — do-not-repeat list |
| ~~`.sps/lock.json`~~ | ❌ **deliberately not created** — the `/sps` skill references removing it but defines no schema, so inventing one would violate rule 3. The lock is asserted through the three rule mirrors (`AGENTS.md` / `GEMINI.md` / `CLAUDE.md`). See `.sps/mistakes.md`. |
| `.sps/antigravity-export-prompt.md` | Prompt to recover planning artifacts from the prior Antigravity session |
| `.sps/third-party-audit-prompt.md` | Prompt for an independent adversarial audit (read-only, no building) |
| `AGENTS.md` / `GEMINI.md` / `CLAUDE.md` | **Mandatory agent rules** — three synced mirrors, rules 1–13 identical in all three |
| `docs/education-feature-inventory.md` | ✅ **APPROVED** — education feature inventory: 8-category tree + level filter, 10 new education features |
| `docs/education-competitors.md` | Education competitor landscape (5 groups) and where Shikkha24 can win |
| **`docs/hosting-and-deployment.md`** | **Why CI exists** (editors never touch GitHub), the deploy pipeline, both rebuild quotas, the 20,000-file ceiling, the Node.js version finding, escalation ladder |
| **`docs/performance-budget.md`** | Lighthouse/Web Vitals budgets, per-asset byte budgets, measurement method, CI gate |
| **`docs/seo-plan.md`** | Full SEO plan: per-template metadata + schema matrix, sitemaps, keyword clusters, redirects |
| **`docs/security.md`** | Threat model, attack surface, auth, headers/CSP, rate limiting, PII, supply chain, email auth |
| **`docs/reliability.md`** | Failure modes, error pages, graceful degradation, capacity/overload, monitoring, incident playbook |
| **`docs/backup-and-recovery.md`** | What is protected, backup tiers, RPO/RTO, restore runbook, DR scenarios |
| **`docs/testing-and-qa.md`** | Quality gates, test strategy, WCAG AA accessibility, browser/device matrix, Bengali render audit |
| **`docs/assets-prompt.md`** | **AI visual assets** — Google Flow prompt library for every news type. Includes the hard rule that generated images must never contain text (Bengali conjuncts garble) and the ethics red lines on real events/people |
| **`docs/image-optimization.md`** | **Image optimization** — AVIF+WebP via `<picture>`, responsive `srcset`, the `sizes` rule, zero-CLS dimensions, LCP `fetchpriority`, immutable caching. How to add new assets |
| **`docs/gpa-calculator-landscape.md`** | **GPA/CGPA calculator landscape** — every grade-calculation tool found in Bangladesh and internationally: what each calculates, how it helps students, which are worth adopting, and how `/gpa` and `/cgpa` are positioned against them |
| `docs/presentation-deck.html` | **Project presentation deck** for team/board approval — 18 slides, mobile-first, covers all aspects |
| `docs/audit-third-party.md` | Independent adversarial audit of the docs and plans (2026-09-11) + remediation status |
| `docs/data-sources.md` | Every live-data widget: provider, free-tier terms, rate limit, fallback |
| `docs/master-plan.md` | ⚠️ **OBSOLETE as a build input** — 87-feature *general-news* inventory. Reference only |
| `docs/competitive-analysis.md` | ⚠️ **OBSOLETE as a build input** — general-news competitor set. Reference only |
| `docs/stack-research.md` | Stack research notes (versions verified 2026-09-11) |
| `docs/task-checklist-original.md` | Original 198-item checklist from plan approval. Archive only |

## Status notes

- **Portal scope amended (2026-09-11):** this is an **education** portal, not a general news portal. `docs/master-plan.md` and `docs/competitive-analysis.md` were produced for a general news portal and are **retained for reference only**. A new education feature inventory, category tree and competitor set are required — see the open decisions in `.sps/profile.md`.
- **Stack versions verified** against live registries on 2026-09-11 (Astro 7.3.2, Payload 3.89.0, Tailwind 4.3.3, TS 7.0.2, Vite 8.3.0, Pagefind 1.5.2, Node 24 LTS 24.21.0, PostgreSQL 18.6, SQLite 3.53.4). **Next.js corrected to `>=16.2.6 <17.0.0`.**
- **The old Strapi-based root plan document was deleted (owner-approved 2026-09-11).** `.sps/plan.md` is the only plan. The original is preserved in git history at commit `acfb128`.
- **All four planning artifacts are present** in `docs/`: master plan (87 features), competitive analysis, stack research, original checklist.
- **Independent third-party audit completed 2026-09-11** — see `docs/audit-third-party.md`. Findings were remediated the same day.
- **Hosting/storage:** DianaHost PNR **2 GB** SSD NVMe (purchased). Frontend on `public_html`, media on host disk, CMS standalone. No Cloudflare (removed 2026-09-14). See the Hosting & Storage Architecture section of `.sps/plan.md`.

## Blocking gates before/during build

| Gate | Status |
|---|---|
| **Education feature inventory approved** (S1 entry) | ✅ 2026-09-11 — 8-category tree + level filter, 10 new education features |
| **Publishing velocity** (S1 entry) | ✅ 2026-09-11 — baseline 15–20/day + burst to 40+; 5-person team in place |
| Portal display name + logo (S2 entry) | ⏳ Domain ✅ registered; placeholder logo in place; final name + logo pending |
| Payload-on-cPanel-Passenger smoke test (S0 exit) | ⏳ Pending |
| TypeScript 7 toolchain validation (S0 exit) | ⏳ Pending |
| Astro incremental build time measured (S0 exit) | ⏳ Pending — decides the CI/batching strategy |
| `wrangler` direct upload vs the 500/month Pages quota (S0 exit) | ⏳ Pending |
| DianaHost Node.js 22/24 available via cPanel selector (S0 exit) | ⏳ Host runs **20.18.2, which is EOL** |
| DianaHost inode quota + other limits confirmed (S0 exit) | ⏳ Not published — needs a support ticket |
| ~~Cloudflare R2 enabled + usage alert set~~ | ✅ **REMOVED 2026-09-14.** No Cloudflare. |
| SQLite WAL 5-writer concurrency proven (S0 exit) | ⏳ Pending — moved from S12 |
| CI quality gates + backup automation + feature flags (S0 exit) | ⏳ Pending |

## Workflow (summary — full rules in AGENTS.md)

1. One section at a time (S0 → S12), each ending with evidence + explicit user approval.
2. Zero assumptions: ask the user; research from the internet before building with anything unfamiliar.
3. Commit immediately after every finished task.
4. Zero recurring fees; no paid services, no limited free-tier SaaS. **The owner has no international card**, so any service requiring one is unusable.
