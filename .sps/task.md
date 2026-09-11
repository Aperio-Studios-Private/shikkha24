# Shikkha24 — SPS Task Checklist

**Rule:** strictly ONE section at a time — complete the DoD → post evidence → explicit user approval → next section. Never batch sections.
**Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done · `[b]` blocked
**Commit rule:** commit immediately after every finished task (`type(scope): summary`).

> ⚠️ **Scope amended 2026-09-11:** this is an **education** portal (`shikkha24.com`). The per-section deliverables below were written for a general news portal and must be re-scoped to education before each section starts. `docs/master-plan.md` is reference-only.

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
- [ ] **GATE: DianaHost provides Node.js ≥22.12** — blocking. Astro 7 requires ≥22.12; Payload requires ≥20.9. The vendor publishes no Node version
- [ ] **GATE: DianaHost inode / file-count quota confirmed** — blocking. A Next.js install contains tens of thousands of files
- [ ] **GATE: SQLite WAL concurrency proven with 5+ concurrent writers** — blocking. **Moved here from S12**: this is a foundational decision and must not be validated at the finish line
- [ ] **GATE: Cloudflare R2 can be enabled without a payment method** — blocking. If not, apply the documented media fallback
- [ ] **GATE: CI rebuild strategy settled** — debounce/batch (e.g. one rebuild per 10 min) or public repo for unlimited minutes. At 45–70 articles/day, one build per publish exceeds the 2,000 min/month private-repo quota
- [ ] Cloudflare Pages project wired for the Astro frontend
- [ ] Env skeleton (`.env.example` only — no secrets committed)
- [ ] Bengali fonts pipeline (Hind Siliguri + Noto Sans Bengali + Inter, WOFF2)
- [ ] GitHub Actions CI skeleton (build + typecheck + lint)
- [ ] Payload version decision: hold 3.89.0 or pin the prior minor and upgrade after the smoke test (3.89.0 was published 2026-09-11, one day before being pinned)
- [ ] S0 DoD evidence posted → **user approval**

## S1 — CMS Content Models & RBAC
- [ ] **GATE: education feature inventory exported into `docs/`** — ❌ **NOT SATISFIED.** The existing inventory (`docs/master-plan.md`) is a general-news inventory and is obsolete for this scope. Requires a discovery round with the owner.
- [ ] **GATE: education category tree approved** — proposal in `.sps/profile.md`
- [ ] Collections: Articles, Categories, **Subcategories**, Authors, Tags, Ads, Settings, Polls, Quizzes, FactChecks, Jobs, Comments, LiveBlogs, **Newsletter Subscribers**, **Photo Galleries**, **Pages**
  - *(the four bolded collections were dropped from an earlier revision and restored by the audit — Subcategories is required by the category tree, Newsletter Subscribers by the newsletter decision, Photo Galleries by the gallery feature, Pages by the E-E-A-T pages)*
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
- [ ] Breaking ticker, lead story, category grids, trending/most-read, latest feed, ad slots (zero-CLS)
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

## S10 — Utility Widgets & Specialized Sections
- [ ] Education utility widgets per `docs/data-sources.md` — each with a confirmed free provider, rate limit and fallback behaviour
- [ ] **GATE: every widget has a free data source or is descoped** — no widget may ship on an unidentified or paid provider
- [ ] S10 DoD evidence → **user approval**

## S11 — SEO, Feeds & AI Optimization
- [ ] News sitemap (<48h), sitemap, RSS, OG/Twitter, auto OG images, canonical, `llms.txt`, robots.txt, Publisher Center, E-E-A-T pages
- [ ] URL architecture implemented: `/:category/:subcategory/:id/:slug` + shortlink for social sharing
- [ ] S11 DoD evidence → **user approval**

## S12 — Deployment, QA & Launch
- [ ] Cloudflare Pages + R2 setup; GitHub Actions pipeline; DianaHost Passenger config
- [ ] Lighthouse ≥95 **and accessibility ≥90**; LCP <1.5s; INP <100ms; CLS <0.02; TTFB <200ms (measured here, in production behind Cloudflare); initial payload <1.2MB; data-saver <30KB
- [ ] Bengali font audit, accessibility audit, load test, mobile device test
- [ ] S12 DoD evidence → **user approval → LAUNCH**
