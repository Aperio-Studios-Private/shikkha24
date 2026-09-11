# SPS Project Profile

## Required skill
- `/sps` required for this project: yes

## Project identity
- Name: **Shikkha24 (শিক্ষা২৪)** — derived from the confirmed domain `shikkha24.com`; owner confirmation of the display name/logo still pending
- Domain: **shikkha24.com** — decided. Reachability unverified (DNS lookup failed from the auditing environment on 2026-09-11)
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
- **Frontend (Astro static) → Cloudflare Pages** — free, unlimited bandwidth, no card required. Removes the 200 GB/month origin bandwidth cap.
- **Media → Cloudflare R2** — 10 GB free tier, zero egress fees. **S0 gate: confirm R2 can be enabled on the owner's Cloudflare account without a payment method.** Fallback if it cannot: media stays on DianaHost under a strict upload quota.
- **Payload CMS → DianaHost PNR 2 GB**, built in CI with Next.js `output: 'standalone'` so only dependency-traced modules ship (≈300–600 MB) instead of a full `node_modules` (0.7–1.2 GB).
- Rationale: a full `node_modules` plus media cannot fit in 2 GB. Offloading the frontend and media, and building slim in CI, brings the host footprint to roughly 400–700 MB.

## Mobile / performance policy
- Mobile default: mobile-first (90%+ of BD readers on mobile per the research; note the Prothom Alo desk figure of 51% mobile in `docs/competitive-analysis.md:18` measures all visitors including desktop-heavy direct traffic — the two are not the same metric and the docs must not present them as equivalent)
- Richer mobile motion allowed: minimal by default; richer motion permitted only for specific S8 interactive features, lazy-loaded and isolated in Astro islands
- Performance priority: speed — LCP < 1.5s, zero CLS, Lighthouse ≥ 95
- Data-saver mode: <30 KB ultra-lite mode available
- Target devices: Symphony, Walton, Xiaomi, Realme, Samsung A-series on 3G/4G

## Project-only rules
- Typography: Hind Siliguri (headlines) + Noto Sans Bengali (body) + Inter (English/UI)
- Colors: brand red #DA1C25 + brand charcoal #1F1F1F + white — Prothom Alo inspired. Dark-mode base is #121212 (a separate token, not "charcoal").
- Motion: minimal — breaking ticker, subtle hover, reading progress bar; richer motion only inside lazy-loaded S8 islands
- Stack: Astro 7.3 (frontend) + Payload CMS 3 (backend) + SQLite → PostgreSQL
- CMS: Payload CMS 3 (headless, free, MIT, built-in versioning + workflows)
- Design Reference: Prothom Alo (layout), Bangla Tribune (typography/whitespace), BBC (dark mode), Guardian (live blog)
- CDN: Cloudflare Free Tier
- Deploy Target: Cloudflare Pages (frontend) + DianaHost PNR 2 GB (Payload CMS)
- CI/CD: GitHub Actions (automated build + deploy). **CI minutes constraint:** 2,000 min/month on private repos; at 45–70 articles/day one build per publish exceeds that. Rebuilds must be debounced/batched (e.g. one rebuild per 10 minutes), or the repo must be public for unlimited minutes.
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

## Categories (PROPOSED — requires owner approval)
Derived from the owner's stated pillars. Dynamic and admin-editable.

- শিক্ষা সংবাদ (Education News)
- বৃত্তি ও স্কলারশিপ (Scholarship)
- ভর্তি (Admission)
- বিশ্ববিদ্যালয় (University)
- উচ্চশিক্ষা (Higher Study)
- বিদেশে পড়াশোনা (Study Abroad) — from "দেশ-বিদেশের"
- পরীক্ষা ও ফলাফল (Exams & Results)
- চাকরি ও ক্যারিয়ার (Jobs & Career)

**Out of scope (from the superseded general-news plan):** রাজনীতি, ব্যবসা-বাণিজ্য, খেলাধুলা, বিনোদন, প্রযুক্তি, আন্তর্জাতিক, লাইফস্টাইল, মতামত, স্বাস্থ্য, সত্যতা যাচাই.

## Feature scope
- ALL features on Day 1 (no phasing — "quality over speed")
- **The 87-feature general-news inventory in `docs/master-plan.md` is obsolete.** It covers politics, business, sports, entertainment, cricket scores, DSE tickers, gold and commodity prices — none of which belong in an education portal. Reference only.
- **Education feature inventory drafted 2026-09-11:** `docs/education-feature-inventory.md`. Built by reclassifying the original 87 features into retained-unchanged / re-scoped / descoped, plus 12 new education-specific features marked `[NEW]`. **Status: PROPOSAL — awaiting owner approval.** Nothing in it has been invented; every `[NEW]` item is explicitly flagged for a decision.
- **Education competitor set researched 2026-09-11:** `docs/education-competitors.md`. Direct competitors are Dainik Shiksha and Shiksha Sangbad; the sharpest opening is the third-party SEO aggregators, who rank on the highest-intent queries with slow, ad-heavy pages.
- Content velocity: the owner has elected to keep the 45–70 articles/day target **and plan to hire**. Team size is therefore a launch prerequisite, not a fixed constraint. (Note: the plan's own desk allocation sums to 42–56/day, which must be reconciled with 45–70 during re-planning — and the desk allocation itself is general-news scope and needs redrawing.)

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
- ✅ **Content velocity: keep 45–70/day and plan to hire** (2026-09-11)
- ✅ **Delete the superseded Strapi root plan** (2026-09-11)

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
- [ ] **Approve the education feature inventory** (`docs/education-feature-inventory.md`) — the 8-category tree, the 12 `[NEW]` features, whether weather/prayer utilities stay, whether BCS/job-circular content is in scope
- [ ] Portal display name confirmation (Shikkha24 / শিক্ষা২৪?) and logo
- [ ] Hands-on audit of the two direct competitors (Dainik Shiksha, Shiksha Sangbad) — page speed, ad density, actual feature set
- [ ] Whether the 45–70/day velocity target is revised now or after hiring
- [ ] Whether to publish BCS/job-circular content (high traffic, but adjacent to "education")
