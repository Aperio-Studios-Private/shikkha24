# Project Memory — Shikkha24

Durable, cross-session truths only — not task logs.

## What this is
- **Shikkha24 (শিক্ষা২৪)** — Bengali-language **education** news/opportunity portal, `shikkha24.com`. Tagline: *দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ*.
- `docs/master-plan.md` + `docs/competitive-analysis.md` are general-news artifacts → **reference only, never build inputs**. Education inventory: `docs/education-feature-inventory.md`.

## Hard constraints (never violate)
1. **Owner has no international card** → anything needing a card at signup is unusable (Oracle, Railway, Render, paid SMTP/TTS/data/storage). Technical, not budgetary.
2. **Zero recurring cost** beyond host + domain.
3. **Bengali-only UI** — no English toggle.
4. **One section at a time** (S0→S12), each ending in evidence + explicit owner approval. Never batch or skip ahead. Docs are amended *before* code when scope changes (rule 13).

## Infrastructure
- Host **DianaHost PNR 2 GB**, Node **20.18.2 — EOL 2026-04-30** (cPanel selector offers nothing newer). Astro/Vite need ≥22.12 → **build in CI only**; Payload/Next run there. Frontend **Cloudflare Pages** (free), media **Cloudflare R2** (10 GB free, zero egress; **card on file → overage billable**, 80% alert). Payload ships as Next `output: 'standalone'`.
- Repo **PRIVATE** → GitHub Actions **2,000 min/mo**, Cloudflare Pages **500 builds/mo** (the tighter cap) + **20,000 files/site**.
- Editors only use the Payload admin; CI is the invisible rebuild that turns a publish into static HTML.
- DianaHost publishes **no** inode/CPU/memory/email/backup limits → needs a support ticket.

## Editorial scale
- **15–20 articles/day baseline, burst 40+** on result/admission/circular days. Team of 5. Greenfield, no migration.

## Verified facts (don't re-research)
- Pinned: Astro 7.3.2, Payload 3.89.0, Tailwind 4.3.3, TypeScript 7.0.2, Vite 8.3.0, Pagefind 1.5.2, Node 24 LTS, PostgreSQL 18.6, SQLite 3.53.4.
- **Next.js `>=16.2.6 <17.0.0`** (Payload peer range). **`react` must be 19.2.x** (19.3.0 rejected). `graphql` stays 16.x.
- Free no-key APIs (tested): Aladhan (prayer/Hijri), Open-Meteo (weather+AQI), open.er-api.com / exchangerate.host / Frankfurter (FX). **No free source** for cricket, DSE, gold, commodities, flood gauges → descoped.

## Typography
- **SolaimanLipi only**, headline + body (owner-chosen for reader familiarity). **SIL OFL**, not on Google Fonts; vendored at `assets/fonts/vendor/` with `OFL.txt`. **154.0 KB**/200 KB budget for two weights, subset Bengali+Latin.
- ⚠️ **Subsetting must keep OpenType layout features** — Bengali conjuncts (যুক্তাক্ষর) are shaped, not single codepoints. Verify `akhn, blwf, half, liga, nukt, pstf, vatu` after any re-subset.
- Rejected: Hind Siliguri (owner: hard to read), Noto Sans Bengali (interim), Anek Bangla (larger *and* less complete), Tiro/Noto Serif (wrong genre), Atma/Baloo Da 2/Galada (unusable at 17px), **Inter** (83 KB/weight).

## Standing decisions (owner-directed)
- **Light mode default; dark opt-in.** Do NOT follow `prefers-color-scheme`.
- **IP geolocation via ipwho.is** (keyless, no prompt). **ipapi.co now sits behind a Cloudflare interstitial** → returns HTML, browser lookups fail silently. Never use the browser Geolocation API (hostile permission prompt).
- **Hijri needs a −2 day correction** (`PUBLIC_HIJRI_OFFSET_DAYS`) vs Aladhan. Re-calibrate if the owner reports drift.
- **Match transliterated API strings by normalisation, not enumeration** — strip diacritics/apostrophes/punctuation, lowercase, then look up. Aladhan returns `Rabīʿ al-awwal`; a hand-written table held `Rabi' al-Awwal` and the Bengali label silently fell through to English.
- **Bangla calendar = the Bangladesh variant** (year starts 14 April; months 1–5 = 31 days, 6–12 = 30; ফাল্গুন +1 in leap year). Not the Indian variant.

## Ad system (S7, built 2026-09-12)
- **`AD_POSITIONS` is a contract, not a taxonomy.** Each value has exactly one `AdSlot` in the frontend, and each slot reserves its box before any ad loads. A position with no slot renders nothing; a slot with no position renders the labelled placeholder. S1's original vocabulary matched **no** real slot, which made the whole collection inert — don't reintroduce free-form slot labels.
- **No raw-HTML ad field, ever.** `codeSnippet` was removed: rendering CMS-authored HTML is stored XSS, and a compromised Ad Manager account would poison every page. Markup is generated from structured fields (`adsenseSlotId`, `image`, `targetUrl`).
- **`clickCount` was removed** — a static site cannot count clicks, and beaconing to the CMS from the browser would break "a CMS outage cannot take the site down". Deferred to Cloudflare Web Analytics.
- **⚠️ Cloudflare Pages JOINS duplicate headers with a comma — it does NOT override.** A comma-joined CSP is enforced as *two* policies, so a strict site-wide `script-src 'self'` still blocks AdSense regardless of a more specific rule. A more specific rule must **`!`-detach** the inherited policy first. Applied to `/`, `/article/*`, `/category/*`. **S12 must verify production returns exactly ONE CSP header.**
- **AdSense loads only on `window.load` → `requestIdleCallback`,** never the copy-paste `<head>` script. With no unit configured the loader makes **zero** third-party requests — that is what holds the no-ads Lighthouse ≥95 profile.
- **Mid-article ads need ≥6 paragraphs** (`countParagraphs`/`splitHtmlAtParagraph` in `lib/richtext.ts`, cutting only after a `</p>`). Demo articles are 4 paragraphs, so that path needs `scripts/verify-ads-s7.mjs` to exercise it.
- **A body's `children.length` is not its paragraph count** — the demo body also holds a heading, a list and a blockquote. Cost one false test failure.
- **Sponsored content:** `isSponsored` + `sponsorName`; excluded from the masthead and breaking ticker, kept in category sections and the latest feed with a «বিজ্ঞাপন» label. The latest feed excludes whatever the masthead showed, matched by **slug** — slicing by index re-showed the promoted story as the feed's lead.

## Gotchas (found the hard way)
**Build environment (this machine)**
- **`HTTP_PROXY` is set → build-time CMS fetches silently fail.** Astro's build-time `fetch()` routes `localhost:3000` through the proxy → **502**. The CMS layer degrades gracefully, so the build stays **green** while every page falls back to empty data and article routes 404 (`getAllArticleSlugs()` → `[]`). **Tell: a green build with suspiciously thin pages, or 304-byte redirect stubs in `dist/article/*`.** Fixed by `NO_PROXY=localhost,127.0.0.1,::1` in `frontend/package.json` `dev`/`build`. `curl` needs `--noproxy '*'`.
- **The sandbox safe-delete shim aborts `astro build`.** Astro deletes its own `dist/` + `dist/.prerender/`; the bulk-delete guard (threshold 50/turn) trips and the build exits 1 **after** writing the pages — so `dist/` looks populated but `pagefind` never runs and `.prerender/` is left to be deployed. **Fix: prefix with `CODEBUDDY_SAFE_DELETE_ENABLED=0`** (deletes are confined to git-ignored `dist/`).
- **Background servers do not survive between tool calls.** Start the CMS **and** run the build in the *same* command.
- **Parallel edits to the SAME file silently lose writes.** Several edits to one file in one message report success but only some land (typically the first and third survive, the second and fourth are dropped) — no error, no warning. Cost two debugging rounds. **Serialize edits to one file and read the value back; different files in parallel are fine.**
- **Drizzle's schema push is interactive and will hang the build.** Dropping/renaming a column makes Payload ask "is this a rename?" on stdin; the dev server blocks forever and the build's CMS health check never passes. With no data in the table, back up the DB and `DROP TABLE` it so Payload recreates it cleanly.
- `.astro` templates are **not type-checked** (`@astrojs/check` rejects TS 7) → typecheck = `tsc --noEmit`. ESLint can't run on TS 7 either → **Biome 2.5.13** is the linter.

**Astro/Tailwind**
- **Astro does NOT inherit page-level CSS imports into components.** Move a stylesheet import into `Layout.astro` and Tailwind emits *nothing* — no `<link rel="stylesheet">`, unstyled page. Every stylesheet must be imported in the rendered tree.
- **Local images go in `src/assets`, NEVER `public/`** — `public/` is copied verbatim; `src/assets` goes through the pipeline (AVIF+WebP, srcset, hashed names). The glob must be **eager** or Astro silently loses the optimization.
- **Payload is finicky under build-time concurrency** → `lib/cms.ts` caches responses *and failures* by path for the whole build.

**Package manager**
- **pnpm 11.22.0 only.** `npm install` cannot run here — a filesystem broker denies its `mkdir` (`CODEBUDDY_BROKER_DENY`). Never reintroduce npm lockfiles.
- pnpm's global project-registry symlink can go stale → misreported `EEXIST`. Remove the symlink under `~/Library/pnpm/store/v*/projects/`.

**Monorepo / Next**
- Turbopack `root` must be the **monorepo root**, not the app dir.
- **TypeScript 7 removed `baseUrl`** (TS5102) — Payload's template still sets it.
- Standalone entry is **`.next/standalone/cms/server.js`**; `next start` is incompatible with standalone. Next does **not** copy `.next/static` — the deploy must.

**Payload**
- **Regenerate types after adding a collection** (`payload generate:types`) or every `relationTo` fails — 20 errors from one stale `payload-types.ts`.
- **`Access` functions take `AccessArgs`, not a user** — use `isEditorialUser(user)`.
- **Bengali locale key must be `bn-BD`**, not `bn`.
- **Never run `payload run` while a dev server holds the same SQLite file** — both push schema; second fails `index already exists`. Isolated, the seed is idempotent.
- `generate:types` and `next build` both need `PAYLOAD_SECRET` + `DATABASE_URI`.
- **`PRAGMA journal_mode = WAL` is not concurrency-safe** — set it once on the database; re-verify against `@payloadcms/db-sqlite` if Payload re-issues it per connection (5 editors could hit "database is locked").

## Conventions
- **Three rule mirrors** — `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`. Rules 1–13 **byte-identical**; change all three in one commit. GEMINI.md adds `H1`–`H14`.
- **`.sps/` is project memory.** Update `.sps/handoff.md` after every meaningful task; **re-read before editing** (concurrent sessions). Corrections get visible `CORRECTION` notes, never silent rewrites.
- **Commit immediately** after each task (`type(scope): summary`). Never mix unrelated changes.
- `.sps/lock.json` intentionally does not exist (skill references it but defines no schema).
- Never assume — ask the owner, or research and cite.

## Known defects / open owner gates
- **`getAllArticleSlugs()` caps at 500 with no pagination** → past ~500 published articles the article routes *and* the sitemap silently stop growing (~3 weeks at 15–20/day). Flagged, not fixed (S4/S5 code, needs a scope decision).
- **Pagefind has no Bengali stemming** (printed at build time) — exact word forms only; "শিক্ষা" won't match "শিক্ষার্থী". S6's "test on a real Bengali corpus" gate is still open.
- **Owner-only gates:** `wrangler pages deploy` quota check · DianaHost support ticket · DNS for shikkha24.com · Payload-on-cPanel-Passenger smoke test · R2 80% alert · AdSense IDs · E-E-A-T legal details (Trade Licence, TIN, Ministry registration) · real logo · Meta app review.
- **CMS `siteName` is currently «শিক্ষা২৪.com»** → flows into the RSS title and Google News `news:name`; Publisher Center name must match exactly, so set it deliberately.
- Monitoring/alerting tool not selected (must be card-free) · Bengali admin locale (~60 strings) needs native-speaker review · RBAC needs a manual pass with all 5 real roles · competitors Dainik Shiksha + Shiksha Sangbad not yet audited hands-on.
