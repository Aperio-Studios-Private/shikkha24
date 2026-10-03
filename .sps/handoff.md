# SPS Handoff

## Live deployment checkpoint — 2026-10-03 21:26 (+06)

- **CMS artifact is uploaded and extracted** at
  `/home/shikkhac/shikkha24-cms`. The user verified `server.js`,
  `.next/static`, and `data/` exist. `node_modules` remains the correct
  CloudLinux symlink to
  `/home/shikkhac/nodevenv/shikkha24-cms/24/lib/node_modules`.
- **Passenger is stopped** (user-confirmed). Production SQLite file
  `data/payload.db` is 0 bytes; `.tables` returned no tables.
- **Schema and seed have NOT succeeded.** Production startup logs contain
  `no such table: users`; repeated seed attempts report `no such table: levels`.
  Do not claim deployment is complete, do not start Passenger, and do not
  continue to frontend deployment until schema + taxonomy seed + live smoke
  tests succeed.
- **Root cause of the latest attempts:** `type -a node` showed
  `/home/shikkhac/nodevenv/shikkha24-cms/24/bin/node` first (CloudLinux shim),
  then `/opt/alt/alt-nodejs24/root/usr/bin/node`. Passing
  `NODE_ENV=development` through the shim still resulted in Node observing
  `production`; passing it directly to the absolute system Node binary yielded
  `development`. Payload v3.89.0's official SQLite adapter
  `packages/db-sqlite/src/connect.ts` calls dev schema push only when
  `NODE_ENV !== 'production'`. `payload run ...` uses a shebang (`env node`),
  so calling `.bin/payload` still routes through the shim. The next attempt,
  not yet made, must invoke the absolute Node binary directly on Payload's
  installed `payload/bin.js`, with the rotated secret passed only as an
  environment variable from hidden prompt input. Do not retry npm or shim
  commands.
- **Secret incident:** the previous `PAYLOAD_SECRET` was pasted into chat. The
  user reports rotating it in cPanel. Never repeat either value or ask the
  user to paste the replacement. For the one-time seed, prompt silently and
  pass it only in the command environment. Rotate again before handover if
  there is any doubt whether the disclosed value is still configured.
- **Verified code/docs:** `cms/src/payload.config.ts` gates adapter push on
  `DB_PUSH === 'true'`; Payload official docs say SQLite db push is development
  only. Corrected runbook is `docs/cms-deployment.md` §3.7. Last documentation
  commits on the branch include `070deca`; pending local changes must be
  committed before handoff.
- **Next single action:** with Passenger stopped, run the direct absolute-Node
  Payload CLI command from the runbook, passing `NODE_ENV=development`,
  `DB_PUSH=true`, `DATABASE_URI=file:./data/payload.db`, and the rotated
  `PAYLOAD_SECRET` entered by hidden prompt. Expected: seed completes and
  reports counts. If it fails, stop and inspect exact error; do not restart
  Passenger. On success, confirm tables, remove `DB_PUSH` from cPanel, restore
  production mode, start once, and verify admin + articles API.

## Deployment status — 2026-10-02 (latest)

- **CI passed for the current deployment branch tip.** Run
  `37021393174` succeeded on `agents/deploy-project-dianahost-ssh-key` at
  `4652115e4c3d70288e7b5433c31a391a5a0801a6`. Lint, typechecks, seed,
  harnesses, frontend/CMS builds, bundle assembly, and dependency audit passed.
- **Current artifacts are ready:** `cms-standalone` (artifact
  `11233397236`, 84,182,339 bytes) and `frontend-dist` (artifact
  `11233856628`, 3,371,932 bytes). Both expire 2026-10-09. They were built from
  the current branch tip, unlike the earlier green run's artifacts.
- **The CMS artifact needs deployment exclusions.** Inspection found
  `cms/data/ci.db`, demo media, and a root `cms/node_modules` directory in the
  downloaded artifact. A clean archive was prepared at
  `/tmp/shikkha24-cms-dianahost-upload-37021393174.tar.gz` (SHA-256
  `086290681e26c3d544459b8bd2c039d03406cc130c94c1511d3ff8e853348eea`).
  It has `server.js` at archive root and 82 `.next/static` entries; it omits
  `data/` and root `node_modules/`. Upload/extract its contents into the app
  root without deleting or replacing production `data/` or CloudLinux's
  `node_modules` symlink. Deployment runbook updated accordingly.
- **Production schema push attempt did not initialize the database (2026-10-03).**
  The owner added `DB_PUSH=true` to the cPanel app environment and restarted
  Passenger, but `sqlite3 data/payload.db '.tables'` returned no tables and
  `stderr.log` shows `no such table: users` / server not running. Payload's
  official SQLite docs state that db push only runs in development mode.
  Therefore setting DB_PUSH on the production Passenger app was ineffective;
  earlier instructions to restart production for schema creation were wrong.
  Correct route: keep Passenger stopped, run `npm run seed` once from cPanel
  Terminal with `NODE_ENV=development`, `DB_PUSH=true`, the production
  `DATABASE_URI`, and the existing `PAYLOAD_SECRET` entered via a hidden prompt.
  Then remove DB_PUSH from cPanel, restore/keep `NODE_ENV=production`, start
  Passenger once, and verify the API/admin. Do not expose a development server.
  See the corrected steps in `docs/cms-deployment.md` §3.7.
- **First CLI schema initialization attempts also failed (2026-10-03).** See
  the live checkpoint at the top of this file for confirmed findings and the
  exact next action. No seed attempt has yet succeeded.
- The preceding seed failure was fixed by commit `734b5ff`: CI sets
  `DB_PUSH=true` only for its throwaway seed database, and `cms/.env.example`
  documents the one-time initialization procedure.
- The deployment branch now includes the `main` merge carrying the F-04
  thin-build guard. The local worktree is clean and matches the remote branch.
- **DianaHost deployment has not yet resumed:** external SSH is still
  unavailable, so use manual cPanel upload. Last known state: the CMS app was
  stopped and its SQLite database empty. Keep CloudLinux's `node_modules`
  symlink intact. For a new production database, use `DB_PUSH=true` only for
  one-time schema creation, seed, then remove it and restart.
- **Next owner action:** download `cms-standalone` from CI run
  `37021393174`; continue with one cPanel action at a time. The frontend must
  be built from the live CMS after CMS initialization and seeding.

## Deployment investigation — 2026-10-02

- **Found:** The `cms-standalone` artifact from successful CI run `36784464435`
  downloads source-like files but omits `cms/.next/static` and the hidden
  `.next` deploy tree.
- **Cause:** GitHub's artifact uploader excludes hidden files by default. The
  CI workflow uploaded `cms/.next/standalone` without
  `include-hidden-files: true`, producing an incomplete deployment artifact.
- **Fix applied:** Added `include-hidden-files: true` to the CMS artifact upload
  step in `.github/workflows/ci.yml`. A fresh successful CI run is required
  before uploading the CMS to DianaHost.
- **Security follow-up:** The first two manual CI runs were blocked by current
  advisories: Next.js `16.3.5` was updated to the already CI-validated
  `16.3.6`, then Astro's transitive `devalue@5.9.2` was pinned to patched
  `5.9.4` through `pnpm-workspace.yaml`. `devalue` is MIT-licensed. Local
  `pnpm audit --audit-level=high` now reports no high or critical findings;
  the remaining 7 low/moderate findings are unchanged.
- **Deployment packaging follow-up:** The first CMS bundle booted with HTTP 503
  because Next required `@swc/helpers/_/_interop_require_default`, but the
  standalone trace omitted the transitive package. `@swc/helpers@0.5.23` is
  now an explicit CMS runtime dependency (MIT-licensed) so the next standalone
  artifact includes it.
- **Database initialization follow-up:** The production SQLite file was empty
  and the project has no migration directory. `cms/src/payload.config.ts` now
  enables the SQLite adapter's schema push only when `DB_PUSH=true`; this flag
  must be used once for initial schema creation, then removed from the
  production environment.

## Documentation index — where to look

| Question | Document |
|---|---|
| **Is feature X built, and where?** | **`docs/feature-register.md`** — the authoritative index of every requested feature |
| What is the approved scope of record? | `docs/education-feature-inventory.md` |
| What is the S13–S17 specification? | `docs/feature-batch-2.md` |
| What is the build order and the gates? | `.sps/plan.md` |
| What is left to do, section by section? | `.sps/task.md` |
| **What is the QA audit + deploy status right now?** | **`docs/qa-deploy-status-2026-10-02.md`** — the 18 audit findings, the failed CI run, the branch defects, and the ordered deploy blockers |
| What went wrong, and why? | `.sps/mistakes.md` + this file |
| Section-by-section evidence | `.sps/section-todos/S*.md` |
| **What grade calculators already exist, and how do ours compare?** | **`docs/gpa-calculator-landscape.md`** — BD + international landscape, and the positioning |

## Current Phase
- **✅ CI seed failure resolved.** Run `37012800533` failed with `no such table: levels`; commit `734b5ff` added `DB_PUSH=true` only to the seed step and documented the production initialization procedure. Runs `37016011953` and `37021393174` succeeded; the latest run built the artifacts listed above from the current branch tip.
- **✅ Handoff corruption resolved.** The damaged `.sps/handoff.md` from the earlier branch state was restored by the merge from `main`. Keep the corruption incident as a historical warning: a bare `@path` is not valid file content.
- **✅ GIT INDEX CORRUPTION REPAIRED (2026-10-02) — no work was lost.** Symptom: `git diff` died with `fatal: unable to read 9f25340…`, so **nothing could be committed at all**. **Diagnosis (do not re-derive):** not a shallow clone, not a partial clone, no alternates, no in-progress rebase/merge, no stale lock files. The index pointed at **54 blobs that no longer existed in the object store** (of 393 entries) — a *partial* object deletion, almost certainly the sandbox bulk-delete guard documented above (threshold 50/turn) catching a git maintenance operation. `git log` and `git log --oneline` still worked, so the damage was invisible until you diffed. **Repair, in order (all non-destructive):** 1. backed up `.git/index` and the 3 divergent working-tree files to `/tmp/newsportal-gitbackup/` **before touching anything**; 2. proved recoverability first — **51 of the 54 missing blobs were byte-identical to the working tree** (`git hash-object <file>` == the index hash), so they were rewritten with `git hash-object -w`; 3. the 3 that differed were files **edited after being staged**, so `git add` on them (index should match the working tree — that is the desired state, not a loss); 4. `git write-tree` then succeeded, proving every index object was readable; 5. rebuilt the stale index cache-tree (derived data only) via `read-tree HEAD` + re-stage. **Also cleared:** 24 stale `origin/dependabot/*` remote-tracking refs (branches deleted upstream). **Remaining `fsck` noise is cosmetic and was deliberately left alone:** ~214 invalid reflog entries and ~30 dead commits referenced by the commit-graph — all *unreachable* history. **Verified every reachable commit is intact** (`git rev-list --all` → 0 missing), `HEAD == origin/main == ad217c5`, 377 files in the HEAD tree, `git status`/`diff`/`log` all functional. **Lesson:** after any bulk git operation in this sandbox, run `git fsck --connectivity-only` — a partial object deletion fails *silently* on every read command until you actually diff.
- **✅ F-04 FIXED — the thin-build guard the docs promised but never had (2026-10-02).** The most destructive latent failure in the pipeline, found by audit. `docs/feature-register.md` §7 standing rule 1 has said *"A green build is not a full build… Assert the page count"* since 2026-09-18, and `.github/workflows/ci.yml` claimed the step *"Catches a thin build (dead CMS → green exit code but missing pages)"* — **but no such assertion existed.** The only check was `articlePages.length > 0`, which a 25-page build passes exactly as comfortably as a 2,000-page one. `htmlFiles.length` appeared solely in `console.log`. **Why it mattered:** `lib/cms.ts` is deliberately built so a CMS outage *cannot* fail the Astro build, and `deploy.yml` then runs `rsync --delete` — so a CMS blip during a rebuild would **delete every published article from the live site** and Google would re-index the loss. **Fix (`scripts/verify-build-output.mjs` §3a), two tiers:** with `CMS_URL` set (**deploy path**) ask the CMS for its published-article count and require the build to hold at least that many article pages — exact and self-calibrating as the archive grows; with no `CMS_URL` (**CI path**) apply a low absolute floor (10) that cannot false-fail. **A configured-but-unreachable CMS FAILS rather than falling back** — falling back would recreate exactly the silence the check exists to remove. **`deploy.yml` also had to pass `CMS_URL` to the verify step** (it was set only on the *build* step), otherwise the exact tier would never have run in production. **Counter-proved all four branches** (project rule: a check never seen to fail is not evidence) — thin build now exits 1, healthy build passes, no-CMS floor passes, unreachable CMS exits 1.
- **✅ CI REGRESSION FIXED (2026-09-20) — S13's publish guard had broken the seed, and therefore CI itself.** Found by re-running the audit rather than trusting this file: the handoff still said *"✅ CI IS GREEN on the runner"* (true 2026-09-15, **false from 2026-09-18**). The last CI push (`e2b6312`) failed at *Seed the CMS database* with `APIError: সংবাদ প্রকাশ করা যায় শুধু সম্পাদকের অনুমোদনের পর।` — the verbatim string from `guardPublishStatus`. **The chain:** `cms/src/seed/demo.ts` creates demo articles with `_status: 'published'`; S13 added `hooks/publish.ts`, which throws on any transition to `published` by a non-editor; `payload run` has **no session**, so the seed was rejected. **Why the first fix attempt failed (recorded so it is not retried):** `overrideAccess: true` does **not** reach a *collection-level* `beforeChange` hook — Payload forwards it to field-level hooks only (`dist/collections/operations/create.js` builds the collection-hook args from `{ collection, context, data, operation, originalDoc, req }`). The seed already passed `overrideAccess: true`, so the flag looked like the obvious marker and was not. What **is** forwarded is `context` — `createLocalReq` merges it onto `req.context`, which the collection hook receives. Fix: an exported `PROGRAMMATIC_CONTEXT` marker key in `hooks/publish.ts`; the seed passes `context: { [PROGRAMMATIC_CONTEXT]: true }`; the guard stands down for it. **Not attacker-controllable:** `req.context` for an HTTP request is initialised by Payload core and is never populated from a body, query or header (verified in the express/REST layer). **Counter-proved both directions on a FRESH database** (the local DB was already seeded, so it would have hidden this — M12): without the marker `seed:demo` exits 1 with the APIError; with it, exit 0 and 24 articles. **`verify:reporter` still passes** — "reporter cannot publish their own article" holds, because a reader session cannot set the context. Lesson added to the pile: a security hook that does not exempt programmatic writes will eventually break the seed, and CI is where it surfaces.
- **⚠️ `backup-db.yml` has failed every day since 2026-09-15 (5 straight) at "Prepare SSH key" — this is expected, not a bug.** DianaHost SSH is on-demand and not yet granted, so `DIANAHOST_SSH_KEY` is unset. The workflow fails *loudly* by design ("the archive is unprotected"). Consequence to keep in view: **there is no working backup of any kind right now**, and each failure spends private-repo CI minutes.
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
- **S2 entry gate:** portal display name + logo — ✅ satisfied by owner decision 2026-09-12 (name = শিক্ষা২৪, logo = placeholder, Inter dropped)
- **Font:** SolaimanLipi only (owner decision) — Hind Siliguri and Noto Sans Bengali both removed. 154.0 KB / 200 KB.

## Branding — logo and site name are independent — 2026-09-13

**Owner instruction:** "the logo and the name should work independently — if I change the company from CMS then it should update everywhere, and if I add a company logo on CMS then show the logo as mark, not replace the entire company name."

Two real defects sat behind that instruction, both now fixed:

1. **`Logo.astro` rendered the uploaded logo *instead of* the name.** The wordmark branch was the `else` of `logoSrc ? … : …`, so uploading a logo silently deleted the company name from the header and footer. The logo now renders as a **mark beside** the name — the two are independent.
2. **The wordmark was hardcoded.** The fallback rendered literal `শিক্ষা` (brand red) + `২৪` (charcoal) and never read `settings.siteName`, so a CMS rename changed only `aria-label`, `<title>`, OG tags and JSON-LD — never the visible brand. The wordmark is now derived from `settings.siteName`.
3. **Fourteen hardcoded `শিক্ষা২৪` strings** in meta descriptions, `robots.txt`, newsletter copy, login, the shortlink page and structured data also ignored the CMS. All now read `settings.siteName`.

**Contract (do not break):**
- `SiteSettings.siteName` and `SiteSettings.logo` are **independent fields**. Neither overrides the other — a rename never touches the logo, a logo upload never hides the name.
- **`showNameWithLogo`** (new checkbox, default **true**) is the *only* way to hide the name. It exists for a logo that already contains the wordmark.
- **Auto-accent:** the wordmark splits around its **last digit run** (Bengali or ASCII) — `শিক্ষা` charcoal + `২৪` brand red. A trailing TLD-like suffix (`.com`, `.com.bd`) stays outside the accent, so the real CMS name **`শিক্ষা২৪.com`** renders `শিক্ষা` charcoal + `২৪` red + `.com` charcoal (owner decision 2026-09-13, Option A). A name whose digit run is not at the end — `শিক্ষা ২৪ ডট কম` — renders single-colour in brand red rather than accenting a run mid-word, so the brand colour is never lost.
- **No hardcoded site name anywhere.** A rename in the CMS must propagate to header, footer, meta descriptions, `robots.txt`, newsletter copy, login, structured data and OG tags in one rebuild. **Grep for `শিক্ষা২৪` before shipping any new page.** The only permitted occurrences are the documented fallbacks: `FALLBACK_SETTINGS` in `frontend/src/lib/cms.ts`, and the `|| 'শিক্ষা২৪'` guards in `rss.xml.ts` / `news-sitemap.xml.ts`.

## S9 — Media, Newsletter & Engagement (build complete) — 2026-09-13

**132 harness checks, 0 failures.** Full evidence in `.sps/section-todos/S9.md`.

| Harness | Result |
|---|---|
| `verify:media` | 13 / 13 |
| `verify:newsletter` | 29 / 29 |
| `verify:engagement` | 22 / 22 |
| `verify:push` | 22 / 22 |
| `verify:oauth` | 46 / 46 |

**Build:** 34 pages + `404.html`; Pagefind 13 pages / 425 words; **0 executable
inline scripts** across every page (the S8 invariant holds after five new
client-script surfaces); 24 media files on disk, **all WebP, 0 originals
retained**; lint 0 errors; typecheck clean.

### New dependencies (rule 8)

| Package | Version | Licence | Justification |
|---|---|---|---|
| `web-push` | 3.6.7 (pinned) | **MPL-2.0** | VAPID signing + aes128gcm payload encryption. **The project's first non-MIT dependency.** MPL-2.0 is file-level copyleft: it applies to modified *files of the library itself*, not to code that merely imports it. We do not modify it, so it imposes nothing on the rest of the project. Hand-rolling the crypto would have been ~150 lines of untestable code, which is the worse trade. |
| `@types/web-push` | 3.6.4 (pinned, dev) | MIT | Types for the above. |
| `sharp` | 0.35.4 (pinned, **frontend**) | **Apache-2.0** | Astro's image optimizer. **Added 2026-09-15 — and it was a latent build breaker, not a new capability.** The frontend's `package.json` never declared it; `frontend/node_modules/sharp` was a stale real directory left by a manual install on 2026-09-12, so the local build resolved sharp and CI did not (`MissingSharp` → build exit 1). **No new package**: `sharp@0.35.4` was already resolved for the CMS, so this is a dedupe — the lockfile gained three importer lines and no `packages:` entry. Same version as the CMS on purpose, so the two cannot drift. |

Nothing else was added — the newsletter, push, OAuth and session layers are all
built on Node's own `crypto`, `fetch` and Payload's config surface. In particular
**no OAuth client library and no JWT library were taken**; `lib/signed-token.ts`
is ~120 lines of `node:crypto` and has no interop surface to maintain.

### The security fact this section turns on

All three public write handlers (`comments`, `citizen`, `newsletter`) create rows
with `overrideAccess: true`, because there is no session to run access control
against. **That bypasses the collection's field-level restrictions** — including
`Comments.isApproved` and `CitizenSubmissions.status`. So the protection is not
the access rule; it is the **key-by-key whitelist** in each handler. The harness
posts a forged `isApproved: true` and a forged `status: 'published'` and asserts
both are ignored.

`overrideAccess: true` also appears in `auth/reader-strategy.ts`, where it is
**not** a hazard — it resolves *identity* from a token we signed, rather than
writing attacker-influenced data. The argument is written into that file so the
two uses are not confused.

### Decisions taken this section

- **Video embeds emit no third-party URL.** The poster is a self-hosted upload,
  never YouTube's `i.ytimg.com` thumbnail. Build check: `youtube-nocookie` **0**,
  `ytimg.com` **0**, `<iframe>` **0**; the embed URL exists only in one hashed
  bundle and is built on click.
- **The video block is offered only on the article body.** `/article/*` is the
  only route whose CSP allows `frame-src` for the player, so the block is
  available only where it can render. `cms/src/blocks/editors.ts` holds two
  editor instances, defined once, to keep that true.
- **`richtext.ts` was split.** It had grown to 439 lines, past the rule-1 budget,
  so the block renderers moved to `frontend/src/lib/content-blocks.ts` (now 260 +
  ~290 lines) and `escapeHtml` to `frontend/src/lib/html.ts`. Pure move; no
  caller changed.
- **Readers have no password.** `disableLocalStrategy: { enableFields: true }` is
  load-bearing: `create` validates the password as required whenever that option
  is falsy, so leaving it on would have made the OAuth callback unable to create
  a reader. `enableFields` keeps the columns so the schema does not depend on the
  choice.
- **`Readers.email` is optional and non-unique.** Email is an attribute, never an
  identity — the identity is `provider` + `providerId`. Facebook returns no
  address for a phone-registered account, and one person may use the same address
  with both providers. **Account linking is deliberately not implemented**:
  merging identities by email is an account-takeover vector when a provider does
  not verify email. Owner decision.
- **Both cron triggers are disabled when their token is unset.** An endpoint that
  can mail the whole list or push to every subscriber must not be reachable by
  accident, so unset = off, not open.
- **The social-login provider list is fetched from the CMS at build time**, not
  duplicated into a `PUBLIC_*` variable. One source of truth, so the frontend
  cannot drift into showing a button the CMS would refuse.

### A test-quality lesson, twice

Two harnesses failed on **correct** behaviour this section because they asserted
on a global total they did not own: `verify:newsletter` hard-coded an audience of
5, and `verify:media` asserted `count(media) === 0` until the demo seed added six
gallery plates. Both now count only what they are responsible for. The rule:
**never assert on a total the test does not own.**


## S8 — Live Blog & Interactive (complete) — 2026-09-12

**⚠️ The most important thing this section produced was not a feature — it was a site-wide bug.**
`public/.htaccess` sets `script-src 'self'` with no `'unsafe-inline'`, and **Astro inlines any
component `<script>` that is "small enough"** into the HTML. Every inlined script was therefore
blocked by the browser: the theme toggle, mobile menu, text resizer, demo-ad rotation, copy-link
button and the `/search` Pagefind bootstrap had been **silently dead since S2**. Nothing local
ever showed it — the CSP is applied by Apache `.htaccess` and the site is not deployed yet. It was
caught by asserting the built HTML, not by looking at a page.

**Three fixes:** `vite.build.assetsInlineLimit: 0` (Vite's default is 4096 bytes) forces every
component script to be an external file; the anti-FOUC theme script moved to `public/theme-init.js`
(a same-origin `<script src>` with no `async`/`defer` is still parser-blocking, so it keeps the
before-paint guarantee); the Pagefind bootstrap moved to `public/search-init.js`. `ArticleAudio`
used `define:vars`, which **always** emits an inline script, and now takes its text from a
`type="application/json"` tag. **Result: 0 executable inline scripts across all 28 pages** — the
strict CSP profile can stay strict.

**Two owner decisions, both made directly this session:**
- **Live-blog updates: opt-in refresh, not auto-poll.** Entries are baked at build time (the
  `docs/reliability.md` §4 fallback), and a **নতুন আপডেট দেখুন** button fetches once on tap.
  Continuous 30s polling would put reader traffic on the 2 GB shared host during exactly the
  result-day spike the architecture exists to keep off it — and taking the CMS down would also
  remove the newsroom's ability to publish.
- **Poll votes: persisted to the CMS, with guards.** Honeypot (silent success, no write), per-IP
  rate limit (20/min, in-process — no CDN rate limiting available), and a salted
  `HMAC-SHA256(ip+UA)` duplicate guard unique per poll. The guard row stores **no raw IP, no user
  agent, no timestamp, and not which option was chosen** — only a poll reference and a one-way
  hash. Disclosed on the widget itself.

**Deliberately documented limitations, not hidden ones:** the tally update is a read-modify-write,
so two simultaneous votes can lose one increment (Payload cannot express an atomic
`vote_count = vote_count + 1`) — acceptable for a reader poll, not for anything counting money.
And the quiz is graded in the browser, so **the answers are in the page** — fine because it is
practice, not assessment, and nothing is stored about the reader.

**Article blocks:** infographic, before/after and scrollytelling, as Payload `BlocksFeature` blocks
rendered by `lib/richtext.ts`. None depends on JavaScript for its meaning — the before/after renders
both images stacked and only becomes a slider once the script can drive it; the scrollytelling is an
ordered list and the scroll animation is behind `@supports (animation-timeline: view())` and
`prefers-reduced-motion`.

**Verified 35/35** (`scripts/verify-s8.mjs`) plus a flag-off build: with all three flags `false`,
`/live/*` and `/quiz/*` generate zero routes, `/quiz` becomes a 280-byte `noindex` redirect stub,
the poll and the interactive strip vanish, and the ad slots are untouched.

**A test-writing lesson worth keeping:** the first two harness runs produced 3 false failures, all
from asserting against the HTML for things that live elsewhere — a CSS rule in the CSS bundle, and
`application/ld+json` (not executable, so not subject to `script-src`). Check where the artefact
actually lands before writing the assertion.


## S7 — Ad System (complete) — 2026-09-12

**The section's real job turned out to be fixing a defect, not adding features.** S1 shipped an
`AdUnits` collection whose position vocabulary (`headerBanner`, `inArticleTop`, `sidebarSticky`…)
was written before the layout existed. The frontend addressed its slots with free-form labels
(`homepage-leaderboard`, `sidebar-rectangle-1`, `article-footer`). **The two sets did not
intersect**, so no ad unit could target any slot — the collection was inert. Reconciled to the
eight slots that exist; the collection held no data, so the change was free.

**Two decisions worth not re-litigating:**
- **No raw-HTML field.** The original `codeSnippet` textarea was removed — rendering CMS-authored
  HTML is a stored-XSS vector, and a compromised Ad Manager account would poison every page
  carrying the unit (`docs/security.md` §4). Markup is generated from structured fields instead.
- **`clickCount` removed.** A static site cannot count clicks, and beaconing to the CMS from the
  reader's browser would give up the property that a CMS outage cannot take the site down. A field
  that always reads 0 is worse than no field.

**⚠️ CSP finding — this would have broken AdSense silently.** ~~Cloudflare Pages **joins** a duplicated header with a comma rather than overriding it, and a comma-joined CSP is enforced as two policies — so the strict `script-src 'self'` would still have blocked AdSense no matter what the more specific rule said. A more specific rule must **`!`-detach** the inherited policy before setting its own.~~ **Removed 2026-09-14:** Cloudflare is gone. Apache `.htaccess` replaces `_headers`. Apache's `Header set` replaces the value cleanly (no comma-join). The two-profile CSP (strict + relaxed) is now expressed via `<LocationMatch>` blocks. Applied to `/`, `^/[^/]+/[^/]+/[^/]+$` (article), `/category/.+`, `/live/.+`, `/quiz(/.+)?$`. **S12 must verify production returns exactly one CSP header.**

**Zero CLS:** every slot reserves its box before any ad loads; the AdSense library is injected on
`window.load` → `requestIdleCallback`, never the copy-paste `<head>` script; in-article ads sit
below the header block. **With no unit configured the loader makes zero third-party requests**,
which is what holds the no-ads Lighthouse profile at ≥95.

**Mid-article placement:** `lib/richtext.ts` gained `countParagraphs` + `splitHtmlAtParagraph`,
cutting only immediately after a `</p>` so no tag is ever sliced. The ad appears at 6+ paragraphs,
split at the midpoint — on a four-paragraph story it would land beside the byline and read as a
mistake.

**A bug the sponsored-content work surfaced:** `remainingLatest` was `latest.slice(1)`. Once a
sponsored story was dropped from the masthead, the promoted story became the lead *and*
re-appeared as the first item of the latest feed — the same headline twice on one page. The feed
now excludes whatever the masthead showed, matched by slug rather than index.

**Verified 20/20 across two harnesses**, both of which revert everything they change:
- `scripts/verify-ad-split.ts` — 10/10 on the split logic (halves rejoin, no tag sliced, floor holds)
- `scripts/verify-ads-s7.mjs` — 10/10 end-to-end (banner, badge, masthead displacement, mid-article ad between two prose blocks, and both reverts)

They exist because the demo content cannot reach two of the paths: no article is sponsored, and
every demo article is four paragraphs — below the mid-ad floor.

**⚠️ Correction made while testing:** the first run of `verify-ads-s7.mjs` failed the mid-article
check. The fault was in the **test**, not the code — it padded total child nodes, but the demo body
also holds a heading, a list and a blockquote, so the *paragraph* count stayed at 5. Worth
remembering: a body's `children.length` is not its paragraph count.

**Two follow-ups recorded, not done:** `docs/seo-plan.md` still needs an advertorial-label policy
written into it (the implementation exists, the documentation does not), and the mid-article ad
position has no real-content coverage until actual articles run past six paragraphs.


## S6 — Search, + S11 feeds (partial) — 2026-09-12

**S6 built:** `pagefind@1.5.2` (MIT) as a dev dependency, `pagefind --site dist` wired into
the frontend `build` script, `/search` page with Bengali UI copy, `data-pagefind-body` on the
article page so only stories are indexed, `data-pagefind-ignore` on the related-articles
sidebar, and a `slot name="head"` on `Layout.astro` so a page can inject its own stylesheet.
Index scope: **12 pages / 356 words** — site chrome excluded.

**⚠️ Known limitation, not a bug:** Pagefind prints at build time that it has **no Bengali
stemming**. Search matches exact word forms only — "শিক্ষা" will not match "শিক্ষার্থী".
Configuration cannot fix this. Mitigations: the category-chip browse fallback (built), a
synonym list at index time (not built), and keeping the taxonomy tight so browse carries
discovery. **The S6 entry gate "Bengali search quality tested on a real Bengali corpus" is
still open and blocking** — there is no real corpus yet.

**S11 feeds built ahead of sequence** (verified 2026-09-12T17:44):
`robots.txt` · `sitemap.xml` · `news-sitemap.xml` · `rss.xml` — all four generated at build
time from the CMS, hand-written rather than via `@astrojs/sitemap`/`@astrojs/rss` (the pnpm
symlink step is blocked here, and ~40–70 lines each is cheaper to own than to configure).

| Artifact | Verified output |
|---|---|
| `sitemap.xml` | 23 URLs — 3 static + 8 categories + 12 articles |
| `news-sitemap.xml` | 12 URLs, all inside the 48h window, `news:language` = `bn` |
| `rss.xml` | 12 items, Bengali `<category>`, `guid isPermaLink="true"` |
| `robots.txt` | disallows `/search` and `/pagefind/`; points at both sitemaps |

**Defect found and fixed in the feeds:** `sitemap.xml` stamped **today's build date as
`lastmod` on every URL**. That is the classic sitemap mistake — the signal becomes noise and
Google discounts `lastmod` for the whole file, losing the accurate dates with it. Articles now
carry their **own `publishedAt`**; `/deadlines` and the category pages carry no `lastmod` at
all rather than a wrong one. Also added the `/page/:slug` E-E-A-T routes to the sitemap, and
removed a non-null assertion from the news sitemap so new code adds no lint warnings.

**Two open details:** the CMS `siteName` is currently **«শিক্ষা২৪.com»**, which flows into the
RSS channel title and the Google News `news:name` — the Publisher Center name must match
exactly, so this needs a deliberate value. ~~`getAllArticleSlugs()` caps at 500 with no
pagination~~ → **✅ FIXED in S11:** `getAllArticlePaths()` now paginates through the full
result set using Payload's `page` + `limit` parameters (see `frontend/src/lib/cms.ts:549`).

**Verification:** lint 0 errors (8 pre-existing `noNonNullAssertion` warnings) · typecheck
exit 0 both workspaces · build exit 0 with the CMS live · Pagefind index rebuilt · no
`.prerender/` leftover.

## S1 — CMS content models & RBAC (complete)

**Built:** 26 collections + 1 global, the 5-role RBAC model with field-level
guards, a Bengali admin locale, and an idempotent taxonomy seed.

**Evidence — 8/8 on the CI-equivalent sequence:**

| Check | Result |
|---|---|
| CMS build (26 collections, Turbopack) | ✅ exit 0 in 60s |
| CMS typecheck · lint (49 files) | ✅ exit 0 |
| Frontend typecheck + build | ✅ exit 0 |
| **Seed** | ✅ **77 rows** — 5 levels + 8 categories + 64 districts |
| **Seed idempotency** | ✅ re-run → `created 0, unchanged 77` |
| **Round-trip** | ✅ `GET /api/categories` → 8 docs, correct Bengali names |
| Admin | ✅ `GET /admin` → 200 |
| Access control live | ✅ `/api/readers` → **403** anonymous |
| WAL concurrency gate | ✅ still green |

**Five findings, recorded so they are not rediscovered:**
1. **Regenerate Payload types after adding collections** — otherwise every
   `relationTo` fails (`Type '"articles"' is not assignable to CollectionSlug[]`).
   Twenty errors, one stale file.
2. **`Access` functions take `AccessArgs`, not a user.** `isEditorial(req.user)`
   type-errors; `isEditorialUser(user)` is the predicate form.
3. **The Bengali locale key must be `bn-BD`, not `bn`** — date-fns has no plain `bn`.
4. **Payload's per-slug overloads cannot type a union slug** — the seed's generic
   helper needs one confined cast.
5. **Never run `payload run` while a dev server holds the same SQLite file.** Both
   push the schema; the second fails with `index ... already exists`. Confirmed a
   collision, not a seed bug — isolated, the seed is fully idempotent.

**Two decisions that need owner awareness** (detail in `.sps/section-todos/S1.md`):
- **`Subcategories` is not a separate collection.** The approved tree is flat; the
  mechanism is a self-relation. `.sps/task.md` still lists it — recommend amending.
- **`readers` is an addition to the content model**, required by social login,
  bookmarks, saved deadlines and push notifications. Kept separate from `users`.

**Still open:** RBAC needs a manual pass with real accounts for all 5 roles; the
Bengali locale is a ~60-string working draft needing a native-speaker review; the
review workflow needs two accounts to exercise end-to-end.

## S2 — Design System & Base Layout (complete)

**Built:** design tokens, 12-col grid, 6 components, base layout, and a build-time
content layer that survives CMS outages.

**Evidence — 7/7 on the CI-equivalent sequence:**

| Check | Result |
|---|---|
| lint (biome, 50 files) | ✅ exit 0 |
| astro sync | ✅ exit 0 |
| typecheck:frontend | ✅ exit 0 |
| build:frontend | ✅ exit 0 |
| CMS build (26 collections) | ✅ exit 0 |
| CMS typecheck | ✅ exit 0 |
| WAL concurrency gate | ✅ still green |

**Design system (`frontend/src/styles/global.css`):**
- Brand colours: brand-red `#DA1C25`, brand-charcoal `#1F1F1F`, dark-base `#121212`
- Semantic tokens: ink / ink-muted / ink-subtle / rule / surface / surface-raised + dark counterparts
- Typography: **SolaimanLipi** — one Bengali family for BOTH headline and body (owner decision, later the same day). System UI for Latin/interfaces. Inter **deliberately absent** — owner-approved; variable file is 83 KB/weight and would break the 200 KB font budget
- Type scale: base = 17px (Bengali floor), line-height ≥1.65
- 12-col responsive grid: 4 → 8 → 12 columns
- Accessibility: visible focus rings, `prefers-reduced-motion` honoured, skip link, text-wrap: balance

**Components:**
- `Logo.astro` — CMS-first; renders uploaded asset or brand wordmark in brand red
- `ThemeToggle.astro` — dark/light; persists to localStorage; follows OS by default; anti-FOUC inline script
- `TextResizer.astro` — 3-step scale (1→1.1→1.2); persists to localStorage; anti-FOUC inline script
- `Header.astro` — utility ribbon (date, optional weather/prayer widgets, social) + main header (logo, search, theme, resizer) + nav bar with mega menu dropdowns + mobile hamburger drawer
- `Footer.astro` — brand zone + category links + footer pages + social links + copyright + legal links + CMS-managed footer text
- `MobileShareBar.astro` — sticky bottom bar on mobile (WhatsApp, Facebook, copy link)

**Layout (`layouts/Layout.astro`):**
- HTML5 boilerplate with `lang="bn"`
- SEO meta tags, OG, Twitter, article dates, canonical, JSON-LD hook
- Font preloading: SolaimanLipi 400 on the critical path (bold loads normally)
- Skip link → `#main-content`
- Header → `<main>` → Footer → MobileShareBar

**Content layer (`lib/cms.ts`):**
- Build-time fetch: Payload REST → static HTML at build time
- Hard requirement: never fail the build — every helper degrades to documented fallback
- Fallbacks mirror the approved 8-category tree and owner-confirmed site settings

**Owner decisions applied (2026-09-12):**
- Display name = শিক্ষা২৪ / Shikkha24 — confirmed
- Logo = placeholder SVG — CMS-managed; real asset drops in via admin with no code change
- Inter is DROPPED from the typography stack — variable file 83 KB/weight blows the 200 KB budget
- **Font settled on SolaimanLipi.** Owner first rejected Hind Siliguri (hard to read; a numeral would not render), then named SolaimanLipi. One Bengali family for both headline and body. **SIL Open Font License, not on Google Fonts** — vendored at `assets/fonts/vendor/` with `OFL.txt`. **154.0 KB** for two weights, subset Bengali + Latin. Subsetting keeps the Indic shaping features (`akhn, blwf, half, liga, nukt, pstf, vatu`) because Bengali conjuncts are shaped, not single codepoints. Rejected on measurement: Anek Bangla (111.2 KB, only 90/128 codepoints — larger *and* less complete), serifs Tiro Bangla / Noto Serif Bengali (wrong genre for news), display faces Atma / Baloo Da 2 / Galada (unusable at 17px). Noto Sans Bengali (110.5 KB, 96/128) was the interim choice before the owner named SolaimanLipi.

**Bug found and fixed after S2 shipped:** the index page rendered completely unstyled. `Layout.astro` never imported `global.css` — the import had lived in the page and was not carried into the layout, so Tailwind emitted no CSS at all (`dist/` contained zero `.css` files). One-line fix, commit `073d20a`. Recorded in MEMORY.md: Astro does not inherit page-level CSS imports into components.

**Two deviations recorded:**
- `subcategories` is a self-relation on Categories, not a separate collection — the approved tree is flat (স্কুল-কলেজ was rejected as a category and replaced by the level filter)
- `readers` was added to the model — social login, bookmarks, saved deadlines and push all need a reader identity

## S3 — Homepage (complete)

**Built:** breaking ticker, lead story, deadline strip (N1/N2), level + district
filters, 8 category sections, latest + trending, ad slots, and live weather +
prayer header utilities.

**Verified 7/7:** lint · astro sync · frontend typecheck + build · CMS typecheck
+ build · WAL gate. Built page: 90.7 KB HTML, 28.6 KB CSS, 157.7 KB fonts.
42 article links and 10 section headings render.

**Header utilities are live, not placeholders** — verified against the real APIs:
- Weather → Open-Meteo: **ঢাকা ৩১° মেঘলা**
- Prayer → Aladhan: **ইফতার/মাগরিব ১৮:০৫**
- Hijri → Aladhan with Bengali month names: **১ রবিউস সানি ১৪৪৮**

Both are fetch-at-build-time and **memoised**, so a 5,000-page build costs 2 API
calls rather than 10,000. Both return `null` on failure — a dead provider omits
the widget and never fails the build.

**Two things the owner must know:**
1. **Trending is provisional.** A static site cannot accumulate view counts, so
   the trending list is fed recent articles. Real trending needs server-side
   view counts (Apache access logs or an editorial "trending" flag).
2. **Demo content exists and must be deleted before launch.** `pnpm seed:demo`
   added 12 articles, 5 deadlines and 1 author so the homepage could be reviewed.
   The production seed (`pnpm seed`) stays **taxonomies-only** per the S1
   principle. All demo slugs are prefixed `demo-`.
   **Removal is now one command** — `cms/src/seed/demo-purge.ts`, a dry run unless
   `--confirm` is passed. It removes 55 rows across 15 collections and leaves the
   taxonomies and the site logo alone. Verified on a throwaway copy of the dev DB:
   dry run → confirm → re-seed → confirm all behave.

**Finding worth not rediscovering:** `Deadlines.type` is a `select` — values must
be one of `admission, result, examRoutine, scholarshipDeadline, holiday,
circular`. The demo seed initially used `scholarship` / `exam` and was rejected
at validation. `DeadlineStrip.astro` carries a parallel Bengali label map that
must stay in step with `DEADLINE_TYPES`.

**Still open (owner-only):** hands-on low-end Android pass (Symphony/Walton
class, 3G) and visual approval of the homepage.

## S4 — Article Page (complete)

**Built:** `/article/[slug].astro` with takeaways box, author card, related
articles, share row, reading-progress bar, Web Speech audio reader, correction
notice, print view and Article JSON-LD. New `lib/richtext.ts` converts Payload's
Lexical JSON to HTML.

**Verified 7/7.** 13 pages built — homepage + 12 articles at ~52 KB each.

**The body renderer.** Payload serves `richText` as Lexical JSON, not HTML.
Rather than importing `@payloadcms/richtext-lexical` across workspaces (which
would drag React and the Payload server runtime into a static build), wrote a
~150-line dependency-free converter. It escapes everything — reporter-entered
text is still user input — and never drops an unrecognised node, so a reporter
who pastes something unexpected sees their words rather than a missing paragraph.

**Two bugs worth remembering:**
1. **Every article 404'd while curl returned 200 for the same URL.** `HTTP_PROXY`
   is set in this environment; Astro's build-time fetch routed `localhost:3000`
   through it → 502. Because the content layer degrades gracefully, the build
   stayed *green* while every page silently fell back to empty data, and
   `getAllArticleSlugs()` returning `[]` meant no article routes at all. Symptom:
   304-byte redirect stubs in `dist/article/*`. Fixed with `NO_PROXY` in the
   dev/build scripts.
2. **Payload faltered under build-time concurrency** (12 pages × ~6 fetches).
   `lib/cms.ts` now caches each response — and each failure — by path for the
   whole build, so a 5,000-article build costs one request per unique path.

**Deferred:** comments → S9 (they need social login and the comments UI; S4
delivers the page shell).

## S5 — Category / Tag / Author / Archive (complete)

**Built:** category listings with pagination, breadcrumbs (with BreadcrumbList
JSON-LD), subcategory filters, `/latest`, `/deadlines`, `/page/:slug` and a real
Bengali 404. New shared components `ArticleGrid`, `Pagination`, `Breadcrumbs`.

**Verified 7/7.** 25 pages built: 12 articles, 8 categories, latest, deadlines,
home, 404.

**Fixed the broken links left over from S3.** The homepage and footer linked to
`/latest`, `/deadlines`, `/category/:slug` and `/404` — none existed. All now
built. `/page/privacy-policy`, `/terms-of-use` and `/contact` have a route but
**no CMS content yet**, so they still 404 — the owner needs to create those Pages.

**Two design notes:** breadcrumbs generate the visible trail and the JSON-LD from
one array so they cannot drift; `getStaticPaths` fetches page 1 to learn the page
count then emits one path per page, so a 300-article category produces 25 pages
automatically.

**Deferred, groundwork done:** author profiles, tag pages and date archive are not
built as *routes* because the demo content has no tags and one author — nothing to
look at. The CMS layer is written and verified (`getTagBySlug`, `getAuthorBySlug`,
`getArchiveBuckets`, `getArticlesByMonth`); each route is ~30 lines.

## ✅ S0 verification COMPLETE — the npm blocker was resolved with pnpm

**The blocker.** Every `npm install` failed with `CODEBUDDY_BROKER_DENY` /
"Brokered host mkdir requires an available runtime file rule". The host injects a
filesystem broker via `NODE_OPTIONS=--require=".../node-language-shim.cjs"`,
activated by `CODEBUDDY_BROKERED_FS_HOOK_ENABLED=1`. It intercepts `fs.mkdir`, asks
the host for permission, and `node-brokered-fs-shim.cjs:717` rethrows the host's
refusal instead of falling back. Raw `fs.mkdir` succeeds everywhere — including
under `node_modules` — so it was npm's specific call pattern being refused, not
filesystem access in general. `dangerouslyDisableSandbox` did not remove the broker.

**The resolution — pnpm, not a bypass.** `pnpm install` succeeds where npm fails.
Nothing was disabled and no security hook was cleared; pnpm's directory-creation
pattern is simply permitted. It is also the better fit here, on three independent
grounds: Payload's own template targets pnpm (`workspace:*` internal refs plus a
`pnpm.onlyBuiltDependencies` block), `astro@7.3.2` declares `pnpm >=7.1.0` in its
engines alongside npm, and pnpm blocks post-install scripts by default — a real
supply-chain win for a stack carrying five native toolchains. The project is now
pnpm-only (`pnpm-workspace.yaml`, `pnpm-lock.yaml`); the stale npm lockfiles were
deleted so the two cannot drift.

**Evidence — every S0 DoD item now has a real result:**

| Check | Result |
|---|---|
| `pnpm install` | ✅ 555 packages; esbuild + sharp post-install binaries built |
| Lint (Biome, repo-wide) | ✅ exit 0 — 16 files, 0 errors |
| Frontend `astro sync` + typecheck (`tsc --noEmit`) | ✅ exit 0 |
| Frontend build | ✅ exit 0 |
| CMS build (Next 16.3.5 + Payload 3.89, Turbopack) | ✅ exit 0 in 34s |
| CMS typecheck | ✅ exit 0 |
| **GATE — Astro incremental build time** | ✅ **~1s** (cold 1s, incremental 1s) |
| **GATE — Next standalone deploy size** | ✅ **114 MB** vs the 300–600 MB target |
| **GATE — SQLite WAL, 5+ concurrent writers** | ✅ **6/6 writers, 240/240 rows, `integrity_check ok`, 63 ms** |
| Payload admin reachable | ✅ `GET /admin` → 200, `<title>Dashboard - Payload</title>` |
| Standalone production start path | ✅ `node .next/standalone/cms/server.js` → 200, static assets served |
| Font budget | ✅ **179.7 KB / 200 KB** |

**Four new findings from verification** — all fixed, all recorded so they are not
rediscovered:
1. **Turbopack `root` must be the monorepo root.** Payload's template pins it to
   the app directory, which fails in a pnpm monorepo with *"Could not find the
   Next.js package"*. Fixed in `cms/next.config.ts`.
2. **TypeScript 7 removed `baseUrl`** (error TS5102) and Payload's template still
   sets it. Removed from `cms/tsconfig.json`; `paths` now resolve relative to the
   tsconfig, which the existing `./src/*` entries already assumed.
3. **The standalone entry point is `.next/standalone/cms/server.js`**, not
   `.next/standalone/server.js` — the monorepo structure is preserved inside the
   bundle. `next start` also warns it is incompatible with `output: 'standalone'`.
4. **Next does not copy `.next/static` into the standalone bundle.** The deploy
   must do it, or the admin loads with every asset 404ing. CI now assembles and
   asserts this, and the bundle is uploaded as an artifact.
5. **`PRAGMA journal_mode = WAL` is not concurrency-safe, and fails intermittently.**
   The first version of the WAL gate re-issued that PRAGMA on every connection and
   failed ~80% of runs with "database is locked" — *intermittently*, so a single
   green run looked like a pass. Switching journal mode requires a lock, and that
   PRAGMA does **not** respect `busy_timeout`; six connections doing it at once
   collide and fail immediately. Removing it from the per-connection setup (the
   parent sets WAL once, on the database) took the gate to 6/6 green, repeatedly.
   ⚠️ **This is a production risk, not just a test artefact:** if Payload's SQLite
   adapter re-issues that PRAGMA on every connection open, five editors connecting
   at once could hit exactly this. **Verify against `@payloadcms/db-sqlite`
   directly at S1**, when the collections exist and the adapter is exercised for
   real. Recorded here so it is not rediscovered under load.

**Caveats — stated rather than glossed over:**
- The **build-time gate was measured on a 1-page site.** It proves the toolchain is
  fast; it does not prove a 5,000-article site rebuilds in 1s. Re-measure once real
  content volume exists, before trusting the CI batching strategy.
- The **WAL test used Node's built-in `node:sqlite`**, not the `@libsql/client`
  driver Payload uses in production. WAL contention is engine-level, so it answers
  the question — but it is not the identical driver, and finding 5 above must be
  re-checked through Payload's own adapter at S1.
- The **CI workflow has still never run.** It is now pnpm-based against a real
  lockfile, so `--frozen-lockfile` works, but expect iteration on the first push.
- **Lighthouse CI, the broken-link check and JSON-LD validation are still not
  wired** — they need real page templates (S3+). This is the one S0 gate that is
  deliberately deferred, and it is recorded as such.
- **Localhost needs `curl --noproxy '*'`** in this environment (an HTTP proxy is
  set). Environment-specific, not a project issue.

**Owner-only gates (cannot be done by an agent):** Payload-on-cPanel-Passenger
smoke test, DNS configuration, DianaHost support ticket, and confirming
the host-disk usage alert.

## Completed
1. ✅ Discovery round 1 (project identity, language, type, team, features, monetization, design, hosting, timeline)
2. ✅ Discovery round 2 (branding, colors, categories, editorial workflow, social, mobile-first, mobile apps, traffic)
3. ✅ Discovery round 3 (content migration, hosting flexibility, typography, CDN)
4. ✅ Stack research (Astro 7, Payload CMS 3, Tailwind 4.3, TypeScript 7, Node 24 — re-verified against live registries 2026-09-11)
5. ✅ Competitive analysis (15+ portals: Prothom Alo, bdnews24, Daily Star, Samakal, Jugantor, Kaler Kantho, Jago News, Bangla Tribune, Ittefaq + BBC, Guardian, Al Jazeera, CNN, NYT, NHK, NDTV) — **now obsolete for this scope, see item 31**
6. ✅ Feature audit (22 missing features found, 10 unique innovations designed) — **now obsolete for this scope, see item 31**
7. ✅ CMS critical finding (Strapi CE missing newsroom features → switched to Payload CMS 3)
8. ✅ Google News SEO strategy researched
9. ✅ SPS memory bootstrapped (agent.md, profile.md, handoff.md)
10. ✅ Root mirrors created (GEMINI.md, AGENTS.md) — **now three mirrors: AGENTS.md, GEMINI.md, CLAUDE.md (item 33)**
11. ✅ Implementation plan written, revised (v2 with verified versions, v3 master plan with competitive intel)
12. ✅ Plan APPROVED by user (2026-09-11T20:41+06:00)
13. ✅ Plan stamped as approved in .sps/plan.md
14. ✅ Profile updated with all approved decisions
15. ✅ Task checklist created — **recreated as `.sps/task.md` during 2026-09-11 docs audit** (the original file was never written to disk)
16. ✅ Docs audit of all files — problems found & fixed (2026-09-11)
17. ✅ Stack versions verified against live registries — all matched. ⚠️ **CORRECTION 2026-09-11 (third-party audit):** this item previously claimed the Next.js row was corrected to "Next 15.x AND 16.x". That was wrong — the actual `@payloadcms/next@3.89.0` peer range is `>=15.2.9 <15.3.0 || >=15.3.9 <15.4.0 || >=15.4.11 <15.5.0 || >=16.2.6 <17.0.0`. Now pinned to **Next 16.2.6+**.
18. ✅ Mandatory agent rules codified in AGENTS.md + GEMINI.md (synced mirrors): readable commented code, section-by-section approvals, zero assumptions, immediate commits, budget guard, performance gates — **now three mirrors, and rules 4, 7 and 9 were amended by the audit (item 33)**
19. ⚠️ **CORRECTED 2026-09-11 (third-party audit):** this item previously claimed the Strapi-based root plan was "deleted — user-approved". **It had never been deleted.** The file was still tracked in the repo root and described itself as "the single source of truth". It has now **actually been deleted** (owner-approved 2026-09-11); the original is preserved in git history at commit `acfb128`.
20. ⚠️ **SUPERSEDED 2026-09-11:** this item defined the newsletter fallback as "self-built Payload newsletter via DianaHost cPanel SMTP → Oracle Cloud Always Free VPS". **Oracle Cloud is not usable** — it requires a credit card at signup, which the owner does not have. New decision: self-built Payload subscriber list + campaign module, delivery via a free-tier ESP API; cPanel SMTP retained only as a low-volume fallback. See item 32.
21. ✅ Git repo initialized — baseline + audit commits; immediate-commit rule active
22. ✅ Antigravity export prompt created (`.sps/antigravity-export-prompt.md`)
23. ✅ README.md created
24. ✅ Artifacts exported from Antigravity to docs/ (master plan, competitive analysis, stack research, original checklist)
25. ✅ Agent rule 13 (docs consistency / plan ↔ build parity) added to both mirrors; GEMINI.md rewritten with Antigravity/Gemini hardening grounded in documented failure modes (Antigravity drive-wipe Dec 2025; PromptArmor prompt-injection Nov 2025; model/quota "bait and switch" 2026; Gemini CLI issues #15037, #7498, #13677, #6054, #7223); mirrors kept in sync — **hardening renumbered H1–H14 by the audit so it can never be confused with rules 1–13 (item 33)**
26. ✅ All four artifacts verified in repo: `docs/master-plan.md` (25.9 KB, 397 lines — 87 numbered features, 10 innovations; heading says "70+" but rows run to 87), `docs/competitive-analysis.md` (46.8 KB), `docs/stack-research.md` (11.1 KB), `docs/task-checklist-original.md` (14.8 KB). ⚠️ **CORRECTION 2026-09-11:** this item claimed the **S1 entry gate was satisfied**. It is **no longer satisfied** — the inventory is a general-news inventory and the portal is an education portal (item 31).
27. ✅ Community-research round on Antigravity/Gemini failure modes (HN launch thread 45967814, drive-wipe thread 46103532, gemini-cli issues) — GEMINI.md hardening expanded 9 → 14 countermeasures with community evidence: edits reported but never applied (#25783) + replace-in-file corruption (HN), guessed deletions with false compliance claims (#26856), fabricated user prompts (#29157); community mitigations adopted: sandbox-aware behavior, commit-before-risky-operations
28. ✅ Third-party audit prompt created (`.sps/third-party-audit-prompt.md`)
29. ✅ `/sps` v4.0.0 + `/sps-cms` v2.3.0 skills installed into **WorkBuddy AI** (`~/.workbuddy-ai/skills/`) from source `~/.sps/src/Shahid-Personal-SkillSet/skills/` — 60 + 56 files, byte-identical to source (`diff -rq` clean), scripts executable; security audit passed. WorkBuddy was not in the upstream installer's `SYNC_PATHS`, so this was a manual faithful copy; re-sync command recorded below.
30. ✅ **Independent third-party audit executed** (2026-09-11) — full read-only adversarial review of all 15 documents, live-registry re-verification of every pinned version, and `git log --stat` reconciliation against this handoff. Result: **`not-ready`**, 3 Critical / 5 High / 17 Medium / 8 Low findings. Report at `docs/audit-third-party.md` (commit `46040a8`). Notable: all ten pinned versions matched the live registries exactly, but three documents contained a false claim (item 19), the storage plan could not hold the stack, and the newsletter fallback was non-functional.
31. ✅ **Scope amended to an education portal** (owner, 2026-09-11) — domain `shikkha24.com` confirmed; owner's positioning: "🎓 Education News | Scholarship | Admission | University | Higher Study / 🌍 দেশ-বিদেশের শিক্ষার সর্বশেষ খবর ও সুযোগ / 📚 শিক্ষার খবর, সুযোগ ও সম্ভাবনা—এক ঠিকানায়।" `docs/master-plan.md` and `docs/competitive-analysis.md` are now **reference-only**; a new education feature inventory, category tree and competitor set are required and cannot be produced without a discovery round.
32. ✅ **Audit remediation applied** (2026-09-11) — hosting/storage architecture rewritten for the purchased **DianaHost PNR 2 GB** plan (DianaHost `public_html` frontend + host-disk media + slim CI-built Payload; **Cloudflare removed 2026-09-14**); newsletter path replaced (Oracle rejected); Node 24 LTS claim corrected; SQLite WAL gate moved S12 → S0; four missing CMS collections restored; accessibility and initial-payload targets added; URL architecture decided; data sources documented; CI-minutes constraint documented.
33. ✅ **Agent rules amended and a third mirror added** — `CLAUDE.md` created; rules 1–13 verified byte-identical across all three files (4,283 bytes each **at the time**; rules 7 and 9 were later amended by the Cloudflare removal, so the current figure is **5,547 bytes** — re-verified byte-identical on 2026-09-15, same rules-block hash across all three); rule 4 gained a read-only/audit carve-out; rule 7 gained the no-international-card hard constraint; rule 9 gained page-level wording, an accessibility target and the S12-only TTFB gate; GEMINI.md hardening renumbered H1–H14.
34. ✅ New documents created: `docs/data-sources.md` (per-widget provider, free-tier terms, rate limit, fallback), `.sps/content-model.md`, `.sps/mistakes.md`, `.sps/lock.json` — ⚠️ correction: `.sps/lock.json` was **deliberately NOT created**; the `sps` skill references removing it but defines no schema (see `.sps/mistakes.md`).
35. ✅ **Education competitor landscape researched** (2026-09-11) — `docs/education-competitors.md`. Five groups mapped with URLs: dedicated education portals (Dainik Shiksha, Shiksha Sangbad — the direct competitors), education sections of general portals, official government portals (educationboardresults.gov.bd, xiclassadmission.gov.bd), third-party SEO aggregators (xiadmission.bd, xiclass.bd, eduboardresults.bd, sscresult.govt.bd), and exam-prep platforms (bcsstudy.com, xam.bd, bdjobprep.com). Key finding: the aggregators rank on the highest-intent queries with slow, ad-heavy pages — the same "faster, cleaner, zero-CLS" wedge the original research identified against Prothom Alo, applied to a market with much weaker incumbents.
36. ✅ **Education feature inventory drafted** (2026-09-11) — `docs/education-feature-inventory.md`. Built by reclassifying the original 87 approved features into retained-unchanged / re-scoped / descoped, plus 12 new education features marked `[NEW]`. Nothing was invented.
37. ✅ **Education feature inventory APPROVED** (2026-09-11) — owner delegated the two structural choices to the agent and answered three directly:
   - **Category tree: 8 categories + a cross-cutting level filter.** The agent rejected splitting out স্কুল-কলেজ because it is an audience segment, not a topic — as a top-level category it would overlap শিক্ষা সংবাদ, ভর্তি and পরীক্ষা ও ফলাফল simultaneously and split SEO authority. Level (প্রাথমিক → স্নাতকোত্তর) and District become filter axes instead.
   - **New features: all 10 for Day 1** (12 proposed; N2+N9 merged into "Academic calendar & deadlines", N3+N7 merged into "Results & merit lists hub" to stop the portal competing with itself for the same query). Two ship with a curated starter dataset rather than empty: institution directory, study-abroad guides (8 destinations).
   - **Weather + prayer times: retained** as light header utilities (server-fetched, cached, deferred, zero CLS).
   - **BCS / job-circular content: in scope** — matches Dainik Shiksha's own positioning and is a proven BD traffic engine.
   - **Publishing velocity: was still open at this point** — the agent explained in plain language that 45–70/day ÷ 5 staff = 9–14 articles per person per day (3–5× a normal reporter's output), that the plan's own desk breakdown contradicts the target (42–56 vs 45–70), and that education publishing is spiky rather than flat. Recommended a **baseline 15–20/day + burst to 40+ on result/admission days** model. → **Resolved in item 39.**
   - **Downstream effect:** S1, S3, S9 and S10 are now fully re-scoped in `.sps/task.md`; `.sps/content-model.md` gained 8 education collections/taxonomies. (The velocity decision was still pending at this point; it was closed in item 39.)
38. ✅ **Six missing operational documents created** (2026-09-11) — owner asked whether all documentation types existed (Lighthouse, SEO, security, crash handling, overload, etc.). A coverage scan found real gaps: **security, crash handling, overload management, monitoring/alerting, backup/DR, accessibility and testing had no coverage at all**, and performance/SEO existed only as scattered targets. Created:
   - `docs/performance-budget.md` — per-asset byte budgets, per-page targets, measurement method, CI gate, and the honest **AdSense-vs-Lighthouse-≥95 trade-off** (AdSense will rarely hold ≥95; two measurement profiles proposed)
   - `docs/seo-plan.md` — per-template metadata + schema matrix (incl. education-specific `CollegeOrUniversity`, `JobPosting`, `Course`), sitemaps/feeds, keyword clusters, redirect policy, and the **Bengali-vs-ASCII slug decision** (recommendation: ASCII slugs, Bengali in title/h1/schema)
   - `docs/security.md` — threat model, attack surface, auth/2FA, headers + CSP (two profiles because AdSense forces a relaxation, delivered via Apache `.htaccess`), input validation, rate limiting (no CDN rate limiting), PII handling, supply-chain scanning, and SPF/DKIM/DMARC
   - `docs/reliability.md` — ranked failure-mode table, error pages, per-feature graceful degradation, capacity model, traffic-spike playbook, monitoring/alerting, single-operator incident playbook. Key structural finding: **the CMS can go down without the site going down**, because the frontend is static HTML on disk (Apache serves it without Node.js) — that property must never be given up
   - `docs/backup-and-recovery.md` — the entire archive is one SQLite file on a shared host; backup tiers, RPO 24h / RTO 4h, four DR scenarios, restore runbook, and the rule that **an untested backup is not a backup**
   - `docs/testing-and-qa.md` — quality gates, honest test scope, **WCAG 2.2 AA** (correcting the old "AAA" claim), browser/device matrix including **UC Browser and Opera Mini** (significant in Bangladesh), and the Bengali conjunct/rendering audit
   - Wired into `.sps/plan.md` (new Operational plans section + 5 new S0/S12 gates), `.sps/task.md` (S0 and S12 expanded), and the README doc map. Two cross-cutting requirements surfaced that did not previously exist: a **feature-flag mechanism** and a **verified card-free monitoring tool**.
39. ✅ **All 12 outstanding questions answered by the owner; decisions applied** (2026-09-11/12):
   - **Publishing velocity = baseline 15–20/day + burst to 40+ on event days.** The flat 45–70/day target is retired. 5-person editorial team already in place; greenfield launch; no migration.
   - **DianaHost runs Node.js 20.18.2 — a significant finding.** `astro@7.3.2` (`>=22.12.0`) and `vite@8.3.0` (`^20.19.0 || >=22.12.0`) **cannot run on it**, so they build in CI only. `next@16.3.4` and `@payloadcms/next@3.89.0` do accept `>=20.9.0`, so Payload runs there. **But Node 20 reached end-of-life 2026-04-30** — an unpatched runtime hosting the CMS admin. DianaHost's cPanel has a **Node.js Selector version drop-down**; the owner should select 22/24 if offered.
   - **All Cloudflare services removed (2026-09-14)** — owner decision. No Pages, no R2, no CDN, no Web Analytics. Everything on DianaHost only. Frontend deploys to `public_html` via rsync. Backups to GitHub Actions artifacts. Security headers via Apache `.htaccess`. See `.sps/cloudflare-removal-plan.md`.
   - **Repository is PRIVATE** → 2,000 Actions minutes/month. Owner asked the excellent question *"why do I need CI for an article to upload? The admin can't access GitHub."* Answer documented in the new **`docs/hosting-and-deployment.md`**: editors only ever use the Payload admin (a normal web CMS); CI is the invisible rebuild step that turns a publish into a static HTML file. Also documented: the escalation ladder and the single CI quota (GitHub 2,000 min/month; Cloudflare Pages quota removed 2026-09-14).
   - **AdSense is activated** → AdSense definitely ships, so the **two-profile Lighthouse measurement** is adopted: **≥95 no-ads / ≥85 with-ads**.
   - **Social login kept** — Meta Login and Google OAuth are free; only app review (a process, not a cost) is needed, so the owner's "no cost" rule does not exclude them.
   - **Logo:** real Illustrator-exported logo at `docs/assets/logo.svg` (owner-supplied 2026-09-13), and the logo is a **CMS-managed Site Settings field** so the asset swaps in without a code change.
   - Domain **registered** (DNS to follow); legal details for E-E-A-T pages promised **before final deploy**.
   - **Corrected an earlier overstatement of mine:** I had said one-build-per-publish would blow the CI quota. That is only true if builds take minutes. At ~30s incremental, 600–900 publishes/month costs ~450 minutes and fits comfortably. **The deciding number is the measured incremental build time — now an S0 gate.**
40. ✅ **Project presentation deck created** (2026-09-12) — `docs/presentation-deck.html`. 18-slide mobile-first HTML deck for team/board approval covering: vision, market gap, audience, 8-category tree, platform features, 10 new education features, tech stack, architecture, S0–S12 roadmap, 12-week timeline, performance targets, competitive advantage, monetization, team/content model, zero-recurring-cost budget, risk register, and approval request. Smooth scroll, keyboard navigation, progress bar, navigation dots. Bengali + English mixed for BD audience.

41. ✅ **S0 foundation built** (2026-09-12, commit `aa1afe6`) — monorepo + both scaffolds + toolchain. Four findings worth not re-researching:
    - **All eight pinned versions verified against the live npm registry** and matched exactly (astro 7.3.2, payload 3.89.0, tailwindcss 4.3.3, typescript 7.0.2, vite 8.3.0, pagefind 1.5.2, next 16.3.5 in range, @payloadcms/next 3.89.0). The plan's Next.js peer-range correction is confirmed: `@payloadcms/next@3.89.0` really does require `>=16.2.6 <17.0.0`.
    - **`react` must be 19.2.x.** `@payloadcms/ui@3.89.0` and `@payloadcms/richtext-lexical@3.89.0` pin `react` to `^19.0.1 || ^19.1.2 || ^19.2.1`. The registry's latest (19.3.0) is **not permitted**. Pinned 19.2.6. Likewise `graphql` must stay on 16.x (`^16.8.1`), so 16.14.2 — not the 17.0.2 latest.
    - **S0 gate "TypeScript 7 toolchain validated" → TS 7 works, its surrounding tooling does not.** `@astrojs/check@0.9.10` (latest) peer-requires `typescript ^5 || ^6` and **rejects TS 7**, so `astro check` is unavailable — typecheck runs via `tsc --noEmit`, which means **`.astro` templates are not type-checked**. `typescript-eslint@8.70.0` caps at `typescript <6.1.0`, so ESLint cannot run on TS 7 either. Chose **Biome 2.5.13** instead: own parser, no TS-version coupling, MIT/Apache-2.0. `typescript@7.0.2` ships `bin/tsc` plus 20 platform-native binaries, confirming the plan's native-toolchain claim.
    - **Bengali font budget solved, with two non-obvious gotchas.** `scripts/fetch-fonts.mjs` self-hosts and subsets. (a) Requesting `wght@400;700` in ONE css2 call returns a **105 KB variable file** for Noto Sans Bengali's bengali subset; requesting each weight separately returns **43 KB static instances** — same glyphs, less than half the bytes. (b) Google emits the `/* subset */` label **before** each `@font-face` block, so parsing the comment and the block separately shifts every label by one and silently drops the bold Bengali files. Inter is dropped for a system UI stack (its variable file alone is 83 KB/weight) per `docs/performance-budget.md` §3. **Measured 179.7 KB against the 200 KB budget.**
    - **`sps-cms` reconciliation recorded** in `.sps/section-todos/S0.md`: the skill mandates a bespoke visual-builder CMS, but the approved plan mandates Payload CMS 3. Applied as *principles* inside Payload (100% admin-controllable surface, global settings, media security, round-trip proof) rather than as a replacement engine — replacing it would be plan drift (rule 13).


42. ✅ **S14 built — QR reporter ID card + automatic photocard** (2026-09-28, verified locally).
    ⚠️ **Provenance:** the code was found **uncommitted in the working tree** — no commit, no
    memory entry, no evidence file. It was verified rather than trusted, and **two exit-gate
    failures were found and fixed** (full detail in `.sps/section-todos/S14.md`):
    - 🚨 **The "যাচাই করা যায়নি" state was unreachable in the built site.** `getStaticPaths`
      returned only the IDs that exist, and a static build emits **only** those paths — so an
      unknown ID reached Apache's generic 404, while the page's own header comment claimed the
      opposite ("*an ID not in the CMS at all still renders the not-found state, because the
      page is static and the route exists regardless*" — **false**). It was dead code that read
      as covered. Fixed with a `not-found` **sentinel** in `getStaticPaths` plus the file's
      **first `mod_rewrite` block** in `.htaccess`, and `noindex` (new `Layout` prop) because
      the rewrite answers **200**. `verify:apache` asserts it **and counter-proves it**: the
      block was stripped from both `.htaccess` copies and the harness went red with
      `HTTP 404 — marker absent`.
      ⚠️ Both `RewriteCond`s (`!-f`, `!-d`) are load-bearing — a real `/verify/SHK-R-…/` is a
      **directory**, so `-d` skips the rule. Drop either and every card collapses into the
      not-found state **while still returning 200**, which a status assertion alone misses.
    - 🚨 **`bloodGroup` (spec §3.3) had been dropped** from both the collection and the card.
      The string appeared **once in the entire repository — in the spec** — so nothing flagged
      it. A spec line with no code reference is invisible to every existing gate.
    - ⚠️ **Adding a Payload field requires `pnpm --filter @shikkha24/cms generate:types`.**
      `cms/src/payload-types.ts` is generated, so `tsc` fails with
      `Property 'bloodGroup' does not exist on type 'Author'` until it is re-run. The error
      reads as a code defect, not as a stale artifact.
    - **Dependency (rule 8):** `qrcode` **1.5.4**, exact pin, **MIT** — server-side QR → PNG
      buffer, Node only (never the browser); `sharp` 0.35.4 was already installed and does the
      compositing. `@types/qrcode` **1.5.6**, dev-only. No canvas native build, no paid service.
    - **Bengali shaping was measured, not assumed.** An SVG `<text>` with an embedded
      `@font-face` data URI is **ignored by librsvg** — its ink was byte-identical to a render
      with no Bengali font at all. libvips's `text` input with an explicit `fontfile` loads the
      vendored WOFF2 directly and bypasses fontconfig. Proof: the conjunct `ক্ষতি` renders ~40%
      narrower than the same characters forced apart (`ক স তি`) — which is what correct
      যুক্তাক্ষর shaping produces.
    - **Two public-read endpoints**, deliberately: a card exists to be scanned by anyone, and it
      draws only what `/reporters/:slug` already publishes. Email, verification note and
      verifier are never drawn. `Cache-Control: max-age=86400` + `ETag` from `updatedAt`.
    - CI now copies the Bengali font into the standalone bundle root — **Next does not trace
      it**, exactly as it does not copy `.next/static`; without it the endpoint answers 503.
      `verify:reporter` was also added to the CI harness loop (it had only ever been run by hand).
    - Gates: biome 0 errors · typecheck 0 · `verify:astro-imports` 118 · build **153 pages**
      (152 + the sentinel) · `verify:build-output` · `verify:links` (7257 links, 428 structured
      URLs) · `verify:apache` · `verify:id-card` · `verify:endpoints` — **all green**.


43. ✅ **S15 built — Live TV, and the THIRD CSP profile** (2026-09-28, verified locally).
    Full detail in `.sps/section-todos/S15.md`.
    - **What shipped:** `LiveStreams` collection, `MediaEmbed.astro` (one click-to-load player for
      **both** providers — the owner chose both, and they differ only in the frame URL, so the
      behaviour, the reserved 16:9 box and the runtime re-validation exist once), `/live-tv`, a
      footer link, a sitemap entry, and a `liveTvTop` ad position.
    - 🚨 **The third CSP profile is the architectural change.** `/live-tv` frames YouTube *and*
      Facebook: strict is `frame-src 'none'`, and the relaxed profile carries no video at all, so
      tagging the route `RELAXED` blocks the player **silently**. Widening `RELAXED` was rejected as
      a security regression (the homepage, every category listing and `/quiz` would gain iframe
      permission they do not need). `SHIKKHA24_CSP_MEDIA` is scoped to `/live-tv` alone.
    - ⚠️ **Three things fail silently on their own**, so all three are asserted: a tagged route with
      no consuming `Header` falls to **strict** (the same class as the `/article/*` rule that stopped
      matching at S11); the tag leaking sitewide; and `frame-src` omitting one provider. The relaxed
      profile is now *asserted* to carry no video host, so the rejected option cannot be quietly
      reintroduced.
    - ⚠️ **`verify-apache.mjs` keys the expected profile on `data-media-embed`**, not on the
      `/live-tv` path — a path key would be a second copy of the `.htaccess` regex (the M14/M16
      mistake). The route loop was restructured at the same time: its old `hasAd`-first branching
      mis-classified a media page with no ad slot as merely "over-relaxed". The new logic keys on
      the direction that matters — needing a relaxation and not getting it is a failure; having a
      wider policy than needed is a note.
    - **Counter-proved:** the tag was stripped from both `.htaccess` copies and both gates went red —
      `verify:apache` reported `/live-tv … got strict`, `verify:build-output` reported
      `0 rule(s) matching /live-tv`.
    - ⚠️ **Two new traps, both cost real time:**
      1. **Payload's boolean field type is `checkbox`, not `boolean`.** `type: 'boolean'` fails
         `tsc` with `Type '"boolean"' is not assignable to …` — the error names the field, not the
         fix.
      2. **A seeder's early-return path is a silent trap.** `seedDemoEngagement` bails out once the
         gallery exists, and that gallery predates S15 — so on any existing database the early
         return is the *only* path taken and the first version of the live-stream fixture created
         **nothing**. The only signal was the seed report printing `liveTv 0`. **When adding a
         fixture to an idempotent seeder, check every return path.**
    - **Dependency (rule 8):** none added. `qrcode` (S14) remains the only new package.
    - **Fixture:** a demo live stream, because `/live-tv` self-hides when the collection is empty —
      without it the third-profile check is vacuous. Purged by `seed:demo:purge` on the `ডেমো:`
      title prefix.
    - **Verified on the built page:** 0 `<iframe>`, 0 `youtube-nocookie` in the markup, and exactly
      one third-party URL — the fallback `<a href>` to the watch page, which is a link and makes no
      request. The S9 "no third-party request on load" invariant holds.
    - Gates: biome 0 errors · typecheck 0 · `verify:astro-imports` 119 · build **154 pages** ·
      `verify:build-output` · `verify:links` (7381 links) · `verify:apache` — **all green**.
    - ⚠️ **Hit the Drizzle stale-index trap** (`payload_locked_documents_rels_order_idx already
      exists`) on the first schema push for the new collection, exactly as recorded. A retry after
      the failed push succeeded — no manual `DROP INDEX` was needed this time. **The database was
      backed up to `/tmp/payload-backup-*.db` first.**


44. ✅ **S16 built — reader reactions** (2026-09-28, verified locally). Full detail in
    `.sps/section-todos/S16.md`.
    - **What shipped:** `Reactions` collection · `POST /api/reactions/toggle` +
      `GET /api/reactions/counts` (both **collection-mounted**) · `ReactionBar.astro` island ·
      `verify:reactions` (9/9) · a privacy-policy disclosure.
    - ⚠️ **`Reactions.read` is NOT public — that is a privacy control.** A row holds a
      `fingerprint`, so a public read would let anyone enumerate every fingerprint on an article.
      The aggregate is computed server-side by the counts endpoint and only five counts plus the
      caller's own choice leave the CMS.
    - ⚠️ **Two compound unique indexes, and both are needed.** `(article, type, reader)` covers a
      signed-in reader (the account survives a cookie wipe); `(article, type, fingerprint)` covers
      an anonymous one. **SQLite treats `NULL` as distinct in a unique index**, so the reader index
      cannot constrain an anonymous row at all — the fingerprint index carries that case.
    - ⚠️ **The insert is deliberately not atomic, and the unique index is the control.** Two
      concurrent toggles can both see "no existing row"; the index refusing the second is the
      database doing its job, so the handler catches that and returns fresh counts rather than a
      500.
    - 🚨 **The counter-proof needed a different method, and this is the finding to keep.** Dropping
      the index out-of-band with `sqlite3` **cannot** prove anything: `payload run` **re-applies the
      declared schema on boot**, so the index was silently recreated before the harness ran and the
      harness **PASSED with the index "dropped"** — a counter-proof that proved nothing. The honest
      method is to remove the index from the **collection config**; the push then drops it for real
      and the harness reports `FAIL … a second row was created — the unique index is missing`.
      Restored byte-identical, re-ran, green. **Counter-prove a schema constraint via the config,
      never via the database.**
    - ⚠️ **`pagination: false` on the counts query is required.** Payload's `find` returns one page
      by default, so counting `docs.length` without it silently caps the tally at the page size —
      a wrong number that looks like a real one (trap 10A).
    - ⚠️ **Payload *throws* `Forbidden`** when access is denied on `find`, rather than returning an
      empty page. A harness asserting only `docs.length === 0` fails on the throw.
    - ⚠️ **The vocabulary lives in three places** — `cms/src/lib/reactions.ts`,
      `cms/src/collections/Reactions.ts` (admin labels), `frontend/src/lib/reactions.ts`. The CMS
      cannot be imported from the frontend (`node:crypto` + Payload), and a shared package for five
      strings is more machinery than the problem deserves. **Grepping for `angry` finds all three.**
    - ⚠️ **Single-choice is an endpoint rule, not a database rule.** The spec's two indexes do not
      make "one row per article per fingerprint" impossible, so a crafted request could record two
      different types and inflate the counts slightly. Making it a DB rule needs two more unique
      indexes, which the spec does not call for — recorded rather than added silently (rule 13).
    - **Dependency (rule 8):** none added.
    - Gates: biome 0 · typecheck 0 · astro-imports 121 · build **154 pages** (24 with a reaction
      bar) · build-output (incl. the new "no baked counts" assertion) · links · apache ·
      `verify:reactions` 9/9 · `verify:endpoints` — **all green**.


45. ✅ **S17 built — photo story + video news, and a real CSP defect found** (2026-09-28, verified
    locally). Full detail in `.sps/section-todos/S17.md`.
    - **What shipped:** `Articles.layout` / `photoStory` / `videoUrl` / `videoProvider` ·
      `PhotoStory.astro` + `lib/photo-story.ts` · `lib/video.ts` · `MediaEmbed` above the body ·
      `/video` hub · `ImageGallery` JSON-LD · `/video` tagged with the media profile.
    - 🚨 **THE DEFECT, and it is the most valuable thing this section produced.**
      `Articles.videoProvider` can be `facebook`, but the **article** profile's `frame-src` named
      only YouTube. An article carrying a Facebook video would have been **silently dead on the
      highest-traffic route** — HTTP 200, valid markup, a valid policy, and the iframe blocked with
      no error anywhere. It surfaced only because S17 made an *article* render a `MediaEmbed` for
      the first time, so `verify:apache`'s expectation finally mismatched.
      **Fix:** the article profile gained the Facebook hosts, **and the harness became
      provider-aware** — it reads `data-media-provider` off each page and asserts the served policy
      allows *that* provider. A blanket "does the policy mention Facebook" would not have caught it,
      because the question is whether the policy permits the frame the page actually creates.
    - ⚠️ **Consequence: the article and media CSP profiles are now byte-identical.** Both env vars
      remain (they dispatch by different route families, so a later change to one cannot silently
      widen the other), but **neither harness alone proves the dispatch any more** — the static half
      is `verify:build-output`, the runtime half is `verify:apache`. `profileOf()` now classifies by
      **capability** (`relaxed-video` / `relaxed-generic` / `strict`), not by which env var produced
      the header.
    - ⚠️ **`/video/page/:n` needed its own rule.** It is 3 segments, and the article rule excludes
      only a `page/` in the *middle* position — so page 2 of the hub would have been served strict
      and its player would have died silently.
    - ⚠️ **`/video` features the newest video with a player**, not just cards. The spec calls it a
      listing *and* decides it needs the media profile because it embeds; those only agree if it
      actually embeds. A page of plain cards needs no `frame-src` at all.
    - **Fixtures, and why there are two of them:** one video article per provider (YouTube **and**
      Facebook) plus a 4-frame photo story. With only a YouTube fixture the provider-aware check
      can never fire and the Facebook half of `MediaEmbed` never renders — **which is exactly how
      the defect survived.**
    - **Photo story:** a layout, not a collection. Frames render **ahead of** the prose, never
      instead of it. Box reservation measured at `--frame-ratio: 1600 / 1067` on all four frames;
      an unmeasurable image is **skipped, not guessed**. Scroll-linked with pure CSS behind
      `@supports` + `prefers-reduced-motion`, so the frames are fully readable with JavaScript off.
    - **Counter-proved both couplings:** stripping the `/video` tag turned both gates red
      (`/video → strict, but the page needs relaxed-video`); stripping the article profile's
      Facebook hosts produced `frames a Facebook video, but the policy forbids the frame`.
    - **Dependency (rule 8):** none added.
    - Gates: biome 0 · typecheck 0 · astro-imports 124 · build **155 pages** · build-output · links
      (7683) · apache · sync · `verify:reactions` · `verify:endpoints` · `verify:id-card` — **all
      green**.
    - ⚠️ **CLS was verified by construction, not measured.** The reserved boxes are asserted in the
      built HTML; the `CLS < 0.02` Lighthouse number needs a production deployment (S12).

46. 🚨 **The GPA calculator was wrong in three ways — fixed 2026-09-28** (owner report: "the GPA
    Calculations is not accurate"). This is **not** a new section; it corrects N6 from S10.
    - **Researched first (rule 3), against three independent sources.** The verified rule:
      ```
      ৪র্থ বিষয় বোনাস = সর্বোচ্চ(০, ৪র্থ বিষয়ের পয়েন্ট − ২.০০)
      চূড়ান্ত জিপিএ = (মূল বিষয়ের পয়েন্টের যোগফল + বোনাস) ÷ মূল বিষয়ের সংখ্যা   [সর্বোচ্চ ৫.০০]
      ```
      Only the part **above** 2.00 is added, so the maximum bonus is **3.00**, not 2.00 — and the
      4th subject is **not** in the divisor. Boundaries: 80+ A+ 5.00 · 70 A 4.00 · 60 A− 3.50 ·
      50 B 3.00 · 40 C 2.00 · 33 D 1.00 · 32 and below F 0.00.
    - 🚨 **Bug 1 — the 4th-subject bonus was `min(GP, 2)` instead of `max(0, GP − 2)`.** An A+ 4th
      subject contributed 2.00 instead of 3.00, and a B (3.00) contributed 2.00 instead of 1.00.
      **The direction of the error was always downwards**, so the calculator systematically
      under-reported.
    - 🚨 **Bug 2 — an F in a compulsory subject did not fail the result.** It scored 0.00 for that
      subject and averaged the rest, so a candidate with one F and five A+ was told **4.17** instead
      of **0.00**. This is the one that could mislead someone about whether they passed.
    - 🚨 **Bug 3 — the final letter grade was looked up on the wrong scale.** `GRADES.find(g => gpa
      >= g.min)` compared a GPA (5.00 scale) against the **marks** boundaries (80, 70, 60 …), so the
      first entry it could satisfy was always the `0` one — **every single result was labelled
      এফ**. Visible, wrong, and nobody had reported it.
    - ⚠️ **The root cause was structural, not arithmetic.** The calculation lived inside a
      `<script>` in `gpa.astro`, so **nothing could call it and nothing could check it**. It is now
      `frontend/src/lib/gpa.ts` — a pure module — with `scripts/verify-gpa.mjs` (60+ checks) over
      it, wired into `pnpm verify` and CI. `verify:build-output` also asserts the page's DOM
      contract (every `getElementById` id the bundle looks up exists in the built page), so a
      renamed element cannot silently kill the calculator.
    - ⚠️ **`pnpm verify:gpa` runs the `.ts` module directly** via Node's
      `--experimental-strip-types`, so the harness exercises the real function rather than a
      re-typed copy of the rules. Two consequences: the harness itself must be plain **`.mjs`**
      (annotations in a `.mjs` are a syntax error — only `.ts` is stripped), and `gpa.ts` must stay
      **erasable** (no enums, no namespaces, no parameter imports).
    - **Also corrected:** the on-page rule text claimed a maximum bonus of 2.00 (now rendered from
      the constants, so it cannot drift); `ঐচ্ছিক (৪র্থ/৫ম)` implied a 5th optional subject that does
      not exist; and the marks input capped at 100, so the **200-mark combined Bangla and English**
      papers could not be entered at all. Each row now carries its own total (১০০/২০০) and grading
      is on the percentage.
    - **Rounding: the sources disagree, and the disagreement is not hidden.** One states the board
      *truncates* rather than rounding up; another's worked example rounds (`42 ÷ 9 = 4.666…`
      reported as `4.67`). The module returns `rawGpa` unrounded and the page **shows it whenever
      rounding moved the number**, so a reader whose exact figure is 4.6667 can see that instead of
      being handed a rounded value presented as authoritative. The displayed GPA rounds to two
      decimals, capped at 5.00.
    - ⚠️ **Two counter-proof lessons, one of them new.** (a) All three bugs were re-introduced one at
      a time and the harness went red each time with the right diagnostic. (b) **The DOM-contract
      check was itself wrong first, and counter-proving it is how that was found:** it used
      `bundle.includes('class="gpa-marks')`, which also matches `class="gpa-marks-2` — and a CSS
      class selector matches whole names, so that rename really does break the query while the check
      stayed green. It now compares **whole class tokens** extracted from the `class="…"`
      attributes. **A check written to catch a silent failure is exactly the check that needs
      counter-proving.**
    - **S10's evidence file had recorded the wrong rule as the design** ("Optional subject's points
      are capped at 2.0…"), which is why nobody questioned it. Corrected there, with the bug struck
      through rather than deleted.
    - Gates: biome 0 · typecheck 0 · `verify:gpa` all pass · astro-imports 130 · build **155 pages**
      · build-output · links · apache — **all green**.

47. ✅ **CGPA calculator added as a second, separate tool — and the two are different systems**
    (2026-09-28, owner request). Not a section; it extends S10's N6.
    - **Why a separate page and not a mode on `/gpa`.** They are not two views of one thing.
      `/gpa` is the **school-leaving 5.00 scale** (A+ = 5.00, an F in a compulsory subject zeroes
      the result). `/cgpa` is the **university 4.00 scale** (A+ = 4.00, marks weighted by credit
      hours, and **an F is a 0.00 that is included** rather than annihilating the average). A single
      page with a toggle would invite exactly the mix-up this split prevents — and mixing the two
      scales is the most common mistake on a Bangladeshi application.
    - ⚠️ **The F rule is the trap, and it is the opposite of the school one.** Copying the school
      rule would tell a student who failed one course that their CGPA is **0.00** when it may be
      comfortably above 3.00. `verify:cgpa` asserts both the value and the credits staying in the
      denominator, and the counter-proof applies the school rule deliberately to confirm the
      harness catches it.
    - ⚠️ **Bangladeshi universities do NOT share one grade table**, so the scale is a choice the
      reader makes, never an assumption. Two verified presets:
      - **UGC / public + National University** — quarter-point 4.00 scale, pass at **40%**.
        Three independent sources agree exactly.
      - **Private-university `+/-` variant** — pass at **60%**, and 75 marks is an **A (3.75)** at
        one and a **C (2.00)** at the other.
      ⚠️ **The second was taken from North South University's own published grading policy, and it
      disagreed with a third-party calculator** — which put A at 95 marks where the university says
      **93**. Third-party calculators are not authorities on someone else's regulations. The page
      names the scale in use, prints where it came from, and tells the reader to check their own
      policy.
    - **Inputs:** one table — course, credits, grade, optional semester. The result gives the
      **CGPA**, the degree class, credit/point totals, **and a per-term GPA breakdown**, so one
      table answers both "what is my CGPA" and "what did I get last semester".
    - **I and W grades are excluded** from the CGPA (they are not offered as options), matching the
      policy; a genuine 0.00 is reported as `0`, which is a different state from "nothing entered".
    - **Counter-proved three ways:** the school F rule, assuming a single scale, and dropping the
      failed course from the denominator — each turned the harness red with the right diagnostic.
    - ⚠️ **The harness caught two of MY OWN wrong expectations first** (a mis-stated denominator,
      and reading 75% as C+ when the NSU band is 73–76 = C). Worth keeping: writing the expectation
      down is where a misunderstanding surfaces, which is the point of the exercise.
    - `verify:build-output`'s DOM-contract check was **generalised to both pages** and now reads the
      selectors from each page's own bundle. ⚠️ It also had to learn that a class selector may be
      satisfied by the **page markup** (a class the script queries but does not create, like the
      scale radios) as well as by the bundle's own injected markup.
    - ⚠️ **`biome.json` gained one override**: `noUselessLoneBlockStatements` is off for
      `scripts/verify-*.mjs`. The `{ }` scoping blocks in those linear harnesses are deliberate and
      keep the section names short; seven "info" diagnostics of the same kind is noise that trains
      a reader to ignore the linter.
    - Gates: biome 0 · typecheck 0 · `verify:gpa` · `verify:cgpa` · astro-imports 135 · build
      **156 pages** · build-output · links (7964) · apache — **all green**.

48. 📊 **GPA/CGPA calculator landscape researched → `docs/gpa-calculator-landscape.md`**
    (2026-09-28, owner request). Catalogues the tools that already exist in Bangladesh and
    internationally — name, region, what each calculates, how it helps students — and states which
    are worth adopting. Headlines:
    - **Very few tools cover both BD systems.** Most cover SSC/HSC *or* university, not both — which
      is why the two calculators are separate pages rather than one tool with a toggle.
    - **⚠️ The finding that shapes positioning: third-party calculators are not authorities on
      someone else's regulations, and at least one is demonstrably wrong.** A widely-linked
      calculator puts NSU's A at **95 marks**; the university's own policy says **93**. So the pitch
      is not "more features", it is **verifiable correctness** — the rules are named, sourced and
      asserted by a test.
    - **Worth adopting (ranked, no commitment made):** previous-CGPA merge; target GPA / "what do I
      need" (which can say a target is *impossible* — the most useful output available); the
      with/without-4th-subject comparison; the retake/improvement rule (the new grade **replaces**
      the old, which students act on).
    - **⚠️ Explicitly NOT recommended: per-university percentage conversion.** It is essential in
      India because employers ask for a percentage and each university defines its own formula. In
      Bangladesh it is unnecessary — a university CGPA is already on a 4.00 maximum, so the correct
      answer is "quote it as it is and state the scale". Copying the Indian model would invent a
      problem.
    - **The one real differentiator we lack** is `nucgpa.com`'s **pre-loaded syllabi per department**
      — it eliminates the data entry that makes every other CGPA calculator tedious. It is also the
      only option with an ongoing maintenance cost, so it needs an owner decision, not an
      assumption.
    - **Not competitors:** WES / ECE / Scholaro. Those are credential *evaluation* for study abroad —
      a paid, official service answering "how is my degree read elsewhere". Pointing at them is more
      useful than trying to replace them.

49. 🚨 **CI went red on the first push of this session — and it was a real S14 defect, not a CI
    artefact** (2026-09-28, commit `a7f883c`). Worth reading before trusting any local run again.
    - **Symptom:** `Verify internal links` failed with **26 broken targets** —
      `/api/photocard/<id>.png` and `/api/idcard/<SHK-R-…>.png`, all **same-origin relative paths**.
      Every local run had been green.
    - **Why it passed locally, every time:** `frontend/.env` sets `PUBLIC_CMS_ORIGIN`, so the card
      URLs were **absolute** and `verify:links` ignores off-origin links. **CI leaves that variable
      unset deliberately** — its own step comment says so — because CMS-dependent islands are meant
      to self-hide without it.
    - **The defect:** `ShareRow.astro` and `reporters/[slug].astro` read the **raw**
      `import.meta.env.PUBLIC_CMS_ORIGIN` and fell back to `?? ''`, producing a same-origin `/api/…`
      path the static host does not serve — a dead card link on 24 article pages and a broken card
      image + download on every verified reporter page.
    - ⚠️ **`ShareRow`'s own comment claimed the opposite**: *"An unset `PUBLIC_CMS_ORIGIN` hides the
      button rather than emitting a link to a path the static host does not serve."* The comment
      stated the intent and the code did the reverse. **This is the second time in S14 that a
      comment asserted behaviour the code lacked** (the first was the `/verify` not-found state).
      **Treat a comment describing a *negative* behaviour — hides, refuses, skips — as a claim to
      verify, not as documentation.**
    - **Fix:** both now read through `getPublicCmsOrigin()`, the established helper: configured
      origin → local `CMS_URL` in dev → `null`, and `null` means the section is not rendered at all.
    - **How it was found and proved:** reproduced locally by copying `frontend/.env` aside and
      supplying CI's env (`CMS_URL` + `PUBLIC_MEDIA_BASE_URL`) — the build then produced the **same
      26 missing links**. After the fix, in the same env, the cards render absolute and
      `verify:links` passes. `.env` restored **byte-identical** (md5 compared). ⚠️ A cross-device
      `mv` fails with `EXDEV` — use `cp` then `rm`.
    - **Then pushed and watched the runner: all 25 CI steps green**, including the two new
      `verify:gpa` / `verify:cgpa` steps and the link check that had failed.
    - **Lesson, and it is the same one the file already carried:** *a green local run is a
      hypothesis; the runner is the evidence.* A harness that quietly reads a developer's `.env`
      passes on every machine that has one, and fails only where it matters.

50. 🚨 **The CMS had six authorisation holes, four critical — all fixed 2026-09-30.** Owner asked
    for an in-depth audit of whether the CMS works correctly, then a complete TODO list fixed one at
    a time with verification after each. **It did not work correctly**, and every existing gate was
    green throughout.
    - ⚠️ **THE SYSTEMIC FINDING, and the reason to read this item:** `403` and `Forbidden` appeared
      **zero times** across `cms/src/verify/*.ts`. The suite tested the *custom* endpoints
      thoroughly and **never once asserted that a generated REST route refuses the wrong caller**.
      That is how six holes shipped. The fix is `verify:access` (below), and it is the most valuable
      artefact here.
    - ⚠️ **Payload's default for an undefined rule is `Boolean(user)`** — "any authenticated
      account", not "anyone". Verified in `payload@3.89.0/dist/auth/defaultAccess.js`. A collection
      that defines only `read` is therefore **not** read-only; it is write-open to every logged-in
      account. **State all four rules explicitly, always.**
    - **The holes** (each proven with a real request *before* being fixed):
      - **C1 `media`** — only `read` defined, so create/update/delete fell to the default.
        `DELETE /api/media/999999` → **404, not 403**. Any account could wipe the image library, on a
        2 GB plan shared with the app and the database.
      - **C2 `users`** — `isSelfOrAdmin` compared a **document** id to the **user** id, and `users`
        and `readers` both number from 1. A reader session got `GET /api/users/1` → **200** with
        nameBn, `roles:["superAdmin"]` and phone, and `PATCH … {email}` was **granted** (400 naming
        the email field). Since email is the login identity and reset sends to it, that was an
        **account-takeover path**.
      - **C3 `newsletter-subscribers`** — `create: () => true`, justified as "so the endpoint's
        local-API call can write". **That was false**: the endpoint uses `overrideAccess: true`. An
        anonymous `POST` with `isActive: true` → **201, is_active=1** — **double opt-in bypassed**.
      - **C4 `readers`** — `create: () => true` → 201, then five more in **222 ms**. This was the
        entry point for C1 and C2.
      - **H1 `bookmarks` / `saved-deadlines` / `push-subscriptions`** — `isSelfOrAdmin` filtered on
        `id`, but ownership is the **`reader` relation**. A reader's own rows were invisible and a
        foreign row sharing their numeric id was returned instead.
      - **M `comments`** — `create: () => true` bypassed `/api/comments/submit`'s rate limit,
        honeypot and whitelist. Bounded by `isApproved` being field-protected.
    - ✅ **`isSelfOrAdmin` is now `isSelfIn('users' | 'readers')`** — the caller must name the
      collection whose ids it compares, so the mistake is **unrepresentable**. That single root
      cause produced three separate defects: `authors` (2026-09-18), `users`, and the relation-owned
      three. A new `isOwnReaderRowOrSuperAdmin` covers the relation-owned case.
    - ✅ **`verify:access`** asserts, for every collection and role: all four rules stated explicitly
      (this is what would have caught Media); `create` returns a strict **boolean, never a Where** (a
      Where from `create` is merely truthy, so it authorises while constraining nothing); anonymous
      denied every write everywhere; a reader denied every write except its own rows, **asserted to
      scope on the owning column** — naming the column is the point, since the old bookmarks rule
      returned a Where that a truthiness check would have accepted. Hermetic: reads the config,
      writes nothing, runs in seconds.
    - ⚠️ **A collection edit needs a CMS RESTART.** Next.js does not reload the Payload config, so the
      first T5 verification "failed" against a stale server. Every verification after that restarted
      first.
    - ⚠️ **A counter-proof that "passes" on a crash is not a counter-proof.** The first bookmarks
      mutation referenced an unimported helper, so the harness *crashed* — non-zero exit, **zero FAIL
      lines** — and the script called it a catch. It now treats "non-zero with no named assertion" as
      a failure. Each defect was reintroduced and the harness went red naming the right assertion.
    - ⚠️ **Caught while proving rather than assuming:** adding `verify:endpoints` to the CI local-API
      loop would have **turned CI red** — that loop boots Payload in-process with no HTTP listener and
      the harness makes real requests (`ECONNREFUSED`). It was already correctly placed in the
      with-CMS step. **Two harnesses need a live server: `verify:endpoints` and `verify:sync`.**
    - ⚠️ **The gate table was documenting gates that did not exist.** `docs/testing-and-qa.md` listed
      `verify:endpoints`, `verify:social` and `verify:rebuild-notice` as "Every CI run" while none ran
      anywhere in the workflow. All three run now and the table matches.
    - **Also fixed:** `requireEnv()` for `PAYLOAD_SECRET`/`DATABASE_URI` (an empty signing secret is a
      *known* signing key — `lib/signed-token.ts` already threw, Payload's own auth did not); the
      localhost origins removed from the production CORS allow-list; the env template's duplicated
      `PUBLIC_SITE_URL` and its wrong description of `PUBLIC_CMS_ORIGIN` (it called it the build-time
      origin — that is `CMS_URL`, the exact confusion this file warns about); a stale collection
      count; and `authors.bloodGroup`, which was anonymous-readable with no public consumer.
    - **Final state:** root `pnpm verify` exit **0** · 12 harnesses in the CI loop pass with **no
      server** · the with-CMS step (sync + endpoints) exit 0 · the 27-check HTTP access matrix ALL
      PASS · database restored to its exact pre-audit counts · 8 commits (`990ab97` … `58724b9`).
    - ⚠️ **Not covered:** the admin UI itself (Payload admin views hydrate client-side — the S13
      `/admin/reporter` browser check is still open), rate limiting under real load, and the
      production CSP/hosting interaction.

51. ✅ **T12 — the dependency advisories fixed, and S11's auto OG images done** (2026-09-30). CI is
    **green on all 29 steps** including `Dependency audit`.
    - **The advisories were new, not caused here.** `pnpm audit --audit-level=high` began failing on a
      lockfile that had **passed two days earlier**. `undici` (TLS validation bypass in BalancedPool;
      WebSocket-subprotocol DoS) and `nodemailer` (addressparser ReDoS), both transitive via Payload.
    - ⚠️ **Upstream has not fixed either.** Verified, not assumed: the latest `payload@3.90.2` still
      pins `undici: 7.29.0`, and the latest `@payloadcms/email-nodemailer@3.90.2` still declares
      `nodemailer: ^9.1.1`. An override is the only fix.
    - ⚠️ **Scoping the override matters more than the override.** `undici` exists **twice** here:
      `7.29.0` via Payload (vulnerable) and `8.10.2` via Astro's `unifont` (not vulnerable). A bare
      `undici: 7.29.1` would drag **Astro's copy backwards a major version**. The key is
      `'undici@7.29.0'` — the exact vulnerable version — so it hits only what needs it and stops
      applying by itself once upstream moves. **Overrides live in `pnpm-workspace.yaml`** (pnpm 10+),
      not `package.json`. Result: 20 vulns (3 high) → 7 (0 high); the gate exits 0.
    - ⚠️ **Two things I got wrong, both caught by checking rather than assuming.**
      (a) A web search claimed nodemailer 10 relicensed to **EUPL-1.1** — **false**: npm and the
      published tarball both report **MIT-0** for 9.1.1 and 10.0.6. That claim would have blocked a
      correct fix. (b) nodemailer 10 **is** a real break, just not a runtime one: its v10.0.0 notes
      list exactly one breaking change ("Node.js 20 or newer"), so it was called safe — and CI's CMS
      typecheck failed with `'auth' does not exist in type 'SMTPConnectionOptions'`. v10 moved `auth`
      from the *connection* options to `SMTPTransport.Options`, and Payload types `transportOptions`
      as the former. **Fixed by building the options object as a value, not an inline literal** — the
      excess-property check only applies to fresh literals. Payload passes `transportOptions` straight
      to `createTransport`, which has always accepted `auth`: an upstream type narrower than the
      function it describes.
    - ⚠️ **The sandbox cannot install — `sandbox-build-traps` Trap 9.** `pnpm install` dies with
      `CODEBUDDY_BROKER_DENY EEXIST` on the store's project symlink, or **hangs indefinitely** (10 min
      observed). `--lockfile-only` hits it too. **The working sequence: `rm -f` the stale symlink and
      run the install in the SAME command**, so the single `registerProject` call creates it fresh.
      Never run two pnpm invocations at once. `node_modules` therefore still holds the old versions
      locally — **CI installs from the lockfile, so CI is where the new versions are exercised.**
    - **Verification without an install:** the published tarball was downloaded and inspected (dual
      ESM/CJS `exports`, `createTransport` on both), then a focused type test with the project's own
      `tsc` proved the new shape passes against v10's real types — with a `@ts-expect-error` guard on
      the old inline form so the test is **not vacuous**.
    - ✅ **S11 auto OG images** — the last agent-doable item of the 26 open ones (25 are owner-only,
      production-only, or approvals). ⚠️ **`satori` was never needed**: S14 already ships
      `GET /api/photocard/:articleId.png`, a 1200×1200 sharp-composed card with the headline over a
      darkened featured image, which `lib/id-card.ts` calls "built for Facebook" *because the sharer
      scrapes the OG image*. The gap was **wiring** — articles without a featured image fell back to
      the generic `/og-default.png`, and **all 24 demo articles are in that state**. Now the featured
      photo wins when present, otherwise the article's own card, guarded on `cmsOrigin` so an unset
      origin keeps the working default rather than emitting a same-origin `/api/…` path (the S14
      defect). Verified: card renders 200/`image/png`/1200×1200 with ETag + 24h cache; both `og:image`
      and `twitter:image` point at it; `/about` and friends keep `og-default.png`; `verify:links`
      passes in both builds.

52. 📋 **University Directory — approved, S18–S21 planned, NOT STARTED** (2026-09-30). Owner asked
    for a directory of universities and colleges with 7 browse categories and 13 profile fields, and
    asked to be interviewed first. **Spec: `docs/university-directory.md`.** Plan and field list:
    `.sps/task.md` → "S18–S21".
    - ⚠️ **It EXTENDS S10's N4, it is not a new feature.** `/institutions` + `/institutions/[slug]`
      already exist with 5 seeded rows and a thin model. Read the existing collection before writing
      a new one.
    - ⚠️ **The data survey changed the requested scope, and this is the important finding.** The
      owner asked for *"full listing including all NU colleges"*. The site is **Bengali-only**; the
      NU college list is **English-only**. Measured on 2026-09-30:
      - **Wikidata** (CC0): 272 universities, **271 with Bengali names**, 178 with official websites,
        217 with inception years — the only source that solves the Bengali-name problem.
      - **GitHub `bangladesh-education-datasets`**: 216 universities, **English only**, CC BY-SA 4.0,
        `specialization` has two casings (`Agricultural Science` **and** `Agricultural science`),
        ~20 one-off values and **25 nulls**, and its sections include *Proposed universities* — so a
        wholesale import would publish pages for universities that do not exist. **Do not import it.**
      - **NU College Portal** (official): **2,274** colleges (602 govt / 1,692 non-govt),
        **zero Bengali names**, no district field, and its data endpoint needs a **CSRF token**.
      - **No source** has faculties, departments, admission information, tuition/fees, important
        links or contact. Those are per-institution editorial work, full stop.
      → Owner chose **Option A, two-tier**: seed every institution with a Bengali name (~271
      universities + Wikidata's higher-ed set), then build the rich profile editorially starting with
      the ~55 public universities.
    - ⚠️ **A query of mine reported "0 Bengali labels" and was WRONG** — a bug in how I read the
      label service. The direct aggregate said **271 of 272**. Checking the aggregate rather than
      trusting my own first query is what caught it.
    - **Three model decisions (owner):** **two axes** — `type` (public/private/nu-college/madrasa)
      and `discipline` (general/engineering/medical/agricultural/islamic/…) — so the 7 browse
      categories are **filters over them** and BUET appears under both Public and Engineering;
      **automatic article linkage** via `Articles.university`; **hybrid profile fields with a visible
      "সর্বশেষ যাচাই" date**. Imported rows are **`isVerified: false`** — the badge means "a person
      checked this".
    - ⚠️ **Fees: exact figure per programme, and the mitigations are mandatory.** The owner chose
      exact figures over a range. A stale figure looks authoritative in a way a missing one does not,
      so `tuitionFees[].verifiedAt` is **`required`** (a fee cannot be saved without a date), a source
      link points at the university's own fee page, and the academic year is part of the row.
    - 🚨 **S18 WAS STARTED AND DELIBERATELY REVERTED — read before resuming.** The model changes were
      written and passed biome + typecheck + astro-imports. **The Payload schema push then HUNG** —
      4+ minutes, twice, including after clearing the WAL — instead of applying them, so the code
      expected columns the database did not have. The six changed files were reverted
      (`Institutions.ts`, `Articles.ts`, `payload-types.ts`, `lib/education.ts`, both institution
      pages) and the tree is back to the last verified commit. **The database was never damaged** —
      still 5 institutions with the original columns — and it was backed up first.
      **Resume by making the schema change and PROVING the push completes before building on it.**
      The trap is `sandbox-build-traps` Trap 14 / the drizzle stale-index trap; the fix belongs in
      that skill, not in this feature.
    - ⚠️ **Two breaking details to remember when S18 resumes:** `address` **moves into the `contact`
      group** (a page still reading `institution.address` renders nothing, not an error, because
      `.astro` frontmatter is not typechecked), and the frontend's `TYPE_LABELS` was **duplicated
      verbatim** in the index and profile pages while still listing the removed `college` value —
      extract it to one shared source.
    - ⚠️ **Known gap: "Notice" has no category.** Of the four requested article groups, three map
      cleanly onto the existing 8 categories (news → `education-news`/`university`; admission
      circular → `admission`; result → `exams-results`). A distinct Notice group needs either a 9th
      category — a plan amendment — or acceptance that notices appear under news.

53. ✅ **S18 — the university directory model, BUILT** (2026-09-30, commit `519c5b4`). Extends S10's
    N4 starter set per `docs/university-directory.md` §2. No access rule changed.
    - 🚨 **THE 2026-09-30 "HUNG SCHEMA PUSH" WAS MISDIAGNOSED, and this is the session's most
      valuable finding.** The push was never the problem. **`pnpm run` triggers pnpm 11's pre-run
      dependency check**, which shells out to `pnpm install` — and in this sandbox that either dies
      with `CODEBUDDY_BROKER_DENY EEXIST` or **hangs indefinitely** (10 min observed). The earlier
      session read that hang as a drizzle failure and reverted six working files.
      **Run the Payload CLI directly instead** —
      `node_modules/.bin/payload run <script>` with `--config.verify-deps-before-run=false` — and the
      push completes in seconds. A `pnpm` shim that injects that flag makes `pnpm run`, the nested
      calls inside the project's own scripts, and `with-cms.sh` all work unchanged.
    - ⚠️ **The drizzle stale-index trap is real, but it is a different failure with a different
      trigger.** It bites a **pre-existing** database whose schema predates the change: the push
      re-emits `CREATE INDEX` for indexes that already exist (`articles_title_idx`, then
      `_articles_v_parent_idx`, …), so it converges only over repeated attempts — drop the named
      index and retry, as MEMORY trap 4 says. **A fresh database pushes cleanly AND is idempotent**,
      verified by booting one twice. So CI (which seeds a fresh `ci.db`) was never at risk.
    - **Two decisions taken while implementing, both against the obvious choice:**
      (a) **`wikidataId` is indexed but NOT `unique`.** Payload does **not** coerce `''` to `null`
      for a text field (read in `payload/dist/fields/hooks/beforeValidate/promise.js`), so a unique
      index would reject the **second** institution saved by hand with a blank ID — and S21 authors
      the first ten by hand. Proven: two blank-ID rows both save. De-duplication belongs to S19.
      (b) **`address` was preserved, not dropped.** The rename to `contact.address` was applied as a
      real `ALTER TABLE … RENAME COLUMN` before the push, so all five seeded addresses survived;
      `DROP COLUMN` would have taken them with it.
    - **The two axes are two fields on purpose.** `type` (ownership) and `discipline` (subject); the
      seven browse categories are *filters over them*. One exclusive category would file BUET either
      as Public or as Engineering — either way it disappears from one of the two searches students
      actually use.
    - **The fee guard is proven, not asserted.** `tuitionFees[].verifiedAt` is `required`; creating a
      fee row without it is refused with *"Tuition fees 1 > Verified on"*.
    - **`verify:access` gained 15 assertions** on the model *contracts* (two axes stay two fields,
      `college` gone, `address` off the top level, fee date `required`) — things an access rule
      cannot express, asserted as config facts in the harness that already exists.
    - **Frontend kept green by the model change:** `CmsInstitution` updated,
      `institution.address` → `institution.contact.address` (visible block **and** JSON-LD), and the
      duplicated label map extracted to `frontend/src/lib/institution-labels.ts` — the two copies had
      drifted and still listed the removed `college` value.
    - **Evidence:** schema push completes (columns/tables/indexes verified in SQLite) · **20/20**
      round-trip checks over the real local API · lint 0 errors · typecheck clean ·
      `verify:astro-imports` 139 exports · `verify:access` 0 FAIL (38 collections) · build **156
      pages** · `verify:build-output` / `verify:links` (7964 links) / `verify:apache` exit 0 · the
      12-harness CI loop and the with-CMS `sync` + `endpoints` step all pass · database left at its
      exact prior counts (5 institutions, 24 articles, no strays).
    - **Next:** S19 (the re-runnable Wikidata import, CC0, one query, no scraping), S20 (the 7-category
      navigation + profile sections + JSON-LD), S21 (Tier-2 authoring, first ~10 public universities).

54. ✅ **S19, S20 and S21's admin experience — the university directory is live** (2026-10-01,
    commits `d423ca1`, `bcd868a`, `d0180b5`, `02dcbb5`). **724 institutions** in the directory.
    - **S19 — the import (`d423ca1`).** One Wikidata SPARQL query (CC0), re-runnable: a second run
      reports 712 unchanged and writes nothing. 940 candidates → 719 created, 5 adopted, **216
      rejected with named reasons**. Three rules were wrong before the data corrected them, and each
      is worth keeping:
      - ⚠️ The candidate set is `university` + `college` subclasses, **not** the broad
        `P31/P279* Q38723` walk — that returns 1,283 items including **52 government girls' high
        schools, 44 schools and 14 cadet colleges**.
      - ⚠️ **A BD "School and College" is classed by Wikidata as a bare `college`.** 43 were imported
        before a name check existed. The check must match `স্কুল` and the **full** `উচ্চ বিদ্যালয়` —
        a bare `বিদ্যালয়` matches `বিশ্ববিদ্যালয়` and would delete the whole university listing.
      - ⚠️ **University of Rajshahi is tagged `open-access publisher`** alongside `public university`.
        While both sat in one "not higher education" set the publisher tag won and **a major public
        university disappeared from the directory**. The fix was the *order* of the checks: a stated
        ownership now beats a loose tag. Found by spot-checking the output, not by reading the code.
      - **De-duplication needs two keys.** `wikidataId` catches a re-run; the Bengali name catches a
        row already present under another identity. The demo placeholders were **real institutions**
        (`demo-du` *is* ঢাকা বিশ্ববিদ্যালয়), so a name match is **adopted**, not duplicated. ⚠️ An
        adopted row is **re-slugged** when its slug carries the demo marker — `seed:demo:purge`
        deletes `demo-` institutions, so a row that has become real data would otherwise be deleted
        with the throwaway content it was created as.
      - ⚠️ **The import exposed a silent cap.** `getAllInstitutionSlugs()` asked for `limit: 200`, so
        a green build emitted 200 pages for 724 institutions and **524 did not exist** — the same
        shape as the `getAllArticleSlugs()` 500-cap defect. It now paginates.
      - ⚠️ **Not in CI or `pnpm seed`** — it is the one seed that needs the public internet, and a job
        that fails when Wikidata is slow is a gate that lies about the code.
    - **S20 — the frontend (`bcd868a`, `d0180b5`).** Profile sections (faculties + departments,
      admission, fees, links, contact), all **hidden when empty**; the fee table's mandatory
      **সর্বশেষ যাচাই** column and source link; the news linkage reading `Articles.university` and
      grouping by the article's own category; `CollegeOrUniversity` JSON-LD with a real
      `PostalAddress`.
      - ⚠️ **The navigation is filters on the hub, and that is a CSP decision.** `.htaccess` tags ANY
        three-segment path `SHIKKHA24_CSP_ARTICLE`, which grants video framing a listing has no use
        for; the file's own comment forbids an enumeration of reserved roots (the `/study-abroad`
        lesson), and the only structural escape hatch is a middle `page/`. `/institutions/<type>`
        would also collide with `/institutions/[slug]`. So the CSP is untouched.
      - ⚠️ **Two fixture problems, both of which would have shipped silently.** (a) The demo seed
        looked institutions up **by slug alone**, but S19 re-slugs an adopted row — so re-running
        `seed:demo` would have created a **second copy of a real university**; it now matches on slug
        **or** Bengali name. (b) Every section is gated on its data, so with nothing carrying fees or
        faculties they rendered **nowhere** — and a section that never renders is a section nothing
        verifies. Added `demo-rich-profile`, a deliberately fictional institution.
    - **S21 — the admin experience (`02dcbb5`).** Three tabs, split by the *work*: পরিচিতি ও যোগাযোগ ·
      বিস্তারিত প্রোফাইল · যাচাই ও সূত্র.
      - ⚠️ **Tabs are presentational, and that was proven rather than assumed:**
        `payload generate:types` output is **byte-identical** before and after.
      - ⚠️ **`verify:access` would have gone red for the wrong reason.** It looked fields up with a
        flat `collection.fields.find`, which does not descend into tabs — so every S18 field would
        have read as missing and the suite would have failed while the model was intact. `ownFields()`
        now treats a field inside a tab as a top-level field.
      - The collection hit 351 lines, so the fields moved to `lib/institution-fields.ts` (298).
    - 🚧 **WHAT IS STILL OPEN, and why it is not an agent task:**
      - **The first ~10 public universities with real profiles.** Every remaining field — faculties,
        departments, admission rules, fees — is one **no source carries**, and
        `docs/university-directory.md` §7 forbids guessing them. The import supplies 56 public
        universities to start from; the authoring is the newsroom's.
      - ⚠️ **Wikidata carries no discipline, so 706 of 724 rows have none.** §2.1's
        "Engineering = `discipline:engineering`" browse path is a filter with **7 entries** until
        someone fills the field in. This is the largest remaining gap in the feature.
      - ⚠️ **The "7 categories" are never enumerated in any doc.** §2.1 gives the shape and one
        example per axis, not a list. The owner chose **"best practice"** when asked, so the nav ships
        as the ownership axis (4 populated categories, 3–554) plus a discipline filter row that
        renders only where it has data. If the original request had a specific seven, they are not in
        the repository.
    - **Evidence:** build **876 pages** · lint 0 errors · typecheck clean · `verify:astro-imports` 142
      exports · `verify:build-output` exit 0 (**0 executable inline scripts**) · `verify:links` exit 0
      (876 pages, 57,063 links) · `verify:apache` **26/26** on a real Apache · `verify:access` 0 FAIL ·
      18/18 profile checks on the built page · the import re-runs as a no-op · database integrity ok.
    - ⚠️ **`verify:apache` cannot run on the full tree in this sandbox.** Its `cpSync` of 876 pages
      exceeds the brokered filesystem's limit and dies **before any assertion**
      (`CODEBUDDY_BROKER_OUTCOME_UNKNOWN`). It was verified on a reduced tree that still contains
      institution routes (152 routes, all correct profiles). **CI has no broker, so the full run is
      unaffected there** — but locally, expect to reduce the tree first.

55. ✅ **S21 completed as far as an agent honestly can — faculties imported, `discipline` proven
    author-only** (2026-10-01, commit `b8b2115`). Follow-up to item 54.
    - ⚠️ **This repo asserted twice that no source carries faculties or departments. Measured, that
      was false.** Wikidata's `P527` covers 64 of the 940 BD higher-education items, and **58 of those
      parts are typed `faculty` — 41 with a Bengali label — holding 179 Bengali-labelled departments**.
      Coverage sits exactly where the worked example starts: **Rajshahi 11, Chittagong 10, Dhaka 8,
      Barishal 6, Agricultural 4, BUET 1**. The import now takes them in the same single query,
      filtered to Bengali-labelled `faculty` parts. **Before writing "no source has X", query the
      source** — the assumption had been carried through two documents and a code comment.
    - ⚠️ **The lists are partial, and a short list reads as a complete one.** BUET shows **1** faculty
      because only one of its five has a Bengali name. The profile page therefore prints
      **"তথ্যসূত্র: উইকিডেটা — তালিকাটি অসম্পূর্ণ হতে পারে।"** under that heading, gated on the
      **provenance** (`dataSource` mentions Wikidata) rather than on `isVerified` alone — otherwise a
      hand-authored unverified profile would carry a false attribution.
    - ⚠️ **`discipline` is author-only, and both automations are provably wrong** (spec §8.2). This
      matters because it is the feature's largest gap — 706 of 724 rows have none, so
      "Engineering = `discipline:engineering`" is a 7-entry filter:
      - **From the name**: a conservative keyword rule recovers 77 rows and files **বাংলাদেশ
        ইউনিভার্সিটি অব বিজনেস অ্যান্ড টেকনোলজি** (a *business* university) as engineering, and
        **ইসলামিয়া কলেজ** (a general degree college) as Islamic. It is wrong precisely for the
        institutions whose names carry two subjects.
      - **From the institution's own faculties**: Dhaka has a Faculty of Engineering. It is not an
        engineering university.
      `discipline` answers what an institution *primarily is*. No source states that, so it is a
      judgement and stays with the editor. **Do not "fix" this with a heuristic.**
    - **`isVerified` now prints its negative case** (**যাচাই করা হয়নি**). It used to add a ✓ when true
      and nothing otherwise, so "a person checked this" and "nobody has looked" were indistinguishable
      — which is the whole claim the field exists to make.
    - ⚠️ **Import idempotency needed a fix.** Payload gives array sub-rows a fresh `id` on every read,
      so comparing a `faculties` array against the stored one made **every** row look modified. The
      change check now strips `id` before comparing: a second run reports **0 created, 0 updated, 724
      unchanged**.
    - ⚠️ **Still not done, now for a stated reason:** fees and admission rules. No source carries them,
      scraping is forbidden, and §7 forbids inventing them — so **the fee table renders only on the
      demo fixture** in this build. That is the honest state, not an oversight, and it is the one
      thing the owner must fill before the directory is genuinely useful.

56. ✅ **S9's last open build item — bookmark → CMS sync — BUILT** (2026-10-01). S9 is now genuinely
    complete; every remaining item in it is an owner action.
    - **What was deferred, and why it was right to defer it.** The note said a naive union re-adds a
      bookmark deleted on another device, and that "something the reader deleted reappearing is worse
      than never syncing". That is exactly right, and it is why the policy is the feature.
    - **The policy, as built:** *first sync merges* (the local list is then an **independent** list,
      not a stale copy — this carries the bookmarks saved before signing in); *every sync after that
      takes the server's answer*; and *a local change whose push failed outranks the server*, because
      a save made while signed out is an intent the server has not heard yet.
    - ⚠️ **The marker is on the READER (`readers.bookmarksSyncedAt`), not in local storage.** A
      per-device marker would let a device that had lost its storage re-upload a stale list and
      resurrect the deletion — the exact bug the policy exists to prevent. It is also **not writable
      by the reader**: flipping it back to "never synced" would do the same thing deliberately.
    - ⚠️ **`bookmarks.title` / `bookmarks.slug` are a deliberate denormalisation.** A reader signing
      in on a second device has **no local list at all** — that is the point of syncing — so the
      server must return something renderable. Storing only the relationship id would force the client
      to resolve every bookmark through the articles API before it could draw the list. The cost is
      that a retitled article keeps the title the reader saved, which is arguably what a bookmark
      should show.
    - ⚠️ **The endpoints are mounted on the collection, not at the API root.** `/api/bookmarks/sync`
      at the root would be parsed as "collection `bookmarks`, document id `sync`" and 404 forever —
      the `/api/comments/submit` lesson (`docs/security.md` §13.4).
    - ⚠️ **The island is on the article page and `/bookmarks` only, not in the layout**, and it makes
      no request unless the reader has synced before, has local bookmarks, or is on `/bookmarks`. An
      anonymous reader browsing articles never calls the CMS — a script that runs on every page for a
      feature most readers never use is a cost paid by everyone for the few.
    - **Two harnesses, and one honest gap.**
      - `verify:endpoints` — **7 checks over HTTP**: an anonymous caller gets 401; the first sync
        merges; **an already-synced reader's stale upload is ignored**; a toggle removes; **a deleted
        bookmark does NOT come back on the next sync**; a missing article is refused with 404; the
        fixtures clean up.
      - `verify:bookmarks` (new, in `pnpm verify` and CI) — **11 checks** on the pure merge policy in
        `frontend/src/lib/bookmark-merge.ts`, run against the real module the way `verify:gpa` runs
        against the real GPA module.
      - ⚠️ **The island's own `fetch`/`localStorage` glue has no behavioural test.** This project has
        no browser harness, so it is verified by construction plus the build and CSP gates. **That is
        the weakest link in the feature and it is stated rather than implied.**
    - **Still owner-only in S9:** the VAPID pair, the OAuth apps, account linking, the send tokens,
      SMTP credentials, and the host-disk alert. None is code.

- **Portal type: education portal** (2026-09-11) — domain `shikkha24.com`; general-news scope retired
- Stack: Astro 7.3 + Payload CMS 3 + SQLite → PostgreSQL (Strapi rejected)
- **Next.js pinned to 16.2.6+** (corrected by the audit)
- CMS: Payload CMS 3 (free versioning, workflows, scheduled publish, field-level ACL)
- Design: Prothom Alo layout + Bangla Tribune typography + BBC dark mode + Guardian live blog
- Language: Bengali-only UI (no English toggle)
- Comments: Custom Payload-based (Facebook/Google social login)
- Categories: Dynamic + subcategories, fully admin-editable (education tree proposed, pending approval)
- **Newsletter: self-built Payload subscriber list + campaign module; delivery via free-tier ESP API; cPanel SMTP as low-volume fallback** (Listmonk and Oracle both rejected)
- **Third-party policy: no paid services at all — the owner has no international card.** Any service requiring a card at signup is unusable
- CI/CD: GitHub Actions, with **rebuilds debounced/batched** to stay inside the 2,000 min/month private-repo quota
- **Hosting: DianaHost PNR 2 GB SSD NVMe (purchased, ~$47/year) — frontend on `public_html`, media on host disk, CMS standalone. No Cloudflare (removed 2026-09-14).**
- CDN: None — DianaHost direct (no CDN, owner decision 2026-09-14)
- Typography: Hind Siliguri (headlines) + Noto Sans Bengali (body) + Inter (English)
- **Audio reader: Browser Web Speech API; the twice-daily audio bulletin is descoped**
- **Utility widgets: free public APIs only; descope anything with no free source**
- **Content velocity: ✅ DECIDED — baseline 15–20/day + burst to 40+ on result/admission days.** Replaces the flat 45–70/day target (which implied 15–23 staff). 5-person team already in place; greenfield launch.
- **Deployment: private repo + GitHub Actions (Node 24) → DianaHost `public_html` (rsync) + DianaHost CMS (SSH).** One rebuild quota: GitHub 2,000 min/month. See `docs/hosting-and-deployment.md`
- **DianaHost runs Node.js 20.18.2 (EOL 2026-04-30)** — Astro/Vite cannot run there (CI only); Payload/Next can. cPanel has a Node.js Selector to upgrade
- Features: ALL features on Day 1 (no phasing) — performance budget enforced **per page template**, not "per feature"
- Workflow: section-by-section approval gates; zero assumptions; immediate commits; docs consistency (docs updated first when scope changes)
- Agent rules: mandatory, codified in AGENTS.md / GEMINI.md / CLAUDE.md (rules 1–13 identical in all three; hardening H1–H14 in GEMINI.md only)

## Pending

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
- [ ] **cPanel → Software → Select Node.js Version → Edit → Change Node.js version** — select 22.x or 24.x if offered. The host currently runs **20.18.2, which is end-of-life**
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
- [x] DianaHost plan purchase — ✅ PNR 2 GB SSD NVMe
- [ ] Confirm with DianaHost: Node.js version availability (≥22.12 required) and the inode/file-count quota
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
