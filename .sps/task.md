# Shikkha24 — SPS Task Checklist

**Rule:** strictly ONE section at a time — complete the DoD → post evidence → explicit user approval → next section. Never batch sections.
**Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done · `[b]` blocked
**Commit rule:** commit immediately after every finished task (`type(scope): summary`).

> ✅ **Scope resolved 2026-09-11:** this is an **education** portal (`shikkha24.com`). Sections S1, S3, S9 and S10 below are already re-scoped. The approved feature set, 8-category tree and level filter are in `docs/education-feature-inventory.md`. `docs/master-plan.md` is reference-only.

---

## S0 — Foundation & Toolchain
- [x] Git repo initialized, baseline committed (2026-09-11)
- [ ] Monorepo structure created (frontend/ + cms/)
- [ ] Astro 7.3 init — build passes
- [ ] Payload CMS 3.89 init with SQLite adapter — admin reachable
- [ ] **Next.js pinned to `>=16.2.6 <17.0.0`** (corrected by the audit; "15.x or 16.x" was wrong)
- [ ] Tailwind 4.3 + TypeScript 7 + Node 24 toolchain configured
- [ ] **GATE: Payload CMS 3 on cPanel Passenger smoke test** — blocking; if it fails: STOP and ask the user
- [ ] **GATE: TypeScript 7 (Go-based) compatibility with Astro 7 + Payload 3 validated** — blocking. Builds should run in CI (Astro/Tailwind/Vite/Pagefind/TS all ship native Rust/Go binaries)
- [ ] **GATE: Next.js `output: 'standalone'` deploy size measured** — must land ≈300–600 MB to fit the 2 GB host
- [ ] **GATE: DianaHost Node.js version resolved** — the host runs **20.18.2, which is end-of-life since 2026-04-30**. Payload/Next accept it (`>=20.9.0`); Astro 7 and Vite 8 do not, so they build in CI only. Select 22/24 from the cPanel **Node.js Selector** drop-down if offered, else record the EOL runtime as an accepted risk
- [ ] **GATE: Astro incremental build time measured** — decides the whole batching strategy and whether the CI quota is comfortable (~30s) or critical (minutes). See `docs/hosting-and-deployment.md`
- [ ] **GATE: `wrangler pages deploy` verified not to consume the 500/month Pages build quota** (direct upload vs Git-triggered build)
- [ ] **GATE: DianaHost limits confirmed via support ticket** — inode/file-count quota, CPU/memory/process limits, hourly email send limits, account-level backup policy. **None are published in their knowledge base**
- [ ] **GATE: SQLite WAL concurrency proven with 5+ concurrent writers** — blocking. **Moved here from S12**: this is a foundational decision and must not be validated at the finish line
- [ ] **GATE: Cloudflare R2 enabled and verified** — a payment method is on file, so R2 is enableable. Verify with `wrangler login && wrangler r2 bucket list`, then set an **80% usage alert** (overage is billable once a card is on file)
- [ ] **GATE: CI rebuild strategy settled** — adaptive batching (15–30 min quiet, 5 min peak, on-demand for `is_breaking`). Two quotas apply: GitHub Actions 2,000 min/month (private repo) and **Cloudflare Pages 500 builds/month**. At the chosen baseline of 15–20 articles/day + bursts, a ~30s incremental build fits comfortably; a multi-minute build does not. See `docs/hosting-and-deployment.md`
- [ ] **GATE: CI quality gates live** — Lighthouse CI with per-page budgets, broken-link check, JSON-LD validation, `pnpm audit` policy (`docs/performance-budget.md`, `docs/testing-and-qa.md`)
- [ ] **GATE: backup automated off-host AND a restore performed successfully** — an untested backup is not a backup (`docs/backup-and-recovery.md`)
- [ ] **GATE: feature-flag mechanism designed** so heavy/fragile features can be disabled without a redeploy (`docs/reliability.md`)
- [ ] **GATE: monitoring/alerting tool selected** — must be verified card-free, and alert to a channel the owner actually reads
- [ ] Security baseline applied: `.env` + SQLite outside the web root, security headers, CSP drafted, `pnpm audit` policy, Dependabot enabled (`docs/security.md`)
- [ ] Cloudflare Pages project wired for the Astro frontend
- [ ] Env skeleton (`.env.example` only — no secrets committed)
- [ ] Bengali fonts pipeline (Hind Siliguri + Noto Sans Bengali + Inter, WOFF2)
- [ ] GitHub Actions CI skeleton (build + typecheck + lint)
- [ ] Payload version decision: hold 3.89.0 or pin the prior minor and upgrade after the smoke test (3.89.0 was published 2026-09-11, one day before being pinned)
- [ ] S0 DoD evidence posted → **user approval**

## S1 — CMS Content Models & RBAC
- [x] **GATE: education feature inventory approved** — ✅ 2026-09-11 (`docs/education-feature-inventory.md`)
- [x] **GATE: education category tree approved** — ✅ 8 categories + cross-cutting level filter
- [x] **GATE: publishing velocity decided** — ✅ 2026-09-11: **baseline 15–20/day + burst to 40+ on event days**, with the existing 5-person team
- [ ] Collections: Articles, Categories, **Subcategories**, Authors, Tags, Ads, Settings, Polls, Quizzes, FactChecks, Jobs, Comments, LiveBlogs, **Newsletter Subscribers**, **Photo Galleries**, **Pages**
  - *(the four bolded collections were dropped from an earlier revision and restored by the audit — Subcategories is required by the category tree, Newsletter Subscribers by the newsletter decision, Photo Galleries by the gallery feature, Pages by the E-E-A-T pages)*
- [ ] **Education collections:** Scholarships, Deadlines / Academic Calendar, Institutions, Circulars, Result Links, Study Abroad Guides, Saved Deadlines — see `.sps/content-model.md`
- [ ] **Taxonomies seeded:** Category (8) + Level (5) + District (64)
- [ ] 5 RBAC roles: Reporter, Section Editor, Editor-in-Chief, Ad Manager, Super Admin
- [ ] Bengali admin labels
- [ ] Versioning + draft/review/publish workflow verified
- [ ] S1 DoD evidence → **user approval**

## S2 — Design System & Base Layout
- [x] **GATE: domain decided** — ✅ `shikkha24.com`
- [ ] **GATE: portal display name + logo decided** — blocking
- [ ] Typography: Hind Siliguri (headlines) + Noto Sans Bengali (body) + Inter — ≥17px mobile, line-height ≥1.65
- [ ] Colors: brand red #DA1C25 + brand charcoal #1F1F1F + white; dark mode base #121212 (BBC-style) — two distinct tokens, do not conflate them
- [ ] 12-col grid, Header + utility ribbon, mega menu, Footer
- [ ] Sticky mobile share bar, text resizer
- [ ] S2 DoD evidence → **user approval**

## S3 — Homepage
- [ ] Lead education story + breaking ticker (result days, circular releases, exam postponements)
- [ ] **Scholarship / admission deadline strip** (N1, N2)
- [ ] Category grids for the **8 approved education categories**
- [ ] **Level filter** (প্রাথমিক · মাধ্যমিক · উচ্চ মাধ্যমিক · স্নাতক · স্নাতকোত্তর) + district selector (আমার জেলা)
- [ ] Header utilities: weather + prayer times + Hijri date (server-fetched, cached, deferred, zero CLS)
- [ ] Trending/most-read, latest feed, ad slots (zero-CLS)
- [ ] Mobile-first + low-end Android pass (Symphony/Walton class, 3G)
- [ ] S3 DoD evidence → **user approval**

## S4 — Article Page
- [ ] Full article, takeaways box, author card, related articles, share, progress bar, audio player (Web Speech API), comments, correction notice, print view, JSON-LD
- [ ] S4 DoD evidence → **user approval**

## S5 — Category/Tag/Author/Archive
- [ ] Listings, pagination, breadcrumbs, subcategory filters, author profiles, date archive
- [ ] S5 DoD evidence → **user approval**

## S6 — Search
- [ ] Pagefind 1.5 + search UI
- [ ] **GATE: Bengali search quality tested on a real Bengali corpus** — blocking
- [ ] Date/section filters
- [ ] S6 DoD evidence → **user approval**

## S7 — Ad System
- [ ] AdSlot (zero-CLS), AdSense, sponsor banners, Payload ad management, sponsored content template
- [ ] S7 DoD evidence → **user approval**

## S8 — Live Blog & Interactive
- [ ] Live blog engine (exam results, admission days), polls, quizzes, infographic blocks, scrollytelling (lazy-loaded islands only)
- [ ] S8 DoD evidence → **user approval**

## S9 — Media, Newsletter & Engagement
- [ ] Gallery, video embeds, push notifications, bookmarks, social login, citizen journalism submission
- [ ] **Cloudflare R2 media pipeline** (or the documented quota fallback if R2 cannot be enabled)
- [ ] Newsletter: self-built Payload subscriber list + campaign module
- [ ] **GATE: newsletter sending path confirmed** — free-tier ESP reachable, or the cPanel SMTP low-volume fallback explicitly accepted
- [ ] S9 DoD evidence → **user approval**

## S10 — Education Features & Specialized Sections
- [ ] **N1** Scholarship tracker (deadline-sorted, filterable by level / country / funding)
- [ ] **N2** Academic calendar & deadlines (shared dated-events model)
- [ ] **N3** Results & merit lists hub (links + how-to guides around the official portals)
- [ ] **N4** Institution directory — starter set: public universities + top private, marked "growing"
- [ ] **N5** Exam routine & syllabus hub (shares the N2 data model)
- [ ] **N6** GPA / grade calculator (SSC/HSC, client-side, zero backend)
- [ ] **N8** Circular tracker (education + BCS/job circulars)
- [ ] **N9** District-first opportunities
- [ ] **N10** Study-abroad country guides — starter set: UK, USA, Canada, Australia, Malaysia, Japan, South Korea, Germany
- [ ] Header utilities finalised per `docs/data-sources.md` (weather, prayer times + Hijri date — both verified free, no key)
- [ ] **GATE: every remaining data-backed element has a confirmed free provider or is descoped** — no widget may ship on an unidentified or paid provider
- [ ] S10 DoD evidence → **user approval**

## S11 — SEO, Feeds & AI Optimization
- [ ] News sitemap (<48h), sitemap, RSS, OG/Twitter, auto OG images, canonical, `llms.txt`, robots.txt, Publisher Center, E-E-A-T pages
- [ ] URL architecture implemented: `/:category/:subcategory/:id/:slug` + shortlink for social sharing
- [ ] S11 DoD evidence → **user approval**

## S12 — Deployment, QA & Launch
- [ ] Cloudflare Pages + R2 setup; GitHub Actions pipeline; DianaHost Passenger config
- [ ] Lighthouse ≥95 **and accessibility ≥90**; LCP <1.5s; INP <100ms; CLS <0.02; TTFB <200ms (measured here, in production behind Cloudflare); initial payload <1.2MB; data-saver <30KB
- [ ] **AdSense-vs-≥95 trade-off resolved** — two measurement profiles (`docs/performance-budget.md`)
- [ ] **GATE: monitoring + alerting live** on a verified card-free tool (`docs/reliability.md`)
- [ ] **GATE: full restore drill completed and timed** against RPO 24h / RTO 4h (`docs/backup-and-recovery.md`)
- [ ] **SPF / DKIM / DMARC configured** + dedicated bulk-sending subdomain (`docs/security.md`)
- [ ] **WCAG 2.2 AA**: automated pass + **manual keyboard and screen-reader pass** (`docs/testing-and-qa.md`)
- [ ] Browser/device matrix incl. **UC Browser and Opera Mini**, plus a low-end Symphony/Walton-class device
- [ ] Bengali font + conjunct rendering audit; error/404 pages verified; pre-launch QA checklist completed
- [ ] S12 DoD evidence → **user approval → LAUNCH**
