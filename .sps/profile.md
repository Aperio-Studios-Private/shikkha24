# SPS Project Profile

## Required skill
- `/sps` required for this project: yes

## Project identity
- Name: **Shikkha24 (শিক্ষা২৪)** — ✅ **CONFIRMED 2026-09-12** by the owner, derived from the domain. **CMS-editable** via Site Settings.
- Domain: **shikkha24.com** — ✅ **registered** (owner-confirmed 2026-09-11). DNS configuration not yet provided; the owner will supply it later. Reachability could not be verified from the auditing environment.
- Logo: **real logo supplied** (owner-supplied 2026-09-13, Illustrator-exported) — `docs/assets/logo.svg`. The logo is a **CMS-managed field** (Site Settings global), so it can be replaced without a code change. The logo and the site name are **independent** (owner decision 2026-09-13): the logo renders as a **mark beside** the name, never in place of it, and the name is derived from `siteName` on every page.
- Goal: Bangladesh's best **education** news and opportunity portal — production-grade, Bengali-first
- Positioning (owner's words, verbatim):
  - 🎓 Education News | Scholarship | Admission | University | Higher Study
  - 🌍 দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ
  - 📚 শিক্ষার খবর, সুযোগ ও সম্ভাবনা—এক ঠিকানায়।
- Users: Students (school/college/university), parents, exam and job candidates (SSC/HSC/BCS/admission), teachers and educators, institutions, plus the editorial team and ad managers
- Type: **Education news portal** — domestic and international education news, scholarships, admission, university, higher study

## Budget
- Zero recurring software/platform fees
- **No international credit/debit card available.** This is a hard constraint: every paid third-party service is unusable, including Oracle Cloud (requires a card at signup), paid SMTP relays, paid TTS APIs, paid data APIs, and paid object storage.
- Payable infrastructure is limited to what can be bought locally (bKash / bank transfer) — currently DianaHost only
- Cloudflare account is active and available (free tier needs no card)
- Hosting purchased: **DianaHost PNR 2 GB SSD NVMe** — 2 GB storage, 200 GB/month bandwidth, 3 addon domains, 30 sub-domains, 30 FTP accounts, 50 databases, unlimited email accounts, cPanel, SSH on demand, Python/Ruby/Node.js support (~$47.04/year)

## Hosting & storage architecture (decided 2026-09-11)
- **Frontend (Astro static) → Cloudflare Pages** — free, unlimited bandwidth. Removes the 200 GB/month origin bandwidth cap.
- **Media → Cloudflare R2** — 10 GB free tier, zero egress fees. **The owner has a payment method on the Cloudflare account** (confirmed 2026-09-11), so R2 can be enabled. ⚠️ Because a card is on file, exceeding 10 GB would incur real charges — **set a usage alert at 80%**. Verification command: `wrangler login && wrangler r2 bucket list`.
- **Payload CMS → DianaHost PNR 2 GB**, built in CI with Next.js `output: 'standalone'` so only dependency-traced modules ship (≈300–600 MB) instead of a full `node_modules` (0.7–1.2 GB).
- Rationale: a full `node_modules` plus media cannot fit in 2 GB. Offloading the frontend and media, and building slim in CI, brings the host footprint to roughly 400–700 MB.
- **Deployment model:** both builds run in GitHub Actions on **Node 24**; only artifacts ship. Full detail, quotas and escalation ladder in **`docs/hosting-and-deployment.md`**.
- **Repository: PRIVATE** (owner decision). This caps GitHub Actions at 2,000 minutes/month and makes the rebuild strategy load-bearing.

## Node.js version on DianaHost — open risk
- DianaHost runs **Node.js 20.18.2** (owner-confirmed 2026-09-11).
- `astro@7.3.2` needs `>=22.12.0` and `vite@8.3.0` needs `^20.19.0 || >=22.12.0` → **both fail on 20.18.2**. They therefore build in CI only, never on the host. This independently justifies the Cloudflare Pages split: had the frontend been built on the host, Astro 7 would have been impossible.
- `next@16.3.4` (`>=20.9.0`) and `@payloadcms/next@3.89.0` (`^18.20.2 || >=20.9.0`) **do** accept 20.18.2, so Payload can run there.
- ⚠️ **But Node 20 reached end-of-life on 2026-04-30** — no security patches, on a public-facing CMS admin handling editor credentials and reader PII.
- **Owner action:** cPanel → Software → *Select Node.js Version* → Edit → **Change Node.js version** → select 22.x or 24.x if offered. If only 20.x is available, this becomes a documented accepted risk.

## Mobile / performance policy
- Mobile default: mobile-first (90%+ of BD readers on mobile per the research; note the Prothom Alo desk figure of 51% mobile in `docs/competitive-analysis.md:18` measures all visitors including desktop-heavy direct traffic — the two are not the same metric and the docs must not present them as equivalent)
- Richer mobile motion allowed: minimal by default; richer motion permitted only for specific S8 interactive features, lazy-loaded and isolated in Astro islands
- Performance priority: speed — LCP < 1.5s, zero CLS, Lighthouse ≥ 95
- Data-saver mode: <30 KB ultra-lite mode available
- Target devices: Symphony, Walton, Xiaomi, Realme, Samsung A-series on 3G/4G

## Project-only rules
- Typography: **SolaimanLipi only** — one Bengali family for BOTH headline and body (owner decision 2026-09-12). **Inter DROPPED** (83 KB/weight would have pushed fonts to 234 KB against a 200 KB ceiling); Latin/UI text uses a system UI stack.
  - **Why SolaimanLipi:** reader familiarity — it is what the major Bangladeshi newspapers are set in. Verified technically: **SIL Open Font License** (vendored at `assets/fonts/vendor/` with `OFL.txt`), **154.0 KB** for two weights subset to Bengali + Latin, full Indic shaping (`akhn, blwf, half, liga, nukt, pstf, vatu`) so যুক্তাক্ষর conjuncts form correctly, all 10 Bengali numerals and all vowel signs present.
  - **History:** Hind Siliguri was removed first (owner: text hard to read, a numeral would not render; only 92/128 Bengali codepoints, missing ৲ ৼ ৽ ৾). Noto Sans Bengali (110.5 KB, 96/128) was the interim single-family choice, then replaced when the owner named SolaimanLipi.
  - Not on Google Fonts — sourced from an OFL redistribution, which the licence permits.
- Colors: brand red #DA1C25 + brand charcoal #1F1F1F + white — Prothom Alo inspired. Dark-mode base is #121212 (a separate token, not "charcoal").
- Motion: minimal — breaking ticker, subtle hover, reading progress bar; richer motion only inside lazy-loaded S8 islands
- Stack: Astro 7.3 (frontend) + Payload CMS 3 (backend) + SQLite → PostgreSQL
- CMS: Payload CMS 3 (headless, free, MIT, built-in versioning + workflows)
- Design Reference: Prothom Alo (layout), Bangla Tribune (typography/whitespace), BBC (dark mode), Guardian (live blog)
- CDN: Cloudflare Free Tier
- Deploy Target: Cloudflare Pages (frontend) + DianaHost PNR 2 GB (Payload CMS)
- CI/CD: GitHub Actions (automated build + deploy). **Repository is private** → 2,000 Actions minutes/month, plus **Cloudflare Pages 500 builds/month**. Rebuilds are **adaptively batched** (15–30 min quiet, 5 min peak, on-demand for breaking news). Whether the quota is comfortable depends on the measured incremental build time — an S0 gate. Full detail: `docs/hosting-and-deployment.md`.
- Newsletter: **self-built subscriber list and campaign module inside Payload** (owner's data stays self-hosted) with delivery via a free-tier ESP API (e.g. Brevo, 300/day, no card required). Documented fallback: DianaHost cPanel SMTP at low volume.
  - Why not Listmonk: it needs its own PostgreSQL and a VPS. There is no free VPS without a card, and **Oracle Cloud Always Free is not usable** (requires a card at signup).
  - Why not bulk-send from cPanel SMTP: cPanel enforces per-domain hourly send caps, and bulk sending from a shared IP risks blacklisting the domain — which would also break password resets and contact forms. This is why the ESP is primary and cPanel SMTP is only a fallback.
- Audio/TTS: **Browser Web Speech API** (client-side, free, no server cost). The twice-daily audio bulletin is not supported by this approach and is descoped.
- Utility data: **free public APIs only**, accepting rate limits and no SLA. See `docs/data-sources.md`. Any widget with no credible free source is descoped.
- Workflow: section-by-section with explicit user approval; zero assumptions (ask first, research before build); immediate commit after every finished task — full rules in AGENTS.md / GEMINI.md / CLAUDE.md

## Language
- Bengali only UI (NO English toggle)
- Bengali date/time display (বঙ্গাব্দ + হিজরি calendars)
- English articles allowed as optional content

## Editorial Workflow (Payload built-in)
- Reporter: Draft → Submit for Review
- Section Editor: Review → Approve/Reject with feedback → Publish
- Editor-in-Chief: Direct publish, homepage control, breaking news
- Ad Manager: Ad units and campaigns only
- Super Admin: Full access

## Categories — APPROVED 2026-09-11
Dynamic and admin-editable. Full detail in `docs/education-feature-inventory.md`.

**Top-level (8):** শিক্ষা সংবাদ · বৃত্তি ও স্কলারশিপ · ভর্তি · বিশ্ববিদ্যালয় · উচ্চশিক্ষা · বিদেশে পড়াশোনা · পরীক্ষা ও ফলাফল · চাকরি ও ক্যারিয়ার

**Cross-cutting filter axes (separate from categories):**
- **Level:** প্রাথমিক · মাধ্যমিক · উচ্চ মাধ্যমিক · স্নাতক · স্নাতকোত্তর
- **District:** 64 districts (আমার জেলা)

**Why no স্কুল-কলেজ category:** it is an audience segment, not a topic. Top-level placement would overlap শিক্ষা সংবাদ, ভর্তি and পরীক্ষা ও ফলাফল simultaneously, split internal linking, and put two of the portal's own pages in competition for the same query. School/college readers are served by the **level filter** across the whole site; a dedicated hub page, if wanted, is a special section built on that filter.

**Out of scope (from the superseded general-news plan):** রাজনীতি, ব্যবসা-বাণিজ্য, খেলাধুলা, বিনোদন, প্রযুক্তি, আন্তর্জাতিক, লাইফস্টাইল, মতামত, স্বাস্থ্য, সত্যতা যাচাই.

**Retained as light header utilities:** weather (Open-Meteo) and prayer times + Hijri date (Aladhan) — owner decision 2026-09-11. Server-side fetched, cached, deferred, zero CLS.

## Feature scope
- ALL features on Day 1 (no phasing — "quality over speed")
- **The 87-feature general-news inventory in `docs/master-plan.md` is obsolete.** It covers politics, business, sports, entertainment, cricket scores, DSE tickers, gold and commodity prices — none of which belong in an education portal. Reference only.
- **Education feature inventory — ✅ APPROVED 2026-09-11:** `docs/education-feature-inventory.md`. Built by reclassifying the original 87 features into retained-unchanged / re-scoped / descoped, plus **10 new education-specific features** (12 proposed, 2 pairs merged to avoid self-cannibalisation). Two of the ten ship with a curated starter dataset rather than empty (institution directory; study-abroad guides). Nothing was invented — every new item is now an approved decision with recorded rationale.
- **Education competitor set — ✅ researched 2026-09-11:** `docs/education-competitors.md`. Direct competitors are Dainik Shiksha and Shiksha Sangbad; the sharpest opening is the third-party SEO aggregators, who rank on the highest-intent queries with slow, ad-heavy pages.
- Content velocity — ✅ **DECIDED 2026-09-11: baseline + burst.** Baseline **15–20 articles/day** with the existing 5-person team, surging to **40+ on result days, admission days and circular days**. This replaces the 45–70/day flat target, which implied 15–23 staff. Rationale: education publishing is spiky, not flat, and 45–70/day ÷ 5 people = 9–14 articles per person per day (3–5× a normal reporter's output). See `docs/education-feature-inventory.md` §7.
- Editorial team: **5 people already in place** (confirmed 2026-09-11) — no hiring prerequisite.
- Content: **greenfield launch** — no migration from an existing site (confirmed 2026-09-11).

## Explicit approvals
- ✅ Plan approved (2026-09-11T20:41+06:00) — **superseded in scope by the education re-scope below**
- ✅ Payload CMS 3 over Strapi 5 CE
- ✅ All features Day 1
- ✅ Custom comments (social login)
- ✅ Dynamic categories (admin-editable)
- ✅ GitHub Actions CI/CD
- ✅ Bengali-only UI
- ✅ Agent rules codified in AGENTS.md / GEMINI.md (2026-09-11)
- ✅ Git repo initialized; immediate-commit workflow (2026-09-11)
- ✅ Stack versions verified against live registries (2026-09-11)
- ✅ **Portal domain: shikkha24.com** (2026-09-11)
- ✅ **Portal is an EDUCATION portal, not a general news portal** (2026-09-11) — owner's positioning statement recorded above
- ✅ **Hosting/storage architecture: Cloudflare Pages + Cloudflare R2 + slim Payload on DianaHost 2 GB** (2026-09-11)
- ✅ **Newsletter: self-built Payload list + free-tier ESP delivery; cPanel SMTP as fallback** (2026-09-11) — supersedes the Listmonk decision
- ✅ **Audio reader: Browser Web Speech API; audio bulletin descoped** (2026-09-11)
- ✅ **Utility widgets: free public APIs only; descope anything with no free source** (2026-09-11)
- ✅ ~~Content velocity: keep 45–70/day and plan to hire~~ — **superseded twice**; final decision 2026-09-11 is **baseline 15–20/day + burst to 40+** with the existing 5-person team (see Feature scope)
- ✅ **Education feature inventory approved** (2026-09-11) — 8-category tree + cross-cutting level filter; 10 new education features; BCS/job-circular content in scope; weather + prayer utilities retained as light header utilities; স্কুল-কলেজ handled as a level filter rather than a category
- ✅ **Delete the superseded Strapi root plan** (2026-09-11)
- ✅ **Publishing velocity: baseline 15–20/day + burst to 40+ on event days** (2026-09-11) — replaces the 45–70/day flat target
- ✅ **Editorial team: 5 people already in place** (2026-09-11) — no hiring prerequisite
- ✅ **Content: greenfield launch** (2026-09-11) — no migration
- ✅ **Repository: private** (2026-09-11)
- ✅ **Cloudflare account has a payment method on file** (2026-09-11) → R2 is enableable
- ✅ **AdSense account activated** (2026-09-11) → AdSense is definitely shipping, so the two-profile Lighthouse measurement (≥95 no-ads, ≥85 with-ads) is adopted
- ✅ **Social login (Facebook/Google): keep** (2026-09-11) — Meta Login and Google OAuth are **free**; only app review (a process, not a cost) is required. No cost → no reason to drop them
- ✅ **Logo: real logo supplied, CMS-editable** (2026-09-13)
- ✅ **Logo and site name are independent; a rename propagates everywhere** (2026-09-13) — the uploaded logo renders as a mark beside the name (never replacing it), a new `showNameWithLogo` toggle (default on) is the only way to hide the name, the wordmark auto-accents its trailing digit/Latin run, and no site name is hardcoded anywhere — every occurrence reads `settings.siteName`

## Explicit rejections
- ❌ Strapi 5 CE (missing review workflows, versioning, scheduled publish in free tier)
- ❌ Giscus comments (requires GitHub account — readers don't have)
- ❌ Bilingual UI toggle (portal is Bangladesh-focused, Bengali only)
- ❌ Manual FTP deployment (GitHub Actions chosen)
- ❌ AMP (obsolete in 2026, Astro static is faster)
- ❌ **Oracle Cloud Always Free** (2026-09-11) — requires a credit card at signup, which the owner does not have. This removes the previously documented newsletter fallback.
- ❌ **Listmonk** (2026-09-11) — needs its own PostgreSQL and a VPS; no free VPS is available without a card
- ❌ Paid third-party services of any kind — the owner has no international card, so this is now a hard technical constraint, not only a budget preference
- ❌ Initial root plan doc (Strapi-based) — **deleted 2026-09-11; `.sps/plan.md` is the only plan**
- ❌ The 87-feature general-news inventory — obsolete after the education re-scope

## Open decisions (require the owner)
- [ ] **Check the cPanel Node.js Selector for Node 22/24** — DianaHost currently runs **Node 20.18.2, which is end-of-life since 2026-04-30**. Payload/Next work on it, but it is a security risk. Select 22/24 if offered.
- [ ] **Raise one DianaHost support ticket** covering: inode/file-count quota, CPU/memory/process limits, hourly email send limits, and whether account-level backups exist and can be restored. **None of these are published in their knowledge base.**
- [ ] **Verify R2 is enabled** — `wrangler login && wrangler r2 bucket list` (wrangler 4.125.0 is installed locally but not authenticated). Then set a usage alert at 80% of 10 GB, since a card is on file.
- [ ] **DNS configuration for shikkha24.com** — owner will provide
- [x] **Real logo** — ✅ supplied 2026-09-13 (Illustrator-exported, `docs/assets/logo.svg`). CMS-managed field, drops in through the admin with no code change.
- [ ] **Legal details for the E-E-A-T pages** — Trade License, TIN, Ministry of Information registration. Owner will provide **before final deploy**.
- [x] Portal display name final confirmation (Shikkha24 / শিক্ষা২৪?) — ✅ **CONFIRMED 2026-09-12**: Shikkha24 / শিক্ষা২৪
- [ ] Hands-on audit of the two direct competitors (Dainik Shiksha, Shiksha Sangbad)
- [ ] Decide repository visibility if the CI quota proves tight (public = unlimited minutes)
- [ ] Start the Meta app review for Facebook Login early (free, but slow)
