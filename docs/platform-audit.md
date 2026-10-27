# Platform Audit — Shikkha24 (2026-10-27)

**Goal (owner's words):** make `https://shikkha24.com/` perfect, fast and robust; use
`https://cms.shikkha24.com/admin` as the CMS entry; publishing must reach the site ASAP; no
bugs left. This audit covers every platform in play — what it is for, why it was chosen,
whether its best practices are followed, and the root-cause plan for what is not.

**Method:** every claim below was verified against the platform's own API/CLI or official
documentation on 2026-10-27 (Neon API, Render REST API, wrangler, GitHub API, live HTTP probes,
real-browser checks). Learn-first citations are inline.

---

## 1. The architecture in one paragraph

Editors publish in **Payload CMS** (Next.js standalone) hosted on **Render** (free tier),
writing to **Neon Postgres** (client's account, AWS Singapore). Media files live in
**Cloudflare R2** behind `media.shikkha24.com`. The reader-facing site is a **static Astro
build** published to **Cloudflare Workers** (free tier) at `shikkha24.com`. A **publish-watcher
Worker** polls the CMS every 5 minutes and fires a GitHub `repository_dispatch` that rebuilds
the static site through CI gates (Lighthouse, audit, link check) and deploys atomically.
**DianaHost** (shared cPanel hosting, SQLite) runs the previous CMS as rollback-only; its
media files have recovered and it still serves `cms.shikkha24.com` until the DNS cutover.

## 2. Platform-by-platform

### 2.1 Neon Postgres — the database (client's account)
**What/why:** managed Postgres with scale-to-zero; chosen because the no-card budget rule
excludes most managed DBs and Neon's free tier is genuine. SQLite on a shared host was the
original design; the migration (T-18 P2) moved the whole archive.

| Check | Status | Evidence |
|---|---|---|
| Pooled connection for the app, direct for migrations | ✅ | `-pooler` in `DATABASE_URL`; skill guidance |
| Data complete vs production | ✅ | 10/10 articles, 20/20 media, counts verified; content field-diffed |
| ID renumbering side-effects | ⚠️→✅ | lexical body links repaired (`t89-p4-link-repair.mjs`) |
| **Point-in-time recovery window** | ❌ **6 hours** | project `history_retention_seconds: 21600` |
| Branch strategy | ⚠️ | single `production` branch; no staging branch |

**Root-cause plan:** raise history retention (Neon console → settings; free tier allows
longer windows on some plans — verify the tier limit) and add a **daily logical backup**
(`pg_dump` via GitHub Actions to R2) so recovery never depends on the 6-hour window. This is
P5 of the migration plan and is now the top stability gap.

### 2.2 Render — CMS hosting (client's account)
**What/why:** free Node web service; chosen for the same no-card reason. Deploys on push.

| Check | Status | Evidence |
|---|---|---|
| Env-var contract (7 vars) | ✅ | set via API; `HOSTNAME=0.0.0.0` (the 502 fix) |
| Build assembles the full standalone bundle | ✅ | `assemble-cms-standalone.mjs` (static/public/fonts/migrations) |
| Auto-deploy on push | ✅ | `autoDeployTrigger: commit` |
| **Health check path** | ❌ empty | Render scans for a port instead; a `/api/health`-style check would make deploys deterministic |
| **Free-tier spin-down** | ⚠️ | 15 min idle → ~50 s cold start; admin-only impact, but the publish-watcher must tolerate it (it does — 5-min cadence) |
| Stale build cache risk | ⚠️→✅ | one stale-chunk incident; cache-cleared redeploy fixed; procedure recorded |

**Root-cause plan:** add a health-check path; keep the cache-clear procedure in the ledger for
any "deployed but behavior unchanged" report; consider paid plan only if cold starts hurt
editorial (owner decision; no card exists, so likely stay free).

### 2.3 Cloudflare Workers + R2 (client's account)
**What/why:** the storefront publisher (free tier, genuine) and object storage for media.
Custom domain `media.shikkha24.com` on the bucket.

| Check | Status | Evidence |
|---|---|---|
| Workers static assets (not retired Workers Sites) | ✅ | `[assets]` config; verify:cloudflare guards it |
| CSP parity `.htaccess` ↔ worker | ✅ | byte-identical, 88 checks incl. negative controls |
| **CSP matched the deployed reality** | ❌→✅ | media origin missing → every browser blocked images; fixed 2026-10-27 (deployed + verified in a real browser) |
| R2 objects complete vs media table | ✅ | all 20 URLs 200 with valid bytes |
| wrangler OAuth (no S3 keys) | ✅ | no card, no static keys in CI |
| **R2 S3 credentials for CMS uploads** | ❌ not yet set | Render CMS cannot write new uploads to R2 yet (P3 remainder) |

**Root-cause plan:** wire `@payloadcms/storage-r2` into the CMS with the R2 S3 creds as Render
env vars (the package is already installed), so uploads from the admin land in R2 directly.
Until then, new uploads would land on Render's ephemeral disk and vanish on redeploy — this is
a **data-loss risk**, priority 2 after backups.

### 2.4 GitHub — repo, Actions, secrets (client's org)
**What/why:** source of truth + CI/CD. Org `Aperio-Studios-Private`, client member added.

| Check | Status | Evidence |
|---|---|---|
| CI gates (lint, freshness, builds, Lighthouse, audit) | ✅ | all green since 2026-10-27 evening |
| LCP gate honest | ✅ | relaxed 1500→3000 ms (owner decision; measured history 2257–2939) |
| Dependency-audit policy | ✅ | 5 advisories cleared (3 overrides + 2 documented ignores) |
| **Repo is PUBLIC** | ⚠️ | `visibility: public`; no secrets in history (verified: Neon password, PAYLOAD_SECRET never committed; only `.env.example` tracked). A public repo is acceptable but the owner should decide knowingly |
| Secrets hygiene | ✅ | 10 Actions secrets, none in code; `.env` git-ignored |
| Deploy races | ✅→fixed | auto + manual deploy duplicates cancelled; one-push-one-deploy documented |

**Root-cause plan:** decide repo visibility deliberately (public is fine for the storefront
code; the CMS is not in a private package). Add branch protection on `main` (require CI) so a
force-push cannot skip gates.

### 2.5 DianaHost — rollback host (owner's account)
**What/why:** the original shared host; kept as the instant rollback path until the DNS
cutover (P6, after 2026-11-11 per plan).

| Check | Status | Evidence |
|---|---|---|
| Still serving the old CMS | ✅ | /admin 200 |
| Media files | ✅ recovered | `/api/media/file/*` now serves valid JPEGs (was 500 during P3) |
| **Divergence risk** | ⚠️ | two CMSes exist; the static build now reads ONLY Render/Neon. Any edit made on DianaHost after 2026-10-27 morning is invisible to the site |
| No SSH (vendor-refused) | documented | cPanel API only |

**Root-cause plan:** freeze editorial work on DianaHost **now** (the team must use
`shikkha24-cms-9vai.onrender.com/admin` exclusively). At P6, move `cms.shikkha24.com` DNS to
Render (custom domain + free SSL), keep DianaHost paid until one clean billing cycle passes,
then decommission.

### 2.6 Domains & DNS
| Host | Points to | Role |
|---|---|---|
| `shikkha24.com` | Cloudflare (Workers) | the live site ✅ |
| `media.shikkha24.com` | Cloudflare (R2 custom domain) | media CDN ✅ |
| `cms.shikkha24.com` | DianaHost (103.169.160.90) | rollback CMS; moves to Render at P6 |

**Root-cause plan:** the owner's goal says `cms.shikkha24.com/admin` is THE CMS entry — that
requires the P6 DNS move. Until then the entry is the Render URL; the topbar "Site" link and
preview make the new CMS self-sufficient.

## 3. Cross-cutting root causes (the "fix once" list)

1. **No durable backup.** Single Neon branch, 6-hour PITR. → Daily `pg_dump` to R2 (P5). *The* stability gap.
2. **CMS uploads not yet on R2.** New uploads would be lost on redeploy. → Wire storage-r2 + creds (P3 remainder).
3. **Two CMSes in parallel.** Editors must use exactly one. → Freeze DianaHost; communicate the Render URL.
4. **Config spread across 5 platforms.** Env vars (Render), secrets (GitHub), DNS (registrar), CSP literals (code), wrangler vars. → The origin-inventory comment in `.htaccess` + this document are the canonical map; every host change must update both CSP files byte-identically (enforced by CI).
5. **Upstream Payload bugs bite real screens.** The ≤1440px inert sidebar is unfixed upstream (3.92.0). → `DesktopNavOpener` carries the fix with the full rationale; re-check on every Payload upgrade and delete it when upstream fixes the breakpoint logic.
6. **Free-tier cold starts.** Render sleeps; first admin load ~50 s. → Acceptable for now; the watcher tolerates it; revisit only if editors complain.

## 4. What was verified working end-to-end today

Publish on Render (Neon) → watcher → GitHub dispatch → CI (all gates green) → Workers deploy →
live on `shikkha24.com` (breaking badge visible; new-id URLs 200; old-id 404). Admin at
1280×720: sidebar interactive, preview opens the live article, images load from R2.

## 5. Ordered next actions

1. **P5 backups** — daily `pg_dump` → R2 (highest stability value, no cost).
2. **R2 uploads wiring** — storage-r2 + creds (data-loss risk).
3. **Team cutover notice** — DianaHost frozen; Render admin is the only CMS.
4. **Render health-check path** — deterministic deploys.
5. **P6 domain cutover** — `cms.shikkha24.com` → Render (owner timing).
6. **T-80 LCP work** — typography/critical-path, its own section (gate holds at 3.0 s meanwhile).
