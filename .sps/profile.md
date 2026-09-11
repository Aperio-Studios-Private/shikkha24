# SPS Project Profile

## Required skill
- `/sps` required for this project: yes

## Project identity
- Name: TBD (undecided — user to finalize before S2 Design System)
- Goal: Build Bangladesh's best news portal — production-grade, Bengali-first, competition-crushing
- Users: General public (news readers), Editorial team (5+ reporters/editors), Ad managers
- Type: General news portal (politics, business, sports, entertainment, tech, lifestyle, international, opinion, education, health + jobs, BCS prep, fact-check)

## Budget
- Zero recurring software/platform fees
- Domain + DianaHost PNR 3GB SSD (৳6,999/year) + Cloudflare free CDN
- NO paid third-party services; NO limited free-tier SaaS for core infrastructure — self-hosted/self-built preferred, genuinely free & unlimited only

## Mobile / performance policy
- Mobile default: mobile-first (90%+ of BD readers on mobile)
- Richer mobile motion allowed: no (low-end Android device priority)
- Performance priority: speed — sub-second LCP, zero CLS, 95+ Lighthouse
- Data-saver mode: <30KB ultra-lite mode available
- Target devices: Symphony, Walton, Xiaomi, Realme, Samsung A-series on 3G/4G

## Project-only rules
- Typography: Hind Siliguri (headlines) + Noto Sans Bengali (body) + Inter (English/UI)
- Colors: Red (#DA1C25) + Charcoal (#1F1F1F) + White — Prothom Alo inspired
- Motion: Minimal — breaking ticker, subtle hover, reading progress bar only
- Stack: Astro 7.3 (frontend) + Payload CMS 3 (backend) + SQLite → PostgreSQL
- CMS: Payload CMS 3 (headless, free, MIT, built-in versioning + workflows)
- Design Reference: Prothom Alo (layout), Bangla Tribune (typography/whitespace), BBC (dark mode), Guardian (live blog)
- CDN: Cloudflare Free Tier
- Deploy Target: DianaHost PNR 3GB SSD (cPanel + Passenger)
- CI/CD: GitHub Actions (automated build + deploy)
- Newsletter: Listmonk 6.2 (self-hosted email marketing)
- Newsletter fallback: self-built Payload newsletter via DianaHost cPanel SMTP → Oracle Cloud Always Free VPS for Listmonk (user-approved 2026-09-11)
- Workflow: section-by-section with explicit user approval; zero assumptions (ask first, research before build); immediate commit after every finished task — full rules in AGENTS.md / GEMINI.md

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

## Categories (dynamic, admin-editable)
- রাজনীতি → জাতীয়, সংসদ, স্থানীয় সরকার
- ব্যবসা-বাণিজ্য → অর্থনীতি, শেয়ারবাজার, ব্যাংক-বীমা
- খেলাধুলা → ক্রিকেট, ফুটবল, অন্যান্য
- বিনোদন → চলচ্চিত্র, সংগীত, টেলিভিশন
- প্রযুক্তি → গ্যাজেট, সফটওয়্যার, সামাজিক মাধ্যম
- আন্তর্জাতিক → এশিয়া, মধ্যপ্রাচ্য, ইউরোপ-আমেরিকা
- লাইফস্টাইল (flat)
- মতামত (flat)
- শিক্ষা (flat)
- স্বাস্থ্য (flat)
- চাকরি (Jobs — special section)
- সত্যতা যাচাই (Fact Check — special section)

## Feature scope
- ALL features on Day 1 (no phasing — "quality over speed")
- 87+ features across 8 categories
- 10 unique innovations no BD portal has
- Full inventory to be exported from the Antigravity session into `docs/` (prompt: `.sps/antigravity-export-prompt.md`)

## Explicit approvals
- ✅ Plan approved (2026-09-11T20:41+06:00)
- ✅ Payload CMS 3 over Strapi 5 CE
- ✅ All features Day 1
- ✅ Custom comments (social login)
- ✅ Dynamic categories (admin-editable)
- ✅ Listmonk newsletter
- ✅ GitHub Actions CI/CD
- ✅ Bengali-only UI
- ✅ Agent rules codified in AGENTS.md / GEMINI.md (2026-09-11)
- ✅ Git repo initialized; immediate-commit workflow (2026-09-11)
- ✅ Newsletter fallback: self-built cPanel SMTP → Oracle Always Free VPS (2026-09-11)
- ✅ Stack versions verified against live registries (2026-09-11)

## Explicit rejections
- ❌ Strapi 5 CE (missing review workflows, versioning, scheduled publish in free tier)
- ❌ Giscus comments (requires GitHub account — readers don't have)
- ❌ Bilingual UI toggle (portal is Bangladesh-focused, Bengali only)
- ❌ Manual FTP deployment (GitHub Actions chosen)
- ❌ AMP (obsolete in 2026, Astro static is faster)
- ❌ Paid third-party services & limited free-tier SaaS for core infrastructure (Railway/Render free-tier fallbacks rejected 2026-09-11)
- ❌ Initial root plan doc (Strapi-based) — deleted 2026-09-11; `.sps/plan.md` is the only plan
