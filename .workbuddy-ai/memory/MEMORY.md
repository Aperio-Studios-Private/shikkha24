# Project Memory — Shikkha24

Durable, cross-session truths only — not task logs.

## What this project is
- **Shikkha24 (শিক্ষা২৪)** — Bengali-language **education** news/opportunity portal. Domain `shikkha24.com`.
- Tagline: *দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ*. Not general news — `docs/master-plan.md` and `docs/competitive-analysis.md` are **reference-only**.

## Hard constraints (never violate)
1. **Owner has no international card.** Anything requiring a card at signup is unusable (Oracle, Railway, Render, paid SMTP/TTS/data/storage). Technical, not budgetary.
2. **Zero recurring cost** beyond host + domain.
3. **Bengali-only UI** — no English toggle.
4. **One section at a time** (S0→S12), each ending in evidence + explicit owner approval. Never batch or skip ahead.

## Infrastructure
- Host: **DianaHost PNR 2 GB** (2 GB storage, 200 GB/mo). Runs **Node 20.18.2 — EOL 2026-04-30**. Astro/Vite cannot run there (need ≥22.12) → **build in CI only**; Payload/Next can run. cPanel has a Node Selector — pick 22/24 if offered.
- Frontend **Cloudflare Pages** (free). Media **Cloudflare R2** (10 GB free, zero egress; card on file → overage billable, set 80% alert). Payload on the host, CI-built with `output: 'standalone'`.
- Repo is **PRIVATE** → **GitHub Actions 2,000 min/mo** and **Cloudflare Pages 500 builds/mo** (the tighter). Pages also caps **20,000 files/site**.
- Editors only use the Payload admin; CI is the invisible rebuild that turns a publish into static HTML (`docs/hosting-and-deployment.md`).
- DianaHost publishes **no** inode/CPU/memory/email/backup limits — must come from a support ticket.

## Editorial scale
- **15–20 articles/day baseline, burst to 40+** on result/admission/circular days (retired the flat 45–70/day). Team of 5 in place. Greenfield, no migration.

## Verified facts (don't re-research)
- Pinned stack: Astro 7.3.2, Payload 3.89.0, Tailwind 4.3.3, TypeScript 7.0.2, Vite 8.3.0, Pagefind 1.5.2, Node 24 LTS, PostgreSQL 18.6, SQLite 3.53.4.
- **Next.js must be `>=16.2.6 <17.0.0`** (Payload's peer range). **`react` must be 19.2.x** (npm latest 19.3.0 is rejected). `graphql` stays 16.x.
- Free no-key APIs (tested): Aladhan (prayer/Hijri), Open-Meteo (weather + AQI), open.er-api.com / exchangerate.host / Frankfurter (FX). **No free source** for cricket, DSE, gold, commodities, flood gauges — descoped.

## Typography (decided 2026-09-12)
- **One Bengali family: SolaimanLipi**, for both headline and body. Owner chose it by name for reader familiarity (it's what major BD newspapers are set in).
- **SIL Open Font License** (Solaiman Karim / Ekushey / OmicronLAB); **not on Google Fonts**. Vendored at `assets/fonts/vendor/` with `OFL.txt`. Build needs no network.
- **154.0 KB** for two weights (68.3 + 85.8), subset Bengali+Latin → WOFF2. Budget 200 KB, 46 KB headroom.
- ⚠️ **Subsetting MUST keep OpenType layout features.** Bengali conjuncts (যুক্তাক্ষর) are shaped, not single codepoints. SolaimanLipi carries the full Indic set (`akhn, blwf, half, liga, nukt, pstf, vatu`) — verify after any re-subset.
- Rejected: **Hind Siliguri** (owner: hard to read, a numeral wouldn't render; only 92/128 Bengali codepoints), **Noto Sans Bengali** (interim, 110.5 KB/96), **Anek Bangla** (111.2 KB but 90/128 — larger *and* less complete), serifs Tiro Bangla / Noto Serif Bengali (wrong genre), display faces Atma / Baloo Da 2 / Galada (unusable at 17px). **Inter** dropped (83 KB/weight).

## Gotchas (found the hard way)
**Astro/Tailwind**
- **Astro does NOT inherit page-level CSS imports into components.** Moving a stylesheet import into `Layout.astro` requires adding it there, or Tailwind emits *nothing* — built HTML has no `<link rel="stylesheet">`, page renders unstyled. Every stylesheet must be imported in the rendered tree.
- `.astro` templates are **not type-checked** (`@astrojs/check` rejects TS 7). Typecheck = `tsc --noEmit`. ESLint can't run on TS 7 either → **Biome 2.5.13** is the linter.
- Google Fonts: `wght@400;700` in one call returns a **variable** file (105 KB); separate calls return **static** (43 KB). The `/* subset */` comment is emitted *before* each `@font-face` — parse them together or labels shift by one.

**Package manager**
- **pnpm 11.22.0 only.** `npm install` cannot run here — a filesystem broker (`CODEBUDDY_BROKERED_FS_HOOK_ENABLED=1`) denies its `mkdir` with `CODEBUDDY_BROKER_DENY`; `dangerouslyDisableSandbox` doesn't help. Never reintroduce npm lockfiles.
- pnpm's global project-registry symlink can go stale and make `forceSymlink` fail with a misreported `EEXIST`. Remove the symlink under `~/Library/pnpm/store/v*/projects/`; pnpm recreates it.

**Monorepo / Next**
- Turbopack `root` must be the **monorepo root**, not the app dir.
- **TypeScript 7 removed `baseUrl`** (TS5102) — Payload's template still sets it.
- Standalone entry is **`.next/standalone/cms/server.js`**; `next start` is incompatible with `standalone`. Next does **not** copy `.next/static` in — the deploy must.

**Payload**
- **Regenerate types after adding a collection** (`payload generate:types`) or every `relationTo` fails — 20 errors from one stale `payload-types.ts`.
- **`Access` functions take `AccessArgs`, not a user** — use `isEditorialUser(user)`.
- **Bengali locale key must be `bn-BD`**, not `bn` (date-fns has no plain `bn`).
- Per-slug method overloads can't type a union slug — one confined cast in the seed.
- **Never run `payload run` while a dev server holds the same SQLite file** — both push schema, second fails `index already exists`. Isolated, the seed is idempotent.
- `generate:types` and `next build` both need `PAYLOAD_SECRET` + `DATABASE_URI`.
- **`PRAGMA journal_mode = WAL` is not concurrency-safe** — it needs a lock and ignores `busy_timeout`, so concurrent writers collide intermittently. Set it once on the database. **Re-verify against `@payloadcms/db-sqlite`** when collections are live: if Payload re-issues it per connection, 5 editors could hit "database is locked".

## Working conventions
- **Three rule mirrors** — `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`. Rules 1–13 **byte-identical** across all three; change all three in one commit. GEMINI.md adds hardening `H1`–`H14`.
- **`.sps/` is project memory.** Update `.sps/handoff.md` after every meaningful task; **re-read it before editing** (concurrent sessions). Corrections get visible `CORRECTION` notes, never silent rewrites.
- **Commit immediately** after each task (`type(scope): summary`). Never mix unrelated changes.
- `.sps/lock.json` intentionally does not exist (skill references it but defines no schema).
- Never assume — ask the owner or research and cite.

## Open decisions
- **Owner-only gates:** `wrangler pages deploy` quota check; DianaHost support ticket (inode/CPU/memory/email/backup); DNS for shikkha24.com; Payload-on-cPanel-Passenger smoke test; R2 80% alert.
- **Re-measure Astro incremental build time** once real volume exists — the 1s figure came from a 1-page site.
- **Monitoring/alerting tool** not selected; must be card-free.
- Legal details for E-E-A-T pages (Trade License, TIN, Ministry of Information) — owner provides before final deploy.
- Hands-on audit of competitors Dainik Shiksha + Shiksha Sangbad.
- Bengali admin locale is a ~60-string draft — needs native-speaker review.
- RBAC needs a manual pass with real accounts for all 5 roles.
