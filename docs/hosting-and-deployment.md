# Hosting & Deployment Model — Shikkha24

**Created:** 2026-09-11 · **Updated 2026-10-04** — rewritten after the first real production deploy.
**Status:** describes the deployment that is actually running on DianaHost.

> **Read this before changing anything about deployment.** Every claim marked
> **VERIFIED** was confirmed by the owner against the live host on 2026-10-04. Claims marked
> **DESIGNED** describe a build that is written but has not yet been run against production —
> treat them as the plan, not as evidence that it works.

---

## 0. The three facts that decide everything

| # | Fact | Consequence |
|---|---|---|
| 1 | **DianaHost has no SSH.** TCP 22, 2222, 222, 2200 and 2022 are all closed. (VERIFIED) | No `rsync`, no `scp`, no `git push` to the host, no cPanel Git private-repo clone. Any deploy that ends in an SSH command **cannot run here**. |
| 2 | **cPanel is the only control surface.** File Manager, Terminal (a shell *inside* cPanel, not SSH), Setup Node.js App, API Tokens, Git Version Control. (VERIFIED) | Deploys go through cPanel — by hand, or over its HTTPS API from CI. |
| 3 | **Node ≥22.12 is needed to build, never to run.** Astro 7 / Vite 8 refuse to *build* on Node 20; Payload runs fine on it. | The frontend is built in CI on Node 24 and shipped as finished HTML. The CMS ships as a standalone bundle. |

The old version of this document described a pipeline ending in `rsync over SSH`. **That pipeline
has never worked on this host.** It is preserved in git history if you want to see it.

### ⚠️ Correction 2026-10-04 — port 21 is open

An earlier revision of this document (and `.sps/handoff.md`) recorded the open ports as
**"only 443, 2083 and 2087"**. That was wrong, and the error is expensive: it is what kept
`backup-db.yml` on an `ssh`/`scp` transport that has never worked here.

**TCP 21 is open**, and the server answers as **Pure-FTPd with TLS**:

```
220---------- Welcome to Pure-FTPd [privsep] [TLS] ----------
530 Login authentication failed      (expected — anonymous login is refused)
```

| Port | Service | Use |
|---|---|---|
| 443 | HTTPS | The site |
| 2083 | cPanel over HTTPS | The deploy API (`scripts/cpanel-client.mjs`) |
| 2087 | cPanel over HTTPS (alt) | — |
| **21** | **FTPS** | **The only way to move a binary file off the host without a shell.** Used by `scripts/backup-fetch.mjs` |
| 22, 2222, 222, 2200, 2022 | SSH | **Closed.** Confirmed still closed |

**What FTPS is and is not for.** It moves files. It cannot run `sqlite3`, so it cannot *take* a
consistent snapshot of a database that is being written to — that is why the backup is split
between a host-side cron (which runs `sqlite3 .backup`) and CI (which only fetches the result).
`docs/backup-and-recovery.md` §6 has the full design.

---

## 1. Why CI exists at all — the short version

**Editors never touch GitHub.** They log into the Payload admin panel — a normal web CMS, like
WordPress. Write, click Publish. That is the entire editor experience.

But the public website is **pre-built into HTML files ahead of time**. That is precisely why it is
fast and cheap: Apache serves a finished file from `public_html`, and no server has to generate
anything per reader.

So when an editor publishes an article, a new HTML file must be **created**. That is what CI does,
automatically and invisibly:

```
Editor clicks Publish (in Payload)
   → Payload fires a webhook  (cms/src/lib/rebuild-trigger.ts)
   → GitHub Actions rebuilds the Astro site
   → the new HTML is shipped to public_html
   → the article is live
```

Nobody sees GitHub. It is plumbing.

### The alternative, and why we are not using it

A "dynamic" site generates each page when a reader requests it — no rebuild needed. But then
**every reader request hits the 2 GB shared host**, which is slower, risks the TTFB and Lighthouse
targets, and falls over under a viral spike.

Given Lighthouse ≥95 on a 2 GB shared host, **static is the right architecture**. The cost of that
choice is: publishing needs a rebuild.

---

## 2. What actually runs where

| Piece | Runs on | Started by | Survives an idle period? |
|---|---|---|---|
| **Public site** (static HTML, 3.8 MB) | DianaHost `public_html`, served by **Apache** | nothing — it is files | ✅ yes |
| **CMS** (Payload admin + API) | `~/shikkha24-cms`, a Node process behind **Phusion Passenger** | cPanel *Setup Node.js App* | ❌ **no** — Passenger kills idle processes |
| **Media** (`data/media/`) | host disk, outside the web root | — | ✅ yes |
| **Database** (`data/payload.db`, SQLite) | host disk, outside the web root | — | ✅ yes |

**The property that makes this architecture safe:** if the CMS is down, readers are unaffected.
Apache serves the pre-built HTML without needing Node at all. Only the admin and publishing stop.
See `docs/reliability.md` §1.

---

## 3. The deployment pipeline — as built

### 3.1 The frontend (static site)

```
GitHub Actions (Node 24)
   ├─ build Astro site + Pagefind index        → frontend/dist  (~156 pages, 3.8 MB)
   ├─ run the dist-only verification harnesses
   ├─ zip frontend/dist
   ├─ upload the zip over HTTPS to cPanel      (UAPI Fileman::upload_files)
   ├─ extract it where it sits                 (API 2.0 Fileman::fileop op=extract)
   └─ swap it into public_html
```

Runbook: **`docs/deployment-runbook.md`**. Workflow: **`.github/workflows/deploy.yml`**.

### 3.2 The CMS (Payload on Passenger)

The CMS changes rarely — only on a dependency bump, a Payload upgrade, or a schema migration.
It is **not** deployed on every publish. Runbook: **`docs/cms-deployment.md`**.

| | |
|---|---|
| Artifact | Next.js `standalone` bundle, **161 MB** |
| Entry point | `standalone/cms/server.js` — the `cms/` path segment is the pnpm workspace name and is **not** optional |
| Install root | `~/shikkha24-cms` (outside `public_html`) |
| Data | `~/shikkha24-cms/data/` — **never in the artifact**, so replacing the app cannot touch the archive |
| Start | cPanel → *Setup Node.js App* → **RESTART** |

### 3.3 The rebuild quota — one hard limit

| Quota | Limit | Source |
|---|---|---|
| **GitHub Actions minutes** | **2,000 / month** (private repo) | GitHub free plan |

~~Cloudflare Pages builds~~ — **removed 2026-09-14.** There is no separate build quota for the
deploy target; only the GitHub Actions minutes cap applies.

| Scenario | Builds/month | Minutes used | Verdict |
|---|---|---|---|
| One build per publish, 30s incremental | 900 | ~450 | ✅ Fits 2,000 |
| One build per publish, 2 min | 900 | ~1,800 | ⚠️ Tight |
| One build per publish, 5 min full rebuild | 900 | ~4,500 | ❌ Over |

⚠️ **Measured 2026-10-04: a full clean frontend build takes 7.71 s** on a laptop. The 30 s
assumption above is conservative; real usage will land near the first row.

Publishing is debounced (`REBUILD_MIN_INTERVAL_MS`, default 5 min) by `cms/src/lib/rebuild-trigger.ts`.
Editors see "published" in the CMS immediately; the public page appears within the batch window.
The CMS must say so honestly rather than implying instant publication.

---

## 4. Deployment automation — what exists and what does not

**This section corrects a belief that was widely held and is false.**

| Claim | Reality (2026-10-04) |
|---|---|
| "Pushing to GitHub deploys the site." | ❌ **False.** See below. |
| "`deploy.yml` deploys on every push." | ❌ **False.** It has no `push:` trigger at all. |
| "The site is deployed by rsync over SSH." | ❌ **Never was.** The host has no SSH. |

### 4.1 Why "push to GitHub and it goes live" does not work here

Three independent blockers, any one of which is fatal:

1. **No SSH.** cPanel's own Git Version Control documentation requires SSH Access for private
   repositories — *"Because SSH keys allow access to the entire cPanel account, and not just a
   single repository, exercise caution."* Not available on this host.
2. **cPanel cannot receive a webhook.** There is no webhook endpoint. The Git "Update from Remote"
   action is a UI button with **no API 2.0 or UAPI function behind it**, so nothing can trigger it.
3. **cPanel's cron-based deploy does not fetch.** The documented cron command
   (`uapi VersionControlDeployment create repository_root=…`) runs `.cpanel.yml` against the
   repository's **existing HEAD**. It deploys what is already there; it never pulls from GitHub.

Also ruled out: cloning a `deploy` branch directly into `public_html` — cPanel refuses to clone
into a non-empty directory, and your `public_html` already contains `.htaccess`.

### 4.2 The replacement, built — the cPanel HTTPS API

> ✅ **IMPLEMENTED (2026-10-04), and not yet run against production.** `deploy.yml` now drives
> `scripts/deploy-static.mjs` and `scripts/deploy-cms.mjs` over this API; `deploy.yml` no longer
> contains a single `rsync` or `scp`. Everything below describes working code.
>
> ⚠️ **But it has never touched the real host.** It is counter-proved against a local server that
> reproduces cPanel's response envelopes (`scripts/verify-cpanel-deploy.mjs`, 40 checks), which
> proves the logic and the failure handling — **not** that the parameter names are right for this
> cPanel build. `mode: dry-run` is the default for exactly that reason, and it contacts the host
> (read-only) so the credentials, the path and the API shapes are all confirmed before a live run.

cPanel exposes **API Tokens** (`cPanel → Security → API Tokens`), which authenticate with a plain
header — there is **no OAuth exchange and no token expiry**:

```
Authorization: cpanel <cpanel-user>:<api-token>
```

That is the whole credential. From GitHub Actions we can therefore reach the host over HTTPS on
port 2083 and move files, with no SSH, no card, and no paid service.

| Operation | Function | API |
|---|---|---|
| Upload the zip | `Fileman::upload_files` | UAPI — `POST /execute/Fileman/upload_files` |
| Extract it, with a destination | `Fileman::extract_files` | UAPI — **unconfirmed on this host**, see below |
| Extract it, in place | `Fileman::fileop` `op=extract` | API 2.0 (deprecated, but always present) |
| List a directory | `Fileman::list_files` | UAPI |
| Delete (recursive) | `Fileman::delete_file` | UAPI |
| Read / write a text file | `Fileman::get_file_content` / `save_file_content` | UAPI |
| Create a directory | `Fileman::mkdir` | API 2.0 (no UAPI equivalent) |

⚠️ **Traps that break a naive script:**

- There is **no UAPI `mkdir`**. It requires the deprecated API 2.0.
- `Fileman::fileop op=extract` has **no destination parameter**. The archive always extracts into
  the directory it already sits in — so using it on `public_html` means the zip is uploaded *into*
  the docroot, where it is publicly downloadable at a guessable URL until it is deleted.
- **`Fileman::extract_files` may not exist on this host.** Newer cPanel builds document it with a
  destination parameter, which would close that hole completely. The cPanel doc URLs would not
  resolve when this was written, so **it is not assumed** — `extractArchive()` tries the UAPI call
  first and falls back, and the first live run reports in the CI summary which one the host
  accepted. A one-file probe archive settles it against the real cPanel version before anything
  real is uploaded.

### 4.2.1 How `rsync --delete` was replaced

`rsync` gave three properties: transfer, removal of what is no longer built, and never clobbering
the one file an operator may be hotfixing. Each now comes from a different place.

| `rsync` behaviour | Replacement | Where |
|---|---|---|
| Transfer files | zip → `upload_files` → extract | `deploy-static.mjs` |
| `--delete` | a **manifest** of the last deploy, diffed against this build | `deploy-manifest.mjs` |
| Never touch `.htaccess` | `.htaccess` is **never written into the manifest**, so no delete set can contain it | `deploy-manifest.mjs` |

The manifest is a plain list of the paths the last deploy wrote, stored on the host at
`~/shikkha24-deploy/frontend-manifest.txt` — outside the docroot, so not publicly readable, and
recording what is *actually deployed* rather than what an artefact claims. A failed run cannot
leave it out of step with reality.

⚠️ **A first deploy deletes nothing**, because there is no previous manifest and the site was
deployed by hand. Deleting nothing is the only safe reading when you do not know what is there.

⚠️ **A directory is only deleted when nothing live sits under it.** Stale files are promoted to
their parent directory and as far up as they will go, stopping at the first ancestor that still
holds a file this build produces. `news/gone/*` all gone and `news/kept/` still live deletes
`news/gone` in one call — never `news`.

### 4.2.2 Running it

The workflow defaults to **`mode: dry-run`**: it builds, runs every harness, prints the exact plan
including every path that would be deleted, and contacts the host read-only (it lists the docroot
and reads the manifest — which is what proves the credentials work). Going live is `mode: live`.

A live **CMS** deploy additionally requires `confirm-risk: true`, because extracting over the app
directory can disturb the CloudLinux venv symlinks in `node_modules` and take the CMS down.
Recovery is a shell loop (`docs/deployment-runbook.md` §3.4); the workflow prints it in the
dry-run summary so it is on the page before it is needed.

**Two triggers fire on their own: a push to `main`, and `repository_dispatch`** — the publish
webhook, when an editor clicks Publish. **Both run in dry run** unless the repository variable
`AUTO_DEPLOY` is set to `live`; until then each builds, verifies and prints the plan, including
every path it would delete, without touching the host. Flip that one setting and a push publishes
the frontend automatically.

#### 4.2.3 The last manual step — the host cron extractor

The cPanel **API cannot extract an archive on this host** (§4.2: `Fileman::extract_files` is
absent, `Fileman::fileop op=extract` answers success and writes nothing). For months that made
"Extract in cPanel File Manager" the one manual step on every publish — the friction behind T-15.

It is now automated **without the API**, using a mechanism this host *does* support: a **host-side
shell `tar` run by cPanel → Cron Jobs**.

> **The evidence for `tar`, stated honestly (corrected 2026-10-13).** Earlier drafts of this section
> called `tar` "proven on this exact account twice over." That was wrong, and it was withdrawn after
> both halves of it were checked:
>
> - **almarsus.com is a different cPanel account** (`/home/almarsus`, not our `/home/shikkhac`). Its
>   every-minute cron genuinely does run `tar -xzf` and serves live traffic — so the mechanism works
>   on the **DianaHost platform**, which is real and valuable evidence — but it says nothing about
>   what is installed on *our* account.
> - **the shikkha24 backup has never produced an archive** on the host. `.sps/opencodereport.md` C3
>   records that `scripts/host-backup-dump.sh` has *never run* — its cron dies at the CloudLinux fork
>   limit before reaching `tar -czf` — and the `backup-db.yml` CI runs are still failing today. So it
>   is not evidence for this account either.
>
> So `tar` is **unverified on the shikkhac account**. It remains the right choice — it is the one
> extraction tool with demonstrated platform-level success on this host, whereas `unzip` had none —
> but the extractor does not rely on it being present: it runs `command -v tar` before touching
> anything and dies with a message naming the remedy if it is missing (§4.2.3 owner action O-1).
> That guard is load-bearing, not belt-and-braces.
>
> ⚠️ **The same caveat applies to cron itself.** The fork limit that has blocked the backup cron
> since 2026-10-04 was checked on 2026-10-10 only through cPanel UAPI (the web/PHP path), **not**
> through a cron run. Whether the shikkhac account can fork from cron at all is still open, and it
> is the larger risk to this mechanism than `tar`'s presence.

| Piece | File | What it does |
|---|---|---|
| The extractor | `scripts/host-extract.sh` | Finds the newest `frontend-*.tar.gz` in `public_html`, waits for the upload's size to settle, `tar -xzf`s it, proves `index.html` landed, deletes every archive, logs to `~/shikkha24-deploy/extract.log` |
| Its liveness proof | (writes) `~/shikkha24-deploy/extract-heartbeat.txt` | A UTC timestamp, written **only after** the script confirms `tar` exists — so a fresh heartbeat means "the cron is alive *and able to extract*", never merely "the cron ran" |
| The CI handoff | `scripts/deploy-static.mjs` | When the API extract no-ops, reads the heartbeat: **fresh → waits for the cron** (polling the *site*, not the API, for a page that is new in this build to return 200); **absent/stale → fails loud exactly as before** |
| The name contract | both files | CI uploads `frontend-<run>.tar.gz`; the cron globs `frontend-*.tar.gz`. Nothing connects these two files at runtime but the filename, so `verify:cpanel-deploy` §10d asserts the agreement statically from both sources |

**Why this cannot ship the T-15 bug again.** The handoff is gated on *evidence* — a fresh heartbeat
the cron writes only when it can actually extract — and CI verifies the *reader-visible end state*
(a page new in this build returning 200), not the mechanism. A host with no `tar` never
heartbeats, so CI falls straight through to the pre-existing loud failure. **The automation is inert
until the cron is genuinely working**; it can never report a green deploy on a stale site.

**Two owner-only setup steps (the agent has no SSH):**

1. **Confirm `tar` exists on the host — and that a cron can fork at all.** cPanel Terminal, or a
   one-off cron:
   `/bin/sh -c 'command -v tar && tar --version | head -1; touch ~/public_html/.w && rm ~/public_html/.w && echo WRITABLE'`.
   ⚠️ **Do not treat this as a formality.** As of 2026-10-13 neither `tar` nor a forking cron has ever
   been shown to work on the *shikkhac* account (see the correction box above). The fork limit has
   only ever been checked via cPanel UAPI, never through an actual cron run, so **a one-off cron whose
   output lands in a file is the test that matters most** — it settles `tar` and forking at once. If
   `tar` is missing, install it (`yum install tar`) or this approach is dead and the honest scope
   reverts to the one-step manual extract. If a one-off cron cannot fork, the extract cron is blocked
   and the backup cron's blocker is the same one.
2. **Install the cron.** Upload `host-extract.sh` to `~/bin/shikkha24-extract.sh`, then cPanel →
   Cron Jobs → every 2 minutes → `/bin/sh /home/shikkhac/bin/shikkha24-extract.sh`. (`/bin/sh`
   *reads* the file, so it needs no execute bit — the same property the backup script relies on.)
   Read `~/shikkha24-deploy/extract.log` to confirm it runs and writes a heartbeat.

Then flip the two GitHub switches — `DEPLOY_WEBHOOK_URL` (CMS publish → rebuild) and
`AUTO_DEPLOY=live` (push/webhook → publish instead of dry-run) — and a publish goes live with no
manual step. Both harnesses are counter-proved: `verify:host-extract` (22 checks, including "fails
loud and touches nothing when `tar` is absent" and "writes no heartbeat when it cannot extract"),
`verify:cpanel-deploy` §10c (the "goes green only when the cron publishes" check, proven to fail
when the branch is disabled), and §10d (the CI↔cron filename agreement, proven to fail on a
half-converted pipeline in both directions).


**A push deploys the frontend only — never the CMS.** The frontend is finished HTML dropped into
`public_html`: idempotent, and a bad build is replaced by the next one, so it is safe to run
unattended. The CMS bundle is extracted over the app directory, which can disturb the CloudLinux
venv symlinks in `node_modules` and take `/admin` down overnight. That stays behind
`workflow_dispatch` + `confirm-risk`. A commit that changes CMS code therefore needs a manual CMS
deploy (`docs/deployment-runbook.md` §3).

**No deploy can touch the database.** The CMS bundle is assembled with `data/` and `.env`
excluded, and `deploy-cms.mjs` throws if either is present at the bundle root. The frontend half
only ever writes into `public_html`. This is the property that makes it safe to let a machine push
to production unattended.

`verify-deploy-mode.mjs` extracts the `Resolve mode and target` step straight out of `deploy.yml`
and executes it, asserting the push branch in full — including that a push **cannot** be
redirected at the CMS by any input. Counter-proof: **10 failures** against a fixture with the push
branch deleted, 0 against the shipped workflow.

#### ⚠️ `AUTO_DEPLOY` is normalised, and an unknown value is refused

`AUTO_DEPLOY` is a **free-text** repository variable, and the mode it produces is the single switch
that decides whether the host is mutated. It is lower-cased, stripped of surrounding whitespace and
checked against an allowlist before anything compares it: `live` and `dry-run` are accepted, and
anything else **fails the run** with an error naming both valid values. An empty or unset
`AUTO_DEPLOY` means dry run — the safe default, not an error.

This matters because the mode used to be read twice, in opposite senses:

```bash
[ "$MODE" = "live" ]      # gates the confirm-risk check
mode == 'dry-run'         # decides DEPLOY_DRY_RUN
```

Setting `AUTO_DEPLOY` to `Live` made the first false — so the confirm-risk gate was skipped — and
the second false too — so the deploy went live anyway. **A casing slip in one repository variable
published to production without asking.** The step now normalises once and emits `dry_run` as a
dedicated boolean, so no downstream step re-derives it from the string.

`scripts/verify-deploy-mode.mjs` (37 checks) extracts that step's shell **out of `deploy.yml`** and
runs it under every combination that matters — `Live`, `LIVE`, `" live "`, `yes`, `deploy`, empty,
and each `workflow_dispatch` input combination. It reads the shipped file rather than a copy,
because a test of a copy proves the copy. Against the pre-fix version of that step the same harness
reports **27 failures**, which is how it was confirmed to detect the regression it guards against.

#### What each harness covers

| Harness | Checks | Proves |
|---|---|---|
| `verify:cpanel-deploy` | 40 | The client against a real HTTP server reproducing cPanel's envelopes, both APIs, success and failure |
| `verify:deploy-mode` | 37 | The workflow's own mode resolution, run as shipped |

`verify:cpanel-deploy` includes a **negative control** (section 11): it feeds the same fake server
and the same "is this call mutating?" filter a deliberately unguarded replica of `extractArchive`,
and asserts the filter catches it. A check that has never been seen to fail is not evidence.

⚠️ **That control exists because the first version of that harness gave a false green.** It
exercised only the three helpers that happened to have a dry-run guard, so it passed while
`extractArchive` performed a real extract and `uploadFile` a real upload. Every mutating helper is
now covered, and adding one to the client means adding it to that list.

### 4.3 Secrets this needs

Set in **GitHub → Settings → Secrets and variables → Actions**. Never commit them.

| Secret | Value |
|---|---|
| `CPANEL_USER` | the cPanel username (e.g. `shikkhac`) |
| `CPANEL_TOKEN` | the API token from cPanel → Security → API Tokens |
| `CPANEL_HOST` | the cPanel server hostname (e.g. `b201.serverdiana.com`) |
| `CMS_URL` | build-time CMS origin, `https://cms.shikkha24.com` |
| `PUBLIC_CMS_ORIGIN` | browser-facing CMS origin; must match the CSP `connect-src` |

The old `DIANAHOST_SSH_KEY` / `DIANAHOST_SSH_HOST` / `DIANAHOST_SSH_USER` / `DIANAHOST_PUBLIC_HTML`
secrets are **no longer read by anything** and can be deleted from GitHub.

Optional **variable** (GitHub → Settings → Secrets and variables → Actions → Variables):

| Variable | Value | Effect |
|---|---|---|
| `AUTO_DEPLOY` | `live` | lets the publish webhook deploy instead of only planning. Case-insensitive; must be exactly `live` or `dry-run` or the run is refused |

⚠️ **Never paste the API token into chat, a commit, a log, or a handoff file.** Put it straight
into GitHub Secrets. If it is ever exposed, delete it in cPanel and create a new one.

The client uses Node's `fetch` rather than `curl` on purpose: `curl -H "Authorization: …"` puts the
token in the process argument list, where any process on the machine can read it with `ps`.
`fetch` keeps it in the environment and off `argv`. No error path includes the headers.

---

## 5. Node.js version

| Tool | Version in this repo | Requires | Builds on the host? |
|---|---|---|---|
| `astro` | 7.3.2 | `>=22.12.0` | ❌ No |
| `vite` | 8.3.0 | `^20.19.0 \|\| >=22.12.0` | ❌ No |
| `next` | 16.3.6 | `>=20.9.0` | ✅ yes |
| `@payloadcms/next` | 3.89.0 | `^18.20.2 \|\| >=20.9.0` | ✅ yes |
| `typescript` | 7.0.2 | `>=16.20.0` | ✅ yes |

**Two consequences:**

1. **Astro and Vite cannot build on the host.** They build in CI on Node 24 — which is already the
   architecture. The frontend is shipped as finished HTML.
2. **Payload + Next 16 run on the host.** The engines allow it.

### ⚠️ Unresolved: which Node is the host actually running?

Nine documents state that DianaHost runs **Node.js 20.18.2, end-of-life since 2026-04-30**, and
record it as *the largest unmitigated security issue in the stack* (`docs/security.md` §1). That
claim was derived from a cPanel drop-down screenshot on 2026-09-11.

**It is now contradicted by live evidence.** The cPanel Terminal paths that successfully ran the
CMS schema bootstrap and the seed on 2026-10-04 were:

```
/home/shikkhac/nodevenv/shikkha24-cms/24/lib/node_modules/payload/bin.js
```

In CloudLinux's layout that directory is named for the Node **major version**, and it is `24`.
Those commands worked; a Node 20 path did not exist on the account.

**This is not yet confirmed.** Before any document is corrected to say Node 24, run in the cPanel
Terminal:

```sh
node -v ; /home/shikkhac/nodevenv/shikkha24-cms/24/bin/node -v
```

If both print `v24.x.y`, the EOL-runtime finding is **resolved**, the "accepted risk" in
`.sps/plan.md` (S0 exit) should be struck, and the security posture changes materially. Until
then, treat Node 20.18.2 as the documented position and this as an open question.

---

## 6. Escalation ladder if the Actions quota is hit

1. **Batch harder** — increase the rebuild interval. Free, but content appears later.
2. **Make the repository public** → unlimited GitHub Actions minutes. **Owner decision** — note
   that the site and all its content are already public, but the source is not.
3. **Self-hosted GitHub Actions runner** — no minutes limit, but needs a machine to run on.

---

## 7. Bandwidth and storage ceilings

With Cloudflare removed, the **200 GB/month bandwidth cap** applies to ALL traffic — HTML, CSS/JS,
and media images. There is no CDN to absorb the load.

**HTML bandwidth:** ~50 KB/page × 100K pageviews/month ≈ 5 GB. Comfortable.

**Media bandwidth:** at ~100 KB per WebP × 5 images per article view × 100K pageviews ≈ 50 GB.
This is the real consumer. A result-day spike could add 20–30 GB in a single day.

**Storage:** 2 GB total, shared by the CMS standalone bundle (**161 MB**, measured), the SQLite
database, the media library and logs. **Mitigations:** aggressive WebP conversion with originals
discarded, a per-day upload cap, browser caching via `Cache-Control` in `.htaccess`, and an alert
at 80 % of the 200 GB bandwidth cap.

---

## 8. DianaHost facts not published anywhere

The vendor's knowledge base documents **none** of the following. They must be obtained from
support, and until they are, they are unknowns:

- **Inode / file-count quota** — critical, a Next.js install is tens of thousands of files
- CPU / memory / process (entry process) limits
- **The maximum upload size for the cPanel API** (`file_upload_max_bytes`) — determines whether the
  161 MB CMS bundle can ever be pushed by CI rather than by hand
- Email sending limits per hour
- Whether account-level backups exist and can be restored on request

---

## 9. Related documents

| Document | Covers |
|---|---|
| **`docs/deployment-runbook.md`** | **the day-to-day deploy procedure, start here** |
| `docs/cms-deployment.md` | first-time CMS setup, schema bootstrap, seeding, updates |
| `docs/reliability.md` | restart procedure, incident response, graceful degradation |
| `docs/backup-and-recovery.md` | the daily dump, restore runbook, DR scenarios |
| `docs/security.md` | headers/CSP, rate limiting, PII, the Node-EOL finding |
| `.sps/plan.md` | the approved implementation plan |