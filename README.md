# Shikkha24 — Bangladesh Education News Portal

Production-grade, Bengali-first **education** news portal. Domain: **shikkha24.com**.

> 🎓 Education News | Scholarship | Admission | University | Higher Study
> 🌍 দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ
> 📚 শিক্ষার খবর, সুযোগ ও সম্ভাবনা—এক ঠিকানায়।

**Status: LIVE — deployed to production 2026-10-04.** The frontend and the CMS are both running on
DianaHost; the Payload admin is at `https://cms.shikkha24.com/admin`. See
**[`docs/deployment-runbook.md`](docs/deployment-runbook.md)** for how it is deployed and maintained.

> ⚠️ **The deployment is not fully automated.** Pushing to GitHub does **not** deploy the site.
> `docs/hosting-and-deployment.md` §4 explains why, in detail, and what is being built instead.

See `.sps/task.md` for the section checklist and `.sps/handoff.md` for the current state.

> 📚 **New here?** Start at **[`docs/README.md`](docs/README.md)** — the index of every document and
> whether it is current.

> 🔐 **Deploying? Read [Secrets — read this before deploying](#secrets--read-this-before-deploying) first.**
> Three values were previously hardcoded in source and are still recoverable from git
> history; one of them means `PAYLOAD_SECRET` should be rotated before you go live.

## Documentation map

📚 **[`docs/README.md`](docs/README.md) is the full index** — every document with a CURRENT /
STALE / REFERENCE label. The most important three:

| File | Purpose |
|---|---|
| **`docs/deployment-runbook.md`** | 🔴 **START HERE.** How the site is deployed, updated, verified, and seeded — and the traps that have each caused a failed deploy |
| **`docs/hosting-and-deployment.md`** | Why CI exists, the real pipeline, the cPanel API, quotas, and the unresolved Node-version question |
| **`docs/cms-deployment.md`** | The CMS: subdomain, Node app, standalone bundle, schema bootstrap, updates |

Everything else:

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
| **`docs/performance-budget.md`** | Lighthouse/Web Vitals budgets, per-asset byte budgets, measurement method, CI gate |
| **`docs/seo-plan.md`** | Full SEO plan: per-template metadata + schema matrix, sitemaps, keyword clusters, redirects |
| **`docs/security.md`** | Threat model, attack surface, auth, headers/CSP, rate limiting, PII, supply chain, email auth |
| **`docs/reliability.md`** | Failure modes, error pages, graceful degradation, capacity/overload, monitoring, incident playbook |
| **`docs/backup-and-recovery.md`** | What is protected, backup tiers, RPO/RTO, restore runbook, DR scenarios |
| **`docs/backup-card.md`** | **The plain-English one-pager: is it working, what do I do, how do I restore** |
| **`docs/testing-and-qa.md`** | Quality gates, test strategy, WCAG AA accessibility, browser/device matrix, Bengali render audit |
| **`docs/feature-register.md`** | Every feature with its status |
| **`docs/feature-batch-2.md`** | The second feature batch |
| **`docs/education-feature-inventory.md`** | ✅ **APPROVED** — education feature inventory: 8-category tree + level filter, 10 new education features |
| **`docs/education-competitors.md`** | Education competitor landscape (5 groups) and where Shikkha24 can win |
| **`docs/assets-prompt.md`** | **AI visual assets** — prompt library for every news type. Includes the hard rule that generated images must never contain text (Bengali conjuncts garble) and the ethics red lines on real events/people |
| **`docs/image-optimization.md`** | **Image optimization** — AVIF+WebP via `<picture>`, responsive `srcset`, the `sizes` rule, zero-CLS dimensions, LCP `fetchpriority`, immutable caching. How to add new assets |
| **`docs/gpa-calculator-landscape.md`** | **GPA/CGPA calculator landscape** — every grade-calculation tool found in Bangladesh and internationally: what each calculates, how it helps students, which are worth adopting, and how `/gpa` and `/cgpa` are positioned against them |
| **`docs/university-directory.md`** | 📋 **PROPOSED — awaiting approval.** University directory spec: what already exists (S10's N4), the measured data survey of four candidate sources, and why "all 2,274 NU colleges" is not achievable on a Bengali-only site |
| `docs/dianahost-provisioning-checklist.md` | What to obtain from DianaHost, in dependency order |
| `docs/data-sources.md` | Every live-data widget: provider, free-tier terms, rate limit, fallback |
| `docs/stack-research.md` | Stack research notes (versions verified 2026-09-11) |
| `docs/audit-third-party.md` | Independent adversarial audit of the docs and plans (2026-09-11) + remediation status |
| `docs/qa-deploy-status-2026-10-02.md` | 📦 Point-in-time QA sweep, superseded by `docs/README.md` |
| `docs/security-audit-2026-10-01.md` | 📦 Point-in-time security audit |
| `docs/presentation-deck.html` | **Project presentation deck** for team/board approval — 18 slides, mobile-first |
| `docs/master-plan.md` | ⚠️ **OBSOLETE as a build input** — 87-feature *general-news* inventory. Reference only |
| `docs/competitive-analysis.md` | ⚠️ **OBSOLETE as a build input** — general-news competitor set. Reference only |
| `docs/task-checklist-original.md` | Original 198-item checklist from plan approval. Archive only |
| `docs/team-leader-proposal-review.md` | Proposal review for the team. Archive only |

## Secrets — read this before deploying

**No secret is committed to this repository.** Every credential is read from an
environment variable at runtime; `.env` is git-ignored (root `.gitignore` plus a
per-workspace copy) and only `.env.example` is tracked. `cms/.env.example` and
`frontend/.env.example` list every variable the code reads, with placeholders.

### ⚠️ Rotate these if you deployed from a commit before 2026-10-01

Three values were previously **hardcoded in source** and remain recoverable from
git history. They have been removed from the working tree — but **removing them
does not un-publish them**, and anyone who cloned this repository before that date
has them.

| Was hardcoded | Where it was | What to do |
|---|---|---|
| `'shikkha24-reactions'` | `cms/src/lib/reactions.ts` — the fallback HMAC key for the reaction-dedupe fingerprint | **Rotate `PAYLOAD_SECRET`.** If any deployment ever started with it unset, every fingerprint from that period was keyed with a published constant, so reaction counts could have been forged by anyone who read the source. |
| `'shikkha24-poll'` | `cms/src/endpoints/poll-vote.ts` — the same fallback, for the poll duplicate-vote guard | Same rotation. Poll tallies recorded in such a period are not trustworthy. |
| `'Verify-admin-1234'`, `'Verify-rep-1234'` | `cms/src/verify/reporter.ts` — passwords for harness fixtures, **one of them a superAdmin** | **Search every database a harness has ever run against for leftover `verify-*@example.test` users and delete them.** They are now created with a random per-run password, but an old crashed run may have left a live admin account. |

⚠️ **`PAYLOAD_SECRET` is the one that matters.** It signs reader sessions, OAuth
state, reaction fingerprints and poll-voter hashes. Rotating it invalidates every
outstanding reader session — which is the intended effect, not a side effect.

⚠️ **Rotating `PAYLOAD_SECRET` also changes every stored fingerprint and voter
hash.** Old `reactions` and `poll-votes` rows keep their old hashes, so a reader
may be able to react once more to an article they had already reacted to. That is
harmless, and it is the correct trade against a forgeable key.

### The rules this repository follows

- A required secret is read through a helper that **throws when it is missing** —
  `requireEnv()` in `cms/src/payload.config.ts`, `requirePayloadSecret()` in
  `cms/src/lib/signed-token.ts`. There is deliberately **no fallback value**: a
  predictable default is worse than a process that refuses to start.
- **Astro exposes only `PUBLIC_`-prefixed variables to the browser.** Nothing
  secret may use that prefix. `NEXT_PUBLIC_` and `REACT_APP_` appear **nowhere**
  in this project — if you see one, it is a leftover and should be deleted.
- Harness fixtures use obvious throwaways (`verify-*@example.test`) and are
  created and deleted inside a single run. They must never be given a password
  that would work outside it.
- `.env.example` is the only env file that may be committed, and it must contain
  **placeholders only** — never a real value, not even a rotated one.

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
| **Payload-on-cPanel-Passenger smoke test** (S0 exit) | ✅ **2026-10-04** — CMS live at `cms.shikkha24.com`, admin renders, 74 tables, 200s response |
| **TypeScript 7 toolchain validation** (S0 exit) | ✅ Typecheck passes in CI for both frontend and CMS |
| **Astro build time measured** (S0 exit) | ✅ **2026-10-04** — full clean build **7.71 s**, ~156 pages, 3.8 MB |
| **Deployment to production** | ✅ **2026-10-04** — frontend and CMS both live; see `docs/deployment-runbook.md` |
| Portal display name + logo (S2 entry) | ⏳ Domain ✅ registered; placeholder logo in place; final name + logo pending |
| ~~`wrangler` direct upload vs the Pages quota~~ | ✅ **MOOT.** Cloudflare removed 2026-09-14 |
| **DianaHost Node.js version** (S0 exit) | ⚠️ **DISPUTED.** Nine docs say 20.18.2 (EOL); the live app runs under `nodevenv/shikkha24-cms/**24**/`, implying Node 24. **One command settles it** — `node -v` in the cPanel Terminal. See `docs/hosting-and-deployment.md` §5 |
| **Auto-deploy** | ✅ **Built 2026-10-04, not yet run live.** `deploy.yml` ships over the cPanel HTTPS API — the host refuses SSH, so rsync was never possible. **A push to `main` and an editor publish both trigger it**, frontend only; the CMS stays manual because extracting over the app dir can break `/admin`. **Dry run is the default** — set `AUTO_DEPLOY=live` to publish. No deploy can touch the database: `data/` and `.env` are excluded from the bundle and the build fails if either appears. Counter-proved by `verify:cpanel-deploy` (40) and `verify:deploy-mode` (47). See `docs/hosting-and-deployment.md` §4.2 |
| DianaHost inode quota + other limits confirmed (S0 exit) | ⏳ Not published — needs a support ticket |
| SQLite WAL 5-writer concurrency proven (S0 exit) | ✅ `verify:sqlite-wal` harness passes |
| CI quality gates + feature flags (S0 exit) | ✅ Gates in `ci.yml` |
| **Automated backup** (S0 exit) | 🟡 **Automation built 2026-10-04, not yet running.** The `ssh`/`scp` workflow (6 runs, 6 failures) was replaced by a host-cron snapshot + **FTPS** fetch — port 21 is open, which an earlier doc wrongly said it was not. `pnpm verify:backup` counter-proves the gate with 47 checks. **🔴 Needs 4 owner setup steps before it works, so there is still no off-host copy today.** `docs/backup-and-recovery.md` §6 |
| ~~Cloudflare R2 enabled + usage alert set~~ | ✅ **REMOVED 2026-09-14.** No Cloudflare. |

### Known open issues

| Issue | Detail |
|---|---|
| **CI red on CLS** | `layout-shifts` measured **0.0436** against a 0.03 gate on the article template. The culprit is identified: the `<aside>` "মূল বিষয়সমূহ" box in `article.container-page > div.grid-12 > div.col-span-4`, moving at `top 510px, 380x227px`. Not yet fixed. |
| **Backup not yet running** | The automation is built and green but **needs 4 owner setup steps** (FTP account, host script, cron entry, 3 GitHub Secrets) — until they are done there is no off-host copy, and the manual procedure in `docs/backup-and-recovery.md` §6.5 is the only thing protecting the archive. Run it. |
| **Only one off-host copy** | Archives live as GitHub Actions artifacts, which **expire** (30-day retention) and whose private-repo quota could not be verified. Two copies in two places, one of them not a GitHub artifact. |
| **CMS runs a hand-patched host** | The host's `.next/routes-manifest.json` was edited directly to unblock the admin. The permanent fix is committed (`f267079`) but not yet deployed, so `/api/*` is still on the looser policy until it is. |
| **Demo content is live** | 24 demo articles are published so the site can be reviewed. `cms/src/seed/demo-purge.ts` removes them with no fallback — but a purge must be followed by a frontend rebuild, or Apache keeps serving the deleted pages. |

## Workflow (summary — full rules in AGENTS.md)

1. One section at a time (S0 → S12), each ending with evidence + explicit user approval.
2. Zero assumptions: ask the user; research from the internet before building with anything unfamiliar.
3. Commit immediately after every finished task.
4. Zero recurring fees; no paid services, no limited free-tier SaaS. **The owner has no international card**, so any service requiring one is unusable.
