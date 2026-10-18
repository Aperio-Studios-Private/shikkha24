# HANDOVER — শিক্ষা২৪.কম (shikkha24.com)

> Written 2026-10-18 by the outgoing build agent. Refreshed 2026-10-18 late
> evening (T-55). Read this top-to-bottom once;
> everything referenced here is proven — commands below were run and verified
> in production during this build cycle. Deep workflow memory lives in `.sps/`
> (read `.sps/handoff.md` + `.sps/tasks.md` first; this file is the human layer).

## 1. What is live right now

| Layer | Where | How it runs |
|---|---|---|
| **Storefront** | https://shikkha24.com (custom domain) + shikkha24-frontend.abdullahalmamunmay.workers.dev | Astro 7 static build (`frontend/dist`) → Cloudflare Workers (`wrangler deploy`) |
| **CMS** | https://cms.shikkha24.com/admin | DianaHost cPanel (`~/shikkha24-cms/`), Passenger, SQLite under `data/`. Host disk: bundle `1fb2be5` (sentinel-verified, deployed ~01:30), pins **payload 3.90.2 / next 16.4.0**, DB schema 3.90.2. **Runtime health still needs one clean cycle:** `/api/payload-migrations` still reports `https://0.0.0.0:3000` (6/6 stable), which the `1fb2be5` source cannot produce → stale-worker/chunk suspicion; the next CMS window (clean extract + kill stale `next-server` workers + re-probe, T-31 runbook) settles it. FAQs collection IS live (`/api/faqs` 200) |
| **Media** | cms.shikkha24.com/api/media/file/* | Uploaded via CMS admin or API; logo (id 24) + favicon (id 25) wired into site-settings |

Content state (API-verified, late 2026-10-18): **9 published articles** (incl.
breaking ticker id 29, weekly digest id 30, JU admission id 31, launch note id
32), 30-tag library, 8 categories, deadlines + circulars collections, FAQ
collection (CMS-side pending deploy), BreakingNews ticker.

### Verified late 2026-10-18 (evidence, this session)

- `gh run list --limit 4` → CI **success** AND Deploy (Cloudflare) **success**
  on `49f1469` (HEAD) — the first fully green publish (T-54).
- `https://shikkha24.com/` → HTTP 200 in 0.47 s; workers.dev preview serves the
  শিক্ষা২৪ body (5 occurrences).
- Digest page 200; `moushi`/`মৌসুমী` references: **0**; corrected link
  `/admission/23/admission-policy-2027` → 200.
- Owner-published articles of today are LIVE: `/education-news/32/post-ujepgq`
  and `/admission/31/post-n2fili` both 200 — the publish→watcher→deploy cycle
  is working end-to-end without `DEPLOY_WEBHOOK_URL` (≤5-min cron poll).
- `gh repo view` → `{"isPrivate":false}` for `SHAHID8142/shikkha24`.
- CMS fingerprinting (UAPI + public endpoints, read-only): host sentinel =
  `1fb2be5`, `cms/package.json` pins payload 3.90.2 / next 16.4.0;
  `/api/faqs` → 200; `X-Powered-By` header absent; `/api/payload-migrations`
  → 501 body still naming `https://0.0.0.0:3000` (inconsistent with the
  deployed source — see §6 item 10).

## 2. Accounts matrix (names only — no secrets in this repo)

| Account | What it controls | Hidden where |
|---|---|---|
| DianaHost cPanel (plan ~$47/yr, the only paid thing) | CMS hosting, mail, DNS zone? | owner's registrar/hosting mailbox |
| Cloudflare account `0e2e4a6986f91edabe1dae4945a9b88b` | Workers + custom domain, deploy token OAuth'd on the build Mac via wrangler | Mac keyring (wrangler login) |
| GitHub `SHAHID8142/shikkha24` — **PUBLIC since 2026-10-18** (T-52; full-history secret scan clean) → Actions minutes now free/unlimited, the T-51 budget block is dead | code of record | owner GitHub login |
| GitLab mirror `shahidprintshop-group/shikkha24-cms-mirror` | read-only backup sync via `glab` (token `shahiddesignhouse`) | macOS keyring via glab |
| Google Search Console | property shikkha24.com (TXT verified), sitemaps submitted | owner Google login |
| Bing Webmaster Tools | sitemaps submitted | owner login |
| CMS admin | `shahiddesignhouse@gmail.com` (superAdmin) | password + origin in `cms/.env.local` |
| Codespace (GitHub) | CMS bundle builder | owner GitHub |

Local secret `.env` files (never committed): `cms/.env.local`
(CMS_ORIGIN, CMS_ADMIN_EMAIL, CMS_ADMIN_PASSWORD, CPANEL_HOST/USER/TOKEN),
`frontend/.env` (CMS_URL). A matching `cms/.env.example` documents the vars.

## 3. Deploy runbooks

### Storefront (frontend changes, tags, digests, breaking ticker)

**Primary path (green since T-54):** `git push` → CI verifies → the Deploy
(Cloudflare) workflow publishes automatically. Both green on `49f1469`
(2026-10-18, 21:34 +06); every push costs nothing now (public repo). The manual
sequence below stays as the fallback for out-of-band deploys:

```sh
cd frontend && pnpm run build            # needs frontend/.env CMS_URL
CLOUDFLARE_ACCOUNT_ID=0e2e4a6986f91edabe1dae4945a9b88b pnpm exec wrangler deploy
node scripts/ping-indexnow.mjs FB079BAFCAA04021AE9B9778B693F0AA   # SEO ping
```
Whole thing ≈2 min from any Mac with this repo (verified 6× in production).
Frontend build will FAIL without `frontend/.env` (CMS_URL).

### CMS (code changes to Payload admin/collections)
1. GitHub Codespace → `git pull && bash scripts/codespace-cms-build.sh`
   (proven: builds with `PAYLOAD_SECRET=ci-placeholder-not-a-real-secret
   DATABASE_URI=file:./data/ci.db`, hygiene gate, zip placement with
   absolute `$PWD`)
2. Download the zip → agent (or you) uploads via `scripts/cpanel-client.mjs`
   UAPI upload → owner pastes ONE Terminal line
   `cd ~/shikkha24-cms && unzip -o <zipname>.zip`
3. Agent touches `tmp/restart.txt` (Passenger restart) → probes
   `/api/articles`, `/api/faqs`, `/admin/login`, `/` then reads
   `DEPLOYED_COMMIT` (must match build).
API-extract via `scripts/deploy-cms.mjs` is BROKEN on this host (cPanel 134
has no `extract_files`) — Terminal unzip is the reliable path. `DEPLOY_DRY_RUN=true`
is the correct dry-run flag (not `DRY_RUN`).

### Content publishing (no rebuild needed)
Admin UI works (English-first, brand-red primaries). Or the proven **API
recipe** (runbook in `.sps/handoff.md` §2026-10-18 02:20):
- login `POST /api/users/login` → token; send header `Authorization: JWT <token>`
  (⚠ the `payload-token` COOKIE silently fails as anonymous on this host)
- `POST /api/articles` requires `author` (authors[0], id 1) and `body` as
  Lexical JSON (copy node shapes from an existing GET; text nodes carry `diets: []`)
- media uploads need `_payload` form field (JSON of fields incl. required `alt`) + `file`
- globals update = **POST** `/api/globals/site-settings`
- `isBreaking: true` + publish → rebuild storefront → ticker ships sitewide

## 4. SEO state + monthly plan

- `.sps/handover-plan.md` holds the full 30-day SEO calendar (weeks, KPI gates,
  content mix, exit criteria) — the operating plan for the next month.
- Done: GSC + Bing sitemaps submitted (owner), robots/sitemap correct
  (sitemap auto-regenerates per build, real `lastmod`), per-article
  NewsArticle JSON-LD, IndexNow key `FB079BAFCAA04021AE9B9778B693F0AA`
  served at root (200, exact 32 bytes) + `scripts/ping-indexnow.mjs`.
- IndexNow status: first batch accepted (202); joint endpoint later 403 =
  suppression window; **Yandex accepted 202** (key proven valid); retry
  scheduled; if 7 days of 403 → regenerate key, redeploy, update ledger.
- Expectation setting: new-domain crawl lag 3–14 days for brand terms. GSC
  "Discovered/Crawled – not indexed" buckets on a 3-day-old site are NORMAL.

## 5. Editing quick-reference

| Task | How |
|---|---|
| Publish article | Admin → Articles → New → fill (title/slug/category/excerpt/body/tags) → Publish (red button). Body = rich text; keep 2–4 tags from the 30-tag library |
| Breaking news | same + **Breaking toggle ON** → then STOREFRONT REBUILD (§3 runbook) — ticker is build-time |
| Weekly digest | self-sourced recap of own articles with internal links (see id 30 as template) — usable even without external sources |
| Logo/favicon | Site Settings (Logo/Favicon) — supports SVG; favicon href carries `?v=updatedAt` cache-bust automatically |
| Deadlines | Deadlines collection (feeds sitewide strip + /deadlines) |
| Source rule | compose from cited sources only; never invent numbers/notice details |

## 6. Known debts & risks (all recorded, none catastrophic)

1. ~~Root lint: 11 pre-existing biome errors~~ FIXED 2026-10-18 (T-53,
   commit `707c1a2`): 10 lint errors cleared; CI lint green on `49f1469`.
2. `astro check` unusable (TS 7 installed, check needs TS 6); biome.json
   ignores `.astro` — the Astro gate = `pnpm run build` + review.
3. IndexNow joint endpoint cooldown (§4).
4. GitLab dual-push in non-interactive shells needs the credential-helper
   pattern (documented in handoff 2026-10-18 ~01:30).
5. ~~GitHub Actions `deploy.yml` frozen until monthly minutes reset (~Oct 25)~~
   RESOLVED (T-52): the repo is public → Actions free/unlimited; the Deploy
   workflow is armed and green (T-54). Note kept from the old entry: the
   cPanel target=cms auto-pipeline stays dormant — CMS deploys remain manual
   per §3 runbook.
6. CMS i18n phase-2 (optional): field descriptions remain Bengali prose; tags/
   labels are English-first per owner rule.
7. VAPID `PUBLIC_VAPID_PUBLIC_KEY` still missing in `frontend/.env` (push
   notifications later).
8. Host hygiene: `~/shikkha24-cms.broken-1792132158` + stray zips — delete
   after 7 stable days (never touch `node_modules` — venv symlink forest).
9. Collections have hard-coded Bengali descriptions in admin (cosmetic).
10. **CMS runtime needs one clean cycle** (T-31 window): the 3.90.2 bundle
    (`1fb2be5`) IS on the host with FAQs live, but `/api/payload-migrations`
    still prints the internal bind address `0.0.0.0:3000` — impossible under
    that bundle's source (`serverURL` has a production fallback) → stale
    worker/chunk suspicion. Fix = full clean extract + kill stale
    `next-server` workers + restart + re-probe (the procedure the runbook
    already mandates), then confirm every T-20 hardening item externally.
11. **`DEPLOY_WEBHOOK_URL` unset** on the live CMS — editors publish and the
    watcher's ≤5-min cron rebuild carries it (proven again 2026-10-18 with
    articles 31/32). The instant path has a step-by-step Bengali cPanel guide:
    `docs/cpanel-deploy-webhook-bn.md` (T-56).
12. **T-50 open (owner decision pending):** CMS media have no WebP variants at
    upload time; the storefront already re-encodes at build time (CmsImage
    AVIF/WebP). Options + tradeoffs in `.sps/tasks.md` T-50.
13. Two personal Gmail addresses remain in tracked docs (now publicly readable
    since T-52) — swap for role addresses only on owner decision.

## 7. Revocation / rotation checklist on handover completion

1. Roll the cPanel password (DianaHost)
2. Change CMS admin password (this also kills JWT sessions)
3. Revoke glab token (GitLab) + delete mirror access if unused
4. Remove deploy access: Cloudflare wrangler logout on build Mac, or rotate token
5. Codespace: stop/delete the workspace
6. Drop me (agent) from any future scheduled reminders — they die with this session.

## 8. For a fresh coding agent taking over

Read `.sps/tasks.md` (queue) then `.sps/handoff.md` (host facts, deploy
recipes, API gotchas — grep for "recipe"). Rule remainder: card-free budget
(rule 7), Bengali-first storefront / English admin (T-38 rule), dual-push
both remotes every commit, proof before "done". Working dir:
`/Volumes/SSD/CODES/NewsPortal`; timestamps Asia/Dhaka.
