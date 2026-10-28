# Clean Deploy Plan — Shikkha24 (from zero, phased)

**Owner instruction (2026-10-27):** "start a clean deploy process from very beginning… make
phased plan for this. start from 0." Approved direction follows the platform audit
(`docs/platform-audit.md`): the code is green and carries every fix; the *deployment* is what
accumulated drift. This plan rebuilds the deployment deliberately, in dependency order, with
evidence at every phase.

## What is rebuilt vs carried

| Carried forward (NOT deleted) | Rebuilt from zero |
|---|---|
| The repo (code, CI workflows, all T-89/T-18 fixes) | The Render service (recreated as code via Blueprint) |
| **Neon data** — the live editorial archive | Every env var / secret (re-declared from a single written contract) |
| **R2 objects** — the 20 recovered media files | The publish-watcher Worker deploy |
| The domain shikkha24.com | The storefront Workers deploy (fresh `wrangler deploy` from clean checkout) |
| DNS zone ownership | The `cms.shikkha24.com` DNS record (cutover to Render) |
| Cloudflare account, GitHub org access | The CSP origin inventory (re-derived from the final origins) |

**No data is wiped.** The editorial archive and media files are the product; the clean start
rebuilds everything that *serves* them.

## Why now (root causes this eliminates)

1. **Uploads are lost on redeploy** (storage-r2 not wired) — already cost the owner their
   logo/favicon uploads today.
2. **No durable backups** — Neon PITR window is 6 h.
3. **Config spread across 5 platforms** with no single source of truth — caused two CSP drift
   incidents; `serverURL` still points at the future domain instead of the real one.
4. **Two live CMSes** (DianaHost + Render) — the owner's goal is one entry:
   `cms.shikkha24.com/admin`.
5. Dashboard-created infrastructure that nobody can reproduce from the repo.

---

## Phase 0 — Freeze & baseline (safety net)

**Goal:** nothing can be lost or silently change while we rebuild.

- Final DianaHost SQLite snapshot copied off the host (rollback-of-the-rollback).
- `pg_dump` of Neon taken manually and stored in R2 (this becomes the automated job in Phase 1).
- Baseline evidence file: HTTP status + key headers for every URL that must keep working
  (site, article page, media file, admin login), plus per-table row counts.
- Announce the editorial freeze on DianaHost (the Render admin is already the only live CMS).

**Done when:** backup files exist in R2; baseline doc committed.
**Rollback:** nothing changed yet.

## Phase 1 — Database foundation (Neon)

**Goal:** the data layer is safe and self-healing before anything else moves.

- Verify schema + row counts against the Phase 0 baseline.
- Daily `pg_dump` → R2 backup job (GitHub Actions cron, secrets via Actions; retention: keep
  30 daily dumps). This is P5 from the audit — the top stability gap.
- Raise Neon history retention if the plan tier allows (verify tier limit in the Neon API).
- Delete the two dead media rows (21, 22) — the owner's lost uploads — after owner confirms
  they will re-upload.
- (Optional, owner decision) staging branch via Neon branching for future schema work.

**Done when:** a backup job has run green at least once and the dump restores into a scratch
database (restore is tested, not assumed).
**Rollback:** no schema changes; additive only.

## Phase 2 — Storage foundation (R2 before the CMS)

**Goal:** uploads persist forever, from this moment on. **No editor uploads before this phase
completes.**

- Owner creates R2 S3 API credentials (Cloudflare dashboard → R2 → Manage API tokens; free, no
  card) — shared with me as env values, never committed.
- Wire `@payloadcms/storage-r2` (already installed, 3.90.2) into `payload.config.ts`:
  bucket `shikkha24-media`, credentials from env, public base URL `https://media.shikkha24.com`.
  Config keys verified against the installed package source before writing (learn-first).
- Verify end-to-end on the local build first: upload a test image via the admin → object lands
  in R2 → URL serves from `media.shikkha24.com` → delete the local `data/media` copy and
  confirm the URL still works (persistence proven).

**Done when:** an uploaded file survives a simulated disk wipe and serves from R2.
**Rollback:** storage adapter removed by reverting one config block.

## Phase 3 — CMS deployed from zero (Render, as code)

**Goal:** the CMS service is defined in the repo and reproducible with one command.

- Add `render.yaml` Blueprint at the repo root defining the web service: plan, region,
  build/start commands, health check path (`/api/global/site-settings` or a dedicated
  lightweight route), and every env var by name (values still live in the dashboard/CLI —
  secrets never enter the repo).
- Create the NEW service from the Blueprint (`render blueprint apply`), apply the env contract,
  deploy, and run the **full fresh-deploy checklist**: boots on Neon, login works, sidebar
  interactive at 1280×720, preview opens the storefront, media grid thumbnails load from R2,
  **upload a real file → persists in R2**.
- Only after the checklist passes: delete the old service `shikkha24-cms` (dashboard-created,
  unreproducible). Update the publish-watcher's `CMS_ORIGIN` and GitHub secrets
  `CMS_URL`/`PUBLIC_CMS_ORIGIN` to the new service URL.
  (Free-tier overlap note: two services briefly share the 750 h/month pool — the window is
  hours, not days.)

**Done when:** the old service is deleted and every checklist item passes on the new one.
**Rollback:** the old service is kept running until this phase's checklist passes.

## Phase 4 — Storefront + watcher from zero (Cloudflare)

**Goal:** the serving side is a fresh, verified deploy driven by the new CMS.

- Fresh `wrangler deploy` of the storefront from a clean checkout (Workers deployments are
  versioned and atomic; this re-establishes the deploy from source).
- Redeploy the publish-watcher pointed at the Phase-3 CMS URL.
- End-to-end publish test: publish a test article in the new admin → watcher fires (≤5 min) →
  CI green → Workers deploy → article live on `shikkha24.com` → delete the test article →
  re-publish → gone from the site.
- Re-derive the CSP origin inventory from the FINAL origins and update both CSP files
  (storefront + admin) in the same commit — the drift rule.

**Done when:** the full publish→live chain passes twice (create + delete).
**Rollback:** Workers version roll-back (one click / one command).

## Phase 5 — Domain cutover (`cms.shikkha24.com` = the owner's goal URL)

**Goal:** the CMS entry becomes exactly `https://cms.shikkha24.com/admin`.

- Add `cms.shikkha24.com` as a custom domain on the Render service (free managed TLS).
- Change the DNS record (currently an A record to DianaHost 103.169.160.90) to Render's CNAME.
- Update in one commit: `CMS_URL`, `PUBLIC_CMS_ORIGIN`, `serverURL` (payload.config),
  publish-watcher `CMS_ORIGIN`, GitHub secrets, and both CSP files. `serverURL` must finally
  match the real origin — this also fixes uploaded-file URLs carrying the wrong host prefix.
- Re-run the Phase-3 checklist against the new URL; re-run the publish test.

**Done when:** `https://cms.shikkha24.com/admin` is the working entry and every absolute URL
the CMS emits uses it.
**Rollback:** DNS record back to DianaHost (the old CMS is frozen, not deleted).

## Phase 6 — Hardening, docs, decommission prep

**Goal:** the clean state is protected and documented.

- Branch protection on `main` (require CI green before merge; no force pushes).
- Owner decision recorded: repo stays public or goes private.
- Uptime monitoring on the three hosts (Cloudflare health checks — free, no card).
- Update `docs/platform-audit.md`, `docs/hosting-and-deployment.md`, `.sps/handoff.md` to the
  final state; mark DianaHost decommission date (owner billing decision, after 2026-11-11).
- Full admin screenshot pass (every view) as the closing verification.

**Done when:** docs match reality; monitoring green; owner signs off.

---

## Owner actions required (only these need you)

1. **Phase 2:** create the R2 S3 API token in the Cloudflare dashboard and share the two
   values (Access Key ID + Secret Access Key) — free, no card.
2. **Phase 5:** approve the DNS change for `cms.shikkha24.com` (I can make it if the zone API
   token has DNS edit rights; otherwise 2 minutes in the dashboard).
3. **Phase 6:** decide repo visibility (public vs private).

## Order is mandatory

2 before 3 (uploads must persist before editors touch the new CMS), 3 before 5 (the domain
must point at a verified service), 1 before everything (backups before any move).
