# CMS Deployment Runbook — Shikkha24

**Created:** 2026-09-15 · **Status:** first-time deployment, not yet executed
**Audience:** the owner, or anyone with cPanel and SSH access to the DianaHost account.

**Why this document exists.** Every other launch step depends on it. The frontend is *built from*
the CMS — `CMS_URL` is fetched at build time and every article, category and setting is baked into
static HTML. So **the CMS must be live before the frontend can be built**, and before DNS, before
the first rsync, before anything else. Nothing in `docs/` described how to get it there.

---

## 1. What runs where

| Piece | Runs on | Started by | Survives an idle period? |
|---|---|---|---|
| **Public site** (static HTML) | DianaHost `public_html`, served by **Apache** | nothing — it is files | ✅ yes, it is just files |
| **CMS** (Payload admin + API) | DianaHost, a **Node.js process behind Phusion Passenger** | cPanel | ❌ **no** — Passenger kills idle processes |
| **Media** (`data/media/`) | DianaHost disk, served by the CMS | — | ✅ yes |

**The property that makes this architecture safe:** if the CMS is down, readers are unaffected.
Apache serves the pre-built HTML without needing Node at all. Only the admin and publishing stop.
See `docs/reliability.md` §1.

---

## 2. Prerequisites

- [ ] cPanel login for the DianaHost account (bookmark `https://<host>:2083`)
- [ ] SSH access enabled in cPanel (**Security → SSH Access**) — or use cPanel's **Terminal**
- [ ] The `shikkha24.com` domain pointed at DianaHost nameservers
- [ ] A subdomain created for the CMS — `cms.shikkha24.com` (see §3.1)
- [ ] The GitHub Actions secrets set (see §3.4)
- [ ] A `PAYLOAD_SECRET` generated: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 3. First-time deployment

### 3.1 Create the subdomain

cPanel → **Domains → Create A New Domain** → `cms.shikkha24.com`.

Set its document root to something **outside** the application directory if cPanel offers the
choice. The application does not need a document root at all — Passenger serves it — but the
subdomain must exist so AutoSSL can issue a certificate for it.

⚠️ **Do not point this document root at the `data/` directory.** The SQLite file and the media
library live there, and a document root there would serve the database to anyone who guessed the
path. See §3.6.

### 3.2 Create the Node.js application

cPanel → **Software → Setup Node.js App** → **Create Application**
(the label varies by cPanel version: it may be **Application Manager** or **Passenger App**).

| Field | Value |
|---|---|
| Node.js version | **the newest offered (22.x or 24.x preferred)** — see the warning below |
| Application mode | Production |
| Application root | `shikkha24-cms` (a directory *outside* `public_html`) |
| Application URL | `cms.shikkha24.com` |
| Application startup file | `server.js` |

> ⚠️ **Node version matters.** DianaHost's default is **20.18.2, which reached end of life on
> 2026-04-30** and receives no security patches. This CMS handles editor credentials and reader
> PII, so running it on an EOL runtime is a real risk. Pick the newest version offered. If only
> 20.x is available, that is an **accepted, documented risk** (`docs/hosting-and-deployment.md`
> §5) — raise a support ticket asking for 22/24, and in the meantime keep the admin panel
> rate-limited (`docs/security.md` §5).

### 3.3 Build and fetch the standalone bundle

The CMS is **built in CI, never on the host**. Next.js `output: 'standalone'` traces only the
modules actually imported, which is what makes the 2 GB plan viable (114 MB measured, vs
0.7–1.2 GB for a full `node_modules`).

1. GitHub → **Actions → CI →** the latest green run on `main`
2. Download the **`cms-standalone`** artifact
3. Unzip it locally

⚠️ **Two gotchas, both of which produce a broken admin with a successful build:**

- In a **pnpm monorepo the entry point is `.next/standalone/cms/server.js`**, *not*
  `.next/standalone/server.js`. The `cms/` segment is the workspace name.
- **Next does not copy `.next/static` into the standalone bundle.** Without it the admin HTML
  loads and every asset 404s. CI already performs this copy when it assembles the artifact —
  verify the unzipped bundle contains `.next/static/` before uploading.

### 3.4 Upload and assemble

Upload the bundle contents into the application root (`shikkha24-cms/`) — over SSH with `rsync`
or `scp`, which is far more reliable than cPanel's File Manager for tens of thousands of files.

```sh
# from the unzipped artifact directory
rsync -az --delete ./ <user>@<host>:~/shikkha24-cms/
```

Then, on the host:

```sh
cd ~/shikkha24-cms
mkdir -p data/media
```

### 3.5 Set the environment variables

cPanel → **Setup Node.js App** → your application → **Environment variables**.
(Values come from `cms/.env.example`; **never commit a real `.env`** — agent rule 11.)

**Required to boot:**

| Variable | Value |
|---|---|
| `PAYLOAD_SECRET` | the 64-char hex string from §2 |
| `DATABASE_URI` | `file:./data/payload.db` |
| `NODE_ENV` | `production` |

**Required for the public site to work:**

| Variable | Value | Without it |
|---|---|---|
| `PUBLIC_SITE_URL` | `https://shikkha24.com` | OAuth redirects and newsletter links break |
| `OAUTH_REDIRECT_BASE` | `https://cms.shikkha24.com` | must match the provider registration exactly |

**Optional — each feature self-hides while its variable is unset.** None of these blocks the
deployment; they are why the site degrades instead of breaking:

| Variable | Enables | While unset |
|---|---|---|
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` | newsletter sending | the subscribe form is **not rendered** |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | deadline reminders | the reminder control is **not rendered** |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET`, `FACEBOOK_OAUTH_CLIENT_ID` / `_SECRET` | social login | **no login button is rendered** |
| `NEWSLETTER_SEND_TOKEN`, `PUSH_SEND_TOKEN` | the two cron endpoints | **both endpoints are disabled** |
| `DEPLOY_WEBHOOK_URL` | publish → rebuild | publishing saves but the site never updates (§6) |
| `MEDIA_UPLOAD_DIR` | media location | defaults to `./data/media` |
| `MEDIA_DAILY_UPLOAD_CAP_BYTES` | per-day upload cap | defaults to 250 MB |

### 3.6 Confirm the data directory is outside the web root

```sh
ls -la ~/shikkha24-cms/data/        # payload.db and media/ — the archive
ls -la ~/public_html/               # must NOT contain a copy of either
```

The database holds the entire editorial archive. If it is reachable over HTTP, anyone who guesses
the filename downloads the whole newsroom. `docs/security.md` §2.

### 3.7 Start and verify

1. cPanel → **Setup Node.js App** → **Restart** (not "Stop")
2. Wait 10–30 s. **The first request takes 5–15 s** while Node initialises and Payload boots —
   this is normal, do not restart again thinking it failed.
3. Verify, in order:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://cms.shikkha24.com/api/articles?limit=1   # expect 200
curl -s -o /dev/null -w '%{http_code}\n' https://cms.shikkha24.com/admin                  # expect 200
```

4. Open `https://cms.shikkha24.com/admin` and create the first **Super Admin** user.
5. Run the taxonomy seed so categories exist before the frontend build:
   ```sh
   cd ~/shikkha24-cms && pnpm seed   # or: payload run src/seed/run.ts
   ```

> **Note:** the seed expects the app's own Node environment. If `pnpm` is unavailable on the host,
> run the seed locally against a copy of the database and upload it, or add a one-off admin screen.
> Do not skip it — the frontend build needs the 8 categories to exist or every article is skipped
> (see the seed's own `skipped` counter).

---

## 4. Verify the deployment

- [ ] `https://cms.shikkha24.com/admin` loads and the Payload login page renders
- [ ] A Super Admin user exists and can log in
- [ ] `GET /api/articles?limit=1` returns `200` with JSON
- [ ] Media upload works — upload one image, confirm it lands in `data/media/` as WebP
- [ ] `data/` is **not** reachable over HTTP (`curl https://cms.shikkha24.com/data/payload.db` → 404)
- [ ] AutoSSL has issued a certificate for `cms.shikkha24.com` (cPanel → SSL/TLS Status)
- [ ] The taxonomy seed has run — 8 categories, 5 levels, 64 districts

**Then, and only then**, set the two GitHub secrets the frontend build needs:

| Secret | Value |
|---|---|
| `CMS_URL` | `https://cms.shikkha24.com` — the **build-time** content origin |
| `PUBLIC_CMS_ORIGIN` | `https://cms.shikkha24.com` — the **browser-facing** origin |

⚠️ These are **different variables with different jobs**, and setting only the second produces a
green build with **no content** (32 pages instead of 84). See `docs/hosting-and-deployment.md` §1
and the audit's §6.

Also add the CMS hostname to the CSP `connect-src` in `frontend/public/.htaccess` — a CSP cannot
be templated, so it is a literal edit, and without it the browser blocks every CMS call before it
is sent.

---

## 5. Updating an existing deployment

The CMS changes rarely — only when dependencies or Payload itself are upgraded. Content changes
do **not** require a CMS redeploy; they require a **frontend rebuild** (§6).

```sh
# 1. back up first — this is the whole editorial archive
sqlite3 ~/shikkha24-cms/data/payload.db ".backup /tmp/predeploy.db"

# 2. upload the new bundle (it does not contain data/, so the archive is untouched)
rsync -az --delete ./ <user>@<host>:~/shikkha24-cms/

# 3. restart via cPanel (or, over SSH, without downtime:)
kill -USR2 <passenger-pid>
```

⚠️ **`--delete` is safe here only because `data/` is excluded from the bundle.** If you ever add
`data/` to the artifact, this command deletes the archive. Consider `--exclude='data/'` as a
belt-and-braces guard.

Restart procedure in more detail, including what to do when the Restart button is missing:
`docs/reliability.md` §7.1.

---

## 6. Making publishing work (the rebuild trigger)

A static site does not notice a CMS edit. Nothing an editor publishes reaches the live site until
something rebuilds it — this is the whole reason `cms/src/lib/rebuild-trigger.ts` exists.

1. Set `DEPLOY_WEBHOOK_URL` on the CMS to the GitHub **repository dispatch** endpoint:
   `https://api.github.com/repos/<owner>/<repo>/dispatches`
2. Set `DEPLOY_WEBHOOK_TOKEN` to a GitHub token with `contents: write`
3. Confirm `.github/workflows/deploy.yml` runs on `repository_dispatch` with type `rebuild`

Then publishing an article fires the webhook, CI rebuilds against this CMS, and rsyncs the new
HTML to `public_html`. **Unset means a silent no-op** — edits save correctly and never appear.

Saves are debounced (`REBUILD_MIN_INTERVAL_MS`, default 5 min) so a 15–20 article day stays inside
the 2,000 min/month GitHub Actions budget. Breaking news bypasses the wait.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Admin loads but every asset 404s | `.next/static` was not copied into the bundle | §3.3 — re-assemble and re-upload |
| `Cannot find module .../server.js` | Wrong entry point — you uploaded `standalone/` instead of `standalone/cms/` | §3.3 — the `cms/` segment is the workspace name |
| Admin is slow then dies | Passenger killed the idle process | Restart via cPanel; it is expected behaviour, not a bug |
| First request after restart times out | Cold start (5–15 s) | Wait. Do not restart again |
| `SQLITE_CANTOPEN` | `data/` does not exist or is not writable | `mkdir -p data && chmod u+rwx data` |
| Frontend build succeeds but the site is empty | `CMS_URL` unset or unreachable from CI | §4 — set it, and check the build's page count (84, not 32) |
| Publishing changes nothing | `DEPLOY_WEBHOOK_URL` unset | §6 |
| `index ... already exists` on a schema push | Drizzle's bookkeeping is stale after a manual column change | Back up, `DROP INDEX IF EXISTS <name>`, retry (`sandbox-build-traps` Trap 4) |

---

## 8. Do not

- ❌ **Do not run the frontend build on the host.** Astro 7 and Vite 8 require Node ≥22.12;
  DianaHost runs 20.18.2. The frontend is built in CI only.
- ❌ **Do not put `data/` under a document root.** That is the entire editorial archive.
- ❌ **Do not commit a real `.env`.** Only `.env.example`.
- ❌ **Do not delete `data/`** to "clean up" — it holds every article, every reader account and
  every image. Back it up first (`docs/backup-and-recovery.md`).
- ❌ **Do not assume the CMS being down takes the site down.** It does not, and treating it as
  such leads to unnecessary panic restarts.

---

## 9. Related documents

| Document | Covers |
|---|---|
| `docs/hosting-and-deployment.md` | the whole hosting model, CI quotas, bandwidth ceilings |
| `docs/reliability.md` §7 | CMS restart procedure, incident response |
| `docs/security.md` §2–3 | why the database lives outside the web root; admin hardening |
| `docs/backup-and-recovery.md` | the daily dump, restore runbook, DR scenarios |
| `.sps/deployment-readiness.md` | the owner-action checklist this runbook feeds |
