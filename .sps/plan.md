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
| Hosting | DianaHost `public_html` (frontend) + DianaHost disk (media) + DianaHost PNR 2 GB (Payload) — no Cloudflare (amended 2026-09-14) | 2026-09-11 |
| Domain | shikkha24.com | 2026-09-11 |
| Portal type | Education portal | 2026-09-11 |
| Audio reader | Browser Web Speech API; audio bulletin descoped | 2026-09-11 |
| Utility widgets | Free public APIs only; descope anything with no free source | 2026-09-11 |
| Content velocity | ✅ **Baseline 15–20/day + burst to 40+ on event days** (replaces the 45–70/day flat target, which implied 15–23 staff) | 2026-09-11 |
| Editorial team | 5 people already in place — no hiring prerequisite | 2026-09-11 |
| Content | Greenfield launch — no **data** migration | 2026-09-11 |
| Schema | ⚠️ **Amended 2026-10-03 — Drizzle migrations are now mandatory, not optional.** This row originally read "no migration", which was true of *content* and false of *schema*: `@payloadcms/db-sqlite` only creates the schema via `pushDevSchema`, gated on `NODE_ENV !== 'production'` (`dist/connect.js:49`), so a production Payload app with no migrations can never populate its own database. It was discovered during the DianaHost deploy, where it presented as `SQLITE_ERROR: no such table: levels` and defeated four separate workarounds. `cms/src/migrations/` is committed, `push: false` is set, and CI gates migration drift. See `.sps/handoff.md` → Current Phase | 2026-10-03 |
| Repository | Private (caps GitHub Actions at 2,000 min/month) | 2026-09-11 |
| Logo | Real logo supplied, CMS-editable (`docs/assets/logo.svg`) | 2026-09-13 |
| Social login | Facebook + Google — kept; both are free (app review is a process, not a cost) | 2026-09-11 |
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
| CDN / Frontend host | DianaHost `public_html` (Apache, no CDN) | — |
| Media storage | DianaHost disk (`data/media/`) | 2 GB shared |
| Newsletter | Self-built Payload module + free-tier ESP API | — |
| Push | Web Push API | — |
| Analytics | None (Apache access logs via cPanel) | — |
| Bengali Fonts | SolaimanLipi 400/700 | self-hosted WOFF2 — *corrected 2026-10-04; this row previously said "Hind Siliguri + Noto Sans Bengali", but `frontend/src/styles/fonts.css` declares SolaimanLipi only, and line 249 of this same file already recorded the others as removed. The file contradicted itself.* |
| English Font | SolaimanLipi (same face) | *corrected 2026-10-04; this row previously said "Inter", which is not used* |
| CI/CD | GitHub Actions | — |
| Hosting (CMS) | DianaHost PNR 2 GB SSD NVMe | 2 GB / 200 GB / 50 DB |

**Verification record (2026-09-11):** every versioned row above was checked against the live npm registry and matched exactly (astro 7.3.2, payload 3.89.0, tailwindcss 4.3.3, typescript 7.0.2, vite 8.3.0, pagefind 1.5.2, Node 24 LTS 24.21.0, PostgreSQL 18.6, SQLite 3.53.4).

**Corrections applied by the third-party audit:**
- **Next.js:** the previous entry ("15.x or 16.x", peer range "≥15.2.9, ≥16.2.6") was wrong. The actual `@payloadcms/next@3.89.0` peer range is `>=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.2.6 <17.0.0`, which excludes Next 15.5.x, 16.0.0–16.2.5 and 17.x. Pin **Next 16.2.6+**.
- **Node 24 LTS:** Active LTS ends **2026-10-20**, Maintenance continues to **2028-04-30** (end-of-life). Node 26 becomes LTS on 2026-10-28. The runtime choice should be revisited at S0.
- **Payload 3.89.0 was published 2026-09-10T14:49Z — one day before being pinned.** S0 must evaluate whether to hold 3.89.0 or pin the prior minor and upgrade after the smoke test.

---

## Hosting & Storage Architecture (decided 2026-09-11; amended 2026-09-14)

The purchased DianaHost plan is **2 GB storage / 200 GB monthly bandwidth**. A full `node_modules` for Next.js 16 + Payload 3 is 0.7–1.2 GB, so the app cannot be deployed conventionally alongside media.

**Owner decision (2026-09-14): all Cloudflare services removed.** Everything resides on DianaHost only. See `.sps/cloudflare-removal-plan.md` for the full removal plan.

| Component | Where it runs | Why |
|-----------|---------------|-----|
| Astro static site | **DianaHost `public_html`** (Apache serves static HTML) | No CDN; the 200 GB/month bandwidth cap applies to all traffic. SSL via DianaHost AutoSSL. |
| Media / uploads | **DianaHost disk** (`data/media/`) | Moved off R2 in S9. Aggressive WebP conversion, originals discarded, per-day upload cap. |
| Payload CMS + admin | **DianaHost PNR 2 GB** | Built in CI with Next.js `output: 'standalone'` so only dependency-traced modules ship (≈300–600 MB) |
| CDN / DNS / SSL | **None (DianaHost direct)** | No CDN. DNS via DianaHost or registrar. SSL via DianaHost AutoSSL (Let's Encrypt via cPanel). |

Expected DianaHost footprint: **≈400–700 MB** (CMS standalone), plus media (grows with content), plus SQLite DB.

**No Cloudflare fallback:** media stays on DianaHost under a strict upload quota (aggressive WebP/AVIF, originals discarded, per-day upload cap). This is the active architecture (owner decision 2026-09-14).

---

## Scope amendment (2026-09-12) — media, newsletter and identity

Three S9 decisions taken by the owner. Two of them **activate fallbacks this plan already
documented**, so they are not new inventions — but they change the architecture, and they are
recorded here before any code was written (rule 13).

### 1. Media moves to DianaHost — R2 is no longer used

**Decision:** the fallback above is now the active architecture. Media is stored on the host,
not on Cloudflare R2.

| | Before | Now |
|---|---|---|
| Media storage | Cloudflare R2, 10 GB free | DianaHost disk — **2 GB total, shared with the app, database and backups** |
| Media egress | Zero | **Counts against the host's 200 GB/month** |
| Media backup | Not required (R2 is durable) | **Media is now part of the backup problem** (`docs/backup-and-recovery.md`) |

**The storage arithmetic, stated plainly:** at the approved velocity of 15–20 articles/day with
2–3 optimised images each, media grows **150–270 MB/month**. On the 2 GB plan that is **7–13 months
to full**, before the database, backups and logs. On a 5 GB plan, 18–33 months. This is the binding
constraint on publishing volume and it must be watched, not assumed.

**Two mitigations that are now mandatory rather than optional:**

1. **Aggressive conversion, originals discarded.** Every upload is converted to WebP (AVIF where it
   wins) and the original is **not retained**. A 900 KB JPEG becomes a ~90 KB WebP.
2. **A per-day upload cap**, so one burst day cannot silently consume the month's headroom.

**One mitigation that is no longer available:** ~~serve media through the Cloudflare proxy~~ —
Cloudflare is removed entirely (owner decision 2026-09-14). Media bandwidth counts against the
200 GB/month origin cap. Browser caching (`Cache-Control` via `.htaccess`) is the only mitigation.
Apache `mod_cache` may provide limited origin-level caching if available on the shared host.

**Consequences:** `PUBLIC_MEDIA_BASE_URL` points at the CMS host. The **S0 R2 gate is
descoped** — R2 is no longer used at all. The R2 80% usage alert is replaced by a host-disk
alert, which DianaHost does not publish and must come from the support ticket already requested.

### 2. Newsletter transport — cPanel SMTP, explicitly accepted

**Decision:** the low-volume cPanel SMTP fallback is accepted; no ESP account.

**The gate closes as "explicitly accepted", not "confirmed working"** — recorded deliberately,
because the risks are real and documented in `docs/security.md` §7:

- cPanel enforces **per-domain hourly send caps** — an over-long campaign is silently truncated.
- Bulk sending from a **shared IP risks blacklisting the domain**, which would also break password
  resets and contact forms.
- No delivery reporting, no bounce handling, no unsubscribe automation.

**Therefore the module is built transport-agnostic:** the subscriber list, double opt-in and campaign
composer live in Payload and know nothing about SMTP. Swapping in an ESP later is a configuration
change, not a rewrite. The SMTP path ships with a **hard per-hour send cap enforced in code**, so the
module cannot trip cPanel's limit even if an editor tries.

### 3. Social login — Meta + Google OAuth, started now

**Decision:** proceed. Both are free (app review is a process, not a cost), so the no-card rule does
not exclude them. The owner starts the Meta review early because it is slow by nature.

**Consequence:** reader accounts become real, so bookmarks, saved deadlines and quiz streaks gain a
cross-device home, and the **comments feature deferred from S4 finally has an identity to attach to**.
Until the owner supplies client IDs the flow is built behind a flag and the browser-local fallback
stays — the same pattern as `PUBLIC_CMS_ORIGIN` in S8: **no control is rendered that cannot work.**

---

## Scope amendment (2026-09-18) — feature batch 2: S13–S17

**Trigger:** the owner requested 11 additional features on 2026-09-18. Six are already built
(polls, comments, weather, prayer times, ad placements, admin security, photo gallery) and need no
work. The remaining five were **not covered by the approved plan**, so they are added here before any
code is written (rule 13). Full specification: **`docs/feature-batch-2.md`**.

### Owner decisions recorded 2026-09-18

| Decision | Answer | Date |
|---|---|---|
| Live TV video source | **Both YouTube and Facebook** — the CMS stores the provider, the page picks the player | 2026-09-18 |
| Photocard → Facebook | **Share button only.** No Graph API, no page token, no app review | 2026-09-18 |
| Reporter portal | **Payload CMS admin stays the single auth surface**, plus a purpose-built mobile-first reporter view. A second frontend login was rejected as a second attack surface with none of the existing hardening | 2026-09-18 (delegated) |
| Build order | **S13 → S14 → S15 → S16 → S17** (dependency-ordered) | 2026-09-18 (delegated) |

### New sections

| # | Section | Key Deliverables |
|---|---------|-----------------|
| S13 | Reporter Management, Verification & Submission | `Authors` verification group (status, `reporterId`, validity, beat, district, audit); `Assignments` collection with per-reporter read scoping; mobile-first reporter admin view (My Work + quick draft); `/reporters` + `/reporters/[slug]` public surfaces; byline verification mark |
| S14 | QR Reporter ID Card & Automatic Photocard | `qrcode` (MIT) + existing `sharp`; on-demand CMS endpoints `GET /api/idcard/:id.png` and `GET /api/photocard/:articleId.png`, cached and `updatedAt`-versioned; static `/verify/[reporterId]` route; Facebook **share button** (no Graph API) |
| S15 | Live TV | `LiveStreams` collection (YouTube + Facebook); `/live-tv` click-to-load player; **a third CSP profile `SHIKKHA24_CSP_MEDIA`** (see below) |
| S16 | Reader Reactions | `Reactions` collection with DB-level dedupe; `POST /api/reactions/toggle` mounted on the collection (the `/comments/submit` lesson); self-hiding reaction bar island |
| S17 | Photo Story & Video News | `Articles.layout = photoStory` + photo-story block array; `Articles.videoUrl`; `/video` hub |

### ⚠️ The one architectural change this batch forces: a third CSP profile

`/live-tv` must embed **YouTube and Facebook** iframes. Neither existing profile fits:

- **`RELAXED`** has no video in `frame-src` → **the iframe would be blocked**.
- **`ARTICLE`** has YouTube but **not Facebook**, and using an `_ARTICLE`-named variable for a
  non-article route is the semantic drift `.sps/handoff.md` warns against.
- **Widening `RELAXED`** would give the homepage, every category listing and `/quiz` iframe
  permission they do not need — a security regression.

**Decision: add `SHIKKHA24_CSP_MEDIA`, scoped to `/live-tv` (and later `/video`).** It is a
**third** profile, so the same commit must:

1. teach `scripts/verify-apache.mjs` the third profile — its expectation logic (corrected in M16 to
   key on `data-ad-slot`) assumes exactly two, and a third breaks that assumption;
2. document it in `docs/security.md` §5;
3. assert the rule's presence in `verify-build-output.mjs`, counter-proved by injecting its removal.

### Dependencies

```
S13 ──┬──> S14        (the ID card renders verified reporter records)
      │
S15 ──┴──> S17        (S17 reuses the MEDIA profile and the click-to-load player)
S16   (independent)
```

---

**CI minutes constraint:** GitHub Actions gives 2,000 minutes/month on private repos. At the **chosen baseline of 15–20 articles/day plus bursts** (≈600–900 publishes/month), a per-publish build costs ~450 minutes if an incremental build is ~30s (comfortable) but ~4,500 minutes if it is a 5-minute full rebuild (over budget). **The deciding number is the measured incremental build time — an S0 gate.** Rebuilds are **adaptively batched** (15–30 min in quiet hours, 5 min at peak, on-demand for `is_breaking`).

⚠️ **One quota remains:** GitHub Actions at 2,000 minutes/month on a private repo. The Cloudflare Pages 500 builds/month and 20,000 files/site quotas are **removed** — the frontend deploys to DianaHost `public_html` via rsync, not Pages.

### Node.js version on DianaHost — an open security risk

DianaHost runs **Node.js 20.18.2**. `astro@7.3.2` requires `>=22.12.0` and `vite@8.3.0` requires `^20.19.0 || >=22.12.0`, so **neither can run on the host** — they build in CI only.

`next@16.3.4` (`>=20.9.0`) and `@payloadcms/next@3.89.0` (`^18.20.2 || >=20.9.0`) **do** accept 20.18.2, so Payload can run there. **But Node 20 reached end-of-life on 2026-04-30** — no security patches, on a public-facing admin handling editor credentials and reader PII. DianaHost's cPanel exposes a **Node.js Selector with a version drop-down**; selecting 22.x or 24.x resolves this if offered.

---

## 13-Section Build Order

> Section deliverables are now re-scoped to education — see `docs/education-feature-inventory.md` (approved 2026-09-11) for the feature set, category tree and per-section changes.
>
> **S13–S17 were added 2026-09-18** (feature batch 2). See `docs/feature-batch-2.md` for the full specification and the "Scope amendment (2026-09-18)" section above for the owner decisions. S12 remains the launch gate for the original scope; S13–S17 are post-S12 feature work.

| # | Section | Key Deliverables | Status |
|---|---------|-----------------|--------|
| S0 | Foundation & Toolchain | Monorepo, Astro 7 init, Payload CMS 3 init, Tailwind 4.3, TS7, Node 24, SQLite, env, GitHub Actions CI, Apache `.htaccess` wiring | ✅ approved 2026-09-12 |
| S1 | CMS Content Models & RBAC | Education collections, 5 RBAC roles, Bengali admin labels | ✅ approved 2026-09-12 |
| S2 | Design System & Base Layout | Typography, colors, dark mode, 12-col grid, Header, Mega menu, Footer, sticky mobile share bar, text resizer. **Font: SolaimanLipi only — one Bengali family for headline and body; Hind Siliguri and Noto Sans Bengali both removed, owner-approved 2026-09-12** (see the font budget note below) | ✅ complete 2026-09-12 |
| S3 | Homepage | Breaking ticker, lead story, academic deadline strip (N1/N2), level + district filters, category grids, trending, latest feed, ad slots, weather + prayer header utilities | ✅ complete 2026-09-12 |
| S4 | Article Page | Full article, takeaways box, author card, related articles, share, progress bar, comments, correction notice, print view, JSON-LD | ✅ complete 2026-09-12 |
| S5 | Category/Tag/Author/Archive | Listings, pagination, breadcrumbs, subcategory filters, author profiles, date archive | ✅ complete 2026-09-12 |
| S6 | Search | Pagefind 1.5, search UI, Bengali, date/section filters | ✅ complete 2026-09-12 |
| S7 | Ad System | AdSlot (zero-CLS), AdSense, sponsor banners, Payload ad management, sponsored content template | ✅ complete 2026-09-12 |
| S8 | Live Blog & Interactive | Live blog engine (exam results, admission days), polls, quizzes, infographic blocks, scrollytelling | ✅ approved 2026-09-13 |
| S9 | Media, Newsletter & Engagement | Gallery, video, Listmonk-free newsletter module, push notifications, bookmarks, social login, citizen journalism | ✅ approved 2026-09-13 |
| S10 | Utility Widgets & Sections | Education utility widgets (see `docs/data-sources.md`) — exam calendar, result links, scholarship tracker, admission deadlines | ✅ built, approval pending |
| S11 | SEO, Feeds & AI Optimization | News sitemap, sitemap, RSS, OG/Twitter, auto OG images, canonical, `llms.txt`, robots.txt, E-E-A-T pages | ✅ built (auto OG images deferred), approval pending |
| S12 | Deployment, QA & Launch | DianaHost `public_html` + Passenger setup, GitHub Actions pipeline (rsync deploy), Lighthouse ≥95, mobile test, Bengali font audit, load test, accessibility | ⏳ local verification done; owner-only items open |
| S13 | Reporter Management, Verification & Submission | `Authors` verification group + `reporterId`; `Assignments` collection with per-reporter read scoping; mobile-first reporter admin view; `/reporters` + `/reporters/[slug]`; byline verification mark *(added 2026-09-18)* | ✅ **built 2026-09-18** — admin view needs a manual browser check; approval pending |
| S14 | QR Reporter ID Card & Automatic Photocard | `qrcode` (MIT) + `sharp`; on-demand cached CMS endpoints for ID card and news photocard; static `/verify/[reporterId]`; Facebook share button *(added 2026-09-18)* | ⬜ specified |
| S15 | Live TV | `LiveStreams` collection (YouTube + Facebook); `/live-tv` click-to-load player; **third CSP profile `SHIKKHA24_CSP_MEDIA`** *(added 2026-09-18)* | ⬜ specified |
| S16 | Reader Reactions | `Reactions` collection with DB-level dedupe; `POST /api/reactions/toggle`; self-hiding reaction island *(added 2026-09-18)* | ⬜ specified |
| S17 | Photo Story & Video News | `Articles.layout = photoStory` + block array; `Articles.videoUrl`; `/video` hub reusing the MEDIA profile *(added 2026-09-18)* | ⬜ specified |

### Built outside the section sequence (2026-09-18)

Recorded here because they are not S0–S17 work but are shipped and must not be
lost. Full detail in **`docs/feature-register.md`**.

| Feature | Why it was built | Where |
|---|---|---|
| **Fact-check section** (`/fact-check` + `/fact-check/:id`) | The `FactChecks` collection existed with **no reader and no route** — the "fact-check radar" is a retained feature, scoped to admission rumours and fake result links | `frontend/src/pages/fact-check/`, `frontend/src/components/FactVerdictBadge.astro` |
| **Official social links** (unified + validated) | Three surfaces built the list independently and **none validated the URL scheme** — a stored `javascript:` value would execute on click | `frontend/src/lib/social.ts`, `frontend/src/components/SocialLinks.astro` |
| **Developer credit** (footer) | The developer's WhatsApp/Facebook were styled like the site's own contact links | `frontend/src/components/DeveloperCredit.astro` |
| **CMS rebuild notice** | With `DEPLOY_WEBHOOK_URL` unset the rebuild was **silent** — the editor saved, saw "Saved successfully", and the site did not change | `cms/src/lib/rebuild-trigger.ts` |
| **`safeExternalUrl`** | One shared URL-scheme guard instead of three copies of a security check | `frontend/src/lib/url.ts` |

### Removed outside the section sequence

| Removed | Reason |
|---|---|
| **`Jobs` collection** | A **strict subset of `Circulars`** — Circulars' `type` already offers শিক্ষা / বিসিএস / সরকারি চাকরি / বেসরকারি চাকরি, and it carries *more* (`level`, `publishedDate`, `vacancyCount`). Two collections for one content type splits the site's own authority across two URLs for the same query. Job content remains publishable as an article (`/category/jobs-career`) or a circular (`/circulars`). |

---

## Build Gates (mandatory)

| Gate | Condition |
|------|-----------|
| **S0 exit** | Payload CMS 3 on cPanel Passenger smoke test passes |
| **S0 exit** | TypeScript 7 toolchain validated with Astro 7 + Payload 3 |
| **S0 exit** | **Next.js `output: 'standalone'` deploy size measured** — must land ≈300–600 MB to fit the 2 GB host |
| **S0 exit** | ~~Cloudflare R2~~ — **REMOVED 2026-09-14.** All Cloudflare services removed per owner decision. No R2, no Pages, no CDN. See `.sps/cloudflare-removal-plan.md`. |
| **S0 exit** | DianaHost Node.js — ⚠️ **RESOLVED AS AN ACCEPTED RISK.** The cPanel Node.js Selector offers **no version above 20.18.2** (drop-down max confirmed from the owner's screenshot), so an upgrade is not possible through the panel. The stack **functions** on it (`next@16.3.4` ≥20.9, `@payloadcmss/next@3.89.0` ≥20.9, `typescript@7.0.2` ≥16.20), while `astro@7.3.2` (≥22.12) and `vite@8.3.0` (^20.19) cannot run there and build in CI. Node 20 is **EOL since 2026-04-30**, so the CMS admin runs unpatched — mitigated by admin hardening (`docs/security.md` §3). **Not a blocker; ask DianaHost to add a newer runtime when convenient** |
| **S0 exit** | **Astro incremental build time measured** — decides the entire batching strategy and whether the CI quota is comfortable (~30s) or critical (minutes) |
| **S0 exit** | ~~`wrangler pages deploy` quota~~ — **REMOVED 2026-09-14.** No Cloudflare Pages. Frontend deploys to DianaHost `public_html` via rsync. |
| **S0 exit** | **DianaHost limits confirmed via support** — inode/file-count quota, CPU/memory/process limits, hourly email send limits, and whether account-level backups exist. **None are published in their knowledge base** |
| **S0 exit** | **SQLite WAL concurrency proven with 5+ concurrent writers** (moved from S12 — a foundational decision must not be validated at the finish line) |
| **S0 exit** | CI rebuild strategy settled (debounce/batch, or public repo for unlimited minutes) |
| **S0 exit** | **CI quality gates live** — Lighthouse CI with per-page budgets, link check, JSON-LD validation, `pnpm audit` policy (`docs/performance-budget.md`, `docs/testing-and-qa.md`) |
| **S0 exit** | **Backup automated off-host AND a restore performed successfully** — an untested backup is not a backup (`docs/backup-and-recovery.md`) |
| **S0 exit** | **Feature-flag mechanism designed** so heavy/fragile features can be disabled without a redeploy (`docs/reliability.md`) |
| **S0 exit** | **Monitoring/alerting tool selected** — card-free and verified, alerting to a channel the owner actually reads |
| S1 entry | Education feature inventory — ✅ **SATISFIED 2026-09-11** (`docs/education-feature-inventory.md`) |
| S1 entry | Education category tree — ✅ **SATISFIED 2026-09-11** (8 categories + level filter) |
| S1 entry | Publishing velocity decided — ✅ **SATISFIED 2026-09-11**: baseline 15–20/day + burst to 40+ on event days |
| S2 entry | Domain decided — ✅ **SATISFIED 2026-09-11** (`shikkha24.com`) |
| **S2 entry** | Portal display name + logo — ✅ **SATISFIED 2026-09-12.** Display name = **শিক্ষা২৪ / Shikkha24** (owner-confirmed; domain-derived). Logo = **placeholder SVG** for now, owner-confirmed: the logo is a CMS-managed `SiteSettings` field, so the real asset drops in through the admin with **no code change**. S2 is therefore unblocked — neither decision can force a rebuild of the design system. |
| S6 entry | Bengali search quality tested on a real Bengali corpus |
| S9 entry | Newsletter sending path confirmed (free-tier ESP reachable, or cPanel SMTP fallback accepted) |
| **S10 entry** | Every remaining data-backed element has a confirmed free provider, or is descoped |
| **S12 entry** | Monitoring + alerting live (`docs/reliability.md`) |
| **S12 entry** | Full restore drill completed and timed against the RPO/RTO targets |
| **S13 entry** | Feature batch 2 specification approved — 📝 **OPEN** (`docs/feature-batch-2.md`) |
| **S13 exit** | A reporter account **cannot** self-verify, read another reporter's assignment, or publish — each proven by a real request, not by UI inspection |
| **S14 exit** | A generated ID card and photocard are byte-identical across two runs, and the QR resolves to a live `/verify/:id` page |
| **S15 exit** | `verify:apache` asserts the third CSP profile on `/live-tv`, and `/live-tv` loads with **zero third-party requests** before the reader taps play |
| **S16 exit** | Double-voting is rejected at the **database** level (not merely in the UI), proven by two direct writes |
| **S17 exit** | Every photo-story image reserves its box (CLS < 0.02), and `/video` embeds under the MEDIA profile |
| Every section exit | Full Definition of Done passes (build, typecheck, lint, performance targets) + explicit user approval |

> **This table is the authoritative gate list.** `.sps/task.md` mirrors it inline per section at a finer granularity (it also labels each section's DoD as a gate). The two are kept **semantically equivalent, not row-for-row identical** — if a gate changes, change it in both files in the same commit (rule 13). Verified 2026-09-11: every gate here has a counterpart there and vice versa.

---

## Verification Targets

| Check | Target |
|-------|--------|
| Lighthouse mobile Performance | ≥ 95 |
| Lighthouse Accessibility | **≥ 90** |
| LCP | < 1.5s |
| INP | < 100ms |
| CLS | < 0.02 |
| TTFB | < 200ms — **measured at S12 only, in production on DianaHost (no CDN).** TTFB is a hosting property and cannot be enforced from S2–S11 |
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
| Astro 7 static on DianaHost `public_html` | Known — Apache serving static HTML is standard |
| ~~Cloudflare R2 as media origin~~ | **Removed 2026-09-14.** Media on DianaHost disk. |
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

## Operational plans (added 2026-09-11)

Six domains had no coverage. They are now documented, and each is a build input for the sections noted.

| Document | Covers | Drives |
|---|---|---|
| `docs/hosting-and-deployment.md` | **Why CI exists at all** (the editor never touches GitHub), the deploy pipeline (rsync to DianaHost `public_html`), the rebuild quota (GitHub 2,000 min), the Node.js version finding, and the escalation ladder | S0, S12 |
| `docs/performance-budget.md` | Lighthouse/Web Vitals budgets, per-asset byte budgets, measurement method, the CI gate, the AdSense-vs-≥95 trade-off | S0 (CI gate), S2 (fonts), all UI sections, S12 |
| `docs/seo-plan.md` | Per-template metadata + schema matrix, education-specific schema, sitemaps/feeds, keyword clusters, redirect policy, slug-language decision | S4, S5, S11 |
| `docs/security.md` | Threat model, attack surface, auth/2FA, security headers + CSP (Apache `.htaccess`), input validation, rate limiting (no CDN rate limiting), PII, supply-chain scanning, SPF/DKIM/DMARC | S0, S1, S4 (comments), S9 |
| `docs/reliability.md` | Failure-mode analysis, error pages, graceful degradation, capacity model, traffic-spike playbook, monitoring/alerting, incident playbook, feature flags | S0, S8, S12 |
| `docs/backup-and-recovery.md` | Backup tiers, RPO 24h / RTO 4h, restore runbook, four DR scenarios, verification drills | S0 (automation), S12 (drill) |
| `docs/testing-and-qa.md` | Quality gates, test strategy, **WCAG 2.2 AA** accessibility, browser/device matrix (incl. UC Browser / Opera Mini), Bengali rendering audit, pre-launch checklist | S0 (CI gates), S2, S12 |

**Two cross-cutting requirements these introduce that were previously absent:**
1. A **feature-flag mechanism** so heavy or fragile features can be disabled without a redeploy (`docs/reliability.md` §5). This is an S0/S8 design requirement.
2. A **verified card-free monitoring/alerting tool** (`docs/reliability.md` §6) — not yet selected.

---

## Accessibility commitment

**WCAG 2.2 Level AA**, with Lighthouse accessibility ≥90 as the automated floor. The superseded plan claimed "WCAG AAA" for dark mode, which is not realistic and has been corrected. See `docs/testing-and-qa.md` §3.

---

## Competitive Intelligence Source

Plan informed by analysis of:
- **BD news portals (obsolete for this scope):** Prothom Alo, bdnews24, Daily Star, Samakal, Jugantor, Kaler Kantho, Jago News 24, Bangla Tribune, Ittefaq
- **International portals (obsolete for this scope):** BBC, Guardian, Al Jazeera, CNN, NYT, NHK, NDTV
- **Education competitor set — DONE 2026-09-11:** `docs/education-competitors.md`. Five groups: dedicated education portals (Dainik Shiksha, Shiksha Sangbad), education sections of general portals, official government portals (educationboardresults.gov.bd, xiclassadmission.gov.bd), third-party SEO aggregators (xiadmission.bd, xiclassbd, eduboardresults.bd), and exam-prep platforms (bcsstudy.com, xam.bd). Key opening identified: the aggregators rank on the highest-intent queries with slow, ad-heavy pages — a fast, zero-CLS, Bengali-first page on the same queries is winnable.
- **Feature inventory — DRAFTED 2026-09-11, awaiting approval:** `docs/education-feature-inventory.md`

---

## Open decisions

**Resolved 2026-09-11:** education feature inventory ✅ · category tree ✅ · competitor set ✅ · weather + prayer utilities retained ✅ · BCS/job circulars in scope ✅ · **publishing velocity: baseline 15–20/day + burst ✅** · editorial team of 5 in place ✅ · greenfield launch ✅ · repository private ✅ · AdSense activated ✅ · social login kept (free) ✅ · logo placeholder in place, CMS-editable ✅ · **all Cloudflare removed (2026-09-14) ✅**

**Still open:**
- [ ] **Check the cPanel Node.js Selector for Node 22/24** — the host runs 20.18.2, which is **end-of-life**
- [ ] **One DianaHost support ticket** — inode quota, CPU/memory/process limits, hourly email limits, backup policy
- [ ] ~~**Verify R2 is enabled**~~ — **REMOVED 2026-09-14.** No Cloudflare R2. Backups to GitHub Actions artifacts + owner local download.
- [ ] **DNS configuration for shikkha24.com** — owner will provide
- [ ] **Real logo** — placeholder SVG stands in for now
- [ ] **Legal details for the E-E-A-T pages** — Trade License, TIN, Ministry of Information registration; owner provides **before final deploy**
- [ ] Portal display name final confirmation
- [ ] Hands-on audit of the two direct competitors (Dainik Shiksha, Shiksha Sangbad)
- [ ] Start the Meta app review for Facebook Login early (free, but slow)
- [ ] Repository visibility if the CI quota proves tight
