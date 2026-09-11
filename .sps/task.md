# News Portal — SPS Task Checklist

**Rule:** strictly ONE section at a time — complete the DoD → post evidence → explicit user approval → next section. Never batch sections.
**Status legend:** `[ ]` pending · `[~]` in progress · `[x]` done · `[b]` blocked
**Commit rule:** commit immediately after every finished task (`type(scope): summary`).

---

## S0 — Foundation & Toolchain
- [x] Git repo initialized, baseline committed (2026-09-11)
- [ ] Monorepo structure created (frontend/ + cms/)
- [ ] Astro 7.3 init — build passes
- [ ] Payload CMS 3.89 init with SQLite adapter — admin reachable
- [ ] Tailwind 4.3 + TypeScript 7 + Node 24 toolchain configured
- [ ] **GATE: Payload CMS 3 on cPanel Passenger smoke test** — blocking; if it fails: STOP and ask the user
- [ ] **GATE: TypeScript 7 (Go-based) compatibility with Astro 7 + Payload 3 validated** — blocking
- [ ] Env skeleton (`.env.example` only — no secrets committed)
- [ ] Bengali fonts pipeline (Hind Siliguri + Noto Sans Bengali + Inter, WOFF2)
- [ ] GitHub Actions CI skeleton (build + typecheck + lint)
- [ ] S0 DoD evidence posted → **user approval**

## S1 — CMS Content Models & RBAC
- [x] **GATE: master plan (87+ features) exported from Antigravity into `docs/`** — satisfied 2026-09-11 (`docs/master-plan.md`: 87 numbered features, 10 innovations, competitive intel; note: export's inventory heading says "70+" but rows are numbered to 87)
- [ ] Collections: Articles, Categories, Authors, Tags, Ads, Settings, Polls, Quizzes, FactChecks, Jobs, Comments, LiveBlogs
- [ ] 5 RBAC roles: Reporter, Section Editor, Editor-in-Chief, Ad Manager, Super Admin
- [ ] Bengali admin labels
- [ ] Versioning + draft/review/publish workflow verified
- [ ] S1 DoD evidence → **user approval**

## S2 — Design System & Base Layout
- [ ] **GATE: portal name + logo + domain decided** — blocking
- [ ] Typography: Hind Siliguri (headlines) + Noto Sans Bengali (body) + Inter — ≥17px mobile, line-height ≥1.65
- [ ] Colors: Red #DA1C25 + Charcoal #1F1F1F + White; dark mode (BBC-style)
- [ ] 12-col grid, Header + utility ribbon, mega menu, Footer
- [ ] Sticky mobile share bar, text resizer
- [ ] S2 DoD evidence → **user approval**

## S3 — Homepage
- [ ] Breaking ticker, lead story, category grids, trending/most-read, latest feed, district selector, utility widgets, ad slots (zero-CLS), quiz promo
- [ ] Mobile-first + low-end Android pass (Symphony/Walton class, 3G)
- [ ] S3 DoD evidence → **user approval**

## S4 — Article Page
- [ ] Full article, takeaways box, author card, related articles, share, progress bar, audio player, comments, correction notice, timeline drawer, print view, JSON-LD
- [ ] S4 DoD evidence → **user approval**

## S5 — Category/Tag/Author/Archive
- [ ] Listings, pagination, breadcrumbs, subcategory filters, author profiles, date archive, "On This Day"
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
- [ ] Live blog engine, polls, daily quiz, before/after slider, infographic blocks, scrollytelling
- [ ] S8 DoD evidence → **user approval**

## S9 — Media, Newsletter & Engagement
- [ ] Gallery, video, photo card generator, push notifications, bookmarks, social login, citizen journalism
- [ ] Newsletter: Listmonk 6.2 — **GATE: DianaHost cPanel test; fallback per `.sps/plan.md` (self-built cPanel SMTP → Oracle Always Free VPS)**
- [ ] S9 DoD evidence → **user approval**

## S10 — Utility Widgets & Sections
- [ ] Cricket pill, AQI ribbon, weather, prayer times, currency, gold, commodities, DSE, disaster banner, jobs, education, expatriate, fact-check
- [ ] S10 DoD evidence → **user approval**

## S11 — SEO, Feeds & AI Optimization
- [ ] News sitemap (<48h), sitemap, RSS, OG/Twitter, auto OG images, canonical, hreflang, llms.txt, robots.txt, Publisher Center, E-E-A-T pages
- [ ] S11 DoD evidence → **user approval**

## S12 — Deployment, QA & Launch
- [ ] cPanel scripts, GitHub Actions pipeline, Cloudflare setup
- [ ] **GATE: SQLite WAL 5-editor concurrent load test**
- [ ] Lighthouse ≥95, LCP <1.5s, INP <100ms, CLS <0.02, TTFB <200ms, data-saver <30KB
- [ ] Bengali font audit, accessibility audit, load test, mobile device test
- [ ] S12 DoD evidence → **user approval → LAUNCH**
