# SPS Handoff

## Current Phase
- **Status:** S0 IN PROGRESS — foundation built, **verification BLOCKED** (see "S0 blocker" below)
- **Last Activity:** 2026-09-12T02:45+06:00
- **Next Action:** unblock `npm install`, then run build + typecheck + lint and measure the three measurable S0 gates
- **User instruction (latest):** "read plans very carefully and then start building" — S0 foundation executed

## ⛔ S0 blocker — `npm install` cannot run in the build environment

**Symptom.** Every `npm install` fails with:

```
npm error code CODEBUDDY_BROKER_DENY
npm error Brokered host mkdir requires an available runtime file rule
```

**Diagnosis (evidence, not a guess).** The host injects a filesystem broker via
`NODE_OPTIONS=--require=".../node-language-shim.cjs"`, activated by
`CODEBUDDY_BROKERED_FS_HOOK_ENABLED=1`. The broker intercepts `fs.mkdir` and asks
the host for permission; the host answers with an error instead of falling back,
and `node-brokered-fs-shim.cjs:717` (`wrappedPromisesMkdir`) rethrows it. Verified:

| Probe | Result |
|---|---|
| `fs.mkdirSync` in the workspace, `/tmp`, `~/.npm`, and under `node_modules` | ✅ all succeed |
| `fs.promises.mkdir` under `node_modules` | ✅ succeeds |
| `npm install` (any package, any directory, repeated 5×) | ❌ denied every time |
| `dangerouslyDisableSandbox: true` | ❌ does **not** remove the broker env vars |
| `TMPDIR` pointed inside the workspace | ❌ no effect |

Dependency **resolution** succeeds (the npm debug log shows the full `placeDep`
tree); only physical extraction is denied. A partial `node_modules` (195 entries
including `astro` and `@payloadcms`) was created before the first denial.

**Consequence.** No build, typecheck or lint has been run. **No S0 DoD evidence
exists yet.** The commit `aa1afe6` is explicitly labelled unverified scaffolding.

**Options for the owner** (not acted on — this is a security control):
1. Run `npm install` manually in a normal terminal, then I continue verification.
2. Authorise running the install with `CODEBUDDY_BROKERED_FS_HOOK_ENABLED=0` for
   that single command, which disables the fs broker.
3. Accept CI-only verification: the architecture already builds both workspaces in
   CI (`.github/workflows/ci.yml`), so verification happens on first push.

## S0 progress — built vs. blocked

**Built and committed (`aa1afe6`):** monorepo (`frontend/` + `cms/`, npm
workspaces), Astro 7.3.2 + Tailwind 4.3.3 + TS 7.0.2 frontend, Payload 3.89.0 +
Next 16.3.5 + SQLite CMS, Bengali font pipeline, feature-flag mechanisms,
Cloudflare `_headers`, CI skeleton, Dependabot, daily backup workflow, `.env`
templates, `.sps/section-todos/S0.md`.

**Measured and PASSING:** the font budget — **179.7 KB / 200 KB**.

**Blocked pending install:** Astro build, Payload build + reachable admin,
typecheck, lint, Astro incremental build time, Next standalone deploy size,
SQLite WAL 5-writer concurrency, CI workflow validation.

**Owner-only gates (cannot be done by an agent):** Payload-on-cPanel-Passenger
smoke test, `wrangler pages deploy` quota check, DianaHost support ticket, DNS.

## Completed
1. ✅ Discovery round 1 (project identity, language, type, team, features, monetization, design, hosting, timeline)
2. ✅ Discovery round 2 (branding, colors, categories, editorial workflow, social, mobile-first, mobile apps, traffic)
3. ✅ Discovery round 3 (content migration, hosting flexibility, typography, CDN)
4. ✅ Stack research (Astro 7, Payload CMS 3, Tailwind 4.3, TypeScript 7, Node 24 — re-verified against live registries 2026-09-11)
5. ✅ Competitive analysis (15+ portals: Prothom Alo, bdnews24, Daily Star, Samakal, Jugantor, Kaler Kantho, Jago News, Bangla Tribune, Ittefaq + BBC, Guardian, Al Jazeera, CNN, NYT, NHK, NDTV) — **now obsolete for this scope, see item 31**
6. ✅ Feature audit (22 missing features found, 10 unique innovations designed) — **now obsolete for this scope, see item 31**
7. ✅ CMS critical finding (Strapi CE missing newsroom features → switched to Payload CMS 3)
8. ✅ Google News SEO strategy researched
9. ✅ SPS memory bootstrapped (agent.md, profile.md, handoff.md)
10. ✅ Root mirrors created (GEMINI.md, AGENTS.md) — **now three mirrors: AGENTS.md, GEMINI.md, CLAUDE.md (item 33)**
11. ✅ Implementation plan written, revised (v2 with verified versions, v3 master plan with competitive intel)
12. ✅ Plan APPROVED by user (2026-09-11T20:41+06:00)
13. ✅ Plan stamped as approved in .sps/plan.md
14. ✅ Profile updated with all approved decisions
15. ✅ Task checklist created — **recreated as `.sps/task.md` during 2026-09-11 docs audit** (the original file was never written to disk)
16. ✅ Docs audit of all files — problems found & fixed (2026-09-11)
17. ✅ Stack versions verified against live registries — all matched. ⚠️ **CORRECTION 2026-09-11 (third-party audit):** this item previously claimed the Next.js row was corrected to "Next 15.x AND 16.x". That was wrong — the actual `@payloadcms/next@3.89.0` peer range is `>=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.2.6 <17.0.0`. Now pinned to **Next 16.2.6+**.
18. ✅ Mandatory agent rules codified in AGENTS.md + GEMINI.md (synced mirrors): readable commented code, section-by-section approvals, zero assumptions, immediate commits, budget guard, performance gates — **now three mirrors, and rules 4, 7 and 9 were amended by the audit (item 33)**
19. ⚠️ **CORRECTED 2026-09-11 (third-party audit):** this item previously claimed the Strapi-based root plan was "deleted — user-approved". **It had never been deleted.** The file was still tracked in the repo root and described itself as "the single source of truth". It has now **actually been deleted** (owner-approved 2026-09-11); the original is preserved in git history at commit `acfb128`.
20. ⚠️ **SUPERSEDED 2026-09-11:** this item defined the newsletter fallback as "self-built Payload newsletter via DianaHost cPanel SMTP → Oracle Cloud Always Free VPS". **Oracle Cloud is not usable** — it requires a credit card at signup, which the owner does not have. New decision: self-built Payload subscriber list + campaign module, delivery via a free-tier ESP API; cPanel SMTP retained only as a low-volume fallback. See item 32.
21. ✅ Git repo initialized — baseline + audit commits; immediate-commit rule active
22. ✅ Antigravity export prompt created (`.sps/antigravity-export-prompt.md`)
23. ✅ README.md created
24. ✅ Artifacts exported from Antigravity to docs/ (master plan, competitive analysis, stack research, original checklist)
25. ✅ Agent rule 13 (docs consistency / plan ↔ build parity) added to both mirrors; GEMINI.md rewritten with Antigravity/Gemini hardening grounded in documented failure modes (Antigravity drive-wipe Dec 2025; PromptArmor prompt-injection Nov 2025; model/quota "bait and switch" 2026; Gemini CLI issues #15037, #7498, #13677, #6054, #7223); mirrors kept in sync — **hardening renumbered H1–H14 by the audit so it can never be confused with rules 1–13 (item 33)**
26. ✅ All four artifacts verified in repo: `docs/master-plan.md` (25.9 KB, 397 lines — 87 numbered features, 10 innovations; heading says "70+" but rows run to 87), `docs/competitive-analysis.md` (46.8 KB), `docs/stack-research.md` (11.1 KB), `docs/task-checklist-original.md` (14.8 KB). ⚠️ **CORRECTION 2026-09-11:** this item claimed the **S1 entry gate was satisfied**. It is **no longer satisfied** — the inventory is a general-news inventory and the portal is an education portal (item 31).
27. ✅ Community-research round on Antigravity/Gemini failure modes (HN launch thread 45967814, drive-wipe thread 46103532, gemini-cli issues) — GEMINI.md hardening expanded 9 → 14 countermeasures with community evidence: edits reported but never applied (#25783) + replace-in-file corruption (HN), guessed deletions with false compliance claims (#26856), fabricated user prompts (#29157); community mitigations adopted: sandbox-aware behavior, commit-before-risky-operations
28. ✅ Third-party audit prompt created (`.sps/third-party-audit-prompt.md`)
29. ✅ `/sps` v4.0.0 + `/sps-cms` v2.3.0 skills installed into **WorkBuddy AI** (`~/.workbuddy-ai/skills/`) from source `~/.sps/src/Shahid-Personal-SkillSet/skills/` — 60 + 56 files, byte-identical to source (`diff -rq` clean), scripts executable; security audit passed. WorkBuddy was not in the upstream installer's `SYNC_PATHS`, so this was a manual faithful copy; re-sync command recorded below.
30. ✅ **Independent third-party audit executed** (2026-09-11) — full read-only adversarial review of all 15 documents, live-registry re-verification of every pinned version, and `git log --stat` reconciliation against this handoff. Result: **`not-ready`**, 3 Critical / 5 High / 17 Medium / 8 Low findings. Report at `docs/audit-third-party.md` (commit `46040a8`). Notable: all ten pinned versions matched the live registries exactly, but three documents contained a false claim (item 19), the storage plan could not hold the stack, and the newsletter fallback was non-functional.
31. ✅ **Scope amended to an education portal** (owner, 2026-09-11) — domain `shikkha24.com` confirmed; owner's positioning: "🎓 Education News | Scholarship | Admission | University | Higher Study / 🌍 দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ / 📚 শিক্ষার খবর, সুযোগ ও সম্ভাবনা—এক ঠিকানায়।" `docs/master-plan.md` and `docs/competitive-analysis.md` are now **reference-only**; a new education feature inventory, category tree and competitor set are required and cannot be produced without a discovery round.
32. ✅ **Audit remediation applied** (2026-09-11) — hosting/storage architecture rewritten for the purchased **DianaHost PNR 2 GB** plan (Cloudflare Pages frontend + Cloudflare R2 media + slim CI-built Payload); newsletter path replaced (Oracle rejected); Node 24 LTS claim corrected; SQLite WAL gate moved S12 → S0; four missing CMS collections restored; accessibility and initial-payload targets added; URL architecture decided; data sources documented; CI-minutes constraint documented.
33. ✅ **Agent rules amended and a third mirror added** — `CLAUDE.md` created; rules 1–13 verified byte-identical across all three files (4,283 bytes each); rule 4 gained a read-only/audit carve-out; rule 7 gained the no-international-card hard constraint; rule 9 gained page-level wording, an accessibility target and the S12-only TTFB gate; GEMINI.md hardening renumbered H1–H14.
34. ✅ New documents created: `docs/data-sources.md` (per-widget provider, free-tier terms, rate limit, fallback), `.sps/content-model.md`, `.sps/mistakes.md`, `.sps/lock.json` — ⚠️ correction: `.sps/lock.json` was **deliberately NOT created**; the `sps` skill references removing it but defines no schema (see `.sps/mistakes.md`).
35. ✅ **Education competitor landscape researched** (2026-09-11) — `docs/education-competitors.md`. Five groups mapped with URLs: dedicated education portals (Dainik Shiksha, Shiksha Sangbad — the direct competitors), education sections of general portals, official government portals (educationboardresults.gov.bd, xiclassadmission.gov.bd), third-party SEO aggregators (xiadmission.bd, xiclass.bd, eduboardresults.bd, sscresult.govt.bd), and exam-prep platforms (bcsstudy.com, xam.bd, bdjobprep.com). Key finding: the aggregators rank on the highest-intent queries with slow, ad-heavy pages — the same "faster, cleaner, zero-CLS" wedge the original research identified against Prothom Alo, applied to a market with much weaker incumbents.
36. ✅ **Education feature inventory drafted** (2026-09-11) — `docs/education-feature-inventory.md`. Built by reclassifying the original 87 approved features into retained-unchanged / re-scoped / descoped, plus 12 new education features marked `[NEW]`. Nothing was invented.
37. ✅ **Education feature inventory APPROVED** (2026-09-11) — owner delegated the two structural choices to the agent and answered three directly:
   - **Category tree: 8 categories + a cross-cutting level filter.** The agent rejected splitting out স্কুল-কলেজ because it is an audience segment, not a topic — as a top-level category it would overlap শিক্ষা সংবাদ, ভর্তি and পরীক্ষা ও ফলাফল simultaneously and split SEO authority. Level (প্রাথমিক → স্নাতকোত্তর) and District become filter axes instead.
   - **New features: all 10 for Day 1** (12 proposed; N2+N9 merged into "Academic calendar & deadlines", N3+N7 merged into "Results & merit lists hub" to stop the portal competing with itself for the same query). Two ship with a curated starter dataset rather than empty: institution directory, study-abroad guides (8 destinations).
   - **Weather + prayer times: retained** as light header utilities (server-fetched, cached, deferred, zero CLS).
   - **BCS / job-circular content: in scope** — matches Dainik Shiksha's own positioning and is a proven BD traffic engine.
   - **Publishing velocity: was still open at this point** — the agent explained in plain language that 45–70/day ÷ 5 staff = 9–14 articles per person per day (3–5× a normal reporter's output), that the plan's own desk breakdown contradicts the target (42–56 vs 45–70), and that education publishing is spiky rather than flat. Recommended a **baseline 15–20/day + burst to 40+ on result/admission days** model. → **Resolved in item 39.**
   - **Downstream effect:** S1, S3, S9 and S10 are now fully re-scoped in `.sps/task.md`; `.sps/content-model.md` gained 8 education collections/taxonomies. (The velocity decision was still pending at this point; it was closed in item 39.)
38. ✅ **Six missing operational documents created** (2026-09-11) — owner asked whether all documentation types existed (Lighthouse, SEO, security, crash handling, overload, etc.). A coverage scan found real gaps: **security, crash handling, overload management, monitoring/alerting, backup/DR, accessibility and testing had no coverage at all**, and performance/SEO existed only as scattered targets. Created:
   - `docs/performance-budget.md` — per-asset byte budgets, per-page targets, measurement method, CI gate, and the honest **AdSense-vs-Lighthouse-≥95 trade-off** (AdSense will rarely hold ≥95; two measurement profiles proposed)
   - `docs/seo-plan.md` — per-template metadata + schema matrix (incl. education-specific `CollegeOrUniversity`, `JobPosting`, `Course`), sitemaps/feeds, keyword clusters, redirect policy, and the **Bengali-vs-ASCII slug decision** (recommendation: ASCII slugs, Bengali in title/h1/schema)
   - `docs/security.md` — threat model, attack surface, auth/2FA, headers + CSP (two profiles because AdSense forces a relaxation), input validation, rate limiting (noting Cloudflare's free tier has **no** configurable rate-limiting rules), PII handling, supply-chain scanning, and SPF/DKIM/DMARC
   - `docs/reliability.md` — ranked failure-mode table, error pages, per-feature graceful degradation, capacity model, traffic-spike playbook, monitoring/alerting, single-operator incident playbook. Key structural finding: **the CMS can go down without the site going down**, because the frontend is static on Cloudflare Pages — that property must never be given up
   - `docs/backup-and-recovery.md` — the entire archive is one SQLite file on a shared host; backup tiers, RPO 24h / RTO 4h, four DR scenarios, restore runbook, and the rule that **an untested backup is not a backup**
   - `docs/testing-and-qa.md` — quality gates, honest test scope, **WCAG 2.2 AA** (correcting the old "AAA" claim), browser/device matrix including **UC Browser and Opera Mini** (significant in Bangladesh), and the Bengali conjunct/rendering audit
   - Wired into `.sps/plan.md` (new Operational plans section + 5 new S0/S12 gates), `.sps/task.md` (S0 and S12 expanded), and the README doc map. Two cross-cutting requirements surfaced that did not previously exist: a **feature-flag mechanism** and a **verified card-free monitoring tool**.
39. ✅ **All 12 outstanding questions answered by the owner; decisions applied** (2026-09-11/12):
   - **Publishing velocity = baseline 15–20/day + burst to 40+ on event days.** The flat 45–70/day target is retired. 5-person editorial team already in place; greenfield launch; no migration.
   - **DianaHost runs Node.js 20.18.2 — a significant finding.** `astro@7.3.2` (`>=22.12.0`) and `vite@8.3.0` (`^20.19.0 || >=22.12.0`) **cannot run on it**, so they build in CI only. This independently validates the Cloudflare Pages split — had the frontend been built on the host, Astro 7 would have been impossible. `next@16.3.4` and `@payloadcms/next@3.89.0` do accept `>=20.9.0`, so Payload runs there. **But Node 20 reached end-of-life 2026-04-30** — an unpatched runtime hosting the CMS admin. DianaHost's cPanel has a **Node.js Selector version drop-down**; the owner should select 22/24 if offered.
   - **Cloudflare has a payment method on file** → R2 is enableable. Could not be verified from here: `wrangler` 4.125.0 is installed but **not authenticated**, and no API token is present. Owner command: `wrangler login && wrangler r2 bucket list`. Because a card is on file, **overage is now billable** — an 80% usage alert is required.
   - **Repository is PRIVATE** → 2,000 Actions minutes/month. Owner asked the excellent question *"why do I need CI for an article to upload? The admin can't access GitHub."* Answer documented in the new **`docs/hosting-and-deployment.md`**: editors only ever use the Payload admin (a normal web CMS); CI is the invisible rebuild step that turns a publish into a static HTML file. Also documented: the escalation ladder, and the fact that **Cloudflare Pages free = 500 builds/month** (tighter than GitHub's quota) and **20,000 files/site** (reached in ~2–3 years at target volume).
   - **AdSense is activated** → AdSense definitely ships, so the **two-profile Lighthouse measurement** is adopted: **≥95 no-ads / ≥85 with-ads**.
   - **Social login kept** — Meta Login and Google OAuth are free; only app review (a process, not a cost) is needed, so the owner's "no cost" rule does not exclude them.
   - **Logo:** placeholder SVG created at `docs/assets/logo-placeholder.svg`, and the logo is a **CMS-managed Site Settings field** so the real asset swaps in without a code change.
   - Domain **registered** (DNS to follow); legal details for E-E-A-T pages promised **before final deploy**.
   - **Corrected an earlier overstatement of mine:** I had said one-build-per-publish would blow the CI quota. That is only true if builds take minutes. At ~30s incremental, 600–900 publishes/month costs ~450 minutes and fits comfortably. **The deciding number is the measured incremental build time — now an S0 gate.**
40. ✅ **Project presentation deck created** (2026-09-12) — `docs/presentation-deck.html`. 18-slide mobile-first HTML deck for team/board approval covering: vision, market gap, audience, 8-category tree, platform features, 10 new education features, tech stack, architecture, S0–S12 roadmap, 12-week timeline, performance targets, competitive advantage, monetization, team/content model, zero-recurring-cost budget, risk register, and approval request. Smooth scroll, keyboard navigation, progress bar, navigation dots. Bengali + English mixed for BD audience.

41. ✅ **S0 foundation built** (2026-09-12, commit `aa1afe6`) — monorepo + both scaffolds + toolchain. Four findings worth not re-researching:
    - **All eight pinned versions verified against the live npm registry** and matched exactly (astro 7.3.2, payload 3.89.0, tailwindcss 4.3.3, typescript 7.0.2, vite 8.3.0, pagefind 1.5.2, next 16.3.5 in range, @payloadcms/next 3.89.0). The plan's Next.js peer-range correction is confirmed: `@payloadcms/next@3.89.0` really does require `>=16.2.6 <17.0.0`.
    - **`react` must be 19.2.x.** `@payloadcms/ui@3.89.0` and `@payloadcms/richtext-lexical@3.89.0` pin `react` to `^19.0.1 || ^19.1.2 || ^19.2.1`. The registry's latest (19.3.0) is **not permitted**. Pinned 19.2.6. Likewise `graphql` must stay on 16.x (`^16.8.1`), so 16.14.2 — not the 17.0.2 latest.
    - **S0 gate "TypeScript 7 toolchain validated" → TS 7 works, its surrounding tooling does not.** `@astrojs/check@0.9.10` (latest) peer-requires `typescript ^5 || ^6` and **rejects TS 7**, so `astro check` is unavailable — typecheck runs via `tsc --noEmit`, which means **`.astro` templates are not type-checked**. `typescript-eslint@8.70.0` caps at `typescript <6.1.0`, so ESLint cannot run on TS 7 either. Chose **Biome 2.5.13** instead: own parser, no TS-version coupling, MIT/Apache-2.0. `typescript@7.0.2` ships `bin/tsc` plus 20 platform-native binaries, confirming the plan's native-toolchain claim.
    - **Bengali font budget solved, with two non-obvious gotchas.** `scripts/fetch-fonts.mjs` self-hosts and subsets. (a) Requesting `wght@400;700` in ONE css2 call returns a **105 KB variable file** for Noto Sans Bengali's bengali subset; requesting each weight separately returns **43 KB static instances** — same glyphs, less than half the bytes. (b) Google emits the `/* subset */` label **before** each `@font-face` block, so parsing the comment and the block separately shifts every label by one and silently drops the bold Bengali files. Inter is dropped for a system UI stack (its variable file alone is 83 KB/weight) per `docs/performance-budget.md` §3. **Measured 179.7 KB against the 200 KB budget.**
    - **`sps-cms` reconciliation recorded** in `.sps/section-todos/S0.md`: the skill mandates a bespoke visual-builder CMS, but the approved plan mandates Payload CMS 3. Applied as *principles* inside Payload (100% admin-controllable surface, global settings, media security, round-trip proof) rather than as a replacement engine — replacing it would be plan drift (rule 13).


- **Portal type: education portal** (2026-09-11) — domain `shikkha24.com`; general-news scope retired
- Stack: Astro 7.3 + Payload CMS 3 + SQLite → PostgreSQL (Strapi rejected)
- **Next.js pinned to 16.2.6+** (corrected by the audit)
- CMS: Payload CMS 3 (free versioning, workflows, scheduled publish, field-level ACL)
- Design: Prothom Alo layout + Bangla Tribune typography + BBC dark mode + Guardian live blog
- Language: Bengali-only UI (no English toggle)
- Comments: Custom Payload-based (Facebook/Google social login)
- Categories: Dynamic + subcategories, fully admin-editable (education tree proposed, pending approval)
- **Newsletter: self-built Payload subscriber list + campaign module; delivery via free-tier ESP API; cPanel SMTP as low-volume fallback** (Listmonk and Oracle both rejected)
- **Third-party policy: no paid services at all — the owner has no international card.** Any service requiring a card at signup is unusable
- CI/CD: GitHub Actions, with **rebuilds debounced/batched** to stay inside the 2,000 min/month private-repo quota
- **Hosting: DianaHost PNR 2 GB SSD NVMe (purchased, ~$47/year) + Cloudflare Pages (frontend) + Cloudflare R2 (media)**
- CDN: Cloudflare free tier
- Typography: Hind Siliguri (headlines) + Noto Sans Bengali (body) + Inter (English)
- **Audio reader: Browser Web Speech API; the twice-daily audio bulletin is descoped**
- **Utility widgets: free public APIs only; descope anything with no free source**
- **Content velocity: ✅ DECIDED — baseline 15–20/day + burst to 40+ on result/admission days.** Replaces the flat 45–70/day target (which implied 15–23 staff). 5-person team already in place; greenfield launch.
- **Deployment: private repo + GitHub Actions (Node 24) → Cloudflare Pages (`wrangler` direct upload) + DianaHost.** Two rebuild quotas to manage: GitHub 2,000 min/month and Cloudflare Pages 500 builds/month. See `docs/hosting-and-deployment.md`
- **DianaHost runs Node.js 20.18.2 (EOL 2026-04-30)** — Astro/Vite cannot run there (CI only); Payload/Next can. cPanel has a Node.js Selector to upgrade
- Features: ALL features on Day 1 (no phasing) — performance budget enforced **per page template**, not "per feature"
- Workflow: section-by-section approval gates; zero assumptions; immediate commits; docs consistency (docs updated first when scope changes)
- Agent rules: mandatory, codified in AGENTS.md / GEMINI.md / CLAUDE.md (rules 1–13 identical in all three; hardening H1–H14 in GEMINI.md only)

## Pending
**Owner actions for S0 (all four can be done in one sitting):**
- [ ] **cPanel → Software → Select Node.js Version → Edit → Change Node.js version** — select 22.x or 24.x if offered. The host currently runs **20.18.2, which is end-of-life**
- [ ] **One DianaHost support ticket** — inode/file-count quota, CPU/memory/process limits, hourly email send limits, and whether account-level backups exist. **None are published in their knowledge base**
- [ ] **Verify R2:** `wrangler login && wrangler r2 bucket list` — then set an 80% usage alert (a card is on file, so overage is billable)
- [ ] **DNS configuration for shikkha24.com** — the domain is registered; the owner will supply the DNS details

**Then:**
- [ ] Start **S0** on the owner's "go"
- [ ] Measure a real **Astro incremental build time** (S0 gate — decides the CI/batching strategy)
- [ ] Verify **`wrangler pages deploy`** does not consume the 500/month Pages build quota
- [ ] Hands-on audit of the two direct competitors (Dainik Shiksha, Shiksha Sangbad)
- [ ] Real logo asset (placeholder SVG in place, CMS-editable)
- [ ] Legal details for the E-E-A-T pages — owner provides **before final deploy**
- [ ] Portal display name final confirmation
- [ ] Start the Meta app review for Facebook Login early (free, but slow)
- [x] ~~Publishing velocity decision~~ — ✅ baseline 15–20/day + burst
- [x] ~~Education feature inventory + category tree approved~~ — ✅ 2026-09-11
- [x] ~~Education competitor set~~ — ✅ 2026-09-11
- [x] Domain purchase — ✅ `shikkha24.com` (reachability not verified from the audit environment)
- [x] DianaHost plan purchase — ✅ PNR 2 GB SSD NVMe
- [ ] Confirm with DianaHost: Node.js version availability (≥22.12 required) and the inode/file-count quota
- [ ] Confirm Cloudflare R2 can be enabled without a payment method (S0 exit gate)
- [ ] Decide the CI rebuild strategy (debounce/batch vs public repo)
- [ ] Reconcile the desk allocation with whatever velocity is chosen — the general-news desk split (which sums to 42–56/day) must be redrawn around education desks
- [ ] Build S0 → S12 (one section at a time, approval-gated)
- [ ] `.sps/lock.json` intentionally NOT created — the `sps` skill references removing it but defines no schema; inventing one would violate rule 3. The lock is asserted via the three root mirrors. Revisit if the skill defines a schema (see `.sps/mistakes.md`)
- [ ] Optional: upstream a `workbuddy` host entry into Shahid-Personal-SkillSet (`install.sh` `SYNC_PATHS` + `skills/sps/hosts/workbuddy.md`) so WorkBuddy installs/updates automatically instead of needing the manual re-sync below

## Tooling — WorkBuddy `/sps` install

Installed to `~/.workbuddy-ai/skills/sps` + `~/.workbuddy-ai/skills/sps-cms` (v4.0.0 / v2.3.0).
WorkBuddy is not in the upstream installer's `SYNC_PATHS`, and `sps-update.sh` re-runs `install.sh`
(which resets the source clone), so re-run this **after every SPS update** to refresh WorkBuddy:

```sh
SRC=~/.sps/src/Shahid-Personal-SkillSet; DEST=~/.workbuddy-ai/skills
rm -rf "$DEST/sps" "$DEST/sps-cms"
cp -R "$SRC/skills/sps" "$DEST/sps" && cp -R "$SRC/skills/sps-cms" "$DEST/sps-cms"
chmod +x "$DEST/sps/scripts/"*.sh "$DEST/sps-cms/scripts/"*.sh
```
