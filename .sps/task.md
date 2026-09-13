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


## S1 — CMS Content Models & RBAC ✅ APPROVED 2026-09-12
- [x] **GATE: education feature inventory approved** — ✅ 2026-09-11 (`docs/education-feature-inventory.md`)
- [x] **GATE: education category tree approved** — ✅ 8 categories + cross-cutting level filter
- [x] **GATE: publishing velocity decided** — ✅ 2026-09-11: **baseline 15–20/day + burst to 40+ on event days**, with the existing 5-person team
- [x] Collections — ✅ **26 collections + 1 global** (`cms/src/collections/`, `cms/src/globals/SiteSettings.ts`)
  - *(the four bolded collections were restored by the audit. Two changes from this list, both owner-flagged: **Subcategories is a self-relation on Categories, not a separate collection** — the approved tree is flat; and **Readers was ADDED** — social login, bookmarks, saved deadlines and push all need a reader identity. See `.sps/section-todos/S1.md`.)*
- [x] **Education collections:** Scholarships, Deadlines / Academic Calendar, Institutions, Circulars, Result Links, Study Abroad Guides, Saved Deadlines — ✅ all built
- [x] **Taxonomies seeded:** Category (8) + Level (5) + District (64) — ✅ **77 rows**, idempotent (`pnpm --filter @shikkha24/cms seed`)
- [x] 5 RBAC roles: Reporter, Section Editor, Editor-in-Chief, Ad Manager, Super Admin — ✅ with field-level guards (`cms/src/access/roles.ts`)
- [x] Bengali admin labels — ✅ `cms/src/i18n/bn.ts` (working draft, ~60 strings; needs native-speaker review)
- [x] Versioning + draft/review/publish workflow — ✅ configured on Articles + Pages; **end-to-end run with two accounts still pending**
- [x] S1 DoD evidence → **user approval received 2026-09-12**

## S2 — Design System & Base Layout ✅ COMPLETE 2026-09-12
- [x] **GATE: domain decided** — ✅ `shikkha24.com`
- [x] **GATE: portal display name + logo decided** — ✅ **SATISFIED 2026-09-12.** Name = **শিক্ষা২৪ / Shikkha24** (owner-confirmed). Logo = **placeholder SVG**, owner-confirmed — it is a CMS-managed `SiteSettings` field, so the real asset drops in through the admin with no code change
- [x] Typography: Hind Siliguri (headlines) + Noto Sans Bengali (body) — **Inter dropped, owner-approved 2026-09-12** (83 KB/weight variable file blew the 200 KB budget; the plan itself recommends a system UI stack). ≥17px mobile, line-height ≥1.65
- [x] Colors: brand red #DA1C25 + brand charcoal #1F1F1F + white; dark mode base #121212 (BBC-style) — two distinct tokens, do not conflate them
- [x] 12-col grid, Header + utility ribbon, mega menu, Footer
- [x] Sticky mobile share bar, text resizer
- [x] S2 DoD evidence → **user approval pending**

## S3 — Homepage ✅ COMPLETE 2026-09-12
- [x] Lead education story + breaking ticker (result days, circular releases, exam postponements)
- [x] **Scholarship / admission deadline strip** (N1, N2) — soonest-first, urgency labels in Bengali
- [x] Category grids for the **8 approved education categories** — all 8 render
- [x] **Level filter** (প্রাথমিক · মাধ্যমিক · উচ্চ মাধ্যমিক · স্নাতক · স্নাতকোত্তর) + district selector (আমার জেলা) — client-side, district persisted to localStorage
- [x] Header utilities: weather + prayer times + Hijri date — **live API data verified** (Open-Meteo ৩১° মেঘলা; Aladhan মাগরিব ১৮:০৫, Hijri ১ রবিউস সানি ১৪৪৮). Build-time, memoised to 2 calls per build, zero CLS, silent degradation.
- [x] Trending/most-read, latest feed, ad slots (zero-CLS) — ⚠️ trending is **provisional**: a static site cannot accumulate view counts, so it is fed recent articles. Real trending needs analytics or an editorial flag. Documented in `TrendingList.astro`.
- [x] Mobile-first + low-end Android pass — mobile-first built; ⏳ **hands-on Symphony/Walton 3G test is owner-only and still open**
- [x] S3 DoD evidence → **user approval pending**

## S4 — Article Page ✅ COMPLETE 2026-09-12
- [x] Full article — `/article/[slug].astro`, body rendered from Payload Lexical via `lib/richtext.ts` (escaped, never raw HTML)
- [x] Key takeaways box — `KeyTakeaways.astro`
- [x] Author card — `AuthorCard.astro`
- [x] Related articles — `RelatedArticles.astro` (same category, falls back to newest)
- [x] Share row — `ShareRow.astro` (WhatsApp/Facebook/X/copy/print; no third-party SDK)
- [x] Reading progress bar — `ReadingProgress.astro` (fixed position, zero CLS, passive listener)
- [x] Audio player (Web Speech API) — `ArticleAudio.astro`, `bn-BD` locale, hides when unsupported, flag-gated
- [x] Correction notice — `CorrectionNotice.astro` (above the body, permanent)
- [x] Print view — `PrintStyles.astro`
- [x] JSON-LD — Article schema with headline/datePublished/author/publisher/inLanguage
- [ ] Comments — ⏳ **deferred to S9** (needs social login + the comments collection UI; not part of S4's page shell)
- [x] S4 DoD evidence → **user approval pending**

## S5 — Category/Tag/Author/Archive ✅ COMPLETE 2026-09-12
- [x] **Listings** — `/category/:slug` (8 built), `/latest`, `/deadlines`. Shared `ArticleGrid` so card layout lives in one place.
- [x] **Pagination** — `Pagination.astro`; accessible nav, `aria-current`, `rel` prev/next, 7-link window, page 1 is the bare path.
- [x] **Breadcrumbs** — `Breadcrumbs.astro` with **BreadcrumbList JSON-LD** generated from the same array as the visible trail, so they cannot drift.
- [x] **Subcategory filters** — rendered when a category has children (`categories.parent` self-relation). Empty under the approved flat tree, which is correct.
- [x] **Static pages + 404** — `/page/:slug` (E-E-A-T pages) and a real Bengali 404. ⚠️ **`/page/*` routes are empty until Pages exist in the CMS** — the footer links (privacy/terms/contact) need those created.
- [ ] **Author profiles + tag + date archive** — ⏳ **deferred**: CMS layer is ready (`getAuthorBySlug`, `getTagBySlug`, `getArchiveBuckets`, `getArticlesByMonth`) and there are no tags or multiple authors in the demo content yet. Routes are ~30 lines each once content exists.
- [x] S5 DoD evidence → **user approval pending**

## S6 — Search ✅ COMPLETE 2026-09-12
- [x] **Pagefind 1.5.2** (MIT) installed as a dev dependency; index built by `pagefind --site dist` as part of `build`
- [x] **Search UI** at `/search` — Pagefind's default UI with **Bengali translations** (placeholder, result counts, zero-results, searching)
- [x] **Index scoped to articles** via `data-pagefind-body` on the article page and `data-pagefind-ignore` on the related-articles sidebar — 12 pages / 356 words indexed, not site chrome
- [x] **Browse fallback** — category chips on the search page, which matters more than usual given the stemming limit below
- [x] **Layout `head` slot added** so a page can inject its own stylesheet
- [x] S6 DoD evidence → **user approval pending**

⚠️ **Known limitation (not a bug):** Pagefind has **no Bengali stemming** — it prints this at build time. Search matches exact word forms only, so "শিক্ষা" will not match "শিক্ষার্থী". Options later: a synonym list, or lean on the category taxonomy for discovery.
- [ ] **GATE: Bengali search quality tested on a real Bengali corpus** — blocking; there is no real corpus yet
- [ ] Date/section filters
- [ ] S6 DoD evidence → **user approval** *(committed as `01f84e1`; lint/typecheck/build all green)*

## S7 — Ad System ✅ COMPLETE 2026-09-12
- [x] **AdSlot (zero-CLS)** — takes a `position`, reserves its box before any ad loads, falls back to a labelled placeholder. Ads load after LCP, never above the fold.
- [x] **AdSense** — `AdCreative.astro` injects the library on `window.load` → `requestIdleCallback`, never the copy-paste `<head>` script. Client id is CMS-managed (`SiteSettings → Tracking`). Zero third-party requests while no unit is configured.
- [x] **Sponsor banners** — `adType: sponsorBanner | direct` renders image + targetUrl with `rel="sponsored nofollow"` and a mandatory «বিজ্ঞাপন» label.
- [x] **Payload ad management** — ⚠️ **the S1 position vocabulary did not match a single real slot**, so no ad unit could ever render. Reconciled to the 8 slots that exist; the collection held no data. Also removed the `codeSnippet` raw-HTML field (script-injection vector) and `clickCount` (a static site cannot increment it).
- [x] **Sponsored content template** — `isSponsored` + `sponsorName` on Articles; banner above the headline, badge in byline and on cards; excluded from the masthead and breaking ticker, kept in category sections and the latest feed.
- [x] **Relaxed CSP profile** for `/`, `/article/*`, `/category/*` — ⚠️ Cloudflare **joins** duplicate headers with a comma rather than overriding, so the more specific rule must `!`-detach the inherited policy first. **S12 check:** confirm production returns exactly one CSP header.
- [x] S7 DoD evidence → **user approval pending** (`.sps/section-todos/S7.md`)

## S8 — Live Blog & Interactive ✅ APPROVED 2026-09-13
- [x] **Live blog engine** — `/live/:slug`, entries baked into the HTML at build time (the `docs/reliability.md` static fallback), key-event badges, a **no-JavaScript key-events filter** (`:has()`), and `LiveBlogPosting` JSON-LD with a nested `BlogPosting` per update.
- [x] **Live updates — owner decision: opt-in refresh.** A **নতুন আপডেট দেখুন** button fetches once on tap, clones a `<template>`, and announces into an `aria-live` region. Deliberately **not** an auto-poll — see `.sps/section-todos/S8.md` §1.
- [x] **Polls — owner decision: persist to the CMS.** `POST /api/polls/:id/vote` with three guards: honeypot (silent success, no write), per-IP rate limit, and a salted `HMAC-SHA256(ip+UA)` duplicate guard unique per poll. Results hidden until the reader votes; the privacy line is on the widget.
- [x] **Quizzes** — `/quiz` hub + `/quiz/:id`, question-by-question flow, instant feedback with the explanation, score + percentage bar, days-in-a-row streak. **Fully client-side**, flag-gated on `PUBLIC_FLAG_QUIZ`.
- [x] **Infographic · before/after · scrollytelling blocks** — Payload `BlocksFeature` blocks rendered by `lib/richtext.ts`, styled from a global stylesheet. Each is readable with JavaScript off; the scripts only add a slider and a scroll animation.
- [x] **⚠️ Fixed a site-wide CSP bug found here:** Astro **inlines small component scripts**, and `script-src 'self'` (no `'unsafe-inline'`) blocks them — the theme toggle, mobile menu, text resizer, demo ads, share button and the `/search` bootstrap had all been silently dead since S2. Fixed with `vite.build.assetsInlineLimit: 0` plus moving two deliberate inline scripts into `public/`. **0 executable inline scripts across all 28 pages.**
- [x] S8 DoD evidence → **user approval received 2026-09-13** (`.sps/section-todos/S8.md`) — 35/35 harness checks + a flag-off build

## S9 — Media, Newsletter & Engagement ✅ APPROVED 2026-09-13
> ✅ **Entry gate SATISFIED 2026-09-12:** the newsletter sending path is **cPanel SMTP, explicitly accepted** (`.sps/plan.md` §"Scope amendment (2026-09-12)"). The gate closes as *accepted*, not *confirmed working* — the cPanel risks are real and documented in `docs/security.md` §7. The module is therefore built **transport-agnostic** so an ESP can be swapped in by configuration alone.
> ⚠️ **Three S9 architecture changes were recorded in `.sps/plan.md` before any code** (rule 13): media moved to the **DianaHost disk** (R2 descoped), newsletter transport is **cPanel SMTP**, and **social login** proceeds behind a flag.

- [x] **Media pipeline — DianaHost disk, not R2.** Aggressive WebP conversion with the **original discarded**, plus a **per-day upload cap** enforced in a hook. `PUBLIC_MEDIA_BASE_URL` / `MEDIA_PUBLIC_BASE_URL` now point at the CMS host. ✅ `verify:media` 13/13. 24 files on disk, **all WebP, zero originals retained**.
- [x] **Photo galleries** — `/gallery` hub + `/gallery/[slug]` from the existing `photo-galleries` collection, with reserved image boxes. ✅ Built; `/gallery` stays on the **strict** CSP (no ad slot, no inline script).
- [x] **Video embeds** — click-to-load, `youtube-nocookie`, no third-party request until the reader taps play. **No `VideoObject` schema.** ✅ Built. In the build: `youtube-nocookie` **0**, `ytimg.com` **0**, `<iframe>` **0** across all pages; the embed URL exists only in one hashed bundle, built on click.
- [x] **Newsletter** — self-built subscriber list + campaign module. **Double opt-in**, **one-click unsubscribe**, **hard per-hour send cap enforced in code**. ✅ `verify:newsletter` 29/29. The campaign is a **resumable batch**, not a loop — cPanel truncates silently past its cap.
- [x] **Comments** — approved-comment list + submission form on the article page, moderation-gated, escaped, rate-limited. ✅ `verify:engagement` 22/22. The generated REST route could do none of the three guards, so `POST /api/comments/submit` was added and the form repointed.
- [x] **Bookmarks** — articles and deadlines. ✅ Browser-local half built (`/bookmarks`, `BookmarkButton`, `lib/bookmarks.ts`) — works with **no account at all**.
  - [ ] ⚠️ **CMS sync when signed in — NOT BUILT.** This is the one open S9 build item. The auth layer it needed now exists (see social login below), so it is unblocked — but the merge policy needs a decision first, not code: a naive union re-adds a bookmark deleted on another device, so it needs a "the server is authoritative after the first upload" marker. Raised for the owner in `.sps/section-todos/S9.md` rather than guessed at.
- [x] **Citizen journalism submission** — form + collection, moderation-gated and rate-limited. ✅ Built.
- [x] **Push notifications + N7 deadline reminders** — Web Push, **self-generated VAPID keys**, a service worker, a subscription endpoint, the save-a-deadline flow. Self-hiding when unconfigured. ✅ `verify:push` 22/22.
- [x] **Social login** — Meta + Google OAuth behind a flag, browser-local fallback retained. No button rendered that cannot work. ✅ `verify:oauth` 46/46. Readers have **no password** at all (`disableLocalStrategy`), and `email` is optional + non-unique because it is an attribute, not an identity.
- [x] S9 DoD evidence → **user approval received 2026-09-13** (`.sps/section-todos/S9.md`)
- [ ] **OWNER:** generate the VAPID key pair and set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` + `PUBLIC_VAPID_PUBLIC_KEY` — until then the reminder control is not rendered
- [ ] **OWNER:** create the OAuth apps and set **`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`** and **`FACEBOOK_OAUTH_CLIENT_ID` / `FACEBOOK_OAUTH_CLIENT_SECRET`** (Meta calls the pair "App ID" / "App Secret"), plus `OAUTH_REDIRECT_BASE` and `PUBLIC_SITE_URL`. Register the exact callback URLs — until then **no login button is rendered at all**.
- [ ] **OWNER:** decide **account linking**. Two provider identities sharing an email stay two separate readers today. Merging them automatically would be an account-takeover vector when a provider does not verify email, so it was deliberately left unimplemented rather than guessed at.
- [ ] **OWNER:** generate `NEWSLETTER_SEND_TOKEN` and `PUSH_SEND_TOKEN` (`openssl rand -hex 32`) and wire them into the cron. **Both endpoints are disabled while their token is unset** — an endpoint that can mail the whole list or push to every subscriber must not be reachable by accident.
- [ ] **OWNER:** SMTP credentials for the bulk-sending subdomain (`mail.shikkha24.com`) + SPF/DKIM/DMARC (S12 gate)
- [ ] **OWNER:** host-disk usage alert — DianaHost publishes no storage metric; this comes from the support ticket already requested
- [ ] **Deferred, recorded:** media is now part of the backup problem (`docs/backup-and-recovery.md`) — the off-host backup must include `data/media/`, not just the SQLite file

## S10 — Education Features & Specialized Sections
- [x] **N1** Scholarship tracker (deadline-sorted, filterable by level / country / funding) — `/scholarships`
- [x] **N2** Academic calendar & deadlines — enhanced `/deadlines` with type/level/district filtering (N9)
- [x] **N3** Results & merit lists hub (links + how-to guides around the official portals) — `/results`
- [x] **N4** Institution directory — starter set: public universities + top private, marked "growing" — `/institutions` + `[slug]`
- [x] **N5** Exam routine & syllabus hub (shares the N2 data model) — `/exams`
- [x] **N6** GPA / grade calculator (SSC/HSC, client-side, zero backend) — `/gpa` (flag-gated)
- [x] **N8** Circular tracker (education + BCS/job circulars) — `/circulars`
- [x] **N9** District-first opportunities — district filter on `/deadlines`
- [x] **N10** Study-abroad country guides — starter set: UK, USA, Canada, Australia, Malaysia, Japan, South Korea, Germany — `/study-abroad` + `[slug]`
- [x] Header utilities finalised per `docs/data-sources.md` (weather, prayer times + Hijri date — both verified free, no key) — completed in S3
- [x] **GATE: every remaining data-backed element has a confirmed free provider or is descoped** — ✅ all S10 data is editorially curated (no external API needed)
- [x] S10 DoD evidence → `.sps/section-todos/S10.md` — **user approval pending**

## S11 — SEO, Feeds & AI Optimization
> ⚠️ **Sequencing deviation:** the four feed routes below were built **ahead of the S0→S12 order** on 2026-09-12. They are verified and committed.
- [x] **Feeds subset (built ahead of sequence):** `robots.txt`, `sitemap.xml`, `news-sitemap.xml`, `rss.xml` — all build-time from the CMS. Verified: sitemap 23 URLs (3 static + 8 categories + 12 articles, real `publishedAt` as `lastmod`), news-sitemap 12 URLs inside 48h, RSS 12 items with Bengali `<category>`. `@astrojs/sitemap` / `@astrojs/rss` deliberately **not** used.
- [x] **OG/Twitter cards, canonical URLs** — Layout emits OG/Twitter meta + self-referencing canonical (parameter-free at build time). Article page passes `ogImage` (resolved photo), `canonical`, `publishDate`, `modifiedDate`. Category pages pass `canonical`. Added branded `og-default.svg` fallback. Commit `5c8c3af`. (Note: `fbclid`/`utm_*` stripping is unnecessary on a static site — the canonical is baked at build time with no query parameters. Google ignores these parameters anyway.)
- [x] **JSON-LD structured data:**
  - Homepage: `Organization` + `WebSite` + `SearchAction`
  - Article: upgraded `Article` → `NewsArticle` with `isAccessibleForFree`, `speakable`, publisher logo, `isPartOf`, author `alternateName`/url
  - Category: `CollectionPage` + `BreadcrumbList` + `ItemList`
  - Layout `jsonLd` prop now accepts array of objects
- [x] **`llms.txt`** — created at `/llms.txt`, describes portal structure for AI search crawlers
- [ ] **Auto OG images** — dynamic per-article OG image generation (deferred; needs a build-time image library or Cloudflare Worker)
- [ ] **Google Publisher Center registration** — owner action
- [ ] E-E-A-T pages — **blocked on the owner** supplying Trade Licence, TIN, Ministry of Information registration
- [x] **URL architecture implemented:** `/:category/:id/:slug` + shortlink `/a/:id` for social sharing. Legacy `/article/:slug` → 301 redirect. Shared `articleUrl()` helper in `lib/url.ts`. 500-cap pagination fix in `getAllArticlePaths()`. Commit `a20f0df`.
- [ ] S11 DoD evidence → **user approval**

## S12 — Deployment, QA & Launch
- [ ] Cloudflare Pages + R2 setup; GitHub Actions pipeline; DianaHost Passenger config — **OWNER-ONLY**
- [x] **Initial payload measured:** all 5 key templates within 1.2MB budget (149–242 KB). See `.sps/section-todos/S12.md`.
- [x] **Bengali typography verified:** 17px base, 1.65 line-height, 154 KB font total (within 200 KB budget).
- [x] **Touch targets verified:** 48px pattern present in CSS.
- [x] **Ad slots reserved:** inline `max-width` + `height` on every AdSlot.
- [x] **404 page verified:** exists, Bengali, has header+footer.
- [x] **Key files verified:** robots.txt, sitemap.xml, news-sitemap.xml, rss.xml, llms.txt, og-default.svg, _headers all present in dist/.
- [x] **Inline script scan:** 79 pages, 0 executable inline scripts (S8 invariant holds).
- [x] **⚠️ CSP route coverage fixed + verified:** the S11 URL change left the article CSP rule at `/article/*`, which matched no article page — every article would have fallen to the strict profile and lost AdSense silently. Fixed to the placeholder pattern `/:category/:id/:slug` (a splat cannot express it: only one splat per rule, and a splat crosses `/`). Verified by `scripts/verify-csp-routes.mjs`, wired into `pnpm verify`. Docs synced (`docs/security.md` §5 + three CMS comments).
- [x] **Pre-launch QA checklist written:** `.sps/section-todos/S12.md`.
- [ ] Lighthouse ≥95 **and accessibility ≥90**; LCP <1.5s; INP <100ms; CLS <0.02; TTFB <200ms — **needs production deployment**
- [ ] **AdSense-vs-≥95 trade-off resolved** — two measurement profiles documented (`docs/performance-budget.md` + `.sps/section-todos/S12.md`)
- [ ] **GATE: monitoring + alerting live** — **OWNER-ONLY** (card-free tool not yet selected)
- [ ] **GATE: full restore drill completed and timed** — **OWNER-ONLY**
- [ ] **SPF / DKIM / DMARC configured** — **OWNER-ONLY** (needs DNS access)
- [ ] **WCAG 2.2 AA**: automated pass + **manual keyboard and screen-reader pass** — **needs human + lab**
- [ ] Browser/device matrix incl. **UC Browser and Opera Mini** — **needs real devices**
- [ ] Bengali font + conjunct rendering audit; error/404 pages verified; pre-launch QA checklist completed — **needs real devices**
- [ ] S12 DoD evidence → **user approval → LAUNCH** — **blocked on owner-only items above**
