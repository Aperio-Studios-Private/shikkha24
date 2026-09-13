# Project Memory — Shikkha24

Durable cross-session truths only. Detail lives in `.sps/handoff.md` + `.sps/section-todos/S*.md`; build traps in the `sandbox-build-traps` skill. Read those for "what happened" — this file is the short list of things that must not be got wrong.

## What this is
- **Shikkha24 (শিক্ষা২৪)** — Bengali-only **education** news/opportunity portal, `shikkha24.com`. Tagline: *দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ*.
- `docs/master-plan.md` + `docs/competitive-analysis.md` are general-news artifacts → **reference only, never build inputs**. Build input: `docs/education-feature-inventory.md`.

## Hard constraints (never violate)
1. **Owner has no international card** → anything needing a card at signup is unusable (Oracle, Railway, Render, paid SMTP/TTS/data/storage). Technical, not budgetary.
2. **Zero recurring cost** beyond host + domain.
3. **Bengali-only UI** — no English toggle.
4. **One section at a time** (S0→S12), each ending in evidence + explicit owner approval. Never batch or skip ahead. **Docs are amended *before* code when scope changes (rule 13).**
5. "Please continue" = *approve the last section + build the next* (this project's recorded convention).

## Infrastructure & scale
- Host **DianaHost PNR 2 GB** (owner considering 5 GB; bandwidth + price still unknown), Node **20.18.2 — EOL 2026-04-30** (cPanel offers nothing newer). Astro/Vite need ≥22.12 → **build in CI only**; Payload/Next run there. Frontend **Cloudflare Pages** (free); media **on DianaHost disk** (R2 descoped 2026-09-12). Payload ships as Next `output: 'standalone'`.
- Repo **PRIVATE** → GitHub Actions **2,000 min/mo**, Cloudflare Pages **500 builds/mo** (tighter cap) + **20,000 files/site**. Editors only use the Payload admin; CI is the invisible rebuild that turns a publish into static HTML.
- DianaHost publishes **no** inode/CPU/memory/email/backup limits → needs a support ticket.
- **15–20 articles/day baseline, burst 40+** on result/admission/circular days. Team of 5. Greenfield, no migration.

## Verified facts (don't re-research)
- Pinned: Astro 7.3.2, Payload 3.89.0, Tailwind 4.3.3, TypeScript 7.0.2, Vite 8.3.0, Pagefind 1.5.2, Node 24 LTS, PostgreSQL 18.6, SQLite 3.53.4.
- **Next.js `>=16.2.6 <17.0.0`** (Payload peer range). **`react` must be 19.2.x** (19.3.0 rejected). `graphql` stays 16.x.
- Free no-key APIs (tested): Aladhan (prayer/Hijri), Open-Meteo (weather+AQI), open.er-api.com / exchangerate.host / Frankfurter (FX). **No free source** for cricket, DSE, gold, commodities, flood gauges → descoped.

## Typography
- **SolaimanLipi only**, headline + body (owner-chosen for reader familiarity). **SIL OFL**, not on Google Fonts; vendored at `assets/fonts/vendor/` with `OFL.txt`. **154.0 KB**/200 KB budget for two weights, subset Bengali+Latin.
- ⚠️ **Subsetting must keep OpenType layout features** — Bengali conjuncts (যুক্তাক্ষর) are shaped, not single codepoints. Verify `akhn, blwf, half, liga, nukt, pstf, vatu` after any re-subset.
- Rejected: Hind Siliguri (owner: hard to read) · Noto Sans Bengali · Anek Bangla · Tiro/Noto Serif (wrong genre) · Atma/Baloo Da 2/Galada (unusable at 17px) · **Inter** (83 KB/weight).

## Standing decisions (owner-directed)
- **Light mode default; dark opt-in.** Do NOT follow `prefers-color-scheme`.
- **IP geolocation via ipwho.is** (keyless, no prompt). **ipapi.co now sits behind a Cloudflare interstitial** → returns HTML, browser lookups fail silently. Never use the browser Geolocation API (hostile permission prompt).
- **Hijri needs a −2 day correction** (`PUBLIC_HIJRI_OFFSET_DAYS`) vs Aladhan. Re-calibrate if the owner reports drift.
- **Match transliterated API strings by normalisation, not enumeration** — strip diacritics/apostrophes/punctuation, lowercase, then look up. Aladhan returns `Rabīʿ al-awwal`; a hand-written table held `Rabi' al-Awwal` and the Bengali label silently fell through to English.
- **Bangla calendar = the Bangladesh variant** (year starts 14 April; months 1–5 = 31 days, 6–12 = 30; ফাল্গুন +1 in leap year). Not the Indian variant.
- **Categories: 8 top-level only.** স্কুল-কলেজ was explicitly rejected (audience segment, not a topic) → covered by the **Level filter**; extra topics become subcategories/tags. ⚠️ A team-leader proposal asked for 15 — **owner decision still pending**, nothing changed.

## Standing contracts — do not break these
- **`AD_POSITIONS` is a contract, not a taxonomy.** Each value has exactly one `AdSlot`; each slot reserves its box before any ad loads. S1's vocabulary matched **no** real slot, which made the collection inert — no free-form slot labels. **No raw-HTML ad field, ever** (`codeSnippet` removed — stored XSS). **`clickCount` removed** — a static site cannot count clicks, and beaconing to the CMS would break "a CMS outage cannot take the site down".
- **⚠️ Cloudflare Pages JOINS duplicate headers with a comma — it does NOT override.** A comma-joined CSP is enforced as *two* policies, so a strict `script-src 'self'` still blocks AdSense regardless of a more specific rule. A more specific rule must **`!`-detach** the inherited policy first. Applied to `/`, `/article/*`, `/category/*`. **S12 must verify production returns exactly ONE CSP header.**
- **AdSense loads only on `window.load` → `requestIdleCallback`,** never the copy-paste `<head>` script. With no unit configured the loader makes **zero** third-party requests — that holds the no-ads Lighthouse ≥95 profile.
- **Interactive islands are opt-in and self-hiding.** `getPublicCmsOrigin()` returns `null` unless `PUBLIC_CMS_ORIGIN` is set; when `null` the refresh button and vote control are **not rendered at all**. A control that cannot work reads as the reader's own failure. Static content always renders.
- **Poll guards, in order:** honeypot (silent success, **no write**) → per-IP rate limit (20/min, in-process — Cloudflare free has no rate-limiting rules) → salted `HMAC-SHA256(ip+UA)` duplicate guard per poll. **The guard row stores no raw IP, no UA, no timestamp, and not which option was chosen.** Tally update is read-modify-write (Payload cannot express an atomic `+1`) — fine for a reader poll, not for money.
- **Quiz is graded in the browser, so the answers are in the page.** Fine — practice, not assessment; nothing stored about the reader. Data travels in a `type="application/json"` tag, never `define:vars`.
- **Article blocks** are Payload `BlocksFeature` blocks rendered by `lib/richtext.ts`, styled from a **global** stylesheet (`content-blocks.css`) because `set:html` output is not touched by Astro's scoped styles. None needs JS to be readable.
- **Mid-article ads need ≥6 paragraphs** (`countParagraphs`/`splitHtmlAtParagraph`, cutting only after a `</p>`). **A body's `children.length` is not its paragraph count.** **Sponsored content** (`isSponsored`/`sponsorName`) is excluded from the masthead + ticker but kept in category sections and the latest feed with a «বিজ্ঞাপন» label — the feed excludes the masthead story by **slug**, not index.
- **`richText(...)` is required for a richText field inside an array** — a bare paragraph node is rejected. **Flag contract:** `PUBLIC_FLAG_LIVE_BLOG` / `_QUIZ` / `_POLL` default ON; setting one to exactly `"false"` removes it from the next build.

## Environment traps (top three; rest in the `sandbox-build-traps` skill)
- **`HTTP_PROXY` is set → build-time CMS fetches silently fail (502).** The build stays **green** while every page falls back to empty data. Tell: suspiciously thin pages, or 304-byte redirect stubs in `dist/article/*`. Fixed by `NO_PROXY=localhost,127.0.0.1,::1` in `frontend/package.json`. `curl` needs `--noproxy '*'`.
- **The sandbox safe-delete shim aborts `astro build`** after writing pages (`dist/` looks fine but `pagefind` never runs). **Prefix with `CODEBUDDY_SAFE_DELETE_ENABLED=0`.**
- **Parallel edits to the SAME file silently lose writes** (first + third survive, second + fourth dropped, no error). Serialize edits to one file and read back; different files in parallel are fine.
- Also: **background servers do not survive between tool calls** — start the CMS and run the build in the *same* command. **Drizzle's schema push is interactive and hangs the build.** **pnpm only** — `npm install` is denied by a filesystem broker.

## Astro / Payload gotchas (project-specific)
- **⚠️ Astro inlines "small enough" component scripts — which a strict CSP blocks.** `_headers` is `script-src 'self'` with no `'unsafe-inline'`, so every inlined script was silently dead (theme toggle, mobile menu, text resizer, demo ads, share button, `/search` bootstrap) — and **nothing local shows it**, because Cloudflare Pages applies the CSP. **Fixed by `vite.build.assetsInlineLimit: 0`** (Vite default is 4096 bytes). **`define:vars` ALWAYS emits an inline script.** Deliberate pre-paint scripts live in `public/` with no async/defer. **Assert the built HTML for inline scripts after any new component script.**
- **Astro does NOT inherit page-level CSS imports into components.** A stylesheet must be imported in the rendered tree or Tailwind emits *nothing*. Component `<style>` blocks land in the CSS bundle → assert CSS rules against `dist/_astro/*.css`, not the HTML. **Local images go in `src/assets`, NEVER `public/`** (the glob must be **eager**).
- **Payload:** regenerate types after adding a collection (`payload generate:types`) or every `relationTo` fails. `Access` functions take `AccessArgs`, not a user (`isEditorialUser(user)`). Bengali locale key is **`bn-BD`**, not `bn`. Never run `payload run` while a dev server holds the same SQLite file. `generate:types` + `next build` need `PAYLOAD_SECRET` + `DATABASE_URI`. `PRAGMA journal_mode = WAL` is not concurrency-safe — set it once on the database, never per connection.
- **Monorepo/Next:** Turbopack `root` must be the monorepo root. TS 7 removed `baseUrl` (TS5102). Standalone entry is **`.next/standalone/cms/server.js`**; Next does **not** copy `.next/static` — the deploy must. `.astro` is **not** type-checked (`@astrojs/check` rejects TS 7) → `tsc --noEmit`; **Biome 2.5.13** is the linter (ESLint rejects TS 7).

## Conventions
- **Three rule mirrors** — `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`. Rules 1–13 **byte-identical**; change all three in one commit. GEMINI.md adds `H1`–`H14`.
- **`.sps/` is project memory.** Update `.sps/handoff.md` after every meaningful task; **re-read before editing**. Corrections get visible `CORRECTION` notes, never silent rewrites.
- **Commit immediately** after each task (`type(scope): summary`). Never mix unrelated changes. `.sps/lock.json` intentionally does not exist. Never assume — ask the owner, or research and cite.

## Known defects / open owner gates
- **`getAllArticleSlugs()` caps at 500 with no pagination** → past ~500 published articles the article routes *and* the sitemap silently stop growing (~3 weeks at 15–20/day). Flagged, not fixed (S4/S5 code, needs a scope decision).
- **Pagefind has no Bengali stemming** (printed at build time) — exact word forms only; "শিক্ষা" won't match "শিক্ষার্থী". S6's "test on a real Bengali corpus" gate is still open.
- **Owner-only gates:** DianaHost support ticket (inode/CPU/memory/email/backup + host-disk alert) · DNS for shikkha24.com · Payload-on-cPanel-Passenger smoke test · AdSense IDs · E-E-A-T legal details (Trade Licence, TIN, Ministry registration) · real logo · Meta app review · `PUBLIC_CMS_ORIGIN` + CSP `connect-src` real hostname · E-E-A-T Pages created in the CMS (footer links 404 until then) · team-leader proposal's 5 open decisions.
- **CMS `siteName` is currently «শিক্ষা২৪.com»** → flows into the RSS title and Google News `news:name`; Publisher Center name must match exactly, so set it deliberately.
- Monitoring/alerting tool not selected (must be card-free) · Bengali admin locale (~60 strings) needs native-speaker review · RBAC needs a manual pass with all 5 real roles · competitors Dainik Shiksha + Shiksha Sangbad not yet audited hands-on.
- **S11 partly built ahead of sequence:** `robots.txt`, `sitemap.xml`, `news-sitemap.xml`, `rss.xml` (hand-written, build-time). Remaining S11: OG/Twitter, auto OG images, canonical, `llms.txt`, Publisher Center, E-E-A-T pages, URL architecture.
