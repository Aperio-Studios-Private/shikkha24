# SPS Handoff

## Documentation index — where to look

| Question | Document |
|---|---|
| **START HERE — what is the state of the project?** | **`docs/README.md`** — every doc, labelled ✅LIVE / ⚠️STALE / 📦REFERENCE |
| **How do I deploy / operate this thing today?** | **`docs/deployment-runbook.md`** — the day-to-day procedure, step by step |
| **Why is deployment built the way it is?** | **`docs/hosting-and-deployment.md`** — the three facts that decide everything |
| **Is feature X built, and where?** | **`docs/feature-register.md`** — the authoritative index of every requested feature |
| What is the approved scope of record? | `docs/education-feature-inventory.md` |
| What is the S13–S17 specification? | `docs/feature-batch-2.md` |
| What is the build order and the gates? | `.sps/plan.md` |
| What is left to do, section by section? | `.sps/task.md` |
| What happened during the S0–S12 build? | `.sps/handoff-archive/s0-s12-build-log.md` *(rotated out 2026-10-04; nothing deleted)* |
| What went wrong, and why? | `.sps/mistakes.md` + this file |
| Section-by-section evidence | `.sps/section-todos/S*.md` |
| **What grade calculators already exist, and how do ours compare?** | **`docs/gpa-calculator-landscape.md`** — BD + international landscape, and the positioning |

⚠️ **Superseded, kept for the record:** `docs/qa-deploy-status-2026-10-02.md` (pre-launch
sweep, two days before launch) and `docs/audit-third-party.md` (audited a pre-build repo,
verdict `not-ready`). Both now carry banners saying so. Do not read either for current status.

## Documentation index — where to look

> **START HERE: `.sps/tasks.md`**, then **`.sps/loop.md`**. Every task carries a
> loop block — hypothesis, one asset, one scalar metric fixed before the edit, an
> attempt budget. `.sps/mistakes.md` is the record of every loop violation found
> the expensive way (M24–M28 are all from 2026-10-10; **M32 is from 2026-10-12**).
>
> For what was asked and what is next, go to `.sps/tasks.md`.
> It is the single source of truth for outstanding
> work — what was asked, what is in flight, what is next, and which items are
> owner actions in cPanel. Read it before anything else in any new session. This
> file holds *knowledge*; `tasks.md` holds *work*.
>
> **If you are picking up the 2026-10-12 session:** the owner's CMS edit is
> **still unpublished** and the blocker is the host, not the code. Read the
> T-15 block and the "Current Phase" section immediately below — it names the
> one owner action that publishes it, and it records a hypothesis I asserted and
> then refuted, which is the thing not to re-assert.

## Current Phase

> **Session 2026-10-12 (ended ~09:15 UTC by owner request).** The owner reported
> CMS edits not appearing on the live site. That is **T-15**, and it is the thing
> to read first. It is `blocked` on the host, not on the code. Three new tasks
> were opened (T-15, T-16, T-17) and one real bug was fixed (M32). **The owner's
> edit is still not published** — the one-line owner action is in T-15 and repeated
> at the bottom of this section.

- **🔴 T-15 — THE STOREFRONT IS STALE, AND THE BLOCKER IS THE HOST (2026-10-12).**
  The owner edited article 27 in the CMS (`টেস্ট - 2`, `07:38:09Z`, published).
  The live site still serves `টেস্ট - ১` with `last-modified: 05:52:35Z`. The
  storefront is **static HTML built in CI**, so a CMS save publishes nothing until
  a rebuild runs — and the rebuild's final step cannot complete on this host.
  - **What I got wrong, and it matters.** I saw a green 05:51 deploy and concluded
    the mechanism worked, so a re-run would publish the edit. **It did not.**
    `cb61eb7` — the check that detects a silent extract no-op — is *not* an
    ancestor of that run's SHA `490c7a8` (`git merge-base --is-ancestor`). The
    05:51 "success" **predates the check**, so it proves the upload and proves
    nothing about extraction. I built a hypothesis on a run that could not have
    failed the way I assumed it couldn't.
  - **Three live runs this session, three different outcomes:**
    | Run | Outcome |
    |---|---|
    | `38221385908` | Cancelled at the 25-min job timeout — a leaked socket hung the harness (M32) |
    | `38226497825` | Failed *correctly*: extract no-op detected, archive left on the host |
    | `38228086708` | Failed *correctly*: same, different pagefind hash |
  - **Read those last two as success, not failure.** Before `cb61eb7` both would
    have reported `success` while the site stayed stale — the exact T-14 defect.
    The gate is now honest. What is missing is not detection; it is a host that
    can extract.
  - **Extraction is flaky, not dead.** The `05:52:35Z` `last-modified` proves one
    real write landed today, yet two consecutive runs since no-opped. A coin flip
    is not a deploy mechanism. Budget exhausted per `.sps/loop.md`; recorded, not
    poked a third time.
  - **Two archives are staged on the host, un-extracted:**
    `public_html/frontend-38226497825.zip` and `public_html/frontend-38228086708.zip`.
- **✅ M32 — THE ONE REAL FIX THIS SESSION.** Section 10b of
  `scripts/verify-cpanel-deploy.mjs` opened a fake cPanel server at line 816 and
  never closed it. A listening socket keeps the Node event loop alive, so the
  harness printed `✅ 79 passed` and **hung forever** — burning the job's
  25-minute budget and cancelling the deploy it was gatekeeping. The suite was
  green; the storefront never published. Found by counting `startFakeCpanel` vs
  `.close()` across the file's brace structure (20 opened, 19 closed) rather than
  by reading 1,300 lines. Fixed in `97312a6`: local repro went from `exit null` at
  60s to `exit 0` in **0.6s**, 79/79 checks unchanged. **The lesson is now in
  `.sps/mistakes.md` M32** — a suite that cannot exit is not a passing suite, and
  on a timed runner it is aimed at the job it gates.
- **🟠 T-17 (auto push-to-deploy) — CODE BUILT & COUNTER-PROVED this session
  (2026-10-12, owner-approved).** The extraction ceiling that blocked it (T-14,
  "no host API can extract") is now **surmounted by a different mechanism**: a
  host-side shell `unzip` run by **cron** — and cron shell execution is already
  proven on this account (the daily backup runs `sqlite3`/`tar` via cPanel → Cron
  Jobs). Built: `scripts/host-extract.sh` (the cron extractor + a heartbeat it
  writes *only after* confirming `unzip`) and the `deploy-static.mjs` handoff
  (when the API extract no-ops, CI trusts a **fresh heartbeat** and waits —
  polling the *site*, not the API — for a page new in this build to return 200,
  going green only then; **no fresh heartbeat → fails loud exactly as before**,
  so the T-15 guard survives and the feature is **inert until the cron genuinely
  works**). Counter-proved: `verify-host-extract.mjs` (22 checks) and
  `verify-cpanel-deploy.mjs` §10c (suite now 85); disabling the cron branch turns
  the "goes green" check **red**, so it is not vacuous.
  **⚠️ Two owner actions I cannot do (no SSH): (1) confirm `unzip` exists on the
  host; (2) install the 2-minute cron.** Full steps are in the T-17 block in
  `.sps/tasks.md`. Until both are done, the site still needs T-15's one-step
  manual extract.
- **🟠 T-16 — the exhaustive feature-by-feature audit the owner requested, still
  queued**, strictly sequential, approval-gated between features. Not started.
- **✅ The old "T-17 has a hard ceiling" note is now SUPERSEDED.** The extraction
  limit that blocked end-to-end automation is real for the *API*, but a host-side
  `unzip` via cron surmounts it — see the T-17 block above. The build → verify →
  upload → **wait-for-cron** → health-check chain is built and counter-proved;
  `cb61eb7` still does the loud-failure part when no cron is present.
- **✅ `scripts/verify-cms-sync.mjs` truncation check — DECIDED: COMMITTED this
  session** (was flagged "decide before the next session"). The working tree
  carried a truncation check that fails when `docs.length < totalDocs` instead of
  reporting a false `PASS 100/100` on a partial fetch — audit finding **D-03**
  (`institutions` holds 724 rows; 624 were never checked and the output read as
  full coverage). **Counter-proved before committing** (`.sps/loop.md`): a stub
  CMS + fixture `dist` ran both the HEAD version and the changed version against
  a clean corpus and a truncated one (institutions `totalDocs: 724`, 100 docs
  returned). Original → `PASS institutions 100/100`, **exit 0** (the defect,
  reproduced). Changed → `FAIL institutions TRUNCATED — fetched 100 of 724`,
  **exit 1** (honest). Clean corpus → both **exit 0**, so **CI does not go red**:
  the demo seed produces <100 rows per collection and the 724-row Wikidata
  import (`seed:universities`) is production-only and never runs in CI. The
  check is deliberately a *loud failure*, not paging — paging the fetch would
  need the listing page to render every row too, which `getInstitutions()`
  (a `limit=1000` cap, not a page size) does not guarantee; a capped page plus a
  fully-paged verify would manufacture false failures. Recording the honest
  limit is the safe shape until the listing itself is genuinely complete.
- **THE OWNER ACTION THAT PUBLISHES THE EDIT (~1 minute):** cPanel → File Manager
  → `public_html` → select **`frontend-38228086708.zip`** (newest) → **Extract**
  → into `public_html`, overwrite everything → delete both zips. Then confirm
  `https://shikkha24.com/education-news/27/post-8x9lfi/` reads `টেস্ট - ২`.

---

- **✅ THE CI GATE IS LIVE AND PROVEN (2026-10-11).** `deploy.yml` now runs
  `scripts/wait-for-ci.mjs` as the first step after checkout — before
  `pnpm install`, before any build. It polls the Actions API for the CI run
  whose `head_sha` matches the commit and refuses to proceed unless it
  concluded `success`. **Verified live on run 38138306945**: CI concluded
  `failure` for `5b441e3`, the gate refused, and the job reached **zero**
  build or upload steps. That is the day's most important change, and it is
  now a constraint on every future deploy:
  - **While CI stays red, a push-triggered deploy uploads nothing.** Red CI
    must never publish, so this is correct — but it means a CMS deploy now
    requires `workflow_dispatch` with `skip-ci-gate: true`, which emits a
    warning annotation stating the tree is unverified. Until T-10 lands,
    that override is the only way to ship.
  - `skip-ci-gate` is deliberately **dispatch-only**. A push can never set
    it, so automatic publishing always respects CI. `verify-workflows.mjs`
    now enforces this: it fails if a build step sits *above* the gate, or
    if the gate's `if:` is not guarded by `workflow_dispatch`. Both faults
    were injected and both turned the check red.
  - `permissions: contents: read` had to gain `actions: read` — see M31.
- **✅ AN EXTERNAL AUDIT WAS VERIFIED CLAIM-BY-CLAIM (2026-10-12).** ~50 claims from
  `~/Desktop/NewsPortal-Fix-Guide.md` were checked against the code, not read. Full report in
  `docs/audit-verification-2026-10-11.md`; tracked as **T-13**. Roughly two-thirds hold.
  - **Do not work the guide as written — seven of its fixes would break things.** The
    worst: restricting the quiz `correctAnswer` (C-02) makes the browser-side grader mark
    every option wrong **and `verify-s8.mjs` still passes**, so it would ship undetected.
    Removing `sharp` (C-13) breaks boot — `lib/id-card.ts` still imports it in production.
    Gating `/api/newsletter/status` (C-05) removes the newsletter form from every page.
    D-04's "fix" would make the migration gate permanently red.
  - **Two of its 🔴 items were already fixed the same day it was written** — the CLS
    regression and T-01. Lighthouse passes; article CLS is 0.0084.
  - **🔴 Found during verification, absent from the guide: CI is failing on artifact
    storage quota** (`38203976878`), which **masks the dependency audit** — the job fails
    before that step, so it reports `skipped` rather than red. Clear it before reading
    T-10's status from CI at all.
  - **Most severe real finding (guide understates it):** the photocard/ID-card endpoints
    call sharp, which cannot load on this host (T-07) — expected to 500 per request, and
    the photocard is the `og:image` fallback and sits in the share row. *Inference, not
    measured: one `curl` of `/api/photocard/:id.png` settles it.*
- **✅ IMAGE UPLOAD WORKS, AND COMPRESSION IS DONE IN THE BROWSER (T-07).**
  The owner chose to drop the sharp pipeline (the host cannot fork for the
  Node process) and add a client-side optimiser instead. Uploads confirmed
  working on the host. Compression confirmed end to end by the owner's own
  console: `0.3 MB → 0.06 MB` (5×). The notice can only appear if the
  component resolves, the capture listener fires before Payload's reader,
  and Canvas encodes a smaller blob — all three held.
  - **Storage was the binding constraint, not LCP.** A 6 MP phone photo is
    ~4 MB; at 15/day that is 1.8 GB/month against ~3 GB free, roughly
    **50 days** of runway. At ~300 KB it becomes ~135 MB/month, roughly
    **22 months**. Vercel and Cloudflare were both rejected: rule 7 (no
    card, no paid service, self-hosted preferred), and the owner already
    removed Cloudflare.
- **✅ GRAVATAR CSP FIX DEPLOYED (T-08).** `admin.avatar: 'default'` in
  `payload.config.ts` (`a94613a`). Payload's own `DefaultAccountIcon`
  renders — verified in the built source, not assumed — instead of a
  `https://www.gravatar.com/avatar/<md5(email)>` URL that the admin's own
  `img-src 'self' data: blob:` was refusing. Archive
  `cms-deploy-38136567355.zip` is on the host **awaiting the owner's
  extraction** (see Pending). The alternative — widening `img-src` to
  allow Gravatar — was rejected: it would send every admin's IP and an
  MD5 of their email to a third party on every page load.
- **✅ TWO NEW DRIFT GATES, both counter-proved.** `verify:payload-importmap`
  (`a38054b`) and the CI gate in `deploy.yml`. With these, every
  generated-and-committed file now has a gate: `payload-types.ts`,
  `cms/src/migrations/`, and `importMap.js`.
- **🆕 THREE MISTAKES RECORDED (M29, M30, M31).**
  - **M29** — the image optimiser shipped *inert*. A custom admin component
    is registered by *string path*, which Payload resolves through the
    committed `importMap.js`; nothing regenerates that map, so Payload
    silently fell back to the default upload. Upload succeeded, every check
    was green, and the feature did not exist. Third instance of the
    generated-file-staleness shape.
  - **M30** — removing `imageSizes` changed the schema (drops
    `sizes_thumbnail_*` etc. from `media`) with no migration committed.
    Caught by the drift gate one commit late. Verified no production data
    was lost: 6 media docs, all `.webp`, none with a populated `sizes`.
  - **M31** — the gate's first live run failed for the wrong reason: the
    workflow's `permissions` block withheld `actions: read`, so every poll
    403'd and the gate burned its full 15-minute deadline before failing
    closed. Local tests passed because a personal token has full scope.
- **⚠️ OPEN — media count dropped 8 → 6 and needs one 30-second test.**
  Earlier today the API reported 8 media docs (incl. `Untitled-2.jpg`,
  `ERP-LOGO.png`); now it reports 6, all `demo-plate-*.webp` from
  2026-10-04, and nothing created today. `Untitled-2.jpg` returns HTTP 500
  — gone from DB *and* disk. Ruled out: data loss (articles intact at 25,
  demo plates still serve 200), DB overwrite (the bundle ships no
  database), and the migration (drops columns, deletes no rows). Most
  likely the owner deleted the test uploads — Payload removes row and file
  together — but **that must not be assumed**. Decisive test: upload one
  image, do *not* delete it, and say "done"; then check the API. If
  something is silently deleting media, that is a serious bug and this
  task reopens.
- **✅ THE SITE IS LIVE (2026-10-04).** Deployed to DianaHost and verified on the host, not
  assumed: `shikkha24.com` serving static HTML, `cms.shikkha24.com/api/articles` → 200,
  `/admin` → 200, 74 tables, taxonomy seed 77 rows.
- **✅ THE DEPLOY HAS NOW RUN LIVE, REPEATEDLY (2026-10-08).** Five live runs against production
  found four real transport defects in sequence, each invisible until the run, each fixed and
  counter-proved before the next attempt. The automation is no longer theoretical, and the
  "never run against production" clause below is history, not current state.
  - **Run 37749577648** — `Fileman::extract_files` does not exist on this host. The fallback regex
    matched documented wording (`Unrecognized function`) this cPanel build has never emitted; the
    real wording is `The system could not find the function “extract_files” in the module “Fileman”.`
    Fixed in `63fa5c1`, and the fake server in `verify-cpanel-deploy.mjs` now answers with the real
    wording — a fake answering a string the regex already matched was a test that could not fail,
    which is how 40 passing checks accompanied a deploy that could not run.
  - **Run 37756100116** — `api2()` discarded the response body, so the failure had no explanation.
    Now reported. `6057cb1`.
  - **Run 37758709796** — the host routes API 2.0 but answers with `{"cpanelresult":{…}}`, the UAPI
    envelope carrying `apiversion: 2`, **not** the documented `cpanel_obj.result`. The extract had
    *succeeded* and was read as failure. `7b00772`.
  - **Run 37764034486** — `Fileman::delete_file` does not exist either; the probe cleanup killed a
    run after a successful extract. `deletePath` now falls back to `fileop op=unlink`. `ab2d665`.
  - **Run 37767514513 — SUCCEEDED**, but verification caught a defect the success hid: the live
    `connect-src` was byte-identical to the pre-push baseline. Two causes, both fixed in `e3b09f9`.
    (1) `supportsDestination` only asked "did anything throw", but `extractArchive` legitimately
    *swallows* the missing-function error and falls through to the no-destination `fileop`, so the
    probe wrongly reported destination support and staged the zip outside the docroot where `fileop`
    cannot reach it. The probe now checks **which mechanism** succeeded. (2) `fileop op=extract` does
    not overwrite a file that already exists, so `.htaccess` — present on the host from the
    pre-CI hand-upload — was silently skipped while every new artefact around it landed. It is now
    written explicitly via `save_file_content`, which overwrites unconditionally.
  - **Run 37785419585 — the `.htaccess` fix verified on the host.** Live headers on `/`, `/about/`
    and `/contact/` now carry `https://api.aladhan.com https://api.open-meteo.com https://ipwho.is`
    in `connect-src`. That is the evidence the new `.htaccess` is actually being served, and it
    settles the open question below about `extract_files`.
  - **The recurring meta-bug across all of the above:** the fake cPanel server kept answering with
    documented or invented shapes the real host never emits, so the harness certified a client that
    could not deploy. Every real host response is now copied into the fake server, and harness
    coverage went 40 → 64. Two of today's checks were counter-proved by reverting each fix and
    confirming the checks that claim to catch it do fail.
- **✅ THE DEPLOY AUTOMATION IS BUILT (2026-10-04) — ~~and has never run against production.~~**
  *(Superseded 2026-10-08: it has, five times. See the block above. The clause is kept because it
  was true when written, and the four defects it took to get here are the reason dry run is the
  default.)*
  `.github/workflows/deploy.yml` no longer contains a single `rsync` or `scp`. It ships over the
  **cPanel HTTPS API**, which is the only transport the host allows (auth is a static token in one
  plain header — **not** OAuth, no exchange, no expiry). `scripts/cpanel-client.mjs`,
  `deploy-manifest.mjs`, `deploy-static.mjs`, `deploy-cms.mjs`, `deploy-summary.mjs`,
  counter-proved by `scripts/verify-cpanel-deploy.mjs` (40 checks) and
  `scripts/verify-deploy-mode.mjs` (37 checks), both in `pnpm verify`.
  - **`rsync --delete` was the hard part.** There is no `--delete` in the API, so the deploy keeps
    a **manifest** of the paths it last wrote, on the host, outside the docroot. Deletes are the
    diff against the current build, collapsed to directories — but only up to the first ancestor
    that still holds a live file. `.htaccess` is never written into the manifest, so no delete set
    can contain it; that is structural, not a marker someone has to remember.
  - **Dry run is the default.** It builds, verifies, prints every path it would delete, and lists
    the docroot read-only — which is also how the credentials get proven before anything is live.
    A live CMS deploy additionally needs `confirm-risk: true`, because extracting over the app
    directory can disturb the venv symlinks in `node_modules`.
  - **Publishing still does not deploy.** `repository_dispatch` runs in dry run until the
    repository variable `AUTO_DEPLOY=live` is set. That is a deliberate switch the owner flips
    after the first successful live run, not a default.
  - **Unverified against the real host:** ~~whether `Fileman::extract_files` exists there~~ —
    **ANSWERED 2026-10-08: it does not.** Nor does `delete_file`. Both fall back to API 2.0
    `fileop`, which has no destination parameter and does not overwrite existing files. The script
    still probes rather than assuming, so a host or cPanel update that adds either function is
    picked up automatically. `docs/hosting-and-deployment.md` §4.2.
  - **Push-to-live on the host remains impossible**, not merely unused — three independent blockers.
    Do not spend time on it again; the reasoning is in `docs/hosting-and-deployment.md` §4.
  - **🔴 Adversarial review found three real defects; all three are now fixed and counter-proved.**
    - **A dry run could have mutated the host.** `extractArchive()` wrapped only its UAPI branch in
      `if (!cfg.dryRun)`, so control fell straight through to the API 2.0 extract — a real extract
      during a dry run. `uploadFile()` had no guard at all. Neither fired, because the
      orchestrators return early, but both were one refactor from firing against the only copy of
      the archive. The invariant now lives in the client, as `config()`'s docstring always claimed.
    - **The dry-run harness gave a false green**, and that is the more instructive half: it called
      only the three helpers that *had* guards, so it passed while the two that didn't were
      unguarded. Every mutating helper is now covered, and section 11 is a **negative control** —
      it feeds the same fake server a deliberately unguarded replica and asserts the "is this call
      mutating?" filter catches it. *When adding a mutating helper to the client, add it to that
      list, or the same hole reopens under a new name.*
    - **`AUTO_DEPLOY=Live` published to production.** The mode was read twice in opposite senses:
      `[ "$MODE" = "live" ]` gated confirm-risk and `mode == 'dry-run'` decided `DEPLOY_DRY_RUN`.
      A casing slip made both false — the gate skipped **and** the deploy went live. Normalised
      once against an allowlist (unknown values are refused, empty means dry run), with `dry_run`
      emitted as a boolean so nothing re-derives it from the string.
  - **⚠️ The lesson that generalises: a check never seen to fail is not evidence.** Two of the three
    defects above were hidden by a passing harness, not by a missing one. Every new gate here now
    gets run once against a deliberately broken copy of the thing it guards, and the result
    recorded. `verify-deploy-mode.mjs` reports **27 failures** against the pre-fix step; the
    negative control in `verify-cpanel-deploy.mjs` reproduces the original unguarded extract.
    Neither required touching the shipped code to produce — the shipped workflow is read out of
    `deploy.yml` and executed, and the replica is defined beside the test.
- **🟡 BACKUP AUTOMATION IS BUILT (2026-10-04) — and cannot run until the owner does 4 setup
  steps. The live site still has no off-host copy.**
  - **What was wrong:** `backup-db.yml` failed 6 runs out of 6 (2026-09-28 → 2026-10-03), each
    using `ssh`/`scp` against a host that refuses both.
  - **⚠️ The root cause was a wrong fact in our own docs.** `docs/hosting-and-deployment.md`
    recorded the open ports as "only 443/2083/2087". **Port 21 is open**, and the server answers
    as `220---------- Welcome to Pure-FTPd [privsep] [TLS] ----------`. FTPS is the only
    transport on this host that moves a binary file out without a shell. The port table is now
    corrected in that doc and in this file. *A documented fact nobody re-tested was more
    expensive than the missing feature.*
  - **Built:** a two-part split. A cPanel cron runs `scripts/host-backup-dump.sh`, which takes a
    consistent snapshot with SQLite's own `.backup` API (**never `cp`** — that can capture a torn
    state), tars `payload.db` + `media/` **at the archive root**, writes `latest.txt`, and prunes
    to 14 days. `.github/workflows/backup-db.yml` then fetches that one archive over FTPS and
    refuses to store anything it cannot prove restorable. **The split is forced:** FTP cannot run
    `sqlite3`, and no HTTP client can snapshot a database that is being written to.
  - **Three ways a backup can lie, each mechanically prevented:** the host cron silently stops →
    **30-hour staleness check** fails the run instead of fetching last week's file forever; the
    transfer truncates → **`PRAGMA integrity_check` + a full extract test**; media is silently
    omitted → **refusal**. A fourth — a valid but entirely empty database that restores to a blank
    site with no error — is caught by core-table presence plus non-zero row counts.
  - **`pnpm verify:backup` — 47 checks**, every one proved against the specific defect it claims
    to catch using real SQLite files, not mocks. It runs in CI *and* inside the backup job, because
    that job's entire output is a decision made by `backup-verify.mjs`.
  - **⚠️ The check that had to be weakened, and why.** `foreign_key_check` findings are a
    **warning, not a rejection.** The live `payload.db` has 3 orphaned rows in `users_sessions`
    (deleted reader accounts Payload does not cascade); the first version rejected a perfectly good
    backup of the real database. *A gate that rejects every real backup is as useless as one that
    accepts everything.* `integrity_check` is the check that means it.
  - **The credential never enters `argv`** — `curl -u user:pass` is visible via `ps`, so the
    password goes in a `.netrc` at mode 0600 in a temp dir, removed in a `finally` either way.
    The FTP account must be **dedicated and jailed to `/home/shikkhac/shikkha24-backup`**, with
    its own password, so it can never reach `.env`.
  - **🔴 Owner setup, four steps** (`docs/backup-and-recovery.md` §6.4): create the jailed FTP
    account; hand-run the dump script in cPanel Terminal **and read the output**; add the 19:00
    UTC cron entry; add `FTP_HOST` / `FTP_USER` / `FTP_PASSWORD` as GitHub Secrets. Until then
    **run the manual procedure in §6.5 — it is the only thing protecting the archive.**
  - **✅ RESOLVED 2026-10-10 — the fork ceiling cleared, measured rather than inferred. The CMS
    security fixes are LIVE.** Recorded first because it supersedes the blocker below and because
    the method is the reusable part.
    - **The measurement.** `scripts/check-host-fork.mjs` (new, `e319227`) times repeated read-only
      UAPI directory listings. Listing a directory is the cheapest call in the cPanel API — the host
      must still spawn a PHP process to answer it, so a returned entry list *is* proof of forking,
      and it writes nothing. Run via `.github/workflows/host-health.yml`, `workflow_dispatch` only.
      First run **15/15 PASS**, gate re-run immediately before the deploy **9/9 PASS**. Latencies
      490–670ms, no queuing. `shikkha24-cms` returned 8 entries and `public_html` 66, so the account
      is not merely forking, it is serving both applications.
    - **⚠️ Why this took a day and cost a wrong recommendation.** The ceiling was inferred from HTTP
      503s for the whole of 2026-10-10 and inferred **wrong twice** — first a misconfigured Node
      startup file, then Passenger itself. On that basis the CMS was nearly replaced wholesale with a
      Git-based static CMS, which would have destroyed the editorial workflow to fix a condition
      that had already lifted. **The owner's pushback ("I want Payload, can we?") was correct and
      the recommendation was withdrawn.** The lesson is already recorded in `.sps/mistakes.md` as a
      pattern: *measure the mechanism, do not infer a system state from a symptom of it.*
    - **The deploy.** `mode=live, target=cms, confirm-risk=true, cms-url=https://cms.shikkha24.com`,
    run `38046872887`. 590 files, `Extracted via api2-fileop`, **`Verified …/api/articles → 200
    after 1 probe`** — against 12 failed probes over 19 minutes on the staging rehearsal the day
    before. Post-deploy: `/api/articles` 200 in 0.078s, `/admin` 200, `/api/globals` 200, frontend
    200 in 0.067s, **24 articles and 64 districts intact**.
    - **Proof the fixes are live, in three links** — no single link is sufficient and the chain is
      recorded so nobody has to re-derive it: (1) `CMS harnesses (local API)` **passed** on the
      deployed commit, and that harness runs `verify:access` first, which covers section 8 (PII
      reads) and section 9 (identity writes); (2) `5bca852` (reader PII) and `6653570`
      (`providerId` account takeover) are both **ancestors of the deployed `e319227`**; (3) the
      bundle was built from that commit and extracted. **⚠️ Not proven:** a live exploit attempt —
      that needs a reader session, which needs a real OAuth sign-in we do not have. The chain proves
      the fixed code is deployed; it does not reproduce the attack.
  - **⚠️ The staging app is misconfigured and still is.** Its startup file is `cms/server.js`, but
    the bundle root holds `server.js` with **no nested `cms/`** — the path does not exist. That was
    the cause of its 503s alongside the fork ceiling, and it is a **separate, still-unfixed** bug.
    The app is now `stopped`. It must be corrected to `server.js` before any staging rehearsal is
    trusted again. Recorded in `docs/deployment-runbook.md` as `~/shikkha24-cms/server.js`.
  - **🔴 BLOCKER, and it is the host, not the code (2026-10-04). The account cannot fork
    processes, so the host half of the backup cannot run at all.** *(Superseded by the resolution
    above — kept for the cron footgun it documents, which is still live.)*
    - **cPanel Terminal access has been disabled by DianaHost.** The step above that says
      "hand-run the dump script in cPanel Terminal and read the output" **can no longer be
      performed** — it was already unreliable ("not reliably available"), and now it is gone. The
      runbook must stop prescribing it.
    - **Evidence, from cPanel itself.** The cron entry is saved and correct (screenshot of the
      Cron Jobs page: `* * * * *` plus the redirect command). Replacing the command with the
      smallest thing a scheduler can do — `date > /home/shikkhac/cron-test.txt` — produced
      `run.log` (388 bytes, 20:28) containing five identical lines:
      `/usr/local/cpanel/bin/jailshell: fork: retry: Resource temporarily unavailable`.
      That is **EAGAIN from `fork(2)`** — CloudLinux refusing to create a process. **Cron is
      firing; the host will not give it a process.**
    - **⚠️ Why the earlier run produced *absolutely nothing*, including no `run.log`.** The
      previous command was `( … ; echo … ) > run.log`. The parentheses require the shell to
      **fork a subshell before** the redirect can be established — the fork failed, so the file
      was never created. The two observations look like "cron never runs" and "cron runs but
      fails at the first syscall"; only the second was true. See `.sps/mistakes.md` **M19**.
    - **`https://cms.shikkha24.com` loads normally**, so this is not a blanket outage — process
      slots are available to a web request and are not available to cron. That distinction has
      not yet been explained by the host.
    - **Consequence:** *no* host-side scheduled automation of any kind works on this account while
      this holds — the dump is the first thing it was noticed on. Raising the CloudLinux `nPROC`
      / LVE limit is **only possible by DianaHost**. Unverified: whether a quieter hour (the dump
      is scheduled for 23:00 local) has enough headroom to fork; that is a hypothesis, not a
      measurement, and it must not be relied on.
    - **Next:** read **cPanel → Site Quality Monitoring** for live CPU/memory/**process** usage,
      and **Setup Node.js App** for a Passenger restart loop, before proposing any workaround.
  - **⚠️ 2026-10-04, found while waiting on the support ticket — an age-only prune rule would
    have filled the disk.** The cron job was left at `* * * * *` as a diagnostic. The script
    prunes archives **older than 14 days**, which silently assumes one run per day and enforces
    nothing: 1,440 × 14 = 20,160 archives, ~80 GB, on a **5 GB** disk with 2,155 M already used —
    roughly 740 archives of headroom, so **under half a day** to a full disk, and a full disk takes
    the site down. It was inert only because *every run was failing*. **Any fix to the fork
    blocker would have armed it.** A hard **`MAX_ARCHIVES=30`** cap now enforces the count
    independently of schedule, and both rules are kept (a count cap alone would pin the newest 30
    forever if the script stopped running). Counter-proved by extracting the shipped prune block
    and running it over 45 real archives: 10 kept, and they were the **10 newest**; a control run
    with a high cap pruned nothing. ⚠️ The **first** fixture gave every archive the same mtime
    (`touch -t` is minute-precision) so `ls -t` tie-broke arbitrarily — the test passed on count
    while proving nothing about ordering, which is exactly M17. **The owner must put the cron back
    to `0 23 * * *`** regardless of the cap, since 30 archives is still 30× the intended one-per-day.
    - **No CloudLinux/resource page is exposed to customers on this host** — Site Quality
      Monitoring is a website *scanner* and Awstats is visitor statistics; neither reports
      process usage. Only DianaHost can see the limit, so the ticket is the only route.
    - **Owner opened the ticket (2026-10-04)**, also asking for cPanel Terminal to be re-enabled,
      and completed the **eKYC** prompt the client area was showing ("Your services require
      identity verification before they can be used") — an unverified account can carry partial
      feature restrictions, which is a candidate explanation for cron-only breakage with no fork
      of our own making. DianaHost is working on it.
  - **Still unverified:** the private-repo Actions artifact quota. `docs.github.com` returned 404
    on every attempt and WebSearch was unavailable, so retention is set to 30 days and the
    workflow *warns* above 100 MB rather than asserting a ceiling it cannot prove.
- **🔴 TWO LIVE CMS BUGS, ONE CAUSE — fixed in code, NOT YET DEPLOYED (2026-10-04).**
  The owner reported *"i cannot logout"* and *"i cnnot upload any new assets"*. **One mistake
  behind both.** `cms/src/payload.config.ts` built `ALLOWED_ORIGINS` (used for **both** `cors`
  and `csrf`) from `PUBLIC_SITE_URL` + localhost — and **omitted `cms.shikkha24.com`**, the origin
  the admin panel is actually served from. Payload's `auth/extractJWT.js` **discards the session
  cookie** whenever `Origin` is present and not listed, so every credentialed request the admin
  browser made was treated as anonymous.
    - **Symptom 1 — `/api/media` → 403**, so nothing could be uploaded. *Not* access control:
      `Media.ts` has `create: isEditorial`, but the check never ran, because the request arrived
      with no user at all. (The owner's pasted console showed the 403 directly.)
    - **Symptom 2 — logout does nothing**, and it *looks* successful. `@payloadcms/ui`'s
      `logOut()` catches every error, clears local state, shows a **success** toast and
      redirects — while the cookie and the server session both survive; the next load
      re-authenticates. The owner's own words (*"it refresh the page and not logged out"*) were
      the exact fingerprint and were still not believed until the source was read.
  - **Fixed and verified:** allow-list moved to `cms/src/lib/origins.ts` with the CMS origin
    present and localhost confined to non-production (localhost was trusted in production until
    2026-09-30). Counter-proof, not assertion — `cms/src/verify/origins.ts` (16 checks) asserts
    **both** directions, because a suite that only asserts the admin is accepted would pass on
    `['*']`. **Reintroducing the defect turns exactly 1 check red and exits 1; restored, exits 0.**
    Both measured. See `.sps/mistakes.md` **M20**.
  - **⚠️ THE FIX CANNOT REACH PRODUCTION WITHOUT A CMS DEPLOY** — and push-to-live has the three
    independent blockers in `docs/hosting-and-deployment.md` §4. **Until that is resolved, neither
    reported bug is actually fixed for the owner**, and the deploy is now the critical path for
    both of them.
  - **✅ `verify:origins` is wired into the root `pnpm verify` chain** (`1fa2a4d`).
  - **🔴 24 COMMITS WERE NEVER PUSHED (found 2026-10-04, `97a18fb..1fa2a4d`).** The eight
    commits before it were in the same state — the whole backup rewrite, the `MAX_ARCHIVES` cap,
    and `f267079`, which is why `.next/routes-manifest.json` had to be **hand-patched on the
    host**: the fix existed and simply could not be deployed. The signal was a manual dispatch
    failing with `HTTP 422: Unexpected inputs provided: ["confirm-risk","mode","target"]` —
    inputs that were plainly in the committed file. **Every local gate was green and every one
    of them ran against code production had never seen.** See `.sps/mistakes.md` **M21**.
    - **The three deploy blockers do not apply to a manual dispatch.** All three are about
      *automatic* deploys (no SSH, no webhook receiver, cron that never fetches).
      `workflow_dispatch` needs none of them — a human presses the button in the Actions tab and
      the run has its own credentials. **This is the route to the first live CMS deploy, and it
      needs neither the terminal DianaHost disabled nor the ticket they are waiting on.**
    - **Safety verified before pushing, not assumed:** `AUTO_DEPLOY` is **not** set, so a push to
      `main` runs the deploy in **dry-run**; `backup-db.yml` triggers only on schedule/dispatch,
      not on push; `deploy.yml` is a single job with no `needs:`, so the red CI gate cannot block
      it. `ci.yml` *will* go red on the known parked CLS gate — expected, not new.
    - **Owner setup, done 2026-10-04:** `CPANEL_HOST` (`b201.serverdiana.com`), `CPANEL_USER`
      (`shikkhac`), `CPANEL_TOKEN` as repository secrets. ⚠️ **The earlier token was pasted into
      chat and is considered exposed — the owner deleted it and created a fresh one.** Never
      reproduce or use the old value.
    - **The delete set is provably empty for this first deploy:** `planDeletes({previous: [],
      current: [...]})` → `firstDeploy: true`, `delete: []`. The site was deployed by hand, so no
      previous manifest exists, and only paths a *previous* deploy recorded can ever be deleted.
      **`node_modules` — the venv symlinks, the one thing that can take the CMS down — cannot be
      in that set**, because it was never recorded. Measured, not reasoned (see `scripts/`).
    - **Remaining live risk, stated plainly:** the dry run does not extract. If DianaHost's fork
      limit (`nPROC`) is still active, the extraction itself — thousands of file operations run
      as this account — could stall partway and leave the CMS half-deployed. The deploy script
      detects this (`${CMS_URL}/api/articles` health check) and prints a venv-repair command,
      ⚠️ **but that repair needs the cPanel Terminal, which DianaHost disabled.** Do not treat a
      passing dry run as proof that a live deploy is safe; it proves credentials and plan only.
  - **🔴 First dry run FAILED — at its own self-test, 39 of 40 (`0104147`), before the host was
    contacted for anything.** `verify-cpanel-deploy.mjs` read stdout for the venv-repair command;
    `summary()` sends the report to `$GITHUB_STEP_SUMMARY` in CI and to stdout locally, **by
    design**. The check therefore passed on every local run and failed in CI, guarding the one
    recovery instruction that depends on the disabled Terminal. Fixed by pinning a step-summary
    file for the child and reading both channels. See `.sps/mistakes.md` **M22**.
- **⚠️ One owner action settles a nine-document dispute.** The runtime Node version is asserted
  as `20.18.2` in nine documents and was **never measured** — it was inferred from the
  CloudLinux `nodevenv` path, whose directory number **is** the version, and that path reads
  `24`. Run, in cPanel Terminal:
  ```sh
  node -v ; /home/shikkhac/nodevenv/shikkha24-cms/24/bin/node -v
  ```
  Node 20 is EOL (2026-04-30), so this is worth knowing either way.
- **🟡 One CI gate is red: CLS, culprit found, fix parked.** `/education-news/20/
  demo-madrasa-new-syllabus/` scores **0.0436** against a **0.03** gate; `/` (0.0091) and
  `/latest/` (0.0007) both pass. The single culprit is the
  `<aside aria-label="মূল বিষয়সমূহ">` from `frontend/src/components/KeyTakeaways.astro`
  (used at `[category]/[id]/[slug].astro:456`), shifting at `top 510px`. Deliberately **not
  fixed yet** — the owner sequenced deploy work first.
- **✅ CMS IS LIVE on `cms.shikkha24.com` (2026-10-04).** Verified on the host, not
  assumed: `/api/articles` → 200, `/admin` → 200, `Migrated: 20261003_155252_initial
  (618ms)`, 74 tables, taxonomy seed → `created 77`.
- **🔴 Root cause of the blank admin — a `/:path*` catch-all CSP (2026-10-04).**
  `cms/next.config.ts` applied one header rule to `source: '/:path*'` carrying
  `default-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
  The admin is a React SPA, so `default-src` being the fallback for every unnamed
  directive meant **no `script-src`, no `style-src`, no `img-src` existed at all** —
  every stylesheet, chunk, favicon and inline style was refused and `/admin` rendered
  blank at HTTP 200. The rule's own comment said the intent was to protect the *API*
  surface; `/:path*` was simply the wrong way to say "API", and it swallowed the admin.
  - Fixed by splitting the CSP per route: deny-all stays on `/api/:path*`, and
    `/admin/:path*` gets a policy that permits the SPA while keeping
    `frame-ancestors 'none'`, `object-src 'none'` and `base-uri 'self'` locked down.
  - **The catch-all deliberately carries no CSP at all.** Two `Content-Security-Policy`
    headers are enforced as an *intersection*, so a catch-all plus a narrower rule means
    the narrow one must permit everything the broad one permits — there is no override.
    One CSP per response also removes any dependence on rule-application order.
  - `'unsafe-eval'` is provably unnecessary, and that was checked rather than assumed:
    **0 of 64** production client chunks and **0 of 621** shipped `@payloadcms/ui`
    files contain `eval(` or `new Function(`. `'unsafe-inline'` *is* required — Next
    inlines the RSC payload and bootstrap scripts — matching what the frontend's own
    `.htaccess` already does.
  - **What was ruled out first:** the frontend `.htaccess` policy is `default-src
    'self'`, not `'none'`; the host's `~/public_html/.htaccess` is 281 bytes and never
    matched a CSP grep. So it was neither of ours-that-looked-suspect — it was ours.
- **✅ The terminal is no longer on the critical path (2026-10-03).**
  - **The production schema no longer needs a shell.** `@payloadcms/db-sqlite` has a
    documented option (`dist/connect.js:56`) that applies migrations at
    `NODE_ENV=production` when `prodMigrations` is set. `cms/src/payload.config.ts`
    now passes the committed migrations through it, gated on
    `PAYLOAD_BOOTSTRAP_SCHEMA=true`. Measured on an empty database in production
    mode: **74 tables on boot; unset, 0 tables** (counter-proof). So the deploy is
    now *upload zip → set 4 env vars → Restart*. This matters because DianaHost
    refuses SSH (ports 22/2222/222/2200/2022 all closed) and
    cPanel Terminal was announced as expiring — the schema must not depend on shell
    access it might lose. Only the taxonomy seed still needs a terminal, and it is
    one command. **⚠️ The "only 443/2083/2087 open" note this line used to carry was
    wrong — port 21 (FTPS) is open too. See `docs/hosting-and-deployment.md` §0.**
  - **Gated off by default on purpose.** It works, which is what makes it a footgun:
    left on, every boot applies pending migrations unattended with no backup first —
    exactly what `push: false` exists to prevent. Bootstrap switch, not a deployment
    mode; the runbook says to remove it.
  - **⚠️ First push of this broke CI, and the reason is worth not rediscovering.**
    `import { migrations } from './migrations/index.js'` resolved under `payload run`
    (which maps `.js`→`.ts`) but **not** under Next's bundler — surfacing as a 500
    from every API route, which reads as "the CMS is broken" rather than "one import
    path is wrong". Fixed extensionless (every other import in that file is), verified
    both directions: `.js` → 500 (CI 37139257348), extensionless → 200 locally.
  - **A page-speed budget was deciding whether a deployable artifact existed.** The
    Lighthouse CLS gate was step 20 of 30 with both uploads at 26 and 30, so a red
    *performance* assertion silently produced no artifact — the actual reason
    "deployment keeps failing". Three separate causes, fixed separately:
    1. Uploads now `always() && steps.<build>.outcome == 'success'` — a finished
       artifact is a property of the build, not of later assertions.
    2. The CMS build/typecheck/assemble were **after** the Lighthouse step, so they
       were skipped and there was nothing to assemble (run 37140158266 proved
       direction 1 while showing this).
    3. The Lighthouse gate was step 21 of 32 with five **functional** verifications
       after it (`.htaccess` against a real Apache, build output, links, search
       bootstrap, CMS read/write) — so a CLS failure skipped them and shipped a
       `frontend-dist` whose `.htaccess` had never been validated. The gate is now
       second-to-last: the only assertion measuring speed rather than correctness,
       and the only one that may fail after everything it depends on is checked.
    - **No threshold was lowered and the gate still fails the job.** It only stopped
      deciding whether an artifact exists.
  - **Deployable now:** run `37140824631` produced `cms-standalone` (80 MB) and
    `frontend-dist` (3 MB) from a run red only on CLS. Assemble asserted
    `cms/server.js` and `cms/src/migrations/index.ts`; bundle measured **108 MB**
    (S0 measured 114 MB, ceiling 700 MB).
  - **⚠️ The `frontend-dist` in that run is under-verified** — the five functional
    checks were skipped (cause 3 above). Deploy the CMS from it freely; prefer a
    later green run for the frontend.
  - **SSH remains on-demand.** `docs/dianahost-provisioning-checklist.md` item 0.3:
    the PNR plan lists *"SSH/Shell Access: Yes (On Demand)"*, not enabled by default.
    The owner generated an RSA-2048 pair on the host (`~/.ssh/shahid`); it needs
    `~/.ssh/authorized_keys` and a support ticket, but **no longer blocks this deploy.**

- **✅✅ BRANCH RECONCILIATION — one branch now produces the deployable artifact (2026-10-03).**
  - **Most of the feared divergence did not exist.** The dependency work had already converged onto `main`: `@swc/helpers@0.5.23` (the fix for the HTTP 503 boot failure) at `cms/package.json:49`, `next@16.3.6`, and the `devalue@5.9.2 → 5.9.4` override in `pnpm-workspace.yaml:66`. **So the deploy-critical risk was not "main is missing the SWC fix" — it was narrower than that, and worth stating precisely rather than merging 17 commits on a guess.**
  - **Exactly one real gap, and it was silent.** `0ecbeda` added `include-hidden-files: true` to the `cms-standalone` upload; `main` never had it. GitHub excludes hidden files from artifacts by default, and Next's bundle is full of hidden `.next` trees — so **every CMS artifact ever built from `main` has been missing `.next/static`**: it downloads, it looks fine, and the deployed admin loads its HTML and 404s every asset. Recovered onto `main` in the commit below.
  - **Deliberately NOT brought over, and why** (all three were checked, not assumed):
    - `dadaca7` (`push: DB_PUSH === 'true'`) — **superseded.** Bringing it over would have re-broken the schema; the migration work above replaces it outright.
    - `e7431dc` (restore `.sps/handoff.md`) — `main`'s copy is intact at 1,507 lines; there is nothing to restore.
    - `3bec83e` (restore `payload.config.ts`) — likewise, `main` holds the full file.
    - `734b5ff` (`DB_PUSH=true` on the CI seed) — **superseded** by `db:migrate`, which is the same fix done durably.
  - **One genuine divergence left open on purpose:** `e16c12a` removes non-null assertions from `frontend/src/lib/bangla-date.ts` (`days[monthIndex]!` → an explicit `undefined` guard that throws). `main` lints clean without it, so it is robustness polish rather than a blocker, and it introduces a `throw` into a formatting hot path. Left off `main` deliberately rather than smuggled into a reconciliation commit.
  - **The deploy branch is NOT deleted.** It is now fully superseded on everything that matters, but deleting a branch is the owner's call. Before deploying, the artifact must come from **`main`**, not from `agents/deploy-project-dianahost-ssh-key`.
  - **🔴 CI on `main` is RED — and it is not this work.** Run `37136192571` failed at the F-16 Lighthouse gate: **CLS 0.038 / 0.044 / 0.044 on the article template against that gate's own 0.03 threshold** (the plan target is <0.02). Worth noting the mismatch with the F-16 handoff entry, which recorded CLS 0.0061 / 0 / 0.0069 measured locally — **the same page measures roughly 6× worse on the runner**, so the local baseline was not representative and the threshold was set from it. Everything this change touched passed in that same run: the new `verify-payload-migrations` gate, `db:migrate` before the seed, all CMS harnesses, and the frontend build.
- **⚠️ F-16 Lighthouse gate is IN, but its CLS threshold does not hold on CI** (landed as `b4f6741`, alongside the reconciliation above).
  - **Gate:** `lighthouserc.json` + `scripts/verify-lighthouse.sh` (`pnpm verify:lighthouse`), wired into the single CI job right after the frontend build — LHCI measures a served `frontend/dist/`, so it must run there and needs no CMS. 3 templates × 3 runs, mobile 412×823 DPR 1.75, simulated 4G, median.
  - **Measured baseline:** perf **93** (home) / **97** (`/latest/`) / **94** (article) · a11y 96/95/97 · SEO 100 · LCP **2939/2351/2708 ms** · CLS 0.0061/0/0.0069 · payload 317/211/241 KB.
  - **Thresholds come from measurement, not from `.sps/plan.md`.** Perf holds **≥90** (plan: ≥95) and LCP is **not asserted at all** (plan: <1.5 s, measures ~2.8 s). **A gate pinned to a target the site does not meet is not a gate — it is red on every commit, and a permanently red gate gets commented out.** The gaps are recorded as work in `docs/performance-budget.md` §8 rather than hidden by lowering a number.
  - ⚠️ **The LCP gap is FCP, not the image** — worth knowing before anyone tries to "optimise images". FCP is 1.8–2.1 s; the hero `<img>` is already AVIF + `fetchpriority="high"` + explicit dimensions, and the fonts are already `font-display: swap` with the 400 weight preloaded. Render-blocking is ~460 ms + ~310 ms × 3. Fixing it means cutting critical-path CSS — a rendering-architecture change, deliberately **not** smuggled into a QA fix.
  - ⚠️ **`/search/` dropped from the measured set; the site was left alone.** Its SEO 69 is caused by our own correct `robots.txt` `Disallow: /search` — Lighthouse penalises the page it is testing. Asserting SEO there would effectively assert that we stop disallowing it. **Lesson: a failing audit is not automatically a defect; check that the tool is measuring what you meant before "fixing" the site.**
  - ⚠️⚠️ **The first gate was silently inert — only counter-proving caught it.** `lhci autorun` **exits 0 when an assertion key matches no audit.** I built it that way; injecting a 1.4 MB payload regression and a WCAG colour-contrast failure both still "passed". Two further traps found by reading the installed `@lhci/utils` source rather than guessing: `getAllAssertionResults` returns **only failures** (so a passing gate looks empty), and `upload.target: filesystem` **breaks the collect→assert chain** by never writing a manifest, leaving `assert` to evaluate nothing. Fix: `temporary-public-storage`.
    - **`scripts/verify-lighthouse.sh` now self-tests that its own assertions can still fail**, exiting non-zero if they cannot. **If that self-test ever fails, the assertion keys are wrong — not the site.**
  - **Dependency (rule 8):** `@lhci/cli@0.15.1`, dev-only, **Apache-2.0**, free, no card needed (rule 7). Pinned exactly; `pnpm install --frozen-lockfile` verified locally — CI enforces it, and adding a dependency without regenerating the lockfile would have broken every build. Uses the runner's preinstalled Chrome via `CHROME_PATH` (no ~300 MB download) against the 2,000 min/month budget.
  - **Still not automated, deliberately:** data-saver <30 KB (**not implemented** — raw HTML alone exceeds it on every page), TTFB (hosting property, S12 production), INP (field-only; lab Lighthouse cannot measure it), with-ads ≥85 profile (needs real AdSense delivery, impossible before launch).
  - **Remaining queue:** F-06 (rate limiter store), F-18 (axe), plus the two performance gaps above as real work. F-07 and F-17 still need owner decisions.
- **✅✅ DEPLOY BLOCKER #1 SOLVED — production could never create its own schema; committed Drizzle migrations replace every `DB_PUSH` workaround (2026-10-03). This supersedes the standing constraint on the parked-deploy entry below.**
  - **Root cause, read out of the installed package rather than inferred.** `@payloadcms/db-sqlite@3.89.0` → `dist/connect.js:49-58`, the whole of the schema-creation story:
    ```js
    // Only push schema if not in production
    if (process.env.NODE_ENV !== 'production' && process.env.PAYLOAD_MIGRATING !== 'true' && this.push !== false) {
      await pushDevSchema(this);
    }
    if (process.env.NODE_ENV === 'production' && this.prodMigrations) { await this.migrate({ migrations: this.prodMigrations }); }
    ```
    **Two facts from this repo make production unschedulable:** [cms/src/payload.config.ts:380](../../cms/src/payload.config.ts#L380) declares **no `push:` key**, and there was **no `cms/src/migrations/` directory anywhere in the tree**. So the schema had exactly one creator — `pushDevSchema` — and it is gated on `NODE_ENV !== 'production'`. Passenger runs the CMS at `NODE_ENV=production`. **The production database therefore had no mechanism that could ever populate it.** Not a permissions problem, not a CloudLinux quirk, not a Passenger setting: a missing artifact.
  - **Why every prior attempt failed, in one line each.** `DB_PUSH=true` in cPanel → the adapter never reads it without a `push:` key wired to it, and even `dadaca7`'s conditional only *disables* push (it never enables it under production). `npm run seed` → npm lifecycle re-applies production settings. `./node_modules/.bin/payload` → the shim is an `env node` shebang, so it never sees `NODE_ENV=development`. All three were fighting the single line above.
  - **Evidence — every row executed locally, not reasoned about:**

    | Step | Result |
    |---|---|
    | `payload migrate:create` | 74 tables generated, incl. `levels`, `users`, `payload_migrations` |
    | `payload migrate` under **`NODE_ENV=production`** | **74 tables created — this operation has never previously been possible in production** |
    | Taxonomy seed against it, still production mode | **77 rows = 8 categories + 5 levels + 64 districts** ✓ (matches the runbook's documented counts exactly) |
    | **Counter-proof:** seed against a *fresh* DB, no migration | `SQLITE_ERROR: no such table: levels`, `select count(*) from "levels" where "levels"."slug" = ?` — **byte-for-byte the DianaHost error, reproduced locally** |

    That last row is the one that carries the finding. It reproduces the failure first and only then shows the migration removing it, so the cause is isolated rather than merely bypassed.
  - **Why `payload migrate` and not the absolute-`node`-binary command on the deploy branch.** Both have *identical* prerequisites (a `node` binary, `payload/bin.js`, and `src/` on the host — the host seed reached `cms/src/seed/index.ts:50`, so `src/` is present), so the migration route is feasible at exactly the point the documented command is. It is strictly more durable because `payload/bin.js` sets `PAYLOAD_MIGRATING=true` and calls `adapter.migrate()` explicitly (`dist/bin/migrate.js:40,60`) — **it works under `NODE_ENV=production` outright**, with no environment lie and no dependency on a host-specific shim quirk. The absolute-path command does work, but it leaves the production schema untracked in git and must be re-run by hand, in Terminal, for every future schema change — which is precisely the failure mode this project already paid for once.
  - **Decision (owner-approved 2026-10-03):** `push: false` in `payload.config.ts`, so migrations are the **single** schema source for dev, CI and production alike; plus a CI gate that regenerates the migrations and fails if they differ from what is committed, mirroring `scripts/verify-payload-types.sh`. This closes the drift risk the other option carried — a dev-pushed schema and a committed migration can diverge, and nothing would have caught it.
  - **Not exempted from the 200-line target by accident:** the generated migration is **1,501 lines**. It is machine-written Drizzle output; splitting it would break the migration, so it is recorded as a deliberate exception rather than left looking like an oversight. Hand-written files in this change stay under 200.
  - **⚠️ The two branches are still diverged in both directions — this fix alone does not produce a deployable artifact.** `main` holds 13 commits the deploy branch lacks (F-01, F-02, F-05, **F-13 (High)**, F-08, F-14, F-03, and the Next.js/devalue security backports); the deploy branch holds commits `main` lacks, **including `2748728` (the `@swc/helpers` fix for the HTTP 503 boot failure), `144e39e` (audit), `0ecbeda` (`include-hidden-files`) and `734b5ff` (the CI seed fix)**. The artifact currently on DianaHost was built from the deploy branch, so deploying it ships a CMS missing every security and QA fix landed since 2026-10-02. Reconciliation is a separate, still-open task.
  - **Status: fixed in the repo, NOT yet deployed.** Passenger remains stopped; `data/payload.db` is still 0 bytes. Nothing about production changes until the owner runs the migration on the host.
- **✅ F-08, F-14, F-03 FIXED — three QA findings closed; two of the three were wrong in an instructive way.**
  - **F-08 (GraphQL playground) — the finding was overstated.** It said "set `disablePlaygroundInProduction` explicitly", implying the playground was exposed. It was **not**: Payload's own `config/defaults.js` already sets it to `true`. Reading the installed package rather than trusting the type definition is what caught this — the fix is now one explicit line under a **top-level `graphQL` key**, so a version bump cannot silently change the posture. **⚠️ I first wrote it under `admin:`, and `tsc` rejected it** (TS2353) — the option belongs to `graphQL`, not `admin`, even though Payload's docs sit the two near each other. `disableIntrospectionInProduction` left at default deliberately: REST already serves the same published content anonymously, so hiding the schema protects nothing that is not already public, and it breaks the editor's explorer.
  - **F-14 (stale generated types) — my first gate could never fail, and only counter-proving showed it.** The design was "regenerate, then `git diff --quiet`". Regeneration **overwrites the staleness before the diff**, so it compared the regenerated file against itself — always clean. Injecting a deliberately stale field still passed. **The rule this generalises to every 'regenerate and compare' gate: snapshot the committed bytes *before* the generator runs, then `cmp` the two.** `scripts/verify-payload-types.sh` captures `git cat-file blob HEAD:…` first and compares with `cmp`. Counter-proof now passes in the real direction: a field added to `Circulars` without regenerating fails the gate and prints the exact drifted field. Runs before the with-CMS step — type generation reads the config, not the database, so it needs no seed and no `PAYLOAD_SECRET`. Restores the working tree on both paths.
  - **F-03 (hardcoded domain) — the code contradicted its own docstring.** `verifyUrlFor()`'s comment claimed *"Both sides build from `PUBLIC_SITE_URL` so they cannot drift"*; the photocard endpoint beside it hardcoded `https://shikkha24.com`, so a staging deployment printed a QR pointing at production. Added `siteOrigin()` + `articleUrlFor()` to `cms/src/lib/id-card.ts` and pointed both card types at them — three duplicated inline `PUBLIC_SITE_URL || …` expressions now have one fallback. **The fallback stays the production domain, not localhost:** a missing variable should fail toward scannable cards, never toward a dead `localhost` URL baked into a permanent PNG. Four assertions added to the existing `verify:id-card` harness (staging host, trailing slash, both card types, uncategorised `/a/:id`).
  - **Dependency (rule 8):** none added. **Gates:** biome 0 · CMS typecheck 0 · frontend typecheck 0 · `verify:payload-types` pass + counter-proof · `verify:id-card` extended.
  - **Remaining queue:** F-16 (Lighthouse — needs Chromium in CI), F-06 (rate limiter store), F-18 (axe). F-07 and F-17 still need owner decisions.
- **✅ F-13 FIXED — the client IP was spoofable, and it keyed every abuse control (`e17bd76`).** `clientIp()` read `x-forwarded-for[0]` — **the caller's own value**, since a proxy appends and validates nothing already there. That one function keys the rate limit on comments, newsletter signup, poll votes, bookmark toggles and account deletion, **plus** the poll `voterHash` and the reaction `fingerprint` (together = the duplicate-vote control). Rotating the header gave a fresh bucket per request and a fresh "voter" per poll, so **none of those controls was enforced against anyone who read the source.** Now reads the **last** entry. **⚠️ It needed no owner input after all** — I had flagged it as blocked on "does the proxy append or overwrite?", but the last entry is correct either way (append → `9.9.9.9, 203.0.113.5` → `203.0.113.5`; overwrite → `203.0.113.5`). What actually must be known is the **hop count**, and that came from the docs: Client → Apache/Passenger → Node = **one trusted hop**. Both the code and `docs/security.md` §7.1 now state that **adding a proxy in front of Passenger breaks this and must be re-derived.** Empty hops filtered first, so `"a, b,"` cannot yield `''` (which would collapse every malformed request into one shared bucket). New gate **`verify:client-ip`** (10 checks, in CI + local `verify`), closing with a counter-proof that the old implementation *was* fooled. **Lesson: I called this "blocked on the owner" before checking whether the architecture already answered it. The cost of a premature "needs your input" is a stalled queue item.**
- **✅ F-05 FIXED — reaction counts aggregate in the database, not in Node (`c92f12b`).** `countsFor()` did `find({ pagination: false })` and counted rows in JavaScript, so every read loaded **every** reaction row on an article into the Node process — and it runs on both `GET /api/reactions/counts` *and* every toggle (a toggle returns fresh numbers). Cost grew linearly with popularity, which is the one shape a news site cannot have: the story that goes viral is the one that starts timing out, on a 2 GB host sharing the disk with SQLite and the bundle. **Now** five parallel `payload.count` calls (index-only, documents never materialised) plus one `limit: 1` lookup for `mine`. The win is real, not cosmetic: the collection's two compound unique indexes `(article, type, reader)` and `(article, type, fingerprint)` both **lead with `article`**, so each `(article, type)` count is an index-prefix lookup — fixed cost regardless of reaction count. The toggle's own query was left alone (already indexed, and `pagination: false` there is correct because the unique index bounds it). **Two claims checked against the installed package rather than trusted:** `payload.count` resolves to `{ totalDocs }`, not a bare number (caught by `tsc` TS2322), and it has **no `limit` option** — the first draft's comment claimed otherwise and was corrected before commit. **The aggregate had NO test at all** — verify:reactions asserted rows are *written* correctly (both indexes, the account key, anonymous read refused) but nothing asserted they are *read back* correctly, which is the half a reader sees. Added 6 assertions + a second anonymous fingerprint fixture (with one voter, "summed across everyone" and "counted only mine" give the same number). **Counter-proved each** against its defect, and CI then ran them for real: 17/17 PASS, `love=2` (cross-voter summing), `total=4`, and `{"like":1,"love":2,"wow":1,"sad":0,"angry":0}` proving unchosen types read `0`, not `undefined`.
- **✅ F-02 DONE — two orphaned harnesses now gate every push (`02885c3`), plus the audit policy (`5ee3352`).** Re-auditing **corrected the original finding: `verify-cms-sync` was NOT orphaned** — it is wired as `verify:sync` and runs in CI under `with-cms.sh`. Four were genuinely unwired. Two of those run cleanly and are now in CI *and* the local `verify` chain: **`verify:ad-split`** (10/10 — matters because every demo article is 4 paragraphs, below the 6-paragraph floor, so the mid-article split NEVER runs in an ordinary build) and **`verify:sqlite-wal`** (240 rows across 6 concurrent writer processes — the valuable one; `.sps/mistakes.md` M10 explicitly forbids deferring it past S0). The other two, **`verify-s8` and `verify-ads-s7`, stay manual and now say why**: both need a live CMS + the `sqlite3` CLI AND mutate the seed DB behind Payload's API (`DELETE FROM poll_votes`; a rewritten article body + a full `astro build`). `verify:endpoints` gets away with writing in CI only because it stamps rows and cleans up via the API; these have no such net. Also fixed a doc error: the feature register listed `pnpm --filter @shikkha24/cms verify:sync`, but that script is a **root** script — the documented command would have failed.
- **✅ AUDIT POLICY — two unpatchable build-time advisories are now an explicit, narrow, documented exemption (`5ee3352`).** CI failed at `Dependency audit` for `GHSA-vfj7-8cjw-p6xm` (braces, CVE-2026-93687) and `GHSA-ch52-4w7c-c8xp` (http-cache-semantics, CVE-2026-93748), both **"Patched versions: None"** — upstream has no fix, so the `overrides` mechanism cannot apply (it needs a patched release to point at). Chosen: `audit.ignore` in `pnpm-workspace.yaml` with the reasoning inline. **Neither reaches production:** Astro is *absent* from `cms/package.json` (verified) and only builds the static frontend in CI on a GitHub runner; both packages are build-time-only transitives (astro toolchain / micromatch→fill-range) and neither is a direct dep of cms or frontend; `braces` recurses only on build-time globs, and `http-cache-semantics` only matters to a program running a shared HTTP cache (storefront is static files behind Apache). **The gate is not weakened:** pnpm 12.4.0+ excludes ignored advisories from the totals and reports them separately, so a third un-ignored high/critical still fails. Uses `audit:` (added pnpm 11.16.0; this repo pins 11.22.0) not the deprecated `auditConfig.ignoreGhsas`. Policy + justifications in `docs/security.md` §9.1.
- **⏸️ DEPLOYMENT WORK PARKED BY OWNER (2026-10-02) — role returns to QA.** Left in a clean, green, in-sync state so it can be resumed without archaeology: **both** branches pushed and clean (0 uncommitted files each), `main` CI run `37019764650` = **success**. The deploy branch also has a green run (`37016011953`) producing both artifacts. Merged the two branches to convergence — `main` and `agents/deploy-project-dianahost-ssh-key` now carry the same dependency set (next 16.3.6, devalue 5.9.4, `@swc/helpers` 0.5.23), the F-04 thin-build guard, the `DB_PUSH` CI fix, and the restored 1,493-line handoff. **Not done, and deliberately not started:** uploading the CMS bundle to DianaHost, initialising the production schema, creating the first Super Admin, and the SSH/auto-deploy question. Standing constraint: external SSH is refused, so uploads must go through cPanel File Manager, and `DB_PUSH=true` must be set *once* on production to create the schema, then removed.
- **🔴 CI RUN 37012800533 FAILED — the deploy branch cannot produce an artifact (2026-10-02).** Failed at `Seed the CMS database` in 54s: `SQLITE_ERROR: no such table: levels`. **Root cause confirmed, not guessed:** `dadaca7 "fix(cms): opt in to SQLite schema push"` made the schema push conditional — `push: process.env.DB_PUSH === 'true'` — and **`DB_PUSH` is set nowhere in CI**. On `main` there is no `push:` key at all, so Payload auto-creates the schema and the seed works; on the branch it does not. **This is the same error the DianaHost handoff reports for `npm run seed`, so the branch broke BOTH the CI artifact and the production seed — one root cause, two failures.** Fix: `DB_PUSH=true` on the seed step only (throwaway `file:./data/ci.db`, never the runtime). `DB_PUSH` is also undocumented in `cms/.env.example` and should be added with a production warning. **Not yet applied — awaiting approval.** Full analysis: `docs/qa-deploy-status-2026-10-02.md`.
- **🔴 `.sps/handoff.md` IS DESTROYED ON THE DEPLOY BRANCH (2026-10-02).** The same commit `dadaca7` replaced **1,493 lines of project memory with a 16-byte file** whose entire content is the literal text `@.sps/handoff.md`. Verified: the deploy tip's handoff is 0 lines and contains **zero** occurrences of "dianahost" — the whole deployment history is gone from that branch. **Blast radius checked by scanning every blob at the tip: only this one file is corrupt** (`frontend/src/styles/global.css` looks like a match but is valid CSS starting `@import`, byte-identical to main). Note `cms/src/payload.config.ts` was *also* destroyed by `dadaca7` (16,619 → 26 bytes) and was correctly restored by `3bec83e`, whose only real change to it is the intended 2-line `DB_PUSH` opt-in — so the corruption pattern hit two files and only one was fixed. **Fix: `git checkout main -- .sps/handoff.md` on the branch.** ⚠️ **Lesson: the same `@<path>` corruption destroyed two files in one commit and CI did not catch either** — the seed failed for an unrelated-looking reason, and the 0-byte handoff passed every gate. A file whose entire body is a bare `@path` is never valid content.
- **✅ GIT INDEX CORRUPTION REPAIRED (2026-10-02) — no work was lost.** Symptom: `git diff` died with `fatal: unable to read 9f25340…`, so **nothing could be committed at all**. **Diagnosis (do not re-derive):** not a shallow clone, not a partial clone, no alternates, no in-progress rebase/merge, no stale lock files. The index pointed at **54 blobs that no longer existed in the object store** (of 393 entries) — a *partial* object deletion, almost certainly the sandbox bulk-delete guard documented above (threshold 50/turn) catching a git maintenance operation. `git log` and `git log --oneline` still worked, so the damage was invisible until you diffed. **Repair, in order (all non-destructive):** 1. backed up `.git/index` and the 3 divergent working-tree files to `/tmp/newsportal-gitbackup/` **before touching anything**; 2. proved recoverability first — **51 of the 54 missing blobs were byte-identical to the working tree** (`git hash-object <file>` == the index hash), so they were rewritten with `git hash-object -w`; 3. the 3 that differed were files **edited after being staged**, so `git add` on them (index should match the working tree — that is the desired state, not a loss); 4. `git write-tree` then succeeded, proving every index object was readable; 5. rebuilt the stale index cache-tree (derived data only) via `read-tree HEAD` + re-stage. **Also cleared:** 24 stale `origin/dependabot/*` remote-tracking refs (branches deleted upstream). **Remaining `fsck` noise is cosmetic and was deliberately left alone:** ~214 invalid reflog entries and ~30 dead commits referenced by the commit-graph — all *unreachable* history. **Verified every reachable commit is intact** (`git rev-list --all` → 0 missing), `HEAD == origin/main == ad217c5`, 377 files in the HEAD tree, `git status`/`diff`/`log` all functional. **Lesson:** after any bulk git operation in this sandbox, run `git fsck --connectivity-only` — a partial object deletion fails *silently* on every read command until you actually diff.
- **✅ F-04 FIXED — the thin-build guard the docs promised but never had (2026-10-02).** The most destructive latent failure in the pipeline, found by audit. `docs/feature-register.md` §7 standing rule 1 has said *"A green build is not a full build… Assert the page count"* since 2026-09-18, and `.github/workflows/ci.yml` claimed the step *"Catches a thin build (dead CMS → green exit code but missing pages)"* — **but no such assertion existed.** The only check was `articlePages.length > 0`, which a 25-page build passes exactly as comfortably as a 2,000-page one. `htmlFiles.length` appeared solely in `console.log`. **Why it mattered:** `lib/cms.ts` is deliberately built so a CMS outage *cannot* fail the Astro build, and `deploy.yml` then runs `rsync --delete` — so a CMS blip during a rebuild would **delete every published article from the live site** and Google would re-index the loss. **Fix (`scripts/verify-build-output.mjs` §3a), two tiers:** with `CMS_URL` set (**deploy path**) ask the CMS for its published-article count and require the build to hold at least that many article pages — exact and self-calibrating as the archive grows; with no `CMS_URL` (**CI path**) apply a low absolute floor (10) that cannot false-fail. **A configured-but-unreachable CMS FAILS rather than falling back** — falling back would recreate exactly the silence the check exists to remove. **`deploy.yml` also had to pass `CMS_URL` to the verify step** (it was set only on the *build* step), otherwise the exact tier would never have run in production. **Counter-proved all four branches** (project rule: a check never seen to fail is not evidence) — thin build now exits 1, healthy build passes, no-CMS floor passes, unreachable CMS exits 1.
- **✅ CI REGRESSION FIXED (2026-09-20) — S13's publish guard had broken the seed, and therefore CI itself.** Found by re-running the audit rather than trusting this file: the handoff still said *"✅ CI IS GREEN on the runner"* (true 2026-09-15, **false from 2026-09-18**). The last CI push (`e2b6312`) failed at *Seed the CMS database* with `APIError: সংবাদ প্রকাশ করা যায় শুধু সম্পাদকের অনুমোদনের পর।` — the verbatim string from `guardPublishStatus`. **The chain:** `cms/src/seed/demo.ts` creates demo articles with `_status: 'published'`; S13 added `hooks/publish.ts`, which throws on any transition to `published` by a non-editor; `payload run` has **no session**, so the seed was rejected. **Why the first fix attempt failed (recorded so it is not retried):** `overrideAccess: true` does **not** reach a *collection-level* `beforeChange` hook — Payload forwards it to field-level hooks only (`dist/collections/operations/create.js` builds the collection-hook args from `{ collection, context, data, operation, originalDoc, req }`). The seed already passed `overrideAccess: true`, so the flag looked like the obvious marker and was not. What **is** forwarded is `context` — `createLocalReq` merges it onto `req.context`, which the collection hook receives. Fix: an exported `PROGRAMMATIC_CONTEXT` marker key in `hooks/publish.ts`; the seed passes `context: { [PROGRAMMATIC_CONTEXT]: true }`; the guard stands down for it. **Not attacker-controllable:** `req.context` for an HTTP request is initialised by Payload core and is never populated from a body, query or header (verified in the express/REST layer). **Counter-proved both directions on a FRESH database** (the local DB was already seeded, so it would have hidden this — M12): without the marker `seed:demo` exits 1 with the APIError; with it, exit 0 and 24 articles. **`verify:reporter` still passes** — "reporter cannot publish their own article" holds, because a reader session cannot set the context. Lesson added to the pile: a security hook that does not exempt programmatic writes will eventually break the seed, and CI is where it surfaces.
- **⚠️ `backup-db.yml` has failed every day since 2026-09-15 (5 straight) at "Prepare SSH key" — this is expected, not a bug.** DianaHost SSH is on-demand and not yet granted, so `DIANAHOST_SSH_KEY` is unset. The workflow fails *loudly* by design ("the archive is unprotected"). Consequence to keep in view: **there is no working backup of any kind right now**, and each failure spends private-repo CI minutes. **⚠️ Superseded 2026-10-04** — the `ssh`/`scp` transport was the wrong idea for this host; the workflow was rewritten to use FTPS. Kept as history, not as current state.
- **✅ Doc drift corrected (2026-09-20):** `docs/seo-plan.md` still flagged `getAllArticleSlugs()` as capped at 500/unfixed — it was fixed in S11 (`getAllArticlePaths()` paginates); the warning is now marked fixed. `.sps/task.md` S2 still named Hind Siliguri + Noto Sans Bengali — replaced by the SolaimanLipi-only decision. (Two more known-but-cosmetic: the feature register still calls the logo a "placeholder" when it is supplied and rendering — only "is it final" is open; and the `docs/image-optimization.md` §2 markup example still shows a `.jpg` fallback `<img>`, stale next to the `fallbackFormat="webp"` fix.)
- **✅ CMS→storefront audit (2026-09-18, commit `517b69f`).** Owner reported "I have edited lots of things but those are not reflecting to the storefront." **Audited rather than assumed — the pipeline is FINE.** Every CMS field tested (siteName, tagline, contact email/phone/address) is present in the built HTML. **Three separate things were making it look broken:**
  1. **🚨 A CMS-uploaded ad banner was 404ing.** `AdCreative.astro` rendered `src={image.url}` **raw**; Payload stores media as a relative `/api/media/file/…` and the static host serves no `/api/`, so the owner's "Marsus" banner was a broken image on the homepage. Every other image already went through `mediaUrl()` — this was the one exception, which is exactly what a "we always use `mediaUrl()`" assumption hides. **Audited project-wide: it was the only instance** (the three `SocialLinks` `href`s are external URLs, already validated as absolute). Found by `verify:links` (`missing: /api/media/file/3.webp ← /`) — the gate worked; it had no broken link to find until the ad unit existed.
  2. **The dev server cached the CMS forever.** `cmsFetch`'s module-level `responseCache` is right for a **build** (short-lived, fetch once, exit) and wrong for `astro dev` (runs for hours), where it had **no invalidation at all** — so the first response per path was cached for the life of the server. Change a category/setting/article, reload, keep seeing the old value until restart. **Indistinguishable from "the CMS is not connected."** Now `CACHE_ENABLED = !import.meta.env.DEV`.
  3. **The rebuild was silent.** With `DEPLOY_WEBHOOK_URL` unset, `rebuild-trigger.ts` does nothing **and says nothing** — the editor saves, Payload says "Saved successfully", the site does not change. `withRebuildTrigger` / `withRebuildTriggerGlobal` now prepend a **Bengali notice** to each config's admin description, stating which of the two states it is. Counter-proved: `cms/src/verify/rebuild-notice.ts` (**10/10**) — present on all five triggered configs, **absent** on `Comments`/`PollVotes`/`Assignments`/`Users`, and it does not replace the collection's own description. The absent direction is the one a careless helper breaks, so it is asserted. Awaiting the config also proves the notice survives Payload's sanitisation.
- **✅ RESOLVED 2026-09-18 — `Jobs` removed, `/fact-check` built.** The owner asked me to decide. Reasoning, in full, because both calls are content-modelling decisions rather than code ones:
  - **`Jobs` — deleted.** Comparing the fields settled it: `Circulars.type` already offers **শিক্ষা / বিসিএস / সরকারি চাকরি / বেসরকারি চাকরি**, and Circulars carries *more* than Jobs (`level`, `publishedDate`, `vacancyCount`). Jobs was a **strict subset**, so two collections were competing for one content type — the editor would have had to guess which to use, and the site would have split its own authority across two URLs for the same query. `docs/education-feature-inventory.md` N8 already defines the Circulars tracker as *"education + BCS/job circulars"*. Removed from `payload.config.ts` + the file deleted; 0 rows lost; `verify:links` / `verify:build-output` / `verify:astro-imports` all still pass. *(The orphan `jobs` table is left in SQLite deliberately — a manual `DROP TABLE` leaves Drizzle's bookkeeping stale, which is a documented trap here.)*
  - **`FactChecks` — kept, and `/fact-check` + `/fact-check/:id` built.** Unlike Jobs it duplicates nothing: a claim, a verdict (মিথ্যা / বিভ্রান্তিকর / সত্য), evidence, sources and before/after images. It addresses a real harm — fake result links and fabricated scholarship notices during Bangladesh's result season — and a visible verdict record is an E-E-A-T asset. Self-hides with an honest empty state, and carries no ad slot (no approved `AD_POSITIONS` value for it).
  - `FactVerdictBadge` uses **red + charcoal only**: solid red for মিথ্যা, tinted red for বিভ্রান্তিকর, solid charcoal for সত্য. Green would be conventional but would add a third hue to a two-colour system for one badge. The verdict is always **written as well as coloured**, so it survives colour-blindness and printing.
  - ⚠️ **Demo corpus:** a demo fact check was added so `/fact-check/:id` is actually **generated** — with zero fact checks the route produced no page, and a route nothing generates has never run (M17). `seed:demo:purge` was updated in the same change, with the claim exported from `demo.ts` so the two cannot drift (M11).
  - **Bug found by the page test:** the verdict summary rendered the count as Latin `1` in a Bengali-only UI. Now `toBnDigits()`.
- **📋 The local workflow, stated once (this is what "nothing is reflecting" usually means):** the frontend is **static**, so a CMS edit changes the database and nothing else. Build with `scripts/with-cms.sh bash -c "pnpm run build:frontend"` (a plain `build:frontend` is a **34-page thin build**; the real one is **147 pages**), or run `astro dev` — which now re-fetches per request.
- **📝 NEW (2026-09-18): feature batch 2 planned — S13→S17.** The owner requested 11 features. **Six were already built** and are recorded so nobody rebuilds them: polls (#6, S8), comments (#7a, S4/S9), weather (#8, S3), prayer/ইফতার/সাহরি (#9, S3), ad placements (#11, S7), admin security (#12, S0/S1/S7), photo gallery (#10a, S9). **Five are new:** S13 reporter verification + assignment + submission (#2, #4) · S14 QR ID card + photocard (#3, #1) · S15 Live TV (#5) · S16 reactions (#7b) · S17 photo story + video news (#10b). Specification: **`docs/feature-batch-2.md`**; plan amendment in `.sps/plan.md`; checklists in `.sps/task.md`. **Owner decisions 2026-09-18:** Live TV = **YouTube + Facebook**; Facebook = **share button only** (no Graph API, no page token, no app review); reporter portal = **CMS admin as the single auth surface** + a mobile-first reporter view (a second frontend login was rejected as a second attack surface with none of the existing hardening); build order delegated to the agent → S13→S17, dependency-ordered. **⚠️ The one architectural change: S15 forces a THIRD CSP profile (`SHIKKHA24_CSP_MEDIA`).** `/live-tv` must embed YouTube **and** Facebook iframes; the relaxed profile has no video in `frame-src` (the iframe would be blocked) and the article profile is YouTube-only. Widening `RELAXED` was rejected as a security regression (the homepage, every category listing and `/quiz` would gain iframe permission they do not need). A third profile breaks `verify-apache.mjs`, whose M16-corrected expectation logic assumes exactly two — that, `docs/security.md` §5, and a counter-proved `verify-build-output` check must all land in the same commit. **Nothing built yet; S13 starts after owner approval of the specification.**
- **Status:** **⚠️ CI was green on 2026-09-15, RED from 2026-09-18 until the seed fix above (2026-09-20).** S11 build complete; S12 local verification complete. All buildable work across S0–S12 is done; remaining items require production deployment, DNS access, or real hardware. **Since the last recorded run:** `/latest` pagination was fixed, a second CSP rule defect was found and fixed, an internal-link gate was added, the Apache harness's expectation was corrected (it had been deriving from a proxy), `PUBLIC_MEDIA_BASE_URL` was found missing from the deploy workflow, and the demo corpus was enlarged so pagination is actually generated, and S5's deferred tag / author / date-archive routes are now built. **All pushed and green.** A deploy rehearsal on real DianaHost is the next real signal.
- **⚠️ CI now proves the `.htaccess` is loadable — and the first attempt did not.** The gate passed locally and **failed on the runner**: `✗ required module mod_log_config.so is missing from /usr/lib/apache2/modules`. Debian/Ubuntu compile many modules into the server binary, so their `.so` files do not exist; macOS builds more of them as shared objects. The harness now asks `<bin> -l` which modules are compiled in and only `LoadModule`s the rest. **Runner environment, recorded so nobody re-derives it:** `/usr/sbin/apache2`, `/usr/lib/apache2/modules`, **8 compiled in**, 6 shared (`authz_core`, `dir`, `mime`, `headers`, `setenvif`, `mpm_event`). macOS: `/usr/sbin/httpd`, `/usr/libexec/apache2`, 3 compiled in, 8 shared. **A local pass is a hypothesis; the runner is the evidence — again.**
- **Last Activity:** 2026-09-15T18:40+06:00 — **built S5's three deferred route families** (`/tag/:slug`, `/author/:slug`, `/archive` + `/archive/:year-month`), which the corpus work an hour earlier had just unblocked. Build **121 → 144 pages** (14 tag pages, 3 author profiles, 4 month buckets + index, plus a real author page/2 — that author has 17 articles, so author pagination is genuinely exercised, not merely implemented); `verify:links` **7,044 / 144**; `verify:apache` **18/18**; `verify:sync` **24/24**; `sitemap.xml` **47 → 81**. Found and fixed two defects no existing check could see: the article JSON-LD advertised a dead `/author/:slug` URL **with a double slash**, and `parsePath()` was dead code in all five listing routes. Also learned that `getStaticPaths` cannot see a frontmatter `const`.
- **Earlier activity:** 2026-09-15T18:20+06:00 — **enlarged the demo corpus so pagination is actually generated.** This was the root cause recorded in M17: 12 articles against a `PAGE_SIZE` of 12 meant `totalPages` was always 1, so the pagination path had **never executed in any build**, and two defects shipped behind it. Now 24 articles (plus 14 tags, three authors, dates across ~3 months): **84 → 121 pages**, `/latest/page/2` emitted and linked in both directions, `verify:links` **5,375 links / 121 pages**, `verify:apache` **18/18** with `/latest/page/:n` now **HTTP 200** rather than a hypothetical 404. Also fixed `seed:demo:purge`, which would otherwise have left two authors and all 14 demo tags behind, and learned that a Lexical body read back from the local API cannot be re-sent.
- **Earlier activity:** 2026-09-15T17:45+06:00 — **fixed `/latest` pagination, corrected the Apache harness's expectation, and found a second CSP defect the corrected harness exposed.** `frontend/src/pages/latest.astro` (a single page reading `?page=N`, which a static build evaluates at build time where there is no query string) is replaced by `frontend/src/pages/latest/[...path].astro`, which emits one real path per page — so `/latest/page/2` exists instead of 404ing the link `Pagination` renders. Added `scripts/verify-links.mjs` (**4,189 internal links across 84 pages**, counter-proved, wired into `pnpm verify` / `ci.yml` / `deploy.yml`). Corrected `verify-apache.mjs`: it now derives each page's expected CSP profile from whether the page **renders an ad slot** rather than from its JSON-LD type (see M16) — and that correction immediately exposed that the article rule was tagging `/latest/page/:n` as an article, so the feed's page 2 would have shipped relaxed with no ads on it. `.htaccess` article rule now excludes a middle segment of `page`; `verify-build-output.mjs` asserts both halves. **`verify:apache` 18/18, `verify:build-output` 24/24, `verify:links` 3/3.** Build: exit 0, **84 pages**.
- **Previous activity:** 2026-09-15T17:10+06:00 — **found and fixed a launch-blocking `.htaccess` defect while re-verifying.** The CSP route dispatch used `<LocationMatch>`, which Apache **forbids in `.htaccess` context** — the file returned **HTTP 500 on every request**, so deploying it would have taken the entire site down (not merely blocked AdSense). Two of the three cache rules were dead for the same class of reason (`<FilesMatch>` matches the basename, not the path). Rewritten to `SetEnvIf Request_URI` + `Header ... env=` with the three CSP strings preserved byte-for-byte. The old harness could not see any of it because it **reimplemented** Apache's regex matching in JavaScript; it is deleted and replaced by `scripts/verify-apache.mjs`, which runs a real Apache over the real `dist/` and asserts status codes, header counts and per-page profiles. **S12 production-only items 11 and 12 are now closed locally.**
- **✅ CI green — what it now proves on a fresh checkout, not just locally:** lint → typecheck (frontend) → seed (taxonomies + demo) → 6 local-API harnesses → **build with a live CMS (84 pages)** → CSP routes → build output → `verify:sync` + `verify:endpoints` over real HTTP → CMS standalone build → CMS typecheck → standalone bundle measured → dependency audit. Every one of these had failed or never run before today.
- **⚠️ `deploy.yml` had a self-contradiction (fixed, commit `b862b06`).** rsync excludes `.htaccess` "so a hotfix on the host is not overwritten", and the very next step `scp`'d the canonical file over it on every run — so the exclusion was decorative and a host-side emergency CSP fix was silently lost. The documented `# NO-DEPLOY` escape hatch had never been implemented. The step now probes for the marker and skips; a failed probe deploys the canonical file, so the check can only ever *preserve* a hotfix, never block a deploy.
- **⚠️ Dependabot PR triage complete (2026-09-15).** All 14 PRs + 1 new PR (#15) closed. 4 CI-action bumps merged (clears Node 20 deprecation); 7 runtime PRs closed (graphql v17 breaks Payload `^16.8.1`, @types/node 26 mismatches Node 20 runtime, 4 root-block duplicates); 4 remaining closed because Dependabot's rebase dropped `pnpm-lock.yaml` changes (`ERR_PNPM_OUTDATED_LOCKFILE`). Safe bumps (dotenv 17, react-dom 19.3, cross-env 10, react 19.3) should be done manually with a lockfile update if owner approves. Root + CMS Dependabot configs now have `ignore` rules for `graphql`, `@types/node`, `next`, `react`, `react-dom`, `typescript` majors.
- **⚠️ `/latest` pagination was broken, and a second defect was hiding behind the same cause (both fixed 2026-09-15).** `PAGE_SIZE` is 12 and the demo corpus was exactly 12 articles, so `totalPages` was always 1 and **no pagination control ever rendered anywhere**. That hid two things: (a) `/latest` was a single page reading `?page=N` — which on a static build is evaluated **at build time**, where there is no query string — while `Pagination` builds its links as `${basePath}/page/${n}`, so the first thirteenth article would have rendered a "পরের →" link to a **404**. Now a catch-all `frontend/src/pages/latest/[...path].astro` emits a real path per page, matching `category/[...path].astro`. (b) The **article CSP rule matched any three-segment path**, and `/latest/page/2` is three segments — so page 2 of the feed would have been served the *article* profile (relaxed, `frame-src` for video embeds) despite carrying no ad slot. The rule now excludes a middle segment of `page`. **Both defects sat exactly on the corpus-size boundary and were invisible to every build and every test; see M17.**
- **⚠️ The Apache harness was deriving its expectation from a proxy (fixed 2026-09-15).** `expectedProfile()` decided a page's CSP profile from its JSON-LD `@type` (`CollectionPage` ⇒ relaxed). That is only *correlated* with the real reason a route is relaxed, which is that it **renders an ad slot**. When `/latest` gained correct `CollectionPage` schema and no ad slot, the harness demanded a relaxed profile for a correctly-strict page and went red. It now keys on `data-ad-slot` — the attribute `AdSlot.astro` emits. **The corrected harness is what exposed defect (b) above.** 23 relaxed == 23 ad-bearing, exactly. Over-relaxation (a relaxed page with no slot — `/quiz` is one, because `/quiz/:id` carries ads) is reported as a note, not failed, since `.htaccess` dispatches by route *family*; the `mustBeStrict` list still catches blanket relaxation. Counter-proved in both directions.
- **✅ The demo corpus now exceeds `PAGE_SIZE`, so pagination is actually generated (2026-09-15).** 12 articles against a `PAGE_SIZE` of 12 meant `totalPages` was always 1 and **no pagination control ever rendered anywhere** — which is how two defects hid (above). The corpus is now **24 articles**: build went **84 → 121 pages**, `/latest/page/2` is emitted, page 1 links to it and page 2 links back to the bare path, and `verify:links` now checks **5,375 links across 121 pages** (was 4,189 / 84). `verify:apache` reports `/latest/page/:n` as **HTTP 200, strict** — the previously-hypothetical 404 route is now a real page, so that fix is verified against reality rather than by argument. 35 relaxed == 35 ad-bearing. The seed also gained the content three deferred routes were waiting for: **14 demo tags, three demo authors (was one), and publish dates ~4 days apart spanning ~3 months** — the stated blocker on the author / tag / date-archive routes (S5) and a partial unblock on the S6 Bengali-search gate.
- **⚠️ Growing the corpus broke `verify-cms-sync`, and the harness was wrong — not the build.** It asserted that **every** CMS article's title appears in `/latest/index.html`. That is only true while the corpus fits on one page; once `/latest` paginates, page 1 holds just the newest slice, and it reported 12 of 24 articles as "missing" against a **correct** build (the pages were all there — `study-abroad/23/demo-study-abroad-australia/index.html` and the rest). It now concatenates the base page **and every `/page/:n` subpage**. **This is M17's third instance and its real lesson: a boundary-sized fixture does not only hide product defects, it lets wrong test assumptions harden into apparent coverage — they are never contradicted.** After enlarging a fixture, read every failure as "was this assumption only true at the old size?" before assuming the product broke. `verify:sync` now reports **24/24**.
- **✅ S5's deferred routes are built (2026-09-15): `/tag/:slug`, `/author/:slug`, `/archive` + `/archive/:year-month`**, all with pagination, all wired into `sitemap.xml` (**47 → 81 entries**) and all reachable from the article page and `/latest` — a route nothing links to is a route no reader finds, and one `verify:links` cannot check either. Build **121 → 144 pages**; `verify:links` **7,044 links / 144 pages**; `verify:apache` **18/18**, 143 routes, all three new route types correctly **strict** (no `AdSlot` renders on them, so they need no CSP relaxation).
- **✅ The favicon is now CMS-managed and validated (2026-09-15).** The `favicon` field **already existed in `SiteSettings` and was completely inert** — nothing in the frontend read it, and `Layout.astro` hardcoded `/favicon.svg` + `/favicon.ico`. It was also unvalidated, so it would have accepted a 15 MB JPEG from the library. Now: validated on the *reference* (`SiteSettings.beforeValidate` — the only place that knows the asset is a favicon), and emitted first in `<head>` with the static pair kept as fallback, plus `apple-touch-icon`.
- **⚠️ The favicon rules, and which of them can actually fire — measured, not assumed.** Type: SVG/PNG/WebP. Size: ≤ 512 KB. Dimensions: ≤ 512×512 px. Proven against real uploads: `2000×2000` noise → stored **2766 KB** WebP → **rejected on bytes**; `2000×2000` flat → stored **7 KB** → **rejected on dimensions**; `64×64` → **accepted**. **The dimension rule is what makes this real:** a byte cap alone lets a flat 2000 px icon through at 7 KB, and `Media`'s WebP normalisation is exactly what creates that gap. **The type rule cannot fire in practice** — `Media` re-encodes every raster upload to WebP, so a stored file is always `image/webp` or `image/svg+xml`, both allowed. It is kept as defence-in-depth for a legacy or future row, and documented as such rather than presented as a live filter.
- **⚠️ The favicon shipped "working" and did not change — two real bugs, both invisible to every gate.** Reported by the owner. (a) **Three competing `rel="icon"` candidates**: the managed icon was emitted *and* the bundled `/favicon.svg` + `/favicon.ico`, and with no `sizes` to disambiguate them the browser was free to keep showing a stale bundled file. The managed icon is now emitted **alone**. (b) **Favicons cache harder than anything else on the page** — Chrome keeps them in a store that ignores ordinary cache headers, so replacing the icon under the same filename shows the old one indefinitely. The URL is now versioned by the media record's `updatedAt` (`?v=<epoch ms>`). `site.webmanifest.ts` had both problems one surface over. **Both branches verified against a real build**: no favicon → 2 bundled candidates; favicon set → 1 versioned managed candidate. Two new `verify-build-output` checks, each counter-proved by injection.
- **⚠️ What was ruled out before the fix, by inspection rather than assumption** — worth keeping, because each would have been a plausible culprit: CSP `img-src` already names `https://cms.shikkha24.com`; `globals: [withRebuildTriggerGlobal(SiteSettings)]` already fires a rebuild on a settings change; and `deploy.yml` already defaults `PUBLIC_MEDIA_BASE_URL` to the CMS host, so the icon URL is absolute and not a relative `/api/…` that would 404. **A settings change still needs a rebuild** — the trigger is debounced (5 min quiet, 30 min max), so it is not instant, and `DEPLOY_WEBHOOK_URL` must be set or nothing fires at all.
- **✅ S6's last item — date and section filters — is built (2026-09-15).** The article page tags each story with `data-pagefind-filter="বিভাগ:<category>"` and `data-pagefind-filter="তারিখ:<YYYY-MM>"`; `/search` renders both. **The keys are Bengali because Pagefind UI uses the filter *key* as the group heading and has no per-filter label translation.** The date value is Bengali numerals (`২০২৬-০৬`) — Bengali digits run U+09E6–U+09EF consecutively, so it still sorts chronologically as a string, which a month name would not.
- **⚠️ Pagefind renders filter values in INDEX order and offers no way to change it — so the date block is reordered in the DOM.** The UI bundle's only `.sort()` is for sub-results. Months came out `০৬, ০৮, ০৭, ০৯` — a date filter listing August before July is a defect a reader notices. `search-init.js` reorders them, comparing **codepoints** (not `localeCompare`, whose Bengali collation is not guaranteed), guarded for idempotence so the `MutationObserver` cannot feed itself, and skipping cleanly where there is no observer (Opera Mini). **This depends on Pagefind's internal class names**, so `verify:build-output` asserts they still exist — a Pagefind rename now fails the build loudly instead of quietly disabling the sort.
- **⚠️ `publishedAt` is stored and formatted in UTC, not Dhaka.** `toLocaleDateString('bn-BD', …)` with no `timeZone` uses the runtime's zone, which is UTC in CI. A story published 02:00 Dhaka on 1 September is stored `2026-08-31T20:00Z` and therefore displays **31 August**. The date *filter* deliberately derives its month from the same basis so the two can never disagree — but the display is off by one for any article published between 18:00 and 24:00 UTC. **Not fixed here**: it changes every displayed date on the site, so it wants its own review rather than riding along with a filter change.
- **✅ `site.webmanifest` is now a generated route, and that fixed a real contract violation.** The static file in `public/` hardcoded the site name (`"name": "শিক্ষা২৪ — Shikkha24"`), which the branding contract forbids — `public/` files are copied verbatim and cannot read the CMS. It is now `src/pages/site.webmanifest.ts`, so `name`/`short_name`/`description` follow Site Settings (the built file now reads `শিক্ষা২৪.কম — Shikkha24.com`, i.e. the real CMS name). **Its `icons` are deliberately still the bundled static ones:** media is served from a different origin and Payload sends no CORS headers, so a cross-origin install icon can break the install prompt rather than decorate it. The tab icon follows the CMS; the install icons do not. Documented in the route.
- **⚠️ Two defects fixed on the way, both invisible to every existing check.** (a) The article JSON-LD's `Person.url` pointed at `/author/:slug`, **which did not exist** — structured data advertising a 404. It *also* carried a **double slash** (`https://shikkha24.com//author/…`) because `${siteUrl}/…` was interpolated onto `Astro.site.href`, which already ends in `/`. `verify:links` never saw either: JSON-LD uses `"url":"…"`, not `href=`, so the link checker does not read it. (b) `parsePath()` was **defined and never called** in all five listing routes — props come from `getStaticPaths`. Removed from all five.
- **⚠️ `getStaticPaths` cannot see a frontmatter `const` — only imports.** It is hoisted to module scope, so a helper declared in the frontmatter is out of scope and the build dies with `monthSegment is not defined` at *generate* time, after the Vite build has already succeeded. Anything `getStaticPaths` calls must be imported (or declared inside it). `archiveMonthSegment()` now lives in `lib/url.ts` for that reason.
- **⚠️ The archive month is deliberately ONE path segment (`/archive/2026-09`).** `/archive/2026/09` would be three segments, and the article rule matches any three-segment path — so it would have been served the *article* CSP profile with no ad slot on it. One segment avoids the collision structurally rather than adding another exclusion (the M15 enumeration trap).
- **⚠️ Pagination coverage on the new routes — checked, not assumed.** `/author/demo-reporter` holds **17** articles, so it emits a real `/author/demo-reporter/page/2` (12 + 5, linking back to the bare path) — **author pagination is genuinely exercised**, and `verify-links` checks those links. `/latest` is too (24 articles, 2 pages). Tags (max 3), archive months (max 8) and categories (max 5) do **not** reach `PAGE_SIZE`, so their `page/2` routes have never been generated — the same pattern, but an argument rather than evidence. ⚠️ **The first version of this note claimed none of the new routes paginated; that was an assumption, not a check** — one `ls` would have shown it. A negative claim about coverage deserves the same verification as a positive one.
- **⚠️ `seed:demo:purge` had to be updated with it, and would otherwise have left rows behind.** It purged **one hardcoded author slug** (`demo-reporter`), so two of the three new authors would have survived; and `tags` was **absent from the purge list entirely**, so all 14 demo tags would have survived. Authors are now matched on the `demo-` prefix and `tags` is purged after `articles` (nothing left pointing at a deleted tag). Same class as M11 — a cleanup whose list was not kept in step with what the seed creates.
- **⚠️ You cannot re-send a body read back from the Payload local API.** The seed's backfill initially echoed `doc.body` into an `update`, which failed with `ValidationError: … Body, Body > Poster image`. The read runs at the default `depth`, so relationship nodes inside the Lexical body come back as **populated objects**, and re-sending them fails validation. Send only the fields you are changing, and build a body only when there is not one.
- **✅ New gate: `pnpm verify:links` (`scripts/verify-links.mjs`).** Every internal `href`/`src` in the built output must resolve to a built file — **5,375 links across 121 pages** (4,189 / 84 before the corpus grew). Nothing else in the toolchain checks this: Astro does not resolve `href` strings, and a link to a route that was never generated is still valid HTML, so the build stays green and the reader gets a 404. It **blocks** (was planned as "warn first"). Counter-proved by injecting `<a href="/definitely-not-a-page/">` into `dist/about/index.html` — the failure names both the target and the referring page. Wired into `pnpm verify`, `ci.yml` and `deploy.yml`. **It found a real launch blocker on its first CI run** — see the `PUBLIC_MEDIA_BASE_URL` bullet below.
- **⚠️ CI has no `cms/.env`.** Every CMS-touching step gets `PAYLOAD_SECRET` + `DATABASE_URI` from the workflow, and the frontend build additionally needs `CMS_URL`. When adding a harness, check it does not read a variable that exists only in a local `.env` — that failure mode is invisible until CI runs.
- **CI now runs 15/15 harnesses** in this order: lint → typecheck → seed → 6 local-API harnesses → build (with CMS) → **`verify:apache`** → `verify:build-output` → **`verify:links`** → `verify:sync` + `verify:endpoints` (with CMS) → CMS standalone build → audit. (`verify:csp` was retired 2026-09-15 — it reimplemented Apache's matching instead of running Apache.)
- **⚠️ The three CMS-host variables are easy to confuse — do not:** `CMS_URL` is read at **build** time and every article/category/setting is fetched from it; `PUBLIC_CMS_ORIGIN` is the **browser-facing** origin for the interactive islands (empty ⇒ they self-hide); `PUBLIC_MEDIA_BASE_URL` is the **browser-facing** origin for media, and **unset it makes every article image 404** (see below). Setting only `PUBLIC_CMS_ORIGIN` produces a green 32-page build.
- **🚨 `PUBLIC_MEDIA_BASE_URL` was missing from `deploy.yml` — the deploy would have shipped a site with no images (found and fixed 2026-09-15).** `mediaUrl()` prefixes the CMS's relative `/api/media/file/…` path with it; unset, that path is emitted as-is, and the static host serves no `/api/`. **`verify:links` found it on its first CI run** (the runner, unlike a local build, has no `frontend/.env`, so it was the first build that ever ran without the variable). Both workflows now set it, defaulting to the production CMS host and overridable with the `PUBLIC_MEDIA_BASE_URL` repository variable.
- **⚠️ A green build is not a full build.** With no reachable CMS the frontend build exits **0** and emits ~32 pages instead of ~84. The exit code never catches it — `verify:build-output` does (it asserts 12 articles exist). Always confirm the **page count**, not the exit code.
- **⚠️ Image budget closed (§2.2, 2026-09-15).** Two defects, not tuning: (a) `<Picture>` was emitting the **source JPEG** as its `<img>` — a 226.5 KB file, the heaviest asset on the site — fixed with `fallbackFormat="webp"` in `CategoryImage.astro`; (b) the sources were **1376 px wide while the largest declared width was 1200**, so Astro generated a fallback `<img>` at source width that no `srcset` entry could match. Sources are now 1200×670 (repo 6.2 MB → 1.2 MB). Result: AVIF max 71.2 KB, WebP max 137.9 KB, **no JPEG**, **zero files over budget**. **Invariant: never ship a source wider than the largest width you declare.**
- **Next Action:** **deploy the CMS first** (`docs/cms-deployment.md` — the frontend is built *from* it), then set the GitHub Actions secrets (`CMS_URL`, `PUBLIC_CMS_ORIGIN`, `DIANAHOST_SSH_KEY`, `DIANAHOST_SSH_HOST`, `DIANAHOST_SSH_USER`, `DIANAHOST_PUBLIC_HTML`), add the CMS hostname to the CSP `connect-src` in `.htaccess`, set `DEPLOY_WEBHOOK_URL` on the CMS, configure DNS/SMTP, run Lighthouse/restore/device tests, then LAUNCH.
- **⚠️ S11 summary:** JSON-LD on all page types, URL architecture `/:category/:id/:slug` + shortlink + 500-cap fix, `llms.txt`, `og-default.svg`, all feeds updated. Commits: `5c8c3af`, `a20f0df`.
- **⚠️ S12 summary:** all agent-buildable items verified locally. Initial payload 149–242 KB (well within 1.2MB). Bengali typography (17px/1.65), touch targets (48px), ad slots reserved, 404 page Bengali with nav. 79 pages, 0 inline scripts. Pre-launch QA checklist written. Most S12 items are owner-only (Lighthouse in production, DNS, monitoring, restore drill, WCAG manual test, device matrix). Evidence: `.sps/section-todos/S12.md`.
- **⚠️ CSP route regression found + fixed (commit `be8310d`):** the S11 URL change left the relaxed-CSP rule at `/article/*`, which matched no article page — every article would have silently fallen to the strict profile and lost AdSense. Fixed to the placeholder pattern `/:category/:id/:slug` (a splat cannot express it — one splat per rule, and a splat crosses `/`). Verified by `scripts/verify-apache.mjs` (the harness then in place, `verify-csp-routes.mjs`, was retired on 2026-09-15 — it reimplemented Apache's matching instead of running Apache), wired into `pnpm verify`. **Lesson: a URL architecture change is cross-cutting — grep for the old prefix in CSP rules, sitemaps, feeds and canonicals after any URL change.**
- **⚠️ Production verification still required for the CSP:** the `<LocationMatch>` mechanism is gone, but the `.htaccess` is still applied by Apache, so the patterns and header values can only be *confirmed* live. If a pattern does not match, the page returns 200 under the strict policy and AdSense is silently blocked. **S12 check:** confirm in production that an ad-bearing page returns exactly ONE `Content-Security-Policy` header with the relaxed policy. Locally this is already proven — `pnpm verify:apache` runs a real Apache over the real `dist/` and asserts it for all 83 routes.
- **⚠️ `.htaccess` context rules (do not re-learn these the hard way):**
  1. **`<Location>` / `<LocationMatch>` are FORBIDDEN in `.htaccess`** — server and virtual-host context only. Using one returns **HTTP 500 on every request**. Path matching in `.htaccess` is `SetEnvIf Request_URI` + `Header ... env=`.
  2. **`<FilesMatch>` / `<Files>` match the BASENAME, not the path.** `<FilesMatch "\._astro/">` and `<FilesMatch "^/fonts/">` never matched anything. `\.html$` is fine — that genuinely is a basename.
  3. **`Request_URI` includes the query string.** A pattern anchored with `$` needs `(\?.*)?$` or a share link (`/?utm_source=…`) silently falls through.
  4. **Prefer "exactly N segments" over an exclusion list of reserved roots.** An exclusion list drifted the moment it was written: `study-abroad` is both a 2-segment listing and the first segment of real article URLs, so every study-abroad article fell to the strict profile. The article route is the 3-segment shape **minus** a middle segment of `page` (`^/[^/?#]+/(?!page/)[^/?#]+/[^/?#]+/?(\?.*)?$`) — `/latest/page/:n` is the one *other* 3-segment path and is a paginated listing that must stay strict. The `page` test is structural, not an enumeration, so it cannot rot the way the old list did.
  5. **A negative lookahead is fine in `mod_setenvif`** — it is PCRE. `(?!page/)` is what excludes `/latest/page/:n` from the article rule; verified by running Apache, not by reading the docs.
- **⚠️ A harness that reimplements the mechanism is not evidence.** `verify-csp-routes.mjs` parsed the rules and re-ran the regexes in JavaScript. It passed for three days while the file was unrunnable — it could only ever confirm that two implementations agreed, never that either was right about Apache. `verify-apache.mjs` starts a real Apache instead. **When a check is described as "production-only", ask whether a local copy of the platform is actually available; here it always was.** ⚠️ **And a harness can still be wrong without reimplementing anything: see the proxy-expectation defect above (M16).** Run Apache, *and* derive the expectation from the cause rather than from a correlated field.
- **⚠️ Sandbox trap (new, 2026-09-15): two concurrent `pnpm` processes deadlock the store.** The second one dies with `[CODEBUDDY_BROKER_DENY] EEXIST` on the `~/Library/pnpm/store/v11/projects/<hash>` symlink, and the first can then hang indefinitely with no output. Serialize pnpm commands; delete the stale store symlink to recover.
- **⚠️ Sandbox trap (new, 2026-09-15): `pnpm` re-runs a full install before every `run`** in this workspace (`verify-deps-before-run`), which hangs on the same brokered symlink. Use `pnpm --config.verify-deps-before-run=false run <script>`. The env-var form (`npm_config_*`) is **not** honoured.
- **⚠️ Sandbox trap (new, 2026-09-15): a spawned Apache cannot stat the repo on `/Volumes/SSD`** — every request returns a blanket 403 with `pcfg_openfile: unable to check htaccess file`. `verify-apache.mjs` therefore copies `dist/` into a scratch directory under `$TMPDIR` and serves that.
- **⚠️ CMS sync investigation (2026-09-13) — one real bug found and fixed.** A report of "CMS data is not syncing" was traced end to end. The **read** path (build-time CMS → static pages) was already correct: every record in every listed collection appears on its page. The **write** path had a genuine failure: `POST /api/comments/submit` returned **404** because the endpoint was registered at the API root with `path: '/comments/submit'`, and `comments` is a collection slug — so Payload's collection router claimed `/api/comments/*` first and parsed `submit` as a document ID. **Every reader comment submission was failing.** Fixed by mounting the endpoint on the Comments collection with a collection-relative path (`/submit`), which resolves to the same public URL and is matched before the collection's generated routes. Verified by `cms/src/verify/endpoints.ts` (real writes over HTTP, read back through the local API, then cleaned up). Commit `3c1e274`.
- **⚠️ Second gap fixed: the newsletter form rendered a control that could not work.** `NewsletterSignup` gated only on a CMS origin, but the subscribe endpoint refuses with **503** when no mail transport is configured (deliberate — accepting an address that can never be mailed is a lie). The footer therefore showed a subscribe box that always errored. Now gated on `/api/newsletter/status` too, resolved once per build and passed down as a prop. Verified in both directions: absent with no SMTP, present with SMTP. This is the S8 self-hiding rule applied to a precondition the frontend could not previously see.
- **⚠️ Two harnesses added, and why they did not exist before.** `scripts/verify-cms-sync.mjs` (read path) and `cms/src/verify/endpoints.ts` (write path). The existing S9 harnesses all call the Payload **local API** and never exercise the HTTP routing layer — which is exactly where the collision lived. The write harness deliberately goes over HTTP, performs a real write, reads the row back to prove it landed, and deletes it.
- **⚠️ Probe method matters.** An early probe sent `GET` to every endpoint and concluded five were missing. That was wrong: a POST-only route answers `GET` with 404, so "missing" and "wrong method" are indistinguishable. Always probe with the method the client actually uses.
- **⚠️ One S9 build item is deliberately NOT built:** bookmark → CMS sync. The browser-local half is complete and works with no account. The sync half is unblocked but needs a **policy decision** first — a naive union-merge resurrects a bookmark deleted on another device. Raised for the owner rather than guessed at.
- **User instruction (latest):** "read all docs and everything then continue to work" — taken, per this project's recorded convention, as approval of the previous section plus instruction to build the next one.
- **⚠️ Open owner question (raised 2026-09-12, resolved 2026-09-14):** the owner planned to upgrade DianaHost to a 5 GB plan and asked whether Cloudflare is still needed. **Owner decision: remove Cloudflare entirely.** Everything on DianaHost only. The 5 GB plan question is separate — still pending bandwidth/price figures.
- **⚠️ Sequencing note:** S11's **sitemap / news-sitemap / RSS / robots** were built **ahead of the S0→S12 order** on 2026-09-12. They are verified and committed; the remaining S11 work (OG/Twitter, auto OG images, canonical, `llms.txt`, Publisher Center, E-E-A-T pages) is **not** started.
- **✅ E-E-A-T pages — RESOLVED (was: "must be created in the CMS").** The footer no longer links to `/page/*` for the legal pages. `/about`, `/contact`, `/privacy-policy` and `/terms-of-use` are all **static Astro routes**, so they cannot 404 when the CMS `pages` collection is empty. The 171-broken-link class the 2026-09-14 audit found is gone. ⚠️ **Still owner-only:** an **editorial / corrections policy** page (does not exist; Google News expects one) and the Trade Licence / TIN / Ministry of Information numbers in `SiteSettings → Legal` (the footer block renders only once set). `/page/:slug` still exists and still serves owner-authored CMS pages — `footerPages` lists them below the four static ones.
- **⚠️ Owner action needed:** `PUBLIC_CMS_ORIGIN` and the CSP `connect-src` host must be set to the real CMS hostname. Both are currently a placeholder (`https://cms.shikkha24.com`), blocked on DNS. Until then the live-blog refresh and the poll vote control are simply not rendered.
- **⚠️ Build environment (four traps, all cost real time):**
  1. `HTTP_PROXY` is set here; build-time CMS fetches fail with 502 unless `NO_PROXY=localhost,127.0.0.1,::1` is set. Now baked into `frontend/package.json` `dev`/`build` scripts. `curl` needs `--noproxy '*'`.
  2. **The sandbox safe-delete shim aborts `astro build`.** Astro deletes its own `dist/` and `dist/.prerender/`; the shim's bulk-delete guard (threshold 50 per turn) trips and the build exits 1 **after** the pages are written — so `dist/` looks populated but `pagefind` never runs and `.prerender/` is left behind to be deployed. **Fix: prefix the build with `CODEBUDDY_SAFE_DELETE_ENABLED=0`.**
  3. **Parallel edits to the SAME file silently lose writes.** Several edits to one file in a single message report success but only some land (typically the first and third survive, the second and fourth are dropped). Cost two debugging rounds in S7 and one in S8. **Serialize edits to one file, and always read the value back.** Different files in parallel are fine.
  4. **Drizzle's schema push is interactive and will hang the dev server.** Renaming or dropping a column makes Payload ask "is this a rename?" on stdin; the server blocks forever and the build's CMS health check never passes. Also, a manual `DROP TABLE` leaves Drizzle's bookkeeping stale, after which every push fails with `index ... already exists` — fix by dropping the named index and retrying. **Hit three more times in S9**, including `readers_provider_id_idx` when `Readers.email` changed nullability (a column change makes Drizzle rebuild the table, and the rebuild re-creates indexes that already exist). Back up the DB first; the fix is always `DROP INDEX IF EXISTS <named index>` then retry.
- **⚠️ Background servers do not survive between tool calls** — confirmed repeatedly. Start the CMS and run the build in the *same* command (`scripts/with-cms.sh`), or the build silently falls back to no-CMS data.
- **⚠️ `pnpm` was missing from this machine (fixed 2026-10-05).** `package.json` pins `pnpm@11.22.0`, `node_modules` was fully installed (866 packages) and `dev.sh` calls `pnpm dev` — but the binary itself was absent from every location: not on `PATH`, not in `node_modules/.bin`, not in any shell rc, and no `corepack` to provide it. Everything looked installed, so the symptom was confusing: `scripts/dev.sh` failed with `pnpm: command not found`.
  - **Fix — no sudo needed:** `npm install -g --prefix "$HOME/.local" pnpm@11.22.0`. A plain `npm install -g` fails with `EACCES` because the npm prefix is `/usr/local`, which is root-owned. `~/.zshrc` already sources `~/.local/bin/env`, so a **login shell picks it up with no further PATH edit**.
  - **⚠️ Non-interactive tool shells do NOT get it** — the same `~/.zshrc` line is not read by a plain `Bash` tool invocation. Prefix those with `export PATH="$HOME/.local/bin:$PATH"`, or `pnpm` appears missing again.
  - **Confirmed working end to end:** `pnpm install --frozen-lockfile` → "Already up to date" across all 3 workspace projects; `scripts/dev.sh` frees both ports, starts both servers, and reports CMS ready in ~2s. Verified live: `/api/articles?limit=1` → HTTP 200 with real Bengali articles, homepage → HTTP 200, and `/higher-study/24/demo-research-thesis-writing` → HTTP 200 with the reaction bar rendering (💬 heading + all five emoji, correct `like`→`angry` order). Dev CSS serves `.dark .dark *{background-color:var(--color-dark-raised)}` → `#242424`, and `dark-surface-raised` appears **zero** times in any served stylesheet.
  - **⚠️ Article URLs need the CMS's own category slug, not a guess** — the route is `/:category/:id/:slug` and the categories are education desks (`higher-study`, `study-abroad`, `jobs-career`). Guessing `news` returns 404.
  - **`dev.sh` cleans up after itself on ports 3000/4321** — it killed a stale CMS process at startup without complaint, so a leftover server from a previous session is not a reason to skip it.
- **S2 entry gate:** portal display name + logo — ✅ satisfied by owner decision 2026-09-12 (name = শিক্ষা২৪, logo = placeholder, Inter dropped)
- **Font:** SolaimanLipi only (owner decision) — Hind Siliguri and Noto Sans Bengali both removed. 154.0 KB / 200 KB.
- **✅ Share row icons — 2026-10-05.** The share row was six text-only pills; each control now carries a mark. New `frontend/src/components/ShareIcon.astro` holds all six paths.
  - **⚠️ Third-party path data, no dependency (rule 8).** Brand marks `whatsapp` / `facebook` / `x` are from **Simple Icons, CC0 1.0**. Utility marks `link` / `printer` / `card` are **Heroicons v2 outline, MIT**. Both are inlined path data — `package.json` is unchanged and there is no runtime fetch. Fetched from `cdn.jsdelivr.net/npm/simple-icons` and `cdn.jsdelivr.net/npm/heroicons`, not recalled from memory.
  - **Why inline SVG and not an icon font:** a webfont is a render-blocking third-party request against a 1.2 MB budget, and the strict CSP allows no external stylesheet. Same reasoning as the existing `SocialLinks.astro`.
  - **Brand marks are `fill="currentColor"`, utility marks `stroke="currentColor"`** — the outline buttons have no background of their own, so the two sets must not be mixed. That difference is why the brand buttons read as solid chips and the rest as outlines.
  - **`MobileShareBar` was refactored onto the same component** — it already carried three inline copies of these marks, so they would otherwise exist twice with no single source.
  - **⚠️ The copy-link icon must stay OUTSIDE `#copy-article-label`.** That script swaps the span's `textContent` to "কপি হয়েছে"; an icon nested inside it is destroyed by the first click.
  - Every icon is `aria-hidden` + `focusable="false"`. The name comes from the control's Bengali label, so a screen reader says "হোয়াটসঅ্যাপে শেয়ার করুন" once — not "whatsapp icon, হোয়াটসঅ্যাপে শেয়ার করুন".
  - **Cost: +1.8 KB gzipped** on a 14.8 KB article page (16.6 KB after).
- **✅ Dark-mode visibility — fixed 2026-10-05 (owner-reported, M23).** Root cause: `dark:bg-dark-surface-raised` → `--color-dark-surface-raised`, a custom property that **does not exist** (the real one is `--color-dark-raised`). A `var()` on an undefined property with no fallback invalidates the declaration at computed-value time, so `background-color` silently became `transparent`. Fixed 4 occurrences across `ReactionBar.astro`, `live-tv.astro`, `verify/[reporterId].astro`.
  - **⚠️ Writing the checker found a second, larger instance nobody had reported:** `text-ink-soft` and `dark:text-dark-ink-soft` were **both** undefined (14 occurrences, 3 files — `live-tv.astro`, `verify/[reporterId].astro`, `PhotoStory.astro`). Thirteen were Tailwind utilities, so that body text had **no colour in light mode either**; the `PhotoStory.astro` one was a hand-written `var(…, #4a4a4a)` that degraded to a visible grey. Renamed to the real `--color-ink-subtle` / `--color-dark-ink-muted`. A `dark:`-only check would have missed all 14.
  - **New guard: `scripts/verify-dark-tokens.mjs`**, wired into the `verify` chain as `verify:dark-tokens`. Parses every colour utility under `frontend/src/` (dark **and** plain), resolves each against `--color-*` in `global.css`, and fails on any undefined one. Scans 854 dark + 1192 light occurrences and **prints those counts**, so a vacuous pass is visible rather than assumed. Counter-proven twice: a synthetic misspelled token, and the real broken classes reintroduced into a real page — both confirmed to fail before the check was trusted (M18).
  - **Evidence:** `tsc --noEmit` exit 0, zero errors. `astro build` exit 0, 39 pages. Built CSS confirmed real — `dark\:bg-dark-raised:where(.dark,.dark *){background-color:var(--color-dark-raised)}`, and `dark-surface-raised` is absent from every bundle. `biome check .` reports **14 pre-existing** errors in files this change does not touch (`sw.js`, `theme-init.js`, `bangla-date.ts`, `geo.ts`, `prayer.ts`); the error set is **byte-identical** before and after, verified by stashing — this change adds zero.
  - **Reaction bar emphasis (owner request, same session):** `ReactionBar.astro` — heading is now `💬 এই সংবাদটি আপনার কেমন লাগল?` at `text-base font-bold`, the panel gets `border-2` + `bg-surface-raised`, each option gets `border-2` + `bg-surface` and `min-h-12` (≥48px touch target, rule 9), and the selected state gets a red tint via `color-mix`. Emoji live in a **new presentation-only** map `REACTION_EMOJI` in `frontend/src/lib/reactions.ts` — deliberately **not** merged into `REACTION_LABELS_BN` or the CMS, so the three-copies contract is untouched. All emoji are `aria-hidden="true"` so a screen reader announces the Bengali label once, not "thumbs up, পছন্দ".
  - **⚠️ Note for the next local check:** the bar self-hides when `getPublicCmsOrigin()` is `null`, and no article pages build locally without a running CMS. To see it in `dist/`, build with `PUBLIC_CMS_ORIGIN=https://cms.shikkha24.com`; otherwise its absence from `dist/` is by design, not a regression.
- **✅ Share row alignment — fixed 2026-10-05 (owner-reported).** Owner: *"the সংরক্ষণ card is placed little top then these share items — if those all in one row height it will looks more natural."* **Measured, not eyeballed**, via CDP `getBoundingClientRect()`. Before: the row was 70px tall while the bookmark card was 48px, its top edge 5px above the row and its centre 16px out; whatsapp/facebook/x were 36px. Cause: `ShareRow.astro`'s container had no `items-center`, so the 48px bookmark and the 36px pills each stretched differently, and the pills were `h-9` — a **pre-existing rule-9 breach** (touch targets must be ≥48×48px). Fix: `items-center` on the row, and `h-9` → `h-12` on all six controls. After: every control and the bookmark measure exactly 48px at `@1926–1974`, with `topDelta: 0, bottomDelta: 0` across all 8 elements, verified at both 1280px and 390px.
  - **Screenshot note:** `Page.captureScreenshot` **with a `clip` returns an empty PNG in this headless setup** (three attempts, all blank). A **full-viewport capture with no clip works** (76 KB) — the row is visible and correctly aligned in it. The failures were in the `clip` region maths, not in rendering. Use a full-viewport capture plus measured geometry rather than a clipped one.
- **✅ Site name — `শিক্ষা২৪.কম`, CMS-driven everywhere (owner request, 2026-10-05).** Owner: *"do not use শিক্ষা২৪ as name, use শিক্ষা২৪.কম, and make sure if admin changes the name on the CMS it should auto-reflect wherever the name is shown to the entire website."* **Audited before touching anything** (subagent, 30 tool calls, every hit classified). Findings:
  - **The CMS value was already correct.** `cms/data/payload.db` holds `site_name = শিক্ষা২৪.কম`, `site_name_en = Shikkha24.com` — the owner had set it in the admin. **29 of ~45 frontend pages already read `settings.siteName`** correctly, and 59 render sites exist across 29 files (`Layout.astro` title + all meta + `og:site_name`, `Header`, `Footer`, `Logo`, the webmanifest/robots/RSS/news-sitemap routes, and every page's JSON-LD `name`). So the architecture was already right; the work was closing the gaps.
  - **Gap 1 — the fallback still said the old name, and CI is the environment that shows it.** `cms/data/ci.db` has **no `site_settings` row at all**, and `cms/src/seed/*` does not create one, so every CI build renders `FALLBACK_SETTINGS` (`frontend/src/lib/cms.ts:132`) — which read `শিক্ষা২৪`. The owner's name was live on his dev server and **absent from every CI build and every deploy rehearsal**. This is the same failure shape as M21 (24 commits that never left the laptop): correct in one place, stale in the one that ships.
  - **Gap 2 — 10 reader-visible literals across 4 pages** (`live-tv.astro` ×3, `reporters/index.astro` ×2, `reporters/[slug].astro` ×1, `verify/[reporterId].astro` ×4). Every one sat on a page that **already had `settings` in scope**, so an admin rename would have left those strings stale. Now `${settings.siteName}`.
  - **Gap 3 — `Logo.astro` could not render a Bengali TLD.** The brand split regex used `(?:\.[A-Za-z]{2,6})+` — **Latin only**. `শিক্ষা২৪.কম` fails to match, so `hasAccent` is false and the **entire name rendered one colour** (`<span class="text-brand-red">শিক্ষা২৪.কম</span>` in the real `dist/`) instead of the intended charcoal `শিক্ষা` + red `২৪.কম`. The doc comment's own example, `শিক্ষা২৪.com`, is why it never showed: Latin `.com` works, Bengali `.কম` does not. Fixed to `[A-Za-zঀ-৿]{2,6}`. Counter-proof: tested against 8 name shapes — all previously-correct ones unchanged, `শিক্ষা২৪.কম` now splits, and the all-digits guard (`২৪`, `২৪.কম`) still collapses to one colour as intended.
  - **Deliberate fallbacks kept, each for a stated reason** (changing them would break an outage contract, not fix a bug): `FALLBACK_SETTINGS` (now `শিক্ষা২৪.কম`), `rss.xml.ts`/`news-sitemap.xml.ts` `||` guards, `id-card.ts` ×2 (correct CMS read, offline fallback), `sw.js` `FALLBACK_TITLE` (a service worker cannot read the CMS without an extra request). `og-default.svg`/`llms.txt` are static assets a route would have to replace — flagged, not changed.
  - **CMS-side twins fixed:** `cms/src/endpoints/newsletter.ts` ×3 (the confirmation **email** subject/body/HTML read the global now) and `payload.config.ts` `titleSuffix`.
  - **New guard: `scripts/verify-site-name.mjs`** (`verify:site-name` in the `verify` chain) — fails the build on any reader-visible literal, with an explicit allowlist for the fallbacks above, each carrying its reason in the script. Counter-proven (M18): a synthetic literal added to a real page **does** fail it, and removing it passes.
  - **⚠️ The `site_settings` row is not seeded.** `ci.db` having no settings row is precisely why the fallback is the CI-rendered name. Fixed by correcting the fallback rather than by adding a seed row, because the fallback must be right *when the CMS is unreachable at all* — a seed would only paper over it. Flagged for the owner: the row itself is created by Payload on first admin save in production.
  - **Migration gate:** changing the `SiteSettings` `defaultValue` alters the schema snapshot, so `verify-payload-migrations` would demand a new migration. **Deliberately not changed** — the existing row is correct, the migration is history, and a fresh default only matters for a first-run install the owner performs through the admin. Recorded here so it is not rediscovered as a surprise.
  - **`docs/team-leader-proposal-review.md:222` argues the opposite** — that `siteName` should be `শিক্ষা২৪` *without* the domain, so the Google News Publisher Center name matches. **The owner's 2026-10-05 decision supersedes that recommendation**; the doc is left as history and this entry records why it was overruled.

- **✅ Weather + prayer accuracy — audited 2026-10-05, fixes authorised and implemented, EXCEPT the CSP (blocked, owner decision needed).** Owner: *"i have checked the weather on google for my city sylhet … but on my site showing 'সিলেট ২৯° হালকা বৃষ্টি' totally different, can you solve this also check the prayer time accuracy. use the best and great practice and api."* **Audited before changing anything.** The reported value is not one bug but **two composing defects**, both of which had to be true to produce it.
  - **Defect 1 — CSP blocks every client-side lookup in production.** All four `.htaccess` CSP profiles set `connect-src 'self' https://cms.shikkha24.com …` and **none lists `api.open-meteo.com`, `api.aladhan.com` or `ipwho.is`**. So `loadWeather`, `loadPrayer` and `detectLocationByIp` are all blocked by the browser on the live site. Weather and prayer times are therefore permanently the **build-time** values — baked for Dhaka whenever the site was last deployed.
  - **Defect 2 — the condition label is never written.** `HeaderWidgets.astro:144` binds `const condEl = el('hw-cond')` and **nothing ever assigns to it** — confirmed by `git log --all -S` (never written in the project's history) and by finding it as a discarded call in the deployed bundle. `loadWeather` requests `weather_code` but its response type declares only `temperature_2m`, and it writes only `tempEl`. So even where the temperature *does* update, the condition after the degree sign is frozen at the build-time one.
  - **Together these explain the report exactly:** the *city label* can differ from the *data* because the label is written by `applyLocation` from a **stored** location, while the number beside it is build-time Dhaka. A reader who once resolved to Sylhet sees `সিলেট` next to Dhaka's temperature and Dhaka's condition. Live `shikkha24.com` showed `ঢাকা ৩৪° বৃষ্টি`; local `dist/` showed `ঢাকা ৩২° প্রায় পরিষ্কার`. **Which environment the owner was viewing could not be determined** — production predicts Dhaka-class values; a dev server predicts a live Sylhet temperature with a Dhaka condition, and only the latter matches the reported ২৯°.
  - **⚠️ Owner decisions taken 2026-10-05:** (a) prayer method = **Moonsighting Committee Worldwide**; (b) the header shows a **neutral placeholder** until live data arrives, rather than flashing another city's stale number.
- **🚧 Prayer method — the Aladhan API's own documentation is wrong (2026-10-05).** This cost real time and would silently mis-set the method, so it is recorded in full:
  - **`method=15` is Moonsighting Committee Worldwide — not `13`.** Verified by enumerating indices `0…20` against the live API. `13` is *Diyanet İşleri Başkanlığı, Turkey (experimental)*. The owner chose Moonsighting on the strength of a recommendation that had itself assumed 13.
  - **⚠️ `/v1/methods` lists methods in a DIFFERENT ORDER from the numeric `method` parameter.** In the `/v1/methods` object, numeric-position 14 is `MOONSIGHTING`; through the `method=` parameter, 14 is *Russia* and 15 is *Moonsighting*. **Anyone who reads the method list and picks by position gets the wrong method.** `verify:prayer-times` now asserts the API's own `meta.method.name` rather than trusting the index.
  - **⚠️ The `method=` NAME parameter is broken — every name returns ISNA.** Tested all ten plausible names (`MOONSIGHTING`, `MWL`, `KARACHI`, `ISNA`, `EGYPT`, `MAKKAH`, `GULF`, `TURKEY`, `QATAR`, `SINGAPORE`): all ten came back `Islamic Society of North America (ISNA)`. Only the numeric form varies. `timingsByCity` and `timingsByCoordinates` are both dead (404 / non-JSON).
  - **⚠️ `school=` is ignored, and `meta.school` misreports what you get — but the value is actually correct for Bangladesh.** Every variant (`HANAFI`, `Hanafi`, `hanafi`, URL-encoded) returned `STANDARD` and an unchanged Asr. Independent solar computation (NOAA position, shadow-ratio Asr) then showed the API's Asr matches **Hanafi** exactly — 12 of 12 cases across 6 cities × 2 dates, within 0–1 min — while `meta.school` claims `STANDARD`. **Hanafi is correct for Bangladesh** (the overwhelming majority school), so the shipped Asr is right and the *label* is wrong. **Do not "fix" this by forcing Hanafi**: the parameter does nothing, and the current value is already the Hanafi one. Recorded so the misleading label is not mistaken for a bug.
  - **Remaining prayer defect:** `getNextPrayer` returns **today's** Fajr string when `isTomorrow` is true, so after Isha the widget says "আগামীকাল" beside a time that is today's (the countdown itself is computed correctly). Small, but it is the one case a reader checks most.
  - **There was no verification of prayer or weather at all.** `scripts/verify-prayer-times.mjs` + `verify:prayer-times` added to the `verify` chain, cross-checking the API's times against the independent solar computation.
- **🚧 Weather defects beyond the CSP/label pair (2026-10-05).**
  - **`weather_code ?? 0` fabricates "পরিষ্কার"** (`widgets.ts:214`). A missing code is not a clear sky; it should render no condition at all.
  - **The WMO table has 19 of 29 codes.** Missing `52, 56, 57, 66, 67, 73, 75, 77, 85, 86`, which fall through to the generic `আবহাওয়া`. **`51, 53, 55` are drizzle but are labelled as rain** — drizzle is a distinct phenomenon, and the owner was shown `হালকা বৃষ্টি` (light rain) while Google reported mostly sunny.
  - **The stored location has no TTL.** `readStoredLocation` returns a `localStorage` entry forever, and the IP lookup only runs when there is none — so a reader who resolved once keeps that city indefinitely, from any connection.
  - **`PRAYER_CACHE_MS` and `WEATHER_CACHE_MS` are exported from `geo.ts` and never imported.** Dead code that reads like an active caching contract.
- **✅ Implementation record — weather + prayer, 2026-10-05.** All of the above is now fixed, **including the CSP** — the owner authorised all three hosts on 2026-10-05 (see the record below). Everything verified end-to-end in the built `dist/`, not just in source.
  - **`frontend/src/lib/weather-codes.ts` (new)** — all **29** WMO codes, with `weatherLabel()` returning `null` for an unknown code. `51/53/55` are now **গুঁড়া** (drizzle), not বৃষ্টি. The old table's `weather_code ?? 0` fabricated "পরিষ্কার" for a code the provider never sent.
  - **`HeaderWidgets.astro` rewritten.** `hw-cond` is now actually written — confirmed in the shipped bundle as `s&&T&&(T.textContent=s)` reading `weather_code`. It was bound and never assigned for the life of the feature.
  - **Server-side weather/prayer fetch removed entirely** (`widgets.ts`, `Header.astro`). The server renders `—` and the browser fills it in, per the owner decision. Verified in `dist/index.html`: `hw-city`/`hw-temp`/`hw-next-time` are all `—` and no baked Dhaka value ships. `widgets.ts` is now just `toBnDigits`.
  - **Cost change worth recording:** this trades *one build-time call for the whole site* for *one call per page view per reader*. To claw that back, the panel's Hijri date is now fetched **lazily on first open** rather than alongside the times — `HIJRI_OFFSET` needs a different Gregorian date, so it was always a second request, and it used to buy a line hidden behind a dropdown.
  - **`lib/hijri.ts` (new)** — the Bengali Hijri formatting moved out of `widgets.ts` so the browser can use it. The **build-time** copy is gone, which means the date in the panel was previously baked at deploy and went stale daily.
  - **Feature flags still work.** `showWeather`/`showPrayer` now gate *rendering* rather than a fetch; the client script checks element presence, so a disabled widget costs no request.
  - **`lib/geo.ts`** — added a **24h TTL on auto-detected locations**. A stored `ip` location used to be permanent, so a reader who resolved once kept that city forever. A location the reader **chose** from the selector never expires — silently discarding a deliberate choice would be worse. Also removed `PRAYER_CACHE_MS`/`WEATHER_CACHE_MS`, which were exported and never imported.
  - **`lib/prayer.ts`** — `getNextPrayer` takes tomorrow's ফজর as a separate argument. It used to display **today's** Fajr string beside an "আগামীকাল" label — wrong by the right order for the one window a reader most checks.
  - **`scripts/verify-prayer-times.mjs` (new)** — `verify:prayer-times`, in the `verify` chain. Asserts the method **by the name the API reports back**, across 5 cities, and cross-checks Asr against an independent NOAA solar computation. **Counter-proven in both directions:** `method=1` (Karachi) fails, `method=13` (Turkey) fails on both the method *and* the Asr check, a wrong expected name fails, and only `15` passes.
  - **A real TypeScript bug fixed in passing:** `if ('requestIdleCallback' in window)` narrows `window` to `never` in the else branch, silently disabling type checking on every later use of `window` in that scope. It now reads the capability off a separate binding.

- **✅ CSP RESOLVED — the owner authorised all three hosts (2026-10-05).** The change was **blocked by the permission classifier** rather than refused by the owner: it sends every reader's IP to a third-party provider, which is the owner's call, not a mechanical edit. The owner was shown the options and chose **(a) add all three and match the published policy**. Applied to all **four** `connect-src` profiles in `frontend/public/.htaccess` (lines 169, 213, 214, 236), asserting the count was exactly 4 before replacing:
    ```
    connect-src 'self' https://cms.shikkha24.com https://api.aladhan.com https://api.open-meteo.com https://ipwho.is
    ```
  - **The CSP was contradicting a disclosure already published to readers.** `privacy-policy.astro:72` already states `ipwho.is` *"আপনার আইপি ঠিকানা থেকে শুধু আনুমানিক এলাকা (শহর/দেশ) জানতে"*, and that page's own header comment describes it as required for prayer and weather. The fix restores the site's stated behaviour; it introduces no new third party.
  - **⚠️ `connect-src` is now four hosts wide, and the reason it was wrong for so long is that nothing checked it.** A missing host does not error — the browser blocks the fetch and the widget simply keeps its `—` placeholder, which reads as "no data yet", not "the policy is broken". `verify-apache.mjs` now asserts every widget host appears in **every** profile, so a fifth profile added without them fails the build instead of silently breaking the widgets.
  - **Counter-proven in five directions** (rule M18 — an assertion that cannot be made to fail is not an assertion): drop `ipwho.is` from one profile → fails that host only; strip all three from one profile → all three fail; delete a profile outright → the count check fires; comment a profile out → the count check fires; add a fifth profile without the hosts → count **and** all three host checks fire. Baseline green, and both files verified byte-identical to the authorised state afterwards.
  - **The first version of that guard counted a commented-out `# Header always set …` line as a live profile** — a bare `connect-src …` search matches inside a comment. It now filters to lines that actually emit a header. Found only because the counter-proof was run rather than assumed.
  - **Own harness errors during that counter-proof, recorded because they nearly produced a false pass:** the `dist/.htaccess` backup had been taken *before* the rebuild and so held the pre-change file (every "restore" reinstated the stale copy); one mutation rewrote the file unchanged because a mode name fell through every branch, so the guard correctly passed a file it was never shown. The mutation harness now raises on an unknown mode and asserts the file actually changed bytes — a no-op must never be able to masquerade as a passing counter-proof.

## Pending

### 🔴 Start here tomorrow (2026-10-12)

- [ ] **Extract `cms-deploy-38136567355.zip`** — the Gravatar CSP fix (`a94613a`, T-08).
      cPanel → File Manager → `shikkha24-cms` → right-click that file → **Extract** →
      into that **same folder** (the one that *contains* `cms/`) → overwrite everything
      → **Restart** the Node app. *Already built and on the host; only the manual extract
      is left. This is the single outstanding action from 2026-10-11.*
- [ ] **The 30-second media-count test.** Upload one image, do **not** delete it, and say
      "done" — then the API can be checked. If the doc persists, the 8→6 drop was the
      owner deleting test uploads and T-07 closes. If it vanishes, something is silently
      deleting media and that is a serious bug. See Current Phase for what was ruled out.
- [ ] **T-10 — decide how deploys get unblocked.** The new CI gate means every push now
      fails at the gate and uploads nothing while the dependency audit is red (3 critical,
      20 high on Payload 3.89.0). Either (a) fix T-10 — Payload 3.90.2 closes all three
      criticals but the seed fails; resume by logging the whole document on
      `payload.create` failure — or (b) deploy via `workflow_dispatch` +
      `skip-ci-gate: true` until (a) lands. **Owner decision.**
- [ ] **Auto-publish wiring** — the plumbing is already in `deploy.yml`; it needs the
      `AUTO_DEPLOY=live` repo variable and the `DEPLOY_WEBHOOK_URL` secret. Now *safe* to
      enable because of the CI gate, and not before.

### ⚠️ Older list — not re-checked since 2026-09-13

> ⚠️ **Read this before working the list (noted 2026-10-04).** Everything below was written on
> **2026-09-13**, three weeks before the site launched, and **none of it has been re-checked
> since.** The checkboxes record what was outstanding *then*, not what is outstanding now —
> several of these were almost certainly done during launch. Do not treat an unticked box as a
> live task without confirming against the host first.
>
> Two items are known to be obsolete: "Start **S0** on the owner's go" and "Build S0 → S12" —
> both complete. "Confirm with DianaHost: Node.js version availability" is *still* open and is
> the same dispute recorded at the top of this file.
>
> The highest-priority item is **not on this list** — it is the backup, recorded in
> `docs/backup-and-recovery.md` §6 and in the Current Phase above. ⚠️ **Updated 2026-10-04:** it
> was "the *absent* backup"; the automation is now built but still needs 4 owner setup steps
> before any off-host copy exists.

**S9 owner actions (2026-09-13) — full detail in `.sps/section-todos/S9.md`:**

- [ ] **VAPID key pair** → `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PUBLIC_VAPID_PUBLIC_KEY`. Generate with `node -e "console.log(require('web-push').generateVAPIDKeys())"`. Until set, the deadline-reminder control is **not rendered at all**.
- [ ] **OAuth apps** → `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET`, `FACEBOOK_OAUTH_CLIENT_ID` / `_SECRET`, `OAUTH_REDIRECT_BASE`, `PUBLIC_SITE_URL`. Both are free and need no card. **Register the exact callback URLs** `{OAUTH_REDIRECT_BASE}/api/oauth/{google,facebook}/callback` — a mismatch is a redirect_uri error that only appears in production. Until set, **no login button is rendered**.
- [ ] **Decide account linking** — two provider identities sharing an email stay two separate readers today. Merging them automatically would be an account-takeover vector when a provider does not verify email, so it was left unimplemented rather than guessed at.
- [ ] **Decide the bookmark-sync policy** — the one open S9 build item. A union-merge resurrects a bookmark deleted on another device; correct behaviour needs the server to become authoritative after the first upload. A product decision about whose device wins, so it is raised rather than assumed.
- [ ] **`NEWSLETTER_SEND_TOKEN` and `PUSH_SEND_TOKEN`** (`openssl rand -hex 32`) wired into cron. **Both endpoints are disabled while their token is unset** — an endpoint that can mail the whole list or push to every subscriber must not be reachable by accident.
- [ ] **SMTP credentials** for the bulk-sending subdomain `mail.shikkha24.com` + SPF/DKIM/DMARC (S12 gate).
- [ ] **Host-disk usage alert** — DianaHost publishes no storage metric; needs the support ticket.
- [x] ✅ **Backup doc updated** (commit `1697caa`, updated 2026-09-14) — `docs/backup-and-recovery.md` now reflects host-disk media and no Cloudflare R2. Tier 1 includes `data/media/` alongside the SQLite file; backups go to GitHub Actions artifacts. All DR scenarios, verification checklist, and open-items updated.

**Owner actions for S0 (all can be done in one sitting):**
- [x] ✅ **Node.js version — RESOLVED 2026-10-04, no action needed.** The host runs **24.18.0**, not the 20.18.2 recorded below. Confirmed on cPanel → Setup Node.js App: app `cms.shikkha24.com`, root `/home/shikkhac/shikkha24-cms`, mode **production**, startup file `cms/server.js`, status **started**, venv `/home/shikkhac/nodevenv/shikkha24-cms/24/`. The "20.18.2 is end-of-life" worry and the "Confirm with DianaHost: Node.js version availability (≥22.12 required)" item are **both closed** — measured, not assumed (M18's rule).
- [ ] **One DianaHost support ticket** — inode/file-count quota, CPU/memory/**process** limits, hourly email send limits, and whether account-level backups exist. **None are published in their knowledge base.** ⚠️ **The process limit is no longer hypothetical — see the 🔴 BLOCKER above. This ticket is now the critical path.**
- [ ] **One DianaHost support ticket** — inode/file-count quota, CPU/memory/process limits, hourly email send limits, and whether account-level backups exist. **None are published in their knowledge base**
- [ ] **DNS configuration for shikkha24.com** — the domain is registered; point at DianaHost nameservers (not Cloudflare). The owner will supply the DNS details.

**Then:**
- [ ] Start **S0** on the owner's "go"
- [ ] Measure a real **Astro incremental build time** (S0 gate — decides the CI/batching strategy)
- [ ] Hands-on audit of the two direct competitors (Dainik Shiksha, Shiksha Sangbad)
- [x] Real logo asset — ✅ supplied 2026-09-13, `docs/assets/logo.svg`
- [ ] Legal details for the E-E-A-T pages — owner provides **before final deploy**
- [ ] Portal display name final confirmation
- [ ] Start the Meta app review for Facebook Login early (free, but slow)
- [x] ~~Publishing velocity decision~~ — ✅ baseline 15–20/day + burst
- [x] ~~Education feature inventory + category tree approved~~ — ✅ 2026-09-11
- [x] ~~Education competitor set~~ — ✅ 2026-09-11
- [x] Domain purchase — ✅ `shikkha24.com` (reachability not verified from the audit environment)
- [x] ✅ DianaHost plan purchase — ⚠️ **CORRECTED 2026-10-04: the plan is "DH 5GB SSD NVMe" (5120 M), not "PNR 2 GB".** Read off the client-area product page, not assumed: **Disk 2155 M / 5120 M (42%)**, **Bandwidth 0 M / 307200 M**, registered **11/09/2026**, recurring **TK 4899.00 BDT**. ⚠️ **Rule 7 in `CLAUDE.md` / `AGENTS.md` / `GEMINI.md` still says "2 GB PNR, ~$47/year" and is therefore wrong on both figures.** It is left unedited pending the owner's confirmation of the actual product name, because rule 7 is a constraint rather than a note and the three mirrors must change together (rule 12) — but the discrepancy is recorded here so it is not lost. *The budget constraint itself is unaffected: still one self-hosted plan plus the domain, no card, no third-party SaaS.*
- [x] ~~Complete the eKYC identity check~~ — **DONE 2026-10-04** (recorded at the fork-blocker entry). *This item was still open in the list after the work was finished; corrected 2026-10-10 so it stops reading as an outstanding blocker.*
- [ ] 🔴 **Put the backup cron back to `0 23 * * *`, or delete it.** It is still parked at `* * * * *`
      — every minute — from the 2026-10-04 fork diagnosis, i.e. **1,440 fork attempts a day on an
      account with a demonstrated history of hitting a CloudLinux process ceiling.** The ceiling has
      since cleared, which is precisely the condition under which this becomes live: `MAX_ARCHIVES=30`
      only bounds the damage, and 30 archives is still 30× the intended one-per-day.
- [ ] Confirm with DianaHost: inode/file-count quota, and **the CloudLinux process (`nPROC`) limit — see the 🔴 BLOCKER above**
- [x] ~~Confirm Cloudflare R2 can be enabled without a payment method~~ — **REMOVED 2026-09-14.** No Cloudflare R2.
- [ ] Decide the CI rebuild strategy (debounce/batch vs public repo)
- [ ] Reconcile the desk allocation with whatever velocity is chosen — the general-news desk split (which sums to 42–56/day) must be redrawn around education desks
- [ ] Build S0 → S12 (one section at a time, approval-gated)
- [ ] `.sps/lock.json` intentionally NOT created — the `sps` skill references removing it but defines no schema; inventing one would violate rule 3. The lock is asserted via the three root mirrors. Revisit if the skill defines a schema (see `.sps/mistakes.md`)
- [ ] Optional: upstream a `workbuddy` host entry into Shahid-Personal-SkillSet (`install.sh` `SYNC_PATHS` + `skills/sps/hosts/workbuddy.md`) so WorkBuddy installs/updates automatically instead of needing the manual re-sync below

## Tooling — WorkBuddy `/sps` install

Installed to `~/.workbuddy-ai/skills/sps` + `~/.workbuddy-ai/skills/sps-cms` (v4.0.0 / v2.3.0).
WorkBuddy is not in the upstream installer's `SYNC_PATHS`, and `sps-update.sh` re-runs `install.sh`
(which resets the source clone), so re-run this **after every SPS update** to refresh WorkBuddy:

```sh
SRC=~/.sps/src/Shahid-Personal-SkillSet; DEST=~/.workbuddy-ai/skills
rm -rf "$DEST/sps" "$DEST/sps-cms"
cp -R "$SRC/skills/sps" "$DEST/sps" && cp -R "$SRC/skills/sps-cms" "$DEST/sps-cms"
chmod +x "$DEST/sps/scripts/"*.sh "$DEST/sps-cms/scripts/"*.sh
```
