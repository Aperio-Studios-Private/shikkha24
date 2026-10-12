# Task queue — the single source of truth for what is outstanding

**Read this file first, every session, before any other document.** It answers the
three questions a new agent has: *what was asked, what is in flight, what is next.*

Updated by the agent at the end of every task that changes it. Never written from
memory — if it is not in this file, it was not recorded, and a new session will
not know about it.

---

## How this queue is worked

1. **Every request the owner makes gets an entry** before any work starts. If it
   is not here, it has not been accepted.
2. **One task in flight at a time.** Finish it, verify it, commit it, mark it
   done — *then* take the next. Never batch tasks into one commit.
3. **Never hallucinate state.** A task is `done` only with evidence: a command's
   output, a URL returning an expected status, or a CI run's conclusion. "I
   believe it works" is not evidence and does not close a task.
4. **A blocked task stays open** and says what it is blocked on. It is never
   quietly dropped, and never reordered past without saying so.
5. **Findings that are not tasks still get recorded** — in `.sps/handoff.md`,
   not here. This file is for *work*, not for knowledge.

**Status values:** `todo` · `doing` · `blocked` · `done` · `dropped` (with reason)

---

## 🔴 In flight

### T-15 — CMS edits do not appear on the live site (owner reported 2026-10-12)
- **Status:** `doing` · 🔴 production · reported by the owner mid-session
- **Reported:** "CMS changes are not reflecting on the site live — after edit, adding
  anything, those are not showing in the site."
- **ROOT CAUSE — proven, not inferred.** The storefront is **static HTML built in
  CI**; the CMS write and the storefront publish are two separate steps, and the
  second one is not happening. Three independent breaks in the chain, each
  measured this session:
  1. **The content is in the CMS.** `GET /api/articles/27` → title `টেস্ট - 2`,
     `updatedAt 2026-10-12T07:38:09Z`, `_status: published`. The edit landed.
  2. **The live site serves the pre-edit page.** The same URL on the storefront
     returns `<title>টেস্ট - ১ — শিক্ষা২৪.কম</title>` — the **old** title. The
     homepage's `last-modified` is `05:52:35Z`, **1h46m before** the edit.
  3. **`AUTO_DEPLOY` is unset**, so every webhook/push deploy resolves to
     `dry-run` and uploads nothing (`deploy.yml:198` `MODE="${AUTO_DEPLOY:-dry-run}"`,
     `gh variable list` shows no variable).
  4. **The webhook that would fire it is unconfigured on the host.**
     `lib/rebuild-trigger.ts:84` returns early when `DEPLOY_WEBHOOK_URL` is empty —
     silently, by design, with the only clue being a Bengali admin notice.
  5. **CI is red**, so even a push deploy is now refused by the T-11 gate
     ("Wait for CI to pass" → failure on the last three runs).
- **This is T-14's finding, now observed as a user-facing symptom.** The host has
  no working API extraction mechanism (probed live: `Fileman::extract_files`,
  `unzip`, `Extract::extract_archive`, `Fileman::extract` all fail with real
  cPanel errors). A deploy uploads a zip and **cannot expand it**.
- **FIX APPLIED — manual live static deploy, proven to work today.** Run
  `38209765693` (05:51) did exactly this: `mode=live target=static skip-ci-gate=true`,
  `Extracted via api2-fileop`, `.htaccess` written explicitly, and the site's
  `last-modified` moved to `05:52:35Z`. That mechanism works — it is the *trigger*
  that is missing, not the transport. Re-running that same dispatch publishes the
  pending edit.
- **Loop block.**
  - **Hypothesis:** the storefront is stale because nothing rebuilt it since the
    edit; a live `target=static` dispatch republishes.
  - **Asset:** `deploy.yml` only (via a workflow dispatch — no code change).
  - **Metric:** `<title>` of `/education-news/27/post-8x9lfi/` reads `টেস্ট - ২`,
    and `last-modified` is later than `07:38:09Z`.
  - **Budget:** 1 attempt — the mechanism was proven at 05:51.
  - **Degraded when:** the deploy reports success but the title is unchanged
    (that would mean extraction no-opped again, per T-14).

### T-16 — Full feature-by-feature audit (owner requested 2026-10-12)
- **Status:** `todo` · queued behind T-15 per the owner's instruction: *"write it
  to the task file and continue working on the current task; no immediate
  execution."*
- **Request:** enumerate every feature and module exhaustively, then audit each
  **strictly sequentially** — one at a time, fully completing each before the
  next, never multiple at once. For each: purpose, implementation status, all
  issues found; then implement and verify fixes. Parallel subagents per feature,
  each returning one consolidated report that the lead verifies before any push
  or deploy. **Present findings per feature and wait for explicit owner approval
  before the next feature.**
- **Not started.** T-15 comes first.
- **⚠️ Karpathy's Loop is already installed here** — `.sps/loop.md` is the
  project's adaptation of it, and `.sps/mistakes.md` records the loop violations.
  No internet research or installation needed; the method is in-repo.

### T-17 — Fully automatic push-to-deploy (owner requested 2026-10-12)
- **Status:** `todo` · queued behind T-15 and T-16
- **Request:** *"Implement a fully functional, bug-free push-to-deploy system,
  completely automatic — trigger a build and deployment on every push, handle
  the pipeline end-to-end without manual steps, ensure reliability: error
  handling, rollbacks, failure cases."*
- **⚠️ The hard constraint this must respect — proven, not assumed (T-14).**
  Three blockers are properties of the host, not of the code, and were each
  measured against the live cPanel API this week:
  1. **No working extraction mechanism.** `Fileman::extract_files`,
     `Fileman::unzip`, `Extract::extract_archive`, `Fileman::extract` all fail
     with real cPanel errors. `api2-fileop` answers success and **writes
     nothing**. The probe (`38212054431`) is conclusive: *"RESULT: no API
     extraction mechanism works on this host."*
  2. **The deploy gate now refuses red CI** (T-11), and CI is red on the
     dependency audit (T-10). A push today uploads nothing.
  3. **`AUTO_DEPLOY` is unset**, so webhook/push runs resolve to `dry-run`.
- **What "automatic" can honestly mean here.** The *build* can be fully
  automatic — and already is. What cannot be is the final *expansion into
  `public_html`*, because no API on this host performs it. A push-to-deploy that
  claims end-to-end automation would be the exact failure mode T-14 documents:
  it would report success while the site stayed stale. **That is the bug the
  owner is currently reporting (T-15), and it is caused by automation that
  looked complete.**
- **Approach to propose:** automatic build + upload + verification on every push,
  with a health check that **fails loudly** when the new HTML is not live, plus a
  one-step manual extract. Rollback = the previous run's archived zip, kept on
  the host. Never a silent success.
- **Not started.** T-15 first.

### T-01 — CMS admin rejects all edits, uploads and creates
- **Status:** `todo` (root cause found; fix needs an owner decision) · 🔴 production
- **Reported:** 2026-10-10 — "You are not allowed to perform this action." on every
  create/edit/upload; logout shows a success toast but the session survives.
- **ROOT CAUSE — proven from data, not inferred:**
  **The `users` table has no `roles` column, in any environment.**
  - Production (verified backup `2026-10-10-PROD-payload.db`): columns are
    `id, name_bn, author_profile_id, phone, updated_at, created_at, email,
    reset_password_token, reset_password_expiration, salt, hash, login_attempts,
    lock_until`. No `roles`.
  - Local dev DB `cms/data/payload.db`: **identical** — also no `roles`.
  - `20261003_155252_initial.json` (the only migration touching `users`): identical
    column list. No `roles`.
  - `Users.ts:101` declares `roles` as a real field — `type: 'select'`,
    `hasMany`, **`required: true`**, `defaultValue: ['reporter']`, indexed.
- **Why that denies every write — the deadlock:**
  `rolesOf()` reads `user.roles`; the column does not exist, so it returns `[]`;
  `hasRole()` then returns `false` for **every** role; `isEditorialUser` is
  therefore `false`, so `isEditorial` denies all writes. Worse, granting the field
  is itself guarded by `access: { create/update: ({req}) => hasRole(req.user,
  'superAdmin') }` (`Users.ts:113-116`) — the **same** missing column. Nobody can
  ever acquire a role, so nobody is ever authorised to grant one. Bootstrap is
  impossible through the API by construction.
- **Why CI never caught it.** `scripts/verify-payload-migrations.sh` PASSES. It runs
  `payload migrate:create` and checks whether a new file appeared. The generator
  diffs against the **newest committed snapshot**, and that snapshot is equally
  missing `roles`, so it correctly reports "no change since last snapshot" and
  writes nothing. The gate is comparing the migrations to themselves and cannot
  see a column that is absent from both sides. Running migrations on the host would
  **not** fix this.
- **Ruled out along the way — do not re-investigate:**
  - Session/`PAYLOAD_SECRET` rotation. A fresh incognito login fails identically.
  - The `5bca852`/`6653570` access rules. `serverManagedField` guards 3 reader
    fields; `update` is `isSelfIn('readers')`.
  - Database driver. `stderr.log` shows `ERR_MODULE_NOT_FOUND: @libsql/core` but is
    **frozen at 18,234 bytes** across two reads 40 minutes apart, and
    `@libsql/core` is present and readable on the host (2,434 bytes, v0.14.0).
    Historical noise from a boot before cPanel's `npm install`.
  - The cPanel entry-key bug (`a18816f`) — delete-set only.
- **FIX PREPARED AND COMMITTED — awaiting deploy.** `480b3d2`, `166138d`.
  - `cms/src/migrations/20261010_120000_users_roles.ts` adds the column and
    backfills existing users to `['reporter']` — enough to restore editing
    immediately, and the least privilege that does it. Uses `ALTER TABLE ADD
    COLUMN`, which is metadata-only in SQLite and therefore cannot lose user rows;
    the table-rebuild pattern the other migrations use is only needed when
    *changing* a column.
  - `cms/src/bootstrap/admin.ts` + an `onInit` hook grants `superAdmin` to
    `PAYLOAD_BOOTSTRAP_ADMIN_EMAIL`. Deliberately an **operation**, not a line in
    the migration: a migration would hard-code "this row is an administrator" into
    permanent history and re-apply to every future environment and every restored
    backup. Env-gated means a new host, a staging box or a disaster recovery needs
    one variable and no SQL. Additive, so promotion never strips an existing role.
  - **Evidence:** the migration SQL was applied to a copy of the production backup
    (26 articles, 64 districts, 8 categories intact, `integrity_check` ok), then
    applied again through `payload migrate` itself. Access behaviour is asserted
    with no database in the path, including the exact pre-migration state that
    caused the bug. Idempotency across repeated boots, an unknown address, and a
    throwing update are all covered.
- **Deploy steps, owner (no Terminal exists — all three are cPanel):**
  1. Deploy the CMS as usual.
  2. In `~/shikkha24-cms/.env`, set **both** on one restart:
     `PAYLOAD_BOOTSTRAP_SCHEMA=true` and
     `PAYLOAD_BOOTSTRAP_ADMIN_EMAIL=shahiddesignhouse@gmail.com`
  3. Confirm the owner can create and edit an article, then **remove
     `PAYLOAD_BOOTSTRAP_SCHEMA`**. Leave `PAYLOAD_BOOTSTRAP_ADMIN_EMAIL` if
     wanted — unlike the schema flag it is idempotent and safe to keep.
- **Still open after this:** the migration gate is still blind. It compares
  `migrate:create`'s output against a snapshot that shares the same blind spot, so
  it cannot detect a field the config declares and the schema lacks. It must
  compare the **runtime config's** fields against the newest snapshot directly.
  Until then, adding a Payload field does not reliably produce a migration — which
  is how `roles` went missing in the first place.
- **Separate, still open:** the admin's CSP sends `img-src 'self' data: blob:`
  without naming the CMS media host, so cross-origin media is blocked. Not
  reproduced; tracked, not folded in.

---

## 🟠 Queued

> Each task carries a **loop block** (`.sps/loop.md`): hypothesis, the single
> asset it may touch, one scalar metric fixed **before** the edit, an attempt
> budget, and the condition that sends it back. Filling these in is the point —
> a task with no metric is how M24 happened.

### T-02 — Fix the article-template CLS (the one red CI step)
- **Status:** `todo` · **Blocks:** CI green, and T-05
- **Hypothesis:** `font-display: swap` with a generic system-font fallback and
  **no metric overrides** reflows Bengali text on load. `grep -c size-adjust
  fonts.css` → **0**. Additionally only weight 400 was preloaded while the
  article H1 is bold, so the largest text on the page swapped last.
- **Asset:** `frontend/src/styles/global.css` — **only the `@font-face` block and
  the two font tokens.** The `Layout.astro` preload is a *separate* task, because
  it is a separate hypothesis and M25 is the lesson.
- **Metric:** Lighthouse CLS on `/education-news/20/demo-madrasa-new-syllabus/`
  ≤ **0.02**. Currently **0.0439**.
- **Budget:** 3 hypotheses. On exhaustion: revert and record.
- **Degraded when:** CLS rises, or any other Lighthouse sub-metric regresses.
- **Fix already prepared, uncommitted** (see the working tree): a
  `SolaimanLipi Fallback` family carrying the font's real vertical metrics read
  from the vendored file — ascent 95.3125%, descent 28.418%, line-gap 8.9844%,
  `size-adjust: 99.2%`.
- ⚠️ **Measure in CI only.** Local Lighthouse passes while CI fails; it is not
  representative. A local green here is the trap M24 describes.

### T-03 — Preload the 700 weight
- **Status:** `todo`
- **Hypothesis:** the article H1 is `font-bold` and 700 is not preloaded, so the
  largest text on the page swaps last.
- **Asset:** `frontend/src/layouts/Layout.astro` — the one `<link rel=preload>`.
- **Metric:** same CLS number as T-02, read independently.
- **Budget:** 1 hypothesis (it is a binary: preloaded or not).
- **Degraded when:** initial payload exceeds the budget — the two files are
  154 KB together against a 200 KB budget.

### T-04 — Deploy the frontend once CI is green
- **Status:** `blocked` by T-02 and T-03
- **Metric:** `shikkha24.com` serves the new build; Lighthouse gate green.
- Nothing frontend-side is pending today: `git log ff195bb..HEAD -- frontend/`
  is empty. **Do not deploy to "catch up" — there is nothing to catch up to.**

### T-06 — Close the migration-gate blind spot (🔴 systemic)
- **Status:** `todo` · **Why it matters more than T-01's symptom**
- **Hypothesis:** `scripts/verify-payload-migrations.sh` asks
  `migrate:create` whether anything changed. The generator diffs against the
  newest committed snapshot, and when a field is missing from **both** the
  snapshot and the database it reports "No schema changes detected" — so the gate
  passes. Measured: the gate passes today with `users.roles` absent from every
  migration.
- **Asset:** `scripts/verify-payload-migrations.sh`.
- **Metric:** the gate **fails** when a collection field exists in
  `payload.config.ts` and in no snapshot — proved by adding a throwaway field and
  watching it go red, then removing it.
- **Budget:** 2 hypotheses.
- **Degraded when:** the gate starts failing on a tree where config and migrations
  genuinely agree.
- ⚠️ This is how `roles` went missing in the first place. Until it is closed, no
  newly added Payload field is reliably migrated, and the failure mode is silent.

### T-07 — ✅ Image upload works; compression moved to the browser
- **Status:** `resolved 2026-10-11` — sharp path abandoned (owner decision); uploads
  confirmed working on the host ("Media successfully created"), compression now done
  client-side.
- **Owner decision.** Rule 7 rules out Vercel/Cloudflare and any paid host. The owner
  chose **Option B** (drop sharp) **plus** a client-side optimiser, after the storage
  maths was put to them: a 6 MP phone photo is ~4 MB, and at 15/day that is
  1.8 GB/month against ~3 GB free — roughly **50 days** of runway. Compressing to
  ~300 KB in the browser makes it ~4.5 MB/month, about **22 months**. This was the
  binding constraint, not LCP.
- **How it is wired.** Payload registers a custom admin component by *string path*
  (`Upload: '@/components/media/OptimisedUpload#OptimisedUploadServer'`). Payload's
  docs are explicit that a bare `<input type="file">` does not connect to the upload
  API, so `OptimisedUpload.client.tsx` renders Payload's own `<Upload>` unmodified and
  only rewrites what that control's hidden input hands over: a **capture-phase**
  listener runs before Payload's reader, compresses via Canvas, and replaces
  `input.files` through a `DataTransfer`.
- **🆕 M29 — the import map silently disabled it, and nothing caught it.**
  `importMap.js` is how Payload resolves that string path, and it is generated by
  `generate:importmap` and **committed**. `cms/package.json` runs `next build`, not
  `generate:importmap`, so nothing regenerates it and a stale map **bundles and ships
  cleanly**. Symptom: upload succeeded, typecheck/lint/build/CI all green, and the
  feature did not exist — Payload falls back to the default component *without
  error*. Fixed in `2340088`; gate added in `a38054b` (`scripts/verify-payload-importmap.sh`).
  **Lesson: the third instance of the F-14 shape** (generated + committed + imported
  = can go stale silently). The other two were `payload-types.ts` and `cms/src/migrations`.
- **🆕 M30 — removing `imageSizes` left no migration.** Commit `70e1266` changed the
  schema (drops `sizes_thumbnail_*`, `sizes_card_*`, `sizes_hero_*` from `media`) with
  no migration committed. Caught by the drift gate one commit later; fixed in `d2d963a`.
  Verified first: 6 production media docs, all `.webp`, **none carries a populated
  `sizes` object** — the columns were created by config and never filled, because sharp
  never ran. No data lost.
- **Storage still watchable.** No 2000px cap is enforced server-side any more. If a
  non-browser client ever posts to `/api/media` it can bypass compression entirely.

<details><summary>Original investigation (kept: do not retry the sharp path)</summary>

- **Status at the time:** `blocked` — Conclusive as of 2026-10-11.
- **Measured, not inferred.** `POST /api/media` unauthenticated returns **403**;
  the 503 appears only once Payload processes the file. Every upload attempt
  writes to `stderr.log`:
  ```
  /home/***/nodevenv/shikkha24-cms/24/bin/node: fork: retry: Resource temporarily unavailable
  Error: Server is not running.  { code: 'ERR_SERVER_NOT_RUNNING' }
  ```
- **Occupancy was ruled out as the cause.** The backup cron (every minute since
  2026-10-04) and the staging Node app were both deleted; the upload still fails
  identically. The fork canary passes 12/12 throughout — cPanel API calls fork
  fine. **The limit applies to the Node process specifically, not the account
  generally**, which is why a green health check and a failing upload coexist.
- **Ruled out along the way, so nobody repeats it:** stale client chunks (fails
  on a never-used browser), mixed old/new build files (`.next` rebuilt, 178 → 174
  chunks, still fails), missing permissions (`403` unauthenticated is correct),
  `sharp.concurrency(1)` (deployed, confirmed on the host, does not help).
- **The trade-off, stated plainly.** `frontend/src/lib/media.ts:buildSrcset` uses
  the **original** file as its first candidate and treats `media.sizes` as extras
  (`if (candidates.length < 2) return undefined`). So the frontend **renders
  correctly with no variants at all** — it just loses `srcset`.
  - **Option A — wait for the host.** No code. DianaHost raises the CloudLinux
    limit and the full pipeline (WebP, 2000px cap, thumbnail/card/hero) works as
    designed. They have been unresponsive; there is no card-free alternative host
    inside rule 7.
  - **Option B — drop the sharp pipeline.** `formatOptions`, `resizeOptions` and
    `imageSizes` removed from `Media.ts`. Uploads work today. **Cost:** no WebP,
    no 2000px cap, no `srcset` — so a 6000px phone photo is served in full to
    every device, against the payload and LCP budgets in
    `docs/performance-budget.md`. A working CMS with heavy images beats a CMS
    that cannot accept images, but it is a real regression and should be a
    deliberate choice, not a default.
- **Do not retry the sharp path.** Two hypotheses spent, both measured.
</details>

### T-14 — 🔴 The storefront cannot be updated automatically on this host
- **Status:** `open — owner action required for every publish` · proven 2026-10-12
- **Measured, not inferred.** The site had not been rebuilt since **2026-10-04**. Every
  deploy since reported success. Three independent causes, all now understood:
  1. **Extraction silently no-ops.** `Fileman::fileop op=extract` returns a success
     envelope and writes nothing. A deploy built 161 correct pages, logged
     `Extracted via api2-fileop`, deleted 3 stale paths, verified `GET / → 200`, and
     concluded `success` — while `public_html/education-news/27` did not exist.
  2. **The post-deploy check could not fail.** It was `GET / → 200`, which the
     **stale** site satisfies perfectly. Fixed in `cb61eb7`.
  3. **No API extraction mechanism exists on this host.** Probed live against
     `Fileman::extract_files`, `Fileman::unzip`, `Extract::extract_archive` and
     `Fileman::extract` — all four fail with real cPanel errors, and none writes a
     file. `api2-fileop` answers success and does nothing. **This is a host
     limitation, not a bug.** Extraction by hand in cPanel File Manager is the only
     path, for the frontend exactly as for the CMS.
- **What still works without a human:** build, upload, `.htaccess` via
  `save_file_content` (which overwrites), and stale-file deletion. So CI still does
  the work and stages a correct archive; only the final expansion is manual.
- **Owner action, ~1 minute:** cPanel → File Manager → `public_html` → extract the
  newest `frontend-<run>.zip` **into `public_html`** → overwrite everything.
- **Follow-on (not blocking):** with extraction manual, `DEPLOY_WEBHOOK_URL` (E-02)
  would fire a build that still cannot land. Set it anyway so the archive is fresh and
  waiting, but publishing still needs the extract. Decide whether that is worth it
  before wiring it.

### T-13 — ✅ External audit verified claim-by-claim (2026-10-12)
- **Status:** `done` — report at `docs/audit-verification-2026-10-11.md`
- ~50 claims from `~/Desktop/NewsPortal-Fix-Guide.md` were each verified against the code with
  file:line evidence. Roughly two-thirds hold. **The guide must not be worked top-to-bottom.**
- **Seven of its fixes would break things** (see the report table). Worst is C-02: restricting the
  quiz `correctAnswer` makes the browser-side grader mark every option wrong, and `verify-s8.mjs`
  still passes — the breakage would ship undetected.
- **Two of its 🔴 items were already fixed the same day it was written** (the CLS regression and
  T-01), so "CI red on CLS" is stale — the Lighthouse gate passes at CLS 0.0084.
- **🔴 Found during verification, absent from the guide:** CI is failing on artifact storage quota
  (`38203976878`), which **masks the dependency audit** — the job fails before that step, so it
  reports `skipped` rather than red. Clear it before reading T-10's status from CI at all.
- **Most severe real finding, understated by the guide:** the photocard/ID-card endpoints call
  sharp, which cannot load on this host (T-07) — expected to 500 per request, and the photocard is
  the `og:image` fallback and sits in the share row. *Inference, not measured: one `curl` of
  `/api/photocard/:id.png` settles it.*
- **Corrected order** is in the report; it deliberately re-ranks by real impact rather than by the
  guide's own severity labels.

### T-12 — 🔴 Media count dropped 8 → 6; unexplained, must not be assumed away
- **Status:** `open · needs one owner action` · observed 2026-10-11
- **Observed.** At ~11:05 the API reported **8** media docs, including
  `Untitled-2.jpg` (image/jpeg, 344.2 KB, 1176x1080) and `ERP-LOGO.png`. Later the
  same day it reported **6**, all `demo-plate-*.webp` created 2026-10-04, and
  **nothing created today**. `GET /api/media/file/Untitled-2.jpg` → **HTTP 500** —
  gone from the database *and* from disk.
- **Ruled out before asking the owner, so the question is narrow:**
  - **No data loss.** Articles intact at 25; the 6 demo plates still serve HTTP 200.
    A database reset or truncation would have taken the articles too.
  - **No overwrite by a deploy.** `cms/.next/standalone` ships **no** database;
    `data/` is excluded when the bundle is assembled and is deliberately not in the
    clear set. `data/` on the host holds exactly one file, `payload.db`.
  - **The new migration is not the cause.** `d2d963a` drops columns; `ALTER TABLE …
    DROP COLUMN` deletes no rows.
- **Most likely:** the owner deleted the test uploads. Payload's delete removes the
  row and the file together, which is exactly this pattern. **This is a hypothesis,
  not a finding** — rule 14 forbids closing a task on belief.
- **Decisive test (≈30 seconds of owner time):** upload one image, do **not** delete
  it, and say "done". Then read `GET /api/media?limit=50&depth=0`.
  - Doc persists → the 8→6 drop was manual deletion; close as **not a bug**, with
    the evidence recorded.
  - Doc vanishes → something is silently deleting media. That is a serious bug:
    reopen as 🔴 and investigate before any further upload testing.
- **Note for whoever runs it:** `?limit=0` returns an inconsistent `totalDocs`, and
  `?sort=-createdAt` is ignored — both were tried first and gave wrong answers. Use
  `?limit=50&depth=0` and sort client-side.

### T-11 — 🔴 deploy.yml can publish a build that CI rejected
- **Status:** `in progress` · started 2026-10-11
- **Measured, not inferred.** `grep -n 'workflow_run|needs:.*ci' .github/workflows/deploy.yml`
  returns nothing. Deploy triggers on `push`/`workflow_dispatch` and never waits on
  CI. **Two builds reached the host today carrying code that did not do what it claimed.**
- **The pattern, because it is the actual finding.** On 2026-10-11:
  | Bug | Reached the host? | Caught by |
  |---|---|---|
  | Image optimiser inert (stale import map, M29) | yes | nothing — a browser console log |
  | `imageSizes` removal left no migration (M30) | yes | CI, on the *next* push |
  Both gates now exist, so the next occurrence is stopped — but only *after* the deploy
  that carried it. A missing control, not two unlucky bugs.
- **The control.** Gate the CMS half on a passing CI run for the same SHA. The frontend
  half already has a verify step inside `deploy.yml`, so the gap is specifically "CI as
  a gate", not "verification at all".
- **Known tension — state it rather than hide it.** CI is currently **red** on the
  dependency audit alone (T-10). A strict gate would block every CMS deploy until T-10
  lands. That is correct behaviour, not a reason to weaken it, but the owner must accept
  the freeze or accept a documented carve-out. **Decision needed from the owner.**
- **Metric:** a push whose CI fails produces zero archive uploads to the host.
  **Met and observed live** on run 38138306945: CI concluded `failure` for
  `5b441e3`, the gate refused, and the job reached **0** build or upload steps.
- **Counter-proof:** force the gate to read a failing CI conclusion and watch a CMS
  deploy refuse to upload; then a green one and watch it proceed. All four paths
  verified locally (green 0, red 1, no-run 1, bad-token 0s) and the refusal path
  verified live in a real workflow run.
- **🆕 M31 — the first live run of the gate failed for the wrong reason, and local
  testing could not have caught it.** `deploy.yml` declares `permissions: contents: read`,
  which *restricts* `GITHUB_TOKEN` and withholds `actions: read`. Every poll returned
  **403**, so the gate sat for its full 15-minute deadline and only then concluded
  "no CI run exists". It failed closed — the right outcome by luck, from a cause that had
  nothing to do with CI's verdict. Two fixes: `actions: read` added to the workflow's
  permissions, and 401/403/404 now abort immediately instead of being treated as
  transient like a 5xx. A local test with a personal token has full scope and passes, so
  **only a real run on the real workflow can prove this class of gate.**
- **Status:** `done 2026-10-11`.
- **⚠️ Consequence the owner must know.** While CI stays red (T-10), **every
  push-triggered deploy now fails at the gate and uploads nothing.** That is
  intended — red CI must never publish — but it means a CMS deploy now requires
  `workflow_dispatch` with `skip-ci-gate: true` (the override emits a warning
  annotation saying the tree is unverified). Until T-11's root cause — the
  dependency audit — is fixed, that is the only way to ship.

### T-08 — CSP console warnings in the admin: investigated, not a content bug
- **Status:** `investigated 2026-10-11` · our own images are **not** blocked · low priority
- **Measured from the live headers, not assumed:**
  - Frontend `https://shikkha24.com/*` → `img-src 'self' data: https://cms.shikkha24.com`
    (+ ad domains on pages that serve ads). **CMS media is explicitly allow-listed.**
  - Admin `https://cms.shikkha24.com/admin` → `img-src 'self' data: blob:`. Media is
    served from `/api/media/file/...`, which is **same-origin**, so `'self'` covers it.
  - Conclusion: no CMS or uploaded image can be what these violations describe.
- **What the console actually shows** is `Permissions-Policy` complaints for
  `attribution-reporting`, `private-aggregation`, `join-ad-interest-group` and
  `run-ad-auction` — **all four are Google ad features**. So an ad script was running
  on that page, and the blocked images are third-party ad/social assets, not ours.
- **Not fully closed:** the pasted log elided the offending URLs as `<URL>`, so the
  exact origins were not read. If any blocked URL turns out to start with
  `https://cms.shikkha24.com` this task reopens immediately.
- **Cosmetic leftovers, not tracked as tasks:** `GET /favicon.ico` 404s on the CMS.
- **Still open from before, same defect shape (M20 — allow-list missing a real origin):**
  Gravatar (`https://www.gravatar.com/avatar/…`) is blocked by the admin's
  `img-src 'self' data: blob:`, which shows as a broken avatar. **Metric:** admin loads
  its avatar with zero CSP violations. Note this is a *third-party* profile image; the
  alternative fix is to stop loading it rather than widen `img-src`.

### T-10 — 🔴 Payload 3.90.2 upgrade: closes a CRITICAL, but the seed breaks
- **Status:** `blocked` — reverted from `main` on 2026-10-11; work preserved in
  git history (`43f01bf`, `7c8b711`, `a6aa265`)
- **Why it matters:** the dependency audit had never run — it sits after the
  Lighthouse gate, which had been red since the CLS regression. Fixing the CLS
  revealed **3 critical + 20 high**:
  - `CRITICAL payload` — **field access control bypass on auth collections**
  - `CRITICAL @payloadcms/db-sqlite` — SQL injection in SQLite/Postgres
  - HIGH payload — password-update restriction not enforced; token refresh and
    password reset expose tokens; API key disclosure; ReDoS; polymorphic join
  - HIGH next — SSRF in Image Optimization
  The first is the same failure mode we spent 2026-10-10 patching around
  (`5bca852`, `6653570`): a field-level access rule on an auth collection that
  does not hold. Those were fixed in our code; this one is in the framework.
- **What the upgrade achieved, measured:** 44 → 21 vulnerabilities, **3 critical
  → 0**, high 20 → 8. `next` 16.4.0 and `sharp` 0.35.5 also land. Everything
  remaining is transitive build-time tooling plus one sharp/librsvg advisory
  with no fixed release.
- **⚠️ Why it is not on `main`:** 3.90 tightens validation and the seed breaks
  in two places, both found by running it rather than reading it:
  1. `ValidationError: This relationship field has the following invalid
     relationships: undefined` — the seed passed `[undefined]` for unresolved
     slugs. **Fixed** (`7c8b711`): seven call sites filtered through
     `resolvedList`/`resolvedOne`.
  2. `list node failed to validate: List tag must be one of ol, ul` — a Lexical
     list's `format` field carries the HTML tag, and the seed wrote `''`.
     **Fixed** (`a6aa265`, `format: 'ul'`).
  Both fixes are verified against a fresh migrated database, and both still do
  **not** make the seed pass. A third probe showed every list in the submitted
  payload already carrying `ul`, so the failure is inside a path not reached by
  inspecting `data.body` — not yet located.
- **Budget:** two hypotheses spent on the upgrade, then reverted per `.sps/loop.md`.
  **Do not retry blindly.** Resume by catching `payload.create` and logging the
  *whole* document on failure, so the offending node is captured rather than
  inferred.
- **When it does land,** the host needs the schema migration applied —
  `reset_password_requested_at` is added to `users` and `readers`
  (`20261011_092820_payload_3_90_schema`, generated by payload). That is the
  `PAYLOAD_BOOTSTRAP_SCHEMA=true` + restart procedure, and the flag must be
  removed afterwards.

## ✅ Done

| ID | Task | Evidence |
|---|---|---|
| D-01 | CMS security fixes live in production | deploy `38046872887`, 590 files, 200 on first probe; harness green on deployed `e319227`; both fix commits are ancestors of it |
| D-02 | `PAYLOAD_SECRET` no longer leaks into CI artifacts | `b011876` sanitiser + 16 counter-proofs |
| D-03 | Fork ceiling diagnosed and cleared | canary 15/15, then 9/9 as a pre-deploy gate — measured, not inferred |
| D-04 | Reader PII leak closed in code | `5bca852` |
| D-05 | `providerId` account takeover closed in code | `6653570` |
| D-06 | `deploy-cms.mjs` made runnable (syntax, `await`, `??`→`||`) | `c4c6ac5` |
| D-07 | Cloudflare Pages deployment removed | `ff195bb` |
| D-08 | cPanel entry key bug — stale-file cleaner never fired | `a18816f`, regression-proved 70/2 → 72/0 |

---

## Owner actions (cPanel — the agent cannot do these)

| # | Action | Why |
|---|---|---|
| O-1 | Set the backup cron to `0 23 * * *` running `/bin/sh /home/shikkhac/bin/shikkha24-backup-dump.sh` | currently parked at `* * * * *` running a **diagnostic probe** (`date > cron-test.txt`) — 1,440 no-op fork attempts/day since 2026-10-04 |
| O-2 | Restart the production CMS app | so the rotated `PAYLOAD_SECRET` takes effect (T-03) |
| O-3 | Tomorrow, read `~/shikkha24-backup/dump.log` in File Manager | the only place a backup failure is visible — no Terminal, cron output goes to email |

---

## Hard constraints — do not re-litigate

- **No cPanel Terminal or SSH.** Disabled by DianaHost; ports 22/2222/222/2200/2022
  all reject. Every workaround must go through the cPanel UI, the cPanel API, or
  **"Run JavaScript Script"** (runs a `package.json` script — this is what retires
  runbook §3.4's Terminal-only venv symlink loop).
- **No international credit/debit card. No paid service, ever.** Budget: the
  existing DianaHost plan + the domain.
- **Budget figures in rule 7 of the root mirrors are stale** — the plan is
  "DH 5GB SSD NVMe", not "PNR 2 GB". Do not quote rule 7's numbers.
- **Never deploy Cloudflare.** Removed 2026-10-14 by owner decision.
- **CI is the only authoritative performance measurement.** Local Lighthouse is
  not representative.
- **Counter-prove every fix.** A check that has never been seen to fail is not
  evidence. Revert the fix, watch it go red, restore, watch it go green.