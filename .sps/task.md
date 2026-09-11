# Shikkha24 — SPS Task Checklist

**Rule:** strictly ONE section at a time — complete the DoD → post evidence → explicit user approval → next section. Never batch sections.
**Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done · `[b]` blocked
**Commit rule:** commit immediately after every finished task (`type(scope): summary`).

> ✅ **Scope resolved 2026-09-11:** this is an **education** portal (`shikkha24.com`). Sections S1, S3, S9 and S10 below are already re-scoped. The approved feature set, 8-category tree and level filter are in `docs/education-feature-inventory.md`. `docs/master-plan.md` is reference-only.

---

## S0 — Foundation & Toolchain ✅ APPROVED 2026-09-12
- [x] Git repo initialized, baseline committed (2026-09-11)
- [x] Monorepo structure created (frontend/ + cms/) — pnpm workspaces
- [x] Astro 7.3 init — build passes (exit 0, 216 KB dist)
- [x] Payload CMS 3.89 init with SQLite adapter — admin reachable (`/admin` → HTTP 200)
- [x] **Next.js pinned to `>=16.2.6 <17.0.0`** — 16.3.5, peer range confirmed
- [x] Tailwind 4.3 + TypeScript 7 toolchain configured (Node 24 in CI; local runs Node 22.22.2)
- [~] **GATE: Payload CMS 3 on cPanel Passenger smoke test** — **OWNER-ONLY**, still open (needs DianaHost access)
- [x] **GATE: TypeScript 7 compatibility validated** — TS 7 works, but `@astrojs/check` and `typescript-eslint` reject it; Biome adopted, typecheck via `tsc --noEmit`
- [x] **GATE: Next.js `output: 'standalone'` deploy size measured** — **114 MB** (target 300–600 MB)
- [~] **GATE: DianaHost Node.js version resolved** — accepted risk (host max is 20.18.2, EOL); **OWNER-ONLY** escalation
- [x] **GATE: Astro incremental build time measured** — **~1s** ⚠️ measured on a 1-page site; re-measure at content volume
- [~] **GATE: `wrangler pages deploy` quota verified** — **OWNER-ONLY**, needs Cloudflare auth
- [~] **GATE: DianaHost limits confirmed via support ticket** — **OWNER-ONLY**
- [x] **GATE: SQLite WAL concurrency proven with 5+ concurrent writers** — 6/6 writers, 240/240 rows, integrity ok
- [~] **GATE: Cloudflare R2 enabled and verified** — R2 confirmed enabled; the 80% usage alert is an **OWNER** action
- [x] **GATE: CI rebuild strategy settled** — adaptive batching; build time ~1s makes the 2,000 min/month quota comfortable
- [~] **GATE: CI quality gates live** — lint/typecheck/build/audit/standalone-size wired and passing locally; **Lighthouse + link-check + JSON-LD deferred to S3+** (need real page templates)
- [~] **GATE: backup automated off-host AND a restore performed** — workflow written; **restore drill is an S12 gate**
- [x] **GATE: feature-flag mechanism designed** — build-time (frontend) + runtime (cms), default-on contract
- [ ] **GATE: monitoring/alerting tool selected** — **still open**; must be verified card-free
- [x] Security baseline applied: `.env` + SQLite outside the web root, security headers, strict CSP profile, `pnpm audit` policy, Dependabot enabled
- [~] Cloudflare Pages project wired for the Astro frontend — `_headers` shipped and verified in `dist/`; project creation is an **OWNER** action
- [x] Env skeleton (`.env.example` ×2 — no secrets committed)
- [x] Bengali fonts pipeline — 179.7 KB / 200 KB budget
- [x] GitHub Actions CI (build + typecheck + lint + gates) — pnpm + Node 24
- [x] Payload version decision — hold 3.89.0 (verified live; `react` pinned to 19.2.6 by Payload's peer range)
- [x] S0 DoD evidence posted → **user approval received 2026-09-12**


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
