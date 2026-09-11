# News Portal — SPS Implementation Plan

**Status:** `approved`
**Approved:** 2026-09-11T20:41+06:00
**Created:** 2026-09-11
**SPS Version:** 4.0.0

---

## Approved Decisions

| Decision | Answer | Date |
|----------|--------|------|
| CMS | Payload CMS 3 (free, MIT) — "make it very user-friendly" | 2026-09-11 |
| Feature scope | ALL features Day 1 — no phasing | 2026-09-11 |
| Comments | Custom Payload comments (Facebook/Google social login) | 2026-09-11 |
| Categories | Dynamic + subcategories, fully admin-editable | 2026-09-11 |
| Newsletter | Listmonk 6.2 (self-hosted, best option) | 2026-09-11 |
| Build pipeline | GitHub Actions (automated CI/CD) | 2026-09-11 |
| Language | Bengali-only UI (no English toggle) | 2026-09-11 |
| Portal name | TBD (placeholder until decided) | — |

---

## Tech Stack (Verified Sep 11, 2026)

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Astro | 7.3.2 |
| CMS | Payload CMS | 3.89.0 |
| CMS Runtime | Next.js | 15.x |
| Styling | Tailwind CSS | 4.3.3 |
| Database (launch) | SQLite | 3.53.4 |
| Database (scale) | PostgreSQL | 18.6 |
| Runtime | Node.js | 24 LTS |
| Types | TypeScript | 7.0.2 |
| Build | Vite | 8.3.0 |
| Search | Pagefind | 1.5.2 |
| CDN | Cloudflare Free | — |
| Newsletter | Listmonk | 6.2.0 |
| Push | Web Push API + FCM | — |
| Analytics | Cloudflare Web Analytics | — |
| Bengali Fonts | Hind Siliguri + Noto Sans Bengali | Google Fonts WOFF2 |
| English Font | Inter | v4 variable |
| CI/CD | GitHub Actions | — |
| Hosting | DianaHost PNR 3GB SSD | ৳6,999/year |

---

## 13-Section Build Order

| # | Section | Key Deliverables |
|---|---------|-----------------|
| S0 | Foundation & Toolchain | Monorepo, Astro 7 init, Payload CMS 3 init, Tailwind 4.3, TS7, Node 24, SQLite, env, GitHub Actions CI |
| S1 | CMS Content Models & RBAC | All collections (Articles, Categories, Authors, Tags, Ads, Settings, Polls, Quizzes, FactChecks, Jobs, Comments, LiveBlogs), 5 RBAC roles, Bengali admin labels |
| S2 | Design System & Base Layout | Typography, colors, dark mode, 12-col grid, Header (utility ribbon), Mega menu, Footer, sticky mobile share bar, text resizer |
| S3 | Homepage | Breaking ticker, lead story, category grids, trending/most-read, latest feed, district selector, utility widgets, ad slots, quiz promo |
| S4 | Article Page | Full article, takeaways box, author card, related articles, share, progress bar, audio player, comments, correction notice, timeline drawer, print view, JSON-LD |
| S5 | Category/Tag/Author/Archive | Listings, pagination, breadcrumbs, subcategory filters, author profiles, date archive, "On This Day" |
| S6 | Search | Pagefind 1.5, search UI, Bengali, date/section filters |
| S7 | Ad System | AdSlot (zero-CLS), AdSense, sponsor banners, Payload ad management, sponsored content template |
| S8 | Live Blog & Interactive | Live blog engine, polls, daily quiz, before/after slider, infographic blocks, scrollytelling |
| S9 | Media, Newsletter & Engagement | Gallery, video, photo card generator, Listmonk, push notifications, bookmarks, social login, citizen journalism |
| S10 | Utility Widgets & Sections | Cricket pill, AQI ribbon, weather, prayer, currency, gold, commodities, DSE, disaster banner, jobs, education, expatriate, fact-check |
| S11 | SEO, Feeds & AI Optimization | News sitemap, sitemap, RSS, OG/Twitter, auto OG images, canonical, hreflang, llms.txt, robots.txt, Publisher Center, E-E-A-T pages |
| S12 | Deployment, QA & Launch | cPanel scripts, GitHub Actions pipeline, Cloudflare setup, Lighthouse ≥95, mobile test, Bengali font audit, load test, accessibility |

---

## Verification Targets

| Check | Target |
|-------|--------|
| Lighthouse mobile | ≥ 95 |
| LCP | < 1.5s |
| INP | < 100ms |
| CLS | < 0.02 |
| TTFB | < 200ms |
| Data-saver payload | < 30 KB |
| TypeScript | Zero errors |
| JSON-LD | Rich Results pass |
| News Sitemap | Valid, <48hr only |
| Bengali typography | ≥17px mobile, line-height ≥1.65 |
| Touch targets | ≥48×48px |
| Ad containers | All reserved, zero CLS |

---

## Evidence Labels

| Item | Confidence |
|------|-----------|
| Astro 7 static on cPanel | Known |
| Astro 7 incremental builds | Known (v7.2) |
| Payload CMS 3 on cPanel Passenger | Assumed — needs testing |
| SQLite WAL for 5+ editors | Known |
| Pagefind Bengali search | Unverified — CJK segmentation exists |
| Payload CMS Bengali admin labels | Assumed — i18n supported |
| Listmonk on shared hosting | Risky — Fallback: Railway.app free tier or Render free tier (both support Go binary + PostgreSQL). Test DianaHost first; if cPanel can't run the Go binary, deploy Listmonk separately. |

---

## Competitive Intelligence Source

Plan informed by deep analysis of:
- **BD Portals:** Prothom Alo, bdnews24, Daily Star, Samakal, Jugantor, Kaler Kantho, Jago News 24, Bangla Tribune, Ittefaq
- **International:** BBC, Guardian, Al Jazeera, CNN, NYT, NHK, NDTV
- Full reports archived in Antigravity conversation artifacts
