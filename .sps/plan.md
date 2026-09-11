# Shikkha24 — SPS Implementation Plan

**Status:** `approved` — **scope amended 2026-09-11**
**Approved:** 2026-09-11T20:41+06:00
**Created:** 2026-09-11
**SPS Version:** 4.0.0
**Last corrected:** 2026-09-11 (third-party audit remediation — hosting/storage architecture, newsletter path, version corrections, gate placement, education re-scope)

---

## Scope amendment (2026-09-11)

The portal is an **education** portal, not a general news portal. Domain: **shikkha24.com**.

Positioning (owner's words):
- 🎓 Education News | Scholarship | Admission | University | Higher Study
- 🌍 দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ
- 📚 শিক্ষার খবর, সুযোগ ও সম্ভাবনা—এক ঠিকানায়।

**Consequence:** the 87-feature inventory in `docs/master-plan.md` and the competitive analysis in `docs/competitive-analysis.md` were produced for a general news portal. Both are **retained for reference only and are obsolete as build inputs**. A new education feature inventory, category tree and competitor set are required, and cannot be produced without a discovery round with the owner. The 13-section build order below is preserved because it is a technical sequence, but the deliverables inside each section must be re-scoped before that section starts.

---

## Approved Decisions

| Decision | Answer | Date |
|----------|--------|------|
| CMS | Payload CMS 3 (free, MIT) | 2026-09-11 |
| Feature scope | ALL features Day 1 — no phasing | 2026-09-11 |
| Comments | Custom Payload comments (Facebook/Google social login) | 2026-09-11 |
| Categories | Dynamic + subcategories, fully admin-editable | 2026-09-11 |
| Newsletter | Self-built Payload subscriber list + campaign module; delivery via a free-tier ESP API. Fallback: DianaHost cPanel SMTP at low volume | 2026-09-11 |
| Build pipeline | GitHub Actions (automated CI/CD), rebuilds debounced/batched | 2026-09-11 |
| Language | Bengali-only UI (no English toggle) | 2026-09-11 |
| Agent rules | Codified in AGENTS.md / GEMINI.md / CLAUDE.md (synced mirrors) | 2026-09-11 |
| Git workflow | Commit immediately after every finished task | 2026-09-11 |
| Hosting | Cloudflare Pages (frontend) + Cloudflare R2 (media) + DianaHost PNR 2 GB (Payload) | 2026-09-11 |
| Domain | shikkha24.com | 2026-09-11 |
| Portal type | Education portal | 2026-09-11 |
| Audio reader | Browser Web Speech API; audio bulletin descoped | 2026-09-11 |
| Utility widgets | Free public APIs only; descope anything with no free source | 2026-09-11 |
| Content velocity | Keep 45–70/day and plan to hire | 2026-09-11 |
| Portal display name / logo | Open — Shikkha24 assumed from the domain, needs owner confirmation | — |
| Education feature inventory | **Open — requires a discovery round** | — |

---

## Tech Stack (verified against live registries — 2026-09-11)

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Astro | 7.3.2 |
| CMS | Payload CMS | 3.89.0 |
| CMS Runtime | Next.js | **16.2.6+ (pin `>=16.2.6 <17.0.0`)** |
| Styling | Tailwind CSS | 4.3.3 |
| Database (launch) | SQLite | 3.53.4 |
| Database (scale) | PostgreSQL | 18.6 |
| Runtime | Node.js | 24 LTS (24.21.0) |
| Types | TypeScript | 7.0.2 |
| Build | Vite | 8.3.0 |
| Search | Pagefind | 1.5.2 |
| CDN / Frontend host | Cloudflare Pages | free tier |
| Media storage | Cloudflare R2 | 10 GB free tier |
| Newsletter | Self-built Payload module + free-tier ESP API | — |
| Push | Web Push API | — |
| Analytics | Cloudflare Web Analytics | — |
| Bengali Fonts | Hind Siliguri + Noto Sans Bengali | Google Fonts WOFF2 |
| English Font | Inter | v4 variable |
| CI/CD | GitHub Actions | — |
| Hosting (CMS) | DianaHost PNR 2 GB SSD NVMe | 2 GB / 200 GB / 50 DB |

**Verification record (2026-09-11):** every versioned row above was checked against the live npm registry and matched exactly (astro 7.3.2, payload 3.89.0, tailwindcss 4.3.3, typescript 7.0.2, vite 8.3.0, pagefind 1.5.2, Node 24 LTS 24.21.0, PostgreSQL 18.6, SQLite 3.53.4).

**Corrections applied by the third-party audit:**
- **Next.js:** the previous entry ("15.x or 16.x", peer range "≥15.2.9, ≥16.2.6") was wrong. The actual `@payloadcms/next@3.89.0` peer range is `>=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.2.6 <17.0.0`, which excludes Next 15.5.x, 16.0.0–16.2.5 and 17.x. Pin **Next 16.2.6+**.
- **Node 24 LTS:** Active LTS ends **2026-10-20**, Maintenance continues to **2028-04-30** (end-of-life). Node 26 becomes LTS on 2026-10-28. The runtime choice should be revisited at S0.
- **Payload 3.89.0 was published 2026-09-10T14:49Z — one day before being pinned.** S0 must evaluate whether to hold 3.89.0 or pin the prior minor and upgrade after the smoke test.

---

## Hosting & Storage Architecture (decided 2026-09-11)

The purchased DianaHost plan is **2 GB storage / 200 GB monthly bandwidth**. A full `node_modules` for Next.js 16 + Payload 3 is 0.7–1.2 GB, so the app cannot be deployed conventionally alongside media.

| Component | Where it runs | Why |
|-----------|---------------|-----|
| Astro static site | **Cloudflare Pages** (free, unlimited bandwidth) | Removes the 200 GB origin bandwidth cap entirely |
| Media / uploads | **Cloudflare R2** (10 GB free, zero egress fees) | Keeps media off the 2 GB host; free egress means viral traffic costs nothing |
| Payload CMS + admin | **DianaHost PNR 2 GB** | Built in CI with Next.js `output: 'standalone'` so only dependency-traced modules ship (≈300–600 MB) |
| CDN / DNS / SSL | **Cloudflare** | Free tier |

Expected DianaHost footprint after this split: **≈400–700 MB**, leaving headroom for the SQLite database and backups.

**Fallback if R2 cannot be enabled without a payment method:** media stays on DianaHost under a strict upload quota (aggressive WebP/AVIF, originals discarded, per-day upload cap). This is workable but constrains publishing volume.

**CI minutes constraint:** GitHub Actions gives 2,000 minutes/month on private repos. At 45–70 articles/day, one build per publish is 1,350–2,100 builds/month, which exceeds the quota. Rebuilds must be **debounced or batched** (e.g. one rebuild every 10 minutes via a scheduled workflow), or the repository must be public for unlimited minutes. This must be settled in S0.

---

## 13-Section Build Order

> Deliverables inside each section must be re-scoped to education before that section starts.

| # | Section | Key Deliverables |
|---|---------|-----------------|
| S0 | Foundation & Toolchain | Monorepo, Astro 7 init, Payload CMS 3 init, Tailwind 4.3, TS7, Node 24, SQLite, env, GitHub Actions CI, Cloudflare Pages + R2 wiring |
| S1 | CMS Content Models & RBAC | Education collections, 5 RBAC roles, Bengali admin labels |
| S2 | Design System & Base Layout | Typography, colors, dark mode, 12-col grid, Header, Mega menu, Footer, sticky mobile share bar, text resizer |
| S3 | Homepage | Breaking ticker, lead story, category grids, trending/most-read, latest feed, ad slots |
| S4 | Article Page | Full article, takeaways box, author card, related articles, share, progress bar, comments, correction notice, print view, JSON-LD |
| S5 | Category/Tag/Author/Archive | Listings, pagination, breadcrumbs, subcategory filters, author profiles, date archive |
| S6 | Search | Pagefind 1.5, search UI, Bengali, date/section filters |
| S7 | Ad System | AdSlot (zero-CLS), AdSense, sponsor banners, Payload ad management, sponsored content template |
| S8 | Live Blog & Interactive | Live blog engine (exam results, admission days), polls, quizzes, infographic blocks, scrollytelling |
| S9 | Media, Newsletter & Engagement | Gallery, video, Listmonk-free newsletter module, push notifications, bookmarks, social login, citizen journalism |
| S10 | Utility Widgets & Sections | Education utility widgets (see `docs/data-sources.md`) — exam calendar, result links, scholarship tracker, admission deadlines |
| S11 | SEO, Feeds & AI Optimization | News sitemap, sitemap, RSS, OG/Twitter, auto OG images, canonical, `llms.txt`, robots.txt, E-E-A-T pages |
| S12 | Deployment, QA & Launch | Cloudflare Pages + R2 setup, GitHub Actions pipeline, DianaHost Passenger config, Lighthouse ≥95, mobile test, Bengali font audit, load test, accessibility |

---

## Build Gates (mandatory)

| Gate | Condition |
|------|-----------|
| **S0 exit** | Payload-on-cPanel-Passenger smoke test passes AND TypeScript 7 toolchain validated with Astro 7 + Payload 3 |
| **S0 exit** | **Cloudflare R2 can be enabled on the owner's account without a payment method** — if not, apply the documented media fallback |
| **S0 exit** | **DianaHost provides Node.js ≥22.12** (Astro 7 requires it; Payload requires ≥20.9). The vendor publishes no Node version — confirm with DianaHost before building |
| **S0 exit** | **DianaHost inode/file-count quota confirmed** — a Next.js install contains tens of thousands of files |
| **S0 exit** | **SQLite WAL concurrency proven with 5+ concurrent writers** (moved from S12 — this is a foundational decision and must not be validated at the finish line) |
| **S0 exit** | CI rebuild strategy settled (debounce/batch, or public repo for unlimited minutes) |
| S1 entry | Education feature inventory **approved by the owner** — draft at `docs/education-feature-inventory.md` (reclassified from the original 87 features + 12 proposed new ones). **Awaiting owner approval.** |
| S2 entry | Portal display name + logo decided (domain ✅ shikkha24.com) |
| S6 entry | Bengali search quality tested on a real Bengali corpus |
| S9 entry | Newsletter sending path confirmed (ESP free tier reachable, or cPanel SMTP fallback accepted) |
| Every section exit | Full Definition of Done passes (build, typecheck, lint, performance targets) + explicit user approval |

---

## Verification Targets

| Check | Target |
|-------|--------|
| Lighthouse mobile Performance | ≥ 95 |
| Lighthouse Accessibility | **≥ 90** |
| LCP | < 1.5s |
| INP | < 100ms |
| CLS | < 0.02 |
| TTFB | < 200ms — **measured at S12 only, in production through Cloudflare.** TTFB is a hosting/CDN property and cannot be enforced from S2–S11 |
| Initial page payload | < 1.2 MB |
| Data-saver payload | < 30 KB |
| TypeScript | Zero errors |
| JSON-LD | Rich Results pass |
| News Sitemap | Valid, <48hr only |
| Bengali typography | ≥17px mobile, line-height ≥1.65 |
| Touch targets | ≥48×48px |
| Ad containers | All reserved, zero CLS |

### URL architecture (decided)

Adopt the research recommendation: **`/:category/:subcategory/:id/:slug`** — lowercase, accents stripped, no trailing slash, plus an automated shortlink for social sharing. Chosen over a slug-only scheme because it lets headlines be edited without changing the URL (the research lists URL changes without 301s among its fatal mistakes).

---

## Scope vs. performance note

ALL features ship on Day 1, and the verification targets are hard limits. **Lighthouse, TTFB, initial payload and data-saver are page-level measurements** — they are enforced on the specific page templates below, not "per feature". Any feature that cannot meet the budget on its host page must be lazy-loaded, isolated in an Astro island, or deferred, and deferral requires explicit user approval.

Pages under measurement: homepage, article page, category listing, search results, live blog, quiz page, utility hub.

*(The previous wording — "enforced per feature, not per page" — was incoherent: Lighthouse scores a page load and cannot score a feature.)*

---

## Evidence Labels

| Item | Confidence |
|------|-----------|
| Astro 7 static on Cloudflare Pages | Known — static HTML on Pages is a documented, first-class use case |
| Cloudflare R2 as media origin | Known — but **whether R2 can be enabled without a payment method is UNVERIFIED**. S0 exit gate |
| Payload CMS 3 on cPanel Passenger | **Assumed — needs testing.** S0 exit gate: smoke test required; if it fails, STOP and ask the user (any fallback is a budget decision, not an agent decision) |
| Next.js standalone output fitting in ≈300–600 MB | Assumed — must be measured in S0 |
| TypeScript 7 (Go-based) + Astro 7/Payload 3 toolchain | Assumed — validate in S0. Note TS 7 ships 20 platform-specific native binaries, and Astro 7 / Tailwind 4.3 / Vite 8 / Pagefind are also native (Rust/Go) toolchains — builds should therefore run in CI, not on the shared host |
| DianaHost Node.js ≥22.12 availability | **Unverified** — the vendor publishes no Node version. S0 exit gate |
| DianaHost inode quota | **Unverified** — not published. S0 exit gate |
| SQLite WAL for 5+ editors | Assumed — **concurrency test moved to S0** |
| Pagefind Bengali search | **Unverified** — test with a real Bengali corpus in S6 |
| Payload CMS Bengali admin labels | Assumed — i18n supported |
| Free-tier ESP deliverability | Assumed — validate in S9 with a real send |
| Newsletter sending from DianaHost cPanel SMTP | **Not viable for bulk.** cPanel enforces per-domain hourly send caps, and bulk sending from a shared IP risks blacklisting the domain. Retained only as a low-volume fallback |
| Self-hosted Listmonk | **Rejected.** Requires PostgreSQL and a VPS. No free VPS is obtainable without a card, and Oracle Cloud Always Free requires a card at signup |

---

## Data sources

All live-data widgets depend on free public APIs. Provider, rate limit, cost and fallback behaviour per widget are recorded in **`docs/data-sources.md`**. Any widget without a credible free source is descoped rather than assumed.

---

## Competitive Intelligence Source

Plan informed by analysis of:
- **BD news portals (obsolete for this scope):** Prothom Alo, bdnews24, Daily Star, Samakal, Jugantor, Kaler Kantho, Jago News 24, Bangla Tribune, Ittefaq
- **International portals (obsolete for this scope):** BBC, Guardian, Al Jazeera, CNN, NYT, NHK, NDTV
- **Education competitor set — DONE 2026-09-11:** `docs/education-competitors.md`. Five groups: dedicated education portals (Dainik Shiksha, Shiksha Sangbad), education sections of general portals, official government portals (educationboardresults.gov.bd, xiclassadmission.gov.bd), third-party SEO aggregators (xiadmission.bd, xiclassbd, eduboardresults.bd), and exam-prep platforms (bcsstudy.com, xam.bd). Key opening identified: the aggregators rank on the highest-intent queries with slow, ad-heavy pages — a fast, zero-CLS, Bengali-first page on the same queries is winnable.
- **Feature inventory — DRAFTED 2026-09-11, awaiting approval:** `docs/education-feature-inventory.md`

---

## Open decisions (block S1 entry)

- [ ] **Approve the education feature inventory** (`docs/education-feature-inventory.md`) — category tree, the 12 proposed `[NEW]` features, whether to keep weather/prayer utilities, whether BCS/job-circular content is in scope
- [ ] Portal display name and logo
- [ ] Hands-on audit of the two direct competitors (Dainik Shiksha, Shiksha Sangbad)
- [ ] Whether to revise the 45–70/day velocity target now that the subject is narrower than general news
