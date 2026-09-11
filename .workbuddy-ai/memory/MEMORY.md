# Project Memory — Shikkha24

Curated long-term facts. Only durable, cross-session truths belong here — not task logs.

## What this project is
- **Shikkha24 (শিক্ষা২৪)** — a Bengali-language **education** news and opportunity portal.
- Domain: **`shikkha24.com`** (decided 2026-09-11).
- Positioning: *Education News | Scholarship | Admission | University | Higher Study — দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ*.
- Not a general news portal. `docs/master-plan.md` and `docs/competitive-analysis.md` are general-news artifacts and are **reference-only**.

## Hard constraints (do not violate)
1. **The owner has no international credit or debit card.** Every service that requires a card at signup is unusable — Oracle Cloud, Railway, Render, paid SMTP relays, paid TTS APIs, paid data APIs, paid object storage. This is technical, not just budgetary.
2. **Zero recurring cost** beyond the approved host and domain.
3. **Bengali-only UI.** No English toggle.
4. **S0 is open** — the owner said "go" on 2026-09-12. Build one section at a time and never skip ahead.
5. **One section at a time** (S0→S12), each ending in evidence + explicit owner approval. Never batch.

## Infrastructure (purchased / chosen)
- Host: **DianaHost PNR 2 GB SSD NVMe** — 2 GB storage, 200 GB/month bandwidth, 50 databases, SSH on demand, Python/Ruby/Node.js.
- **⚠️ DianaHost runs Node.js 20.18.2, which is END-OF-LIFE (2026-04-30).** `astro@7.3.2` needs `>=22.12.0` and `vite@8.3.0` needs `^20.19.0 || >=22.12.0` → **Astro and Vite cannot run on the host at all**; they build in CI only. `next@16.3.4` (`>=20.9.0`) and `@payloadcms/next@3.89.0` (`^18.20.2 || >=20.9.0`) do accept it. DianaHost's cPanel has a **Node.js Selector with a version drop-down** — select 22/24 if offered.
- Frontend: **Cloudflare Pages** (free, unlimited bandwidth).
- Media: **Cloudflare R2** (10 GB free, zero egress). The account **has a payment method on file**, so R2 is enableable — but that also means overage is **billable**: set an 80% usage alert. Verify with `wrangler login && wrangler r2 bucket list`.
- Payload CMS runs on the 2 GB host, built in CI with Next.js `output: 'standalone'` (~300–600 MB).
- Repository is **PRIVATE** → CI budgets: **GitHub Actions 2,000 min/month** and **Cloudflare Pages 500 builds/month** (the tighter of the two). Cloudflare Pages also caps at **20,000 files/site** (~2–3 years at target volume).
- **Why CI exists:** editors only ever use the Payload admin panel — they never touch GitHub. Because the public site is pre-built static HTML, publishing triggers an invisible rebuild in CI. Full explanation in `docs/hosting-and-deployment.md`.
- DianaHost publishes **no inode quota, CPU/memory limits, email send limits, or backup policy** — all must come from a support ticket.

## Editorial scale (decided)
- **Publishing velocity: baseline 15–20 articles/day + burst to 40+ on result/admission/circular days.** The flat 45–70/day target is retired (it implied 15–23 staff).
- Editorial team: **5 people already in place**. Greenfield launch, no content migration.

## Verified facts worth not re-researching
- Pinned stack (all verified against live registries 2026-09-11): Astro 7.3.2, Payload 3.89.0, Tailwind 4.3.3, TypeScript 7.0.2, Vite 8.3.0, Pagefind 1.5.2, Node 24.21.0 LTS "Krypton", PostgreSQL 18.6, SQLite 3.53.4.
- **Next.js must be `>=16.2.6 <17.0.0`.** The `@payloadcms/next@3.89.0` peer range excludes Next 15.5.x, 16.0.0–16.2.5 and 17.x.
- **Node 24 Active LTS ends 2026-10-20** (EOL 2028-04-30). Node 26 becomes LTS 2026-10-28.
- Free data APIs that work with **no API key** (tested live): Aladhan (prayer times + Hijri date), Open-Meteo (weather), Open-Meteo Air Quality (AQI), open.er-api.com and exchangerate.host and Frankfurter (FX).
- No free source exists for cricket scores, DSE data, gold prices, commodity prices or flood gauges — all descoped.

### Toolchain gotchas (found the hard way, 2026-09-12)
- **`react` must be 19.2.x.** `@payloadcms/ui@3.89.0` pins react to `^19.0.1 || ^19.1.2 || ^19.2.1` — the npm `latest` (19.3.0) is **rejected**. `graphql` must stay on 16.x (`^16.8.1`), not 17.x.
- **TypeScript 7 breaks its surrounding tooling.** `@astrojs/check@0.9.10` (latest) peer-requires `typescript ^5 || ^6` → `astro check` is unavailable, so **`.astro` templates are not type-checked**; typecheck is `tsc --noEmit`. `typescript-eslint@8.70.0` caps at `typescript <6.1.0` → **ESLint cannot run on TS 7**. **Biome 2.5.13** is used instead (own parser, no TS coupling).
- `typescript@7.0.2` ships `bin/tsc` plus **20 platform-native binaries** — builds belong in CI, not on a shared host.
- **Google Fonts gotchas:** requesting `wght@400;700` in one css2 call returns a **variable** file (105 KB for Noto Sans Bengali's bengali subset); requesting each weight separately returns **static** instances (43 KB). The `/* subset */` comment is emitted **before** each `@font-face`, so parsing them separately shifts every label by one. Inter's variable file alone is 83 KB/weight → dropped for a system UI stack.
- **Package manager is pnpm 11.22.0, not npm.** `npm install` cannot run in this build environment at all — a filesystem broker (`CODEBUDDY_BROKERED_FS_HOOK_ENABLED=1`) refuses its `mkdir` calls with `CODEBUDDY_BROKER_DENY`, and `dangerouslyDisableSandbox` does not remove the broker. pnpm's calls are permitted. pnpm is also the better fit: Payload's own template targets it, `astro@7.3.2` declares `pnpm >=7.1.0` in engines, and it blocks post-install scripts by default. Do not reintroduce npm lockfiles — two managers would drift.
- **`PRAGMA journal_mode = WAL` is not concurrency-safe.** Switching journal mode needs a lock and does **not** honour `busy_timeout`, so N connections doing it at once collide and fail with "database is locked" — *intermittently*, so one green run looks like a pass. Set it once, on the database. ⚠️ Verify against `@payloadcms/db-sqlite` at S1: if Payload re-issues it per connection, 5 editors connecting at once could hit this.
- **Monorepo gotchas (all hit and fixed at S0):**
  - Turbopack `root` must point at the **monorepo root**, not the app dir — Payload's template default fails in a pnpm monorepo with *"Could not find the Next.js package"*.
  - **TypeScript 7 removed `baseUrl`** (error TS5102); Payload's template still sets it. `paths` resolve relative to the tsconfig without it.
  - The standalone entry point is **`.next/standalone/cms/server.js`** — the monorepo structure is preserved inside the bundle. `next start` is incompatible with `output: 'standalone'`.
  - Next does **not** copy `.next/static` into the standalone bundle; the deploy must, or every admin asset 404s.

## Working conventions
- **Three rule mirrors** — `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`. Rules 1–13 must be **byte-identical** across all three; change all three in the same commit. GEMINI.md additionally carries hardening rules `H1`–`H14`.
- **`.sps/` is project memory.** Update `.sps/handoff.md` after every meaningful task. Never rewrite plan/profile history silently — add visible `CORRECTION` notes.
- **Commit immediately** after each finished task (`type(scope): summary`). Never mix unrelated changes.
- `.sps/handoff.md` is edited by concurrent agent sessions — **always re-read it before editing**.
- `.sps/lock.json` intentionally does not exist: the `sps` skill references it but defines no schema. Do not invent one.
- Agents must never assume. Ask the owner, or research it first and cite the source.

## Open decisions
- **Portal display name + logo** — blocking S2 entry. Placeholder SVG is in place; "Shikkha24" assumed from the domain.
- **Owner-only S0 gates still open:** `wrangler pages deploy` quota check, DianaHost support ticket (inode/CPU/memory/email/backup limits), DNS for shikkha24.com, Payload-on-cPanel-Passenger smoke test, R2 80% usage alert.
- **`.astro` template type-checking is unavailable** while TypeScript 7 is pinned (`@astrojs/check` rejects TS 7). Revisit when it supports TS 7, or pin TS 6 for the frontend only.
- **Font budget headroom is thin** — 179.7 KB of the 200 KB ceiling. Any new family or weight needs a budget amendment.
- **Re-measure the Astro incremental build time once real content volume exists.** The 1s figure came from a 1-page site and should not be used to justify the CI batching strategy on its own.
- **Monitoring/alerting tool** — not yet selected; must be verified card-free (`docs/reliability.md` §6).
- Legal details for the E-E-A-T pages (Trade License, TIN, Ministry of Information registration) — owner provides before final deploy.
- Hands-on audit of the two direct competitors (Dainik Shiksha, Shiksha Sangbad).
