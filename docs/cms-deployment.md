# CMS Deployment Runbook — Shikkha24

**Created:** 2026-09-15 · **Updated 2026-10-04** — the first production deploy has been executed.
**Status:** executed and verified against the live host on 2026-10-04.
**Audience:** the owner, or anyone with cPanel access to the DianaHost account.

> ⚠️ **There is no SSH on this host.** An earlier version of this runbook assumed SSH for steps
> §2, §5 and §6. All three have been corrected. Use the cPanel **Terminal** (a shell inside
> cPanel) or the cPanel **File Manager** — never `ssh`, `rsync` or `scp`.

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
- [ ] The cPanel **Terminal** available (cPanel → **Advanced → Terminal**) — this is a shell
      *inside* cPanel, **not** SSH, and nothing can connect to it from outside
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
>
> ⚠️ **This finding is currently disputed and is not yet resolved.** The application that actually
> ran on 2026-10-04 lives under
> `~/nodevenv/shikkha24-cms/**24**/lib/node_modules/`, and in CloudLinux's layout that directory is
> named for the Node **major version** — which would make the host Node 24, not Node 20. Confirm
> with `node -v` in the cPanel Terminal before relying on either claim. The full question is
> written up in `docs/hosting-and-deployment.md` §5.

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

### 3.7 Build the schema, seed, then start

> **Order changed 2026-10-03 — do this before restarting Passenger.**
> This step used to be last, and that ordering is why the first deployment attempt
> failed. See §3.7a for why the database cannot be created by starting the app.

> **No terminal required (added 2026-10-03).** Step 1 below — the one that used to
> need a shell — can now be done from cPanel alone, because DianaHost refuses SSH
> and cPanel Terminal is not always available. Use **3.7 B (recommended)** unless
> you have a shell and specifically want the CLI. Steps 2–6 are unchanged.

#### 3.7 A — with a terminal (CLI)

> **Two corrections to this section, 2026-10-04.** Both were found by deploying it.
> Before reading on: `cd` into `cms/`, and use an **absolute** `DATABASE_URI`.
> The standalone bundle keeps its workspace segment, so the app's files live at
> `~/shikkha24-cms/cms/` — not `~/shikkha24-cms/`. A relative `file:./data/payload.db`
> therefore resolves against `cms/` and opens a **different database** from the one
> the running app uses, silently. Every `sqlite3` command must be absolute too.

1. **Apply the migrations.** With Passenger stopped, from cPanel → Terminal:

   ```sh
   cd ~/shikkha24-cms/cms
   read -r -s -p 'PAYLOAD_SECRET (hidden): ' PAYLOAD_SECRET; printf '\n'
   env PAYLOAD_SECRET="$PAYLOAD_SECRET" \
     DATABASE_URI='file:/home/shikkhac/shikkha24-cms/data/payload.db' \
     /opt/alt/alt-nodejs24/root/usr/bin/node \
     ~/nodevenv/shikkha24-cms/24/lib/node_modules/payload/bin.js migrate
   unset PAYLOAD_SECRET
   ```

   Expect `Migrated: 20261003_155252_initial` and `Done.` — 74 tables. Confirm:

   ```sh
   sqlite3 /home/shikkhac/shikkha24-cms/data/payload.db '.tables' | tr ' ' '\n' | grep -c .
   # expect 74
   ```

   **The absolute `node` path matters here.** The CloudLinux `nodevenv` shim sets
   `NODE_ENV=production` even when it is overridden inline, and `.bin/payload` is
   an `env node` shebang that routes through that shim. For `migrate` this is
   harmless — the CLI works fine under `NODE_ENV=production`, which is exactly why
   it replaced the `DB_PUSH` workaround — but calling the absolute binary removes
   the question entirely.

   **The CLI must be the cPanel `nodevenv` one, never the app's own copy.** The
   standalone bundle ships the traced `payload` package but **not** `bin.js`,
   `dist/bin/`, or `tsx` (which `bin.js` requires for `run`). There is no CLI inside
   the application directory — the only working invocation is the `nodevenv` path above.

   Then continue at step 2.

#### 3.7 B — without a terminal (cPanel only)

1. **Set the bootstrap variable.** cPanel → **Setup Node.js App** → your application
   → **Environment variables** → add:

   | Variable | Value |
   |---|---|
   | `PAYLOAD_BOOTSTRAP_SCHEMA` | `true` |

2. **Restart the app** (not Stop). The application builds its own schema while
   booting — there is no command to run and no ordering to get right.
3. **Wait 30 s**, then verify the schema took, either by reloading `/admin`
   (a login page means the schema exists) or from a terminal with
   `sqlite3 /home/shikkhac/shikkha24-cms/data/payload.db '.tables' | tr ' ' '\n' | grep -c .`
   → **74**.
4. **Remove `PAYLOAD_BOOTSTRAP_SCHEMA` and restart again.** Leaving it set means
   every future boot applies pending migrations unattended — see §3.7c.

> How this works: `cms/src/payload.config.ts` passes the committed migrations to
> the adapter's `prodMigrations` option, and the adapter runs them at
> `NODE_ENV=production` (`@payloadcms/db-sqlite` `dist/connect.js:56`). The same
> committed SQL runs as in 3.7 A — only the thing invoking it changes.

#### 3.7 C — why the bootstrap variable is temporary

It is gated off precisely because it works. Unset, every boot applies pending
migrations with no human present and no backup taken first — the failure mode
`push: false` exists to prevent. It is a bootstrap switch, not a deployment mode.

Measured 2026-10-03 at `NODE_ENV=production` against an empty database:
**74 tables with the variable set, 0 without it.** Both directions were run.

#### 3.7 D — shared steps (either route)

2. **Run the taxonomy seed** (8 categories, 5 levels, 64 districts).

   With a terminal — note `cd ~/shikkha24-cms/cms` and the **absolute**
   `DATABASE_URI`, for the reasons in §3.7 A. `run.ts` also lives under `cms/`,
   so from the app root the CLI reports `Cannot find package 'payload'`:

   ```sh
   cd ~/shikkha24-cms/cms
   env PAYLOAD_SECRET="$PAYLOAD_SECRET" \
     DATABASE_URI='file:/home/shikkhac/shikkha24-cms/data/payload.db' \
     NODE_ENV=production \
     PUBLIC_SITE_URL=https://shikkha24.com \
     OAUTH_REDIRECT_BASE=https://cms.shikkha24.com \
     /opt/alt/alt-nodejs24/root/usr/bin/node \
     ~/nodevenv/shikkha24-cms/24/lib/node_modules/payload/bin.js \
     run src/seed/run.ts
   ```

   Expect `created 77`. Do not skip it — the frontend build needs the 8 categories
   to exist or every article is skipped (see the seed's own `skipped` counter).

   > **`ERR_MODULE_NOT_FOUND: Cannot find package 'payload'`** means the venv's
   > packages are not on the resolution path from `cms/src/seed/`. The standalone
   > bundle has no top-level `node_modules/<pkg>` — pnpm keeps them under
   > `node_modules/.pnpm/`, and Node only walks *upward* through `node_modules`
   > directories. Link the venv into the app once, without clobbering what is there:
   >
   > ```sh
   > V=/home/shikkhac/nodevenv/shikkha24-cms/24/lib/node_modules
   > N=/home/shikkhac/shikkha24-cms/node_modules
   > for d in "$V"/*; do t="$N/${d#$V/}"; [ -e "$t" ] || { mkdir -p "${t%/*}"; ln -sfn "$d" "$t"; }; done
   > ```

3. cPanel → **Setup Node.js App** → **Restart** (not "Stop").
4. Wait 10–30 s. **The first request takes 5–15 s** while Node initialises and Payload boots —
   this is normal, do not restart again thinking it failed.
5. Verify, in order:

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://cms.shikkha24.com/api/articles?limit=1   # expect 200
curl -s -o /dev/null -w '%{http_code}\n' https://cms.shikkha24.com/admin                  # expect 200
```

6. Open `https://cms.shikkha24.com/admin` and create the first **Super Admin** user.

> **There is no `DB_PUSH` variable, and there must never be one.** Earlier drafts of
> this runbook set it in the cPanel environment and told you to restart the app to
> create the schema. That cannot work: `@payloadcms/db-sqlite` creates the schema
> only via `pushDevSchema`, gated on `NODE_ENV !== 'production'`
> (`dist/connect.js:49`), and Passenger runs the app at `NODE_ENV=production`.

### 3.7a Why starting the app cannot create its own schema

Worth stating once, because it cost four workarounds on 2026-10-03 and the error
message (`SQLITE_ERROR: no such table: levels`) points nowhere near the cause.

`@payloadcms/db-sqlite` has exactly one schema-creation path:

```js
// dist/connect.js:49 — the whole story
if (process.env.NODE_ENV !== 'production' && process.env.PAYLOAD_MIGRATING !== 'true' && this.push !== false) {
  await pushDevSchema(this);
}
if (process.env.NODE_ENV === 'production' && this.prodMigrations) { await this.migrate({ migrations: this.prodMigrations }); }
```

Development and CI got a schema implicitly from that push. Production never could.
The repository also had **no `cms/src/migrations/` directory at all**, so
`payload migrate` was a silent no-op — which is what made the failure look
unfixable rather than merely unfinished.

Three consequences that still hold:

- **Schema changes are migrations.** `cms/src/payload.config.ts` sets `push: false`,
  so the committed migrations are the only description of the schema. After changing
  a collection, run `pnpm --filter @shikkha24/cms db:migrate:create <name>` and commit it.
  `verify:payload-migrations` fails CI if you forget.
- **Applying an update to an existing database is `payload migrate`,** never a
  `push`. Same command, same absolute-`node` invocation as step 1.
- **A green build no longer implies a correct schema.** That is the entire reason
  the drift gate exists.

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
sqlite3 ~/shikkha24-cms/data/payload.db ".backup /tmp/predeploy-$(date +%F).db"

# 2. zip the assembled bundle (NOT the app directory — see §3.3 for the traps)
#    and upload + extract it via cPanel File Manager, overwriting ~/shikkha24-cms

# 3. restart: cPanel → Software → Setup Node.js App → RESTART
```

⚠️ **There is no SSH, so there is no `kill -USR2`.** The cPanel **RESTART** button is the
mechanism. Press it **once** — the cold start takes 5–15 s and a second restart does not help.

⚠️ **The archive is safe only because `data/` is excluded from the bundle.** Extracting over the
app directory is destructive to everything *else* there, including `node_modules/` — which is a
CloudLinux symlink into the venv and must be recreated with the loop in
`docs/deployment-runbook.md` §3.4 if the extraction disturbs it.

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

Then publishing an article fires the webhook and CI rebuilds the site against this CMS. The new
HTML is then shipped to `public_html` — see `docs/hosting-and-deployment.md` §4 for how, and note
that this path is **not yet fully automated** (2026-10-04).

**Unset means a silent no-op** — edits save correctly and never appear.

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
  the frontend is built in CI on Node 24 and shipped as static HTML.
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
| **`docs/deployment-runbook.md`** | **the day-to-day deploy procedure — start here** |
| **`docs/dianahost-provisioning-checklist.md`** | **what to obtain from DianaHost, in dependency order** |
| `docs/hosting-and-deployment.md` | the whole hosting model, CI quotas, bandwidth ceilings |
| `docs/reliability.md` §7 | CMS restart procedure, incident response |
| `docs/security.md` §2–3 | why the database lives outside the web root; admin hardening |
| `docs/backup-and-recovery.md` | the daily dump, restore runbook, DR scenarios |
| `.sps/deployment-readiness.md` | the owner-action checklist this runbook feeds |
| `docs/README.md` | the index of every document and its current status |
