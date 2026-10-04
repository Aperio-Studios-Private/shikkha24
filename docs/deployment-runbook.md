# Deployment Runbook — Shikkha24

**Created:** 2026-10-04 · **Status:** describes the procedure used for the first production deploy.
**Audience:** the owner, or any agent picking this project up cold.

> **What this document is for.** Someone should be able to read this file and redeploy the site
> without reading the code, and without rediscovering anything the hard way. Everything below was
> either executed successfully on 2026-10-04 or is explicitly marked as not yet done.

---

## 0. Read this first — three things that will waste your afternoon

1. **There is no SSH on this host.** Do not write `rsync`, `scp`, or `ssh`. It will fail. Ports
   22, 2222, 222, 2200 and 2022 are all closed.
2. **The CMS "Terminal" in cPanel is not SSH.** It is a shell *inside* cPanel. It works, and it is
   what the schema bootstrap uses — but nothing can connect to it from outside.
3. **Never put `data/` in an artifact.** `~/shikkha24-cms/data/` is the entire editorial archive:
   every article, every reader account, every uploaded image and the SQLite database. The CMS
   bundle deliberately excludes it. If a build ever includes it, replacing the app deletes the site.

---

## 1. Where things live

| | Path | On the live site |
|---|---|---|
| Frontend source | `frontend/` | built to `frontend/dist` (3.8 MB, ~156 pages) |
| Frontend live | — | `~/public_html` |
| CMS source | `cms/` | built to `cms/.next/standalone` (**161 MB**) |
| CMS live | — | `~/shikkha24-cms` |
| CMS entry point | — | `~/shikkha24-cms/server.js` (from `standalone/cms/server.js`) |
| CMS data | — | `~/shikkha24-cms/data/` — **outside the web root, never replaced** |
| CMS admin | — | `https://cms.shikkha24.com/admin` |

The cPanel account is `shikkhac`; the cPanel server is `b201.serverdiana.com:2083`.

---

## 2. Deploying the frontend (the common case)

The frontend is a **static Astro build**. It is rebuilt whenever an editor publishes, and by hand
whenever the code changes.

### 2.1 By hand — the procedure that worked on 2026-10-04

```sh
# 1. Build against the LIVE CMS. CMS_URL must be set or you get a thin site.
CMS_URL='https://cms.shikkha24.com' PUBLIC_CMS_ORIGIN='https://cms.shikkha24.com' pnpm --filter frontend build
```

⚠️ **`cd` into the exact directory you are zipping.** The first attempt at this produced a 91 MB
archive containing `frontend/.env` and `package.json` because the shell's working directory had
reset. Use an absolute path:

```sh
cd /absolute/path/to/NewsPortal/frontend/dist && zip -qr ~/Downloads/shikkha24-dist-$(date +%F).zip .
```

Then, in cPanel → **File Manager**:

1. Upload the zip to `~/public_html`.
2. Select it → **Extract** → extract into `~/public_html`, overwriting.
3. Delete the zip.

⚠️ **Confirm what you are uploading before you upload it.** The zip must contain `index.html`,
`.htaccess`, `_astro/`, etc. If it contains `.env` or `package.json`, you zipped the wrong
directory. Delete the archive and rebuild — do not upload it.

### 2.2 By automation — `.github/workflows/deploy.yml`

> ✅ **Rewritten 2026-10-04.** It no longer contains a single `rsync` or `scp`. It builds the site,
> runs every harness, and ships it over the cPanel HTTPS API — the only transport this host allows,
> since it refuses SSH. `docs/hosting-and-deployment.md` §4.2 has the mechanism.
>
> ⚠️ **It has never been run against production.** The logic is counter-proved against a local
> server that reproduces cPanel's response envelopes (34 checks), which proves the failure handling
> — **not** that the parameter names match this cPanel build. Run a dry run first, every time, until
> one live run has succeeded.

```sh
# Plan it: builds, verifies, prints every path that would be deleted, changes nothing.
gh workflow run deploy.yml -f mode=dry-run -f target=all -f reason='manual fix'

# Apply it. The CMS half additionally needs the risk acknowledgement.
gh workflow run deploy.yml -f mode=live -f target=all -f confirm-risk=true -f reason='manual fix'

# Follow it.
gh run watch
```

| Input | Default | Meaning |
|---|---|---|
| `mode` | `dry-run` | `dry-run` plans and verifies; `live` pushes to production |
| `target` | `all` | `all`, `static` (the public site) or `cms` |
| `confirm-risk` | `false` | required for a live CMS deploy — see below |

**Why a live CMS deploy needs confirming.** Extracting the bundle over `~/shikkha24-cms` can
disturb the CloudLinux venv symlinks in `node_modules`, which takes the CMS down. It is recoverable,
but only with a terminal (§3.4). The confirmation exists so that happens deliberately.

**Publishing does not deploy yet.** `repository_dispatch` fires on every editor publish, but it
also runs in **dry run** until you set the repository variable `AUTO_DEPLOY=live`
(Settings → Secrets and variables → Actions → Variables). Until then a publish shows you the plan
and nothing else. There is still no `push:` trigger — pushing to GitHub does not deploy.

⚠️ **`AUTO_DEPLOY` accepts exactly `live` or `dry-run`** (case and surrounding spaces don't
matter). Anything else — `yes`, `true`, `on` — **fails the run with an error** rather than falling
back to a default, because a typo must never be the thing that decides whether production is
overwritten. Leave it empty for dry run.

**Where the plan appears.** The report — files deployed, every path deleted, which extraction
mechanism the host accepted, whether the site answered afterwards — goes to the **run summary
panel**, not just the step log. Read that panel; it is the difference between the report scrolling
past and being on the page.

---

## 3. Deploying the CMS (rare — only on a dependency or schema change)

The CMS is a Payload + Next app. **Content changes never require a CMS redeploy** — they require a
frontend rebuild (§2). The CMS only ships when code or dependencies change.

### 3.1 Build the standalone bundle

```sh
pnpm --filter cms build
```

The result is `cms/.next/standalone`. Three things about it that have each caused a failed deploy:

| Trap | Why | Fix |
|---|---|---|
| `standalone/server.js` is missing | pnpm's monorepo layout keeps the workspace segment | the entry point is **`standalone/cms/server.js`** |
| `.next/static` is missing | `standalone` only traces server code | copy `cms/.next/static` → `cms/.next/standalone/cms/.next/static` |
| packages are not resolvable | Node walks **upward** for `node_modules`; pnpm nests them | see §3.4 |

### 3.2 Back up before you touch anything

```sh
sqlite3 ~/shikkha24-cms/data/payload.db ".backup /tmp/predeploy-$(date +%F).db"
```

This is the whole editorial archive. Back it up before **every** CMS deploy.

### 3.3 Upload and assemble

Zip the assembled bundle, upload via cPanel File Manager, extract into `~/shikkha24-cms`,
overwriting. The archive must **not** contain `data/`.

### 3.4 The venv symlink loop

The standalone bundle ships the traced `payload` package but **not** `bin.js`, `dist/bin/`, or
`tsx`. Node's module resolution walks *upward* from the file's directory looking for
`node_modules`, and cPanel's virtualenv lives in a sibling tree, so `ERR_MODULE_NOT_FOUND:
Cannot find package 'payload'` is the expected first failure.

The fix is to link the venv's packages into the app's `node_modules`:

```sh
V=/home/shikkhac/nodevenv/shikkha24-cms/24/lib/node_modules; N=/home/shikkhac/shikkha24-cms/node_modules; for d in "$V"/*; do t="$N/${d#$V/}"; [ -e "$t" ] || { mkdir -p "${t%/*}"; ln -sfn "$d" "$t"; }; done
```

⚠️ **`[ -e "$t" ] ||` is load-bearing.** Without it this clobbers existing entries. Never remove that guard.

⚠️ **The `24` in that path is the Node major version.** If the host is moved or re-provisioned,
re-read it from cPanel rather than assuming.

### 3.5 Start it

cPanel → **Software → Setup Node.js App** → your application → **RESTART**.

There is no SSH route to restart the process, so the button is the mechanism. Press it **once** —
a restart after a cold start is the single most common cause of "the site is down" reports.

### 3.6 Cold start is slow — this is normal

The first request after a restart takes **5–15 seconds** while Passenger boots the app. The admin
appears blank during this. Wait. Do not restart again.

---

## 4. The schema bootstrap — why it exists

`pushDevSchema` is gated on `NODE_ENV !== 'production'` and migrations run only when
`NODE_ENV=production`, so on the host the schema comes from the committed Drizzle migrations:

```sh
export NODE_ENV=production
export DATABASE_URI='file:/home/shikkhac/shikkha24-cms/data/payload.db'
~/nodevenv/shikkha24-cms/24/lib/node_modules/payload/bin.js migrate
```

⚠️ **`DATABASE_URI` must be absolute, every time, including in read-only checks.** A relative
`file:data/payload.db` silently opens a *different* database than the running app, and you will
conclude the app has no data when it has plenty.

Run this once on first deploy and after any migration lands.

---

## 5. Seeding content

```sh
cd ~/shikkha24-cms/cms
```

⚠️ **Not** `~/shikkha24-cms` — the `cms/` segment is part of the path and this is a very easy
mistake to make.

Two seeds exist:

| Seed | Creates | Idempotent |
|---|---|---|
| taxonomy seed | 77 rows: categories, tags, levels | yes — prints `skipped` for anything present |
| demo seed | 24 articles, 3 authors, 14 tags, 5 deadlines, 6 media, 1 gallery, 3 comments, 4 scholarships, 3 result links, 6 institutions, 3 circulars, 8 study-abroad guides | yes |

Both **skip rather than duplicate**. Running them twice is safe.

⚠️ **The demo content is marked so it can be removed cleanly.** Articles carry a `demo-` slug, a
`demo-` filename and a `ডেমো:` title prefix. See §7.

---

## 6. Verifying a deploy — do not skip this

Run these from outside the host. A deploy is not finished until they pass.

```sh
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' https://shikkha24.com/            # 200, ~153000
curl -s -o /dev/null -w '%{http_code}\n' https://shikkha24.com/sitemap.xml                  # 200
curl -s -o /dev/null -w '%{http_code}\n' https://shikkha24.com/rss.xml                      # 200
curl -s -o /dev/null -w '%{http_code}\n' https://cms.shikkha24.com/api/articles?limit=1      # 200
curl -s -o /dev/null -w '%{http_code}\n' https://cms.shikkha24.com/admin                    # 200
```

Then confirm the security headers are actually being served:

```sh
curl -sI https://shikkha24.com/ | grep -iE 'strict-transport|x-content-type|x-frame|content-security'
```

Expected: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, and a CSP whose `connect-src` includes `https://cms.shikkha24.com`.

### 6.1 Two responses that look broken but are not

- **`/article/<slug>` returns a ~774-byte page.** This is an intentional meta-refresh redirect stub
  to the canonical `/education-news/<id>/<slug>`. The canonical URL returns 200 with ~67 KB.
- **`/admin` returns HTML but the page is blank.** This means the admin is being served a CSP that
  refuses its own scripts and styles. Check the CSP — see §6.2.

### 6.2 The CSP trap that blanked the admin once already

A `Content-Security-Policy` header on a catch-all route (`/:path*`) with `default-src 'none'` and
no `script-src`/`style-src`/`img-src` will blank the Payload admin, because **`default-src` is the
fallback for every directive that is not named explicitly.** With only `frame-ancestors`,
`base-uri` and `form-action` present, there is no `script-src` and no `style-src` at all.

Also note that **two `Content-Security-Policy` headers are enforced as an intersection** — a second
header does not override the first, it can only narrow it further. That is why
`cms/next.config.ts` puts exactly one CSP on each route.

Current policy: `CMS_API` is deny-all on `/api/*`; `CSP_ADMIN` allows same-origin + inline scripts
and styles on `/admin/*`. `'unsafe-inline'` is **required**, not a shortcut — Next inlines the RSC
payload into the HTML it streams. It was verified as necessary: 0 of 64 production client chunks and
0 of 621 shipped `@payloadcms/ui` files contain `eval(` or `new Function(`.

---

## 7. Demo content — loading and removing it

The demo content exists so the site can be reviewed before real content exists. It must be
removable **without leaving a trace**, because after an editor deletes an article the site must
show nothing — no fallback copy, no cached page, no orphaned media.

`cms/src/seed/demo-purge.ts` implements exactly that. It:

- runs as a **dry run by default**; it only deletes when given `--confirm`
- identifies demo rows by `demo-` slug, `demo-` filename, `ডেমো:` title prefix, **and** the
  imported deadline / quiz / poll / fact-check constants
- deletes dependent rows first (comments, bookmarks, poll votes, saved deadlines)
- deletes an author only when no surviving article still references them
- deliberately leaves taxonomies alone
- prints a leftover report naming any collection that is still non-empty

⚠️ **After a purge you must rebuild and redeploy the frontend** (§2). The static HTML of a deleted
article is already on disk and Apache will keep serving it until it is replaced. This is the single
most important step in the purge and the easiest to forget.

---

## 8. Do not

- ❌ **Do not run `rsync`, `scp` or `ssh` against this host.** There is no SSH.
- ❌ **Do not delete or overwrite `~/shikkha24-cms/data/`.** It is the entire archive.
- ❌ **Do not run the frontend build on the host.** Astro 7 needs Node ≥22.12; build in CI.
- ❌ **Do not put `data/` under a document root.** That serves the database to the internet.
- ❌ **Do not commit a real `.env`.** Only `.env.example`, placeholders only.
- ❌ **Do not upload a zip you have not inspected.** Check it for `.env` and `package.json` first.
- ❌ **Do not restart the CMS twice.** Cold start is slow; the second restart does not help.
- ❌ **Do not paste the cPanel API token, or any secret, into chat or a commit.**
- ❌ **Do not assume the CMS being down takes the site down.** It does not.

---

## 9. Related documents

| Document | Covers |
|---|---|
| `docs/hosting-and-deployment.md` | why CI exists, the pipeline, quotas, the Node question |
| `docs/cms-deployment.md` | first-time CMS setup in full, schema bootstrap, seeding |
| `docs/reliability.md` | incident response, restart procedure |
| `docs/backup-and-recovery.md` | daily dumps and restore — **start at §6.4 if you are setting the backup up for the first time** |
| `docs/security.md` | headers, CSP, rate limiting, PII |
| `docs/README.md` | the index of every document and its status |