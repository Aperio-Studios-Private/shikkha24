# SPS Handoff

## ⭐ START HERE — 2026-10-17 end-of-day. Read THIS before any chronology below.

Written so a fresh agent on ANY harness/chat can work from zero. Read this +
`.sps/tasks.md` (the queue, T-31…T-34 are the live items); every claim below
was verified by command output the same day.

### Where the product stands

| Surface | State (verified 2026-10-17) |
|---|---|
| **Storefront** `shikkha24.com` | Cloudflare Workers, worker `shikkha24-frontend`, version `9df9f338`. 6 published articles live; 89-page build. Masthead dates computed client-side per view (build-freeze bug T-32 FIXED) — বঙ্গাব্দ, খ্রিস্টাব্দ and হিজরি (calendar pinned `islamic-umalqura`, see `frontend/src/lib/hijri-date.ts`) |
| **CMS** `cms.shikkha24.com` | DianaHost cPanel (host `b201.serverdiana.com`, user `shikkhac`, app root `~/shikkha24-cms`, startup `cms/server.js`, cPanel Node venv 24). Running the **2026-10-11 CI restore** (payload 3.89.0 / next 16.3.6 — matches the venv, coherent & serving). All 6 DB migrations APPLIED → **DB schema is 3.90.2 while runtime is 3.89.0** — deliberate, additive, tolerated (T-33-era outage record below). Media (56 files) at `~/shikkha24-cms/cms/data/media` (cwd-relative). `/api/faqs` → **404 BY DESIGN** until a 3.90.2 deploy; the storefront already falls back to its seed |
| **Source of truth** | git `main` on GitHub (private). Do not trust chat history — trust these files |

### The next CMS deploy (T-31) ships, in one shot
Payload **3.90.2** complete package (matches the migrated DB schema; bundle
must carry the FULL package — tracing hollows it otherwise), **T-20 security
hardening currently MISSING from live CMS** (draft leak, medical-data leak,
six unfiltered reads, serverURL pin, result-links leak — running admin predates
them), the **photocard redesign** (c7e1c9c..6669b58), and the **FAQs admin
collection**. Method: owner's Windows machine + **WSL2 Ubuntu** build → zip →
upload via cPanel path → extract CLEAN dir → restore `data/` + `cms/data/media`
+ `.env` → swap → **kill stale `next-server` workers** (zombie lesson below) →
verify. Fallback if no Windows machine: private GitLab Free mirror. NEVER
repeat the two dead paths: macOS-built bundles and host builds (CloudLinux LVE
kills installs with EXIT=137; three fails on 2026-10-16 prove it).

### Credentials / auth state on this Mac
- `wrangler login` = **Abdullahalmamunmay@gmail.com**, account
  **`0e2e4a6986f91edabe1dae4945a9b88b`** (fresh login 2026-10-17 after the
  stored login drifted to a personal account `chalantika07` that could not see
  the site account). Always pin `CLOUDFLARE_ACCOUNT_ID=0e2e…`. Previously logged
  wrangler state was stale → Authentication error 10000 (see
  `docs/manual-deploy.md` account-ID trap + this drift).
- cPanel UAPI token lives in `cms/.env.local` (`CPANEL_HOST/USER/TOKEN`) —
  enables uploads & Fileman listing; **no `Fileman::extract_files` on this
  host** (uploads alone extract nothing).
- `frontend/.env` exists locally (git-ignored, rule 11):
  `CMS_URL`, `PUBLIC_CMS_ORIGIN`, `PUBLIC_MEDIA_BASE_URL`,
  `PUBLIC_SITE_URL` → all `https://…shikkha24.com`. Vite auto-loads it — the
  documented one-paste build+deploy is safe as written. WITHOUT it the build
  silently degrades to empty defaults (thin build, T-33).

### Runbooks that are proven (copy-paste safe today)
- **Frontend deploy:** `cd frontend && pnpm run build && CLOUDFLARE_ACCOUNT_ID=0e2e4a6986f91edabe1dae4945a9b88b pnpm exec wrangler deploy`
  — then the build log must NOT contain `[cms] Could not reach the CMS`.
  `verify:build-output` needs `CMS_URL` in ITS env (repo-root script; does not
  read `frontend/.env`).
- **CMS deploy:** T-31 runbook in `.sps/tasks.md` (9 steps incl. zombie-kill).
- **Content → storefront:** write in CMS admin → publish (free, always works) →
  run the frontend deploy above. Storefront content is BUILD-TIME frozen
  (`output: 'static'`) — nothing else syncs it.
- **After ANY host directory swap:** for `pgrep -f next-server`, kill PIDs whose
  `/proc/PID/cwd` is inside a renamed dir; cPanel "Restart" does NOT kill them.

### Trap list (each burned real time — details in entries below)
1. Account-ID trap + OAuth drift → Authentication error 10000 (manual-deploy.md).
2. Zombie `next-server` workers surviving renames/restarts → restarts that
   "do nothing" (2026-10-16 outage was prolonged ~2h by exactly this).
3. Missing `CMS_URL` → silent thin build (deploys that ERASE content!). The
   faqs-404 warning line is by-design and harmless; the localhost line is fatal.
4. `unzip -o` over pnpm symlink farms silently skips entries — always extract
   into a CLEAN dir.
5. `payload migrate` reads `./src/migrations` from its CWD (deploy bundles keep
   them at `cms/src/migrations` — copy up one level before running).
6. DB schema is 3.90.2 with a 3.89.0 runtime — do NOT "fix" by re-running or
   reverting migrations; additive and tolerated.
7. Live article URLs are `/<category>/<id>/<slug>/` (NOT `/category/…`) — grep
   accordingly.
8. CloudLinux LVE caps the cPanel account (not `ulimit`) — no heavy builds on
   the host, ever. Jailshell works but: single-line commands only, no process
   substitution (`/dev/fd` missing), no node without venv `source`.
9. Bengali dates: `bangla-date.ts` (+ `hijri-date.ts`) are the ONLY date
   formatters; never mint `new Date()` into static HTML (T-32) — same-class
   build-time-date spots still parked: `DeadlineStrip.astro:54`,
   `VerificationBadge.astro:48`, `Footer.astro:38`.
10. Owner protocol: ONE instruction per message, single-line Terminal commands,
    owner pastes output before the next step; counter-prove every fix; the
    owner has NO international card (rule 7) — WSL2/GitLab-free/own-Mac paths
    only.

### Priority queue right now
1. **T-31** — WSL2 CMS deploy (ships security fixes + redesign + faqs admin + runtime 3.90.2). Highest value, waits on owner's Windows machine (fallback: GitLab mirror).
2. **T-34** — owner publishes the মাউশি breaking-news draft (file committed at `editorial/breaking-2026-10-17/`) → frontend deploy; runner-up: 84-post recruitment circular for jobs-career.
3. Copy `PUBLIC_VAPID_PUBLIC_KEY` (public half, from CMS env on DianaHost) into `frontend/.env` → rebuild → deadline-reminder control returns.
4. T-32 same-class build-time-date fixes (DeadlineStrip, VerificationBadge, Footer year).
5. Host cleanup (after a few stable days): `~/shikkha24-cms.broken-1792132158`, stale `cms-deploy-*.zip` (~300 MB), `~/cms-src*`.
6. Older parked O-items — the ledger in `.sps/tasks.md` is authoritative.

### Doc map
`tasks.md` (queue; T-31…T-34 current) · `profile.md` (identity/budget/architecture
amendments — Workers publishing approved T-18 P1 2026-10-15) ·
`owner-assistance.md` (owner's parked asks) · `mistakes.md` ·
`docs/manual-deploy.md` (frontend deploy + account-ID trap) ·
`docs/hosting-and-deployment.md` · `frontend/AGENTS.md` (Astro specifics) ·
`.sps/plan.md` (build plan; sections S0–S12).


## 2026-10-17 (evening) — T-33: thin builds wiped the storefront's news; `.env` written locally; real article URL scheme noted

Follow-on to T-32's deploy: manual frontend builds without `CMS_URL` degraded
to Astro's empty defaults and two of them (one mine, one the owner's, using
the command I supplied) went live. Fixed by writing `frontend/.env` on the
Mac (the documented four values) — the owner's one-paste build+deploy is now
correct as written — and re-deploying version `9df9f338`, proven live
(articles 200, category listings populated, masthead dates unchanged). See
T-33 for the checker nuance (`verify:build-output` needs `CMS_URL` in *its*
env — root script, does not read `frontend/.env`) and the real article URL
scheme (`/<category>/<id>/<slug>/`). VAPID public key follow-up recorded.


## 2026-10-17 — masthead date bug (frozen at build day) fixed; Hijri line added (T-32)

Owner caught the masthead printing the previous day. Not timezone drift:
`output: 'static'` had baked the build-day date into every page. The masthead
now recomputes the বঙ্গাব্দ, খ্রিস্টাব্দ and (new, by owner request) হিজরি
lines in the reader's browser via `lib/bangla-date.ts` and the new
`lib/hijri-date.ts`; prerendered text remains the no-JS fallback. The Hijri
calendar is pinned to `islamic-umalqura` after a four-variant empirical test
against the owner's ground truth on 2026-10-17 (only umalqura said
5/6/1448). Full evidence trail: `.sps/tasks.md` → T-32. Same-class stale-date
spots (DeadlineStrip, VerificationBadge, Footer year) are recorded in T-32 as
open follow-ups.


## 2026-10-16 (final) — host-build verdict: this account cannot build; next deploy = owner's Windows/WSL2 (T-31, parked)

Follow-on to the outage entry below. After the restore, three on-host
`pnpm install` attempts (frozen lockfile, then `--filter cms`, heap capped to
768 MB, network-concurrency 2) all died `EXIT=137`. Shell `ulimit` reports
unlimited, so the ceiling is **CloudLinux LVE per-account enforcement**, not
the shell — the 48 GB `free -m` shows is machine-level, irrelevant to the
cage. The pnpm store persists across kills, so attempts are resumable, but
the cap number from cPanel → Resource Usage was never read; if it ever
surfaces as ≥2 GB, a tuned on-host build is still possible (plan C).

**Architecture truth the night confirmed:** bundles are built on Linux CI
runners and only uploaded here; the host runs them. Cross-compiling from
macOS is dead (see outage entry). `pnpm` flags verified against pnpm 11.22.0
source on this machine: `--config.minimum-release-age=0` is the valid CLI
shape (bare `--minimum-release-age` errors "Unknown option"); the
"Verifying lockfile against supply-chain policies (N entries)" phase is
`minimumReleaseAge` (see `minimumReleaseAge ? … : null` gate in the bundle).

**Owner decision:** T-31 — build in WSL2 Ubuntu on the owner's own Windows
machine, deploy via cPanel path. Full runbook lives in `.sps/tasks.md` →
T-31, including the fix that matters most: **ship a complete
`payload@3.90.2`** so runtime matches the already-migrated 3.90.2 schema and
the venv stops being load-bearing. Fallback if no Windows machine: private
GitLab Free mirror (owner refuses going public; no card exists).

Also this session: `scripts/assemble-cms-bundle.mjs` landed (commit
`6c9ab27`) reproducing CI's six assembly assertions; the jailshell-Terminal
hard-constraint in `.sps/tasks.md`/AGENTS bullets was annotated — Terminal
**works** again as of tonight (owner ran ~30 commands), annotation recorded
rather than history rewritten.


## 2026-10-16 (later) — CMS outage and restore; the macOS-bundle path is dead; zombie workers

**Outcome: the CMS was down ~5 h (every route 500) and is now restored to the
2026-10-11 CI bundle. Live card = old design, WITH photo (sd 32.74, 1,031,858 B —
verified remotely after restore). The photocard redesign (c7e1c9c..6669b58) is
committed and safe in git but NOT live.**

Root causes, in the order they actually mattered:

1. **The macOS-built bundle is unusable on Linux.** Understood only after
   extracting it into a clean dir: `payload@3.90.2` was a hollow package —
   24 files, all under `dist/`, no `package.json`/`bin.js` — because Next
   standalone tracing does not include the package root a CLI needs. sharp
   carried `@img/sharp-darwin-arm64` only. The 2026-10-11 CI bundle has the
   SAME hollow-payload shape, so this is a property of `output: standalone`
   + pnpm, not of building off-CI: the bundle was never self-sufficient, it
   always relied on the cPanel venv (payload 3.89.0, next 16.3.6).
2. `unzip -o` over an existing pnpm symlink farm skips entries with
   `Is a directory` — the running tree ended up with next 16.3.6 real dirs
   shadowing 16.4.0 (top level, `.pnpm/node_modules/next` fallback, AND
   `cms/node_modules/next`), `@payloadcms/next` on 3.89.0, and sharp missing.
3. **Zombie workers masked every fix.** Two `next-server` processes kept
   running with `cwd` inside the *renamed* directory
   (`~/shikkha24-cms.broken-*/cms`). Linux keeps a process's directory inode
   across renames, and cPanel "Restart" did not kill them — so every status
   check kept returning 500 from stale chunks (`1y2j_next_dist…`, a file that
   did not exist in any candidate bundle). **Fix:** kill PIDs whose
   `/proc/PID/cwd` points at the renamed dir, then let Passenger respawn.
   ⚠️ Any future directory swap MUST be followed by this check.
4. **Five DB migrations were pending (pre-existing, since 10-11).** Ran them
   on the host with the venv 3.89.0 CLI — migrations are literal SQL, so the
   CLI version mismatch is harmless (I over-warned otherwise; corrected).
   *Note:* `payload migrate` reads `./src/migrations` from its **cwd** — the
   deploy bundle carries them at `cms/src/migrations`; they had to be copied
   up one level to run. **The DB is now on the 3.90.2 schema while the runtime
   stays 3.89.0** — deliberate and safe: schema is additive (faqs table,
   dropped unused media columns), old code tolerates it, and it pre-migrates
   for the eventual 3.90.2 deploy.
5. **Media lives at `cms/data/media`** (cwd-relative `MEDIA_UPLOAD_DIR`).
   The restore copied only root `data/` (the DB) back, so the card rendered
   flat charcoal (sd 0.00) until the media dir was copied back from the
   broken tree. The variance check added in 6669b58 is what detected this
   remotely.

Current host state: Oct-11 bundle at `~/shikkha24-cms` (payload 3.89.0 /
next 16.3.6 = the venv versions, so coherent); venv-fallback links repaired;
media 56 files restored; `.env` restored. `~/shikkha24-cms.broken-1792132158`
is a holding copy — keep a few days, then delete. ~300 MB of stale
`cms-deploy-*.zip` still in the app root (move to `~/cms-archive-backup/`).

`scripts/assemble-cms-bundle.mjs` (committed with this) reproduces CI's
bundle-assembly assertions locally — but **the macOS manual deploy path should
be treated as dead**. Shipping the redesign requires a Linux build: GitHub
Actions (blocked by budget — owner weighing transfer vs public), or an
on-host build (viable: Node 24, 48 GB RAM, 2 TB disk; needs current source on
the host + a secrets-free build).


## 2026-10-16 (round 15) — two parked tasks resolved, and a guard that was guarding nothing

The five named tasks were already closed, so this round went at the older parked items.
Two turned out not to be what their entries said.

### T-11 CLOSED — the automation-gate works; but the check guarding it did not (M32)

T-11's control is **built, deployed and observed working**: run 38138306945 had CI fail
for `5b441e3`, the gate refused, and the job reached **0** build/upload steps. It is the
first step in `deploy.yml`, above `pnpm install`, with a dispatch-only `skip-ci-gate`.

But the check that enforces its *ordering* — `verify-workflows.mjs` — **was blind, and
only a negative control found it.** Its pattern listed the underlying tools:

```
/next build|astro build|deploy-cms|deploy-frontend|payload migrate|migrate:create/
```

`deploy.yml` invokes **none of those literally**. It runs `pnpm run build:frontend`,
`pnpm run build:cms` and `node scripts/deploy-cms.mjs`. So the check matched nothing and
passed anyway. A step doing `pnpm run build:frontend` placed directly above the gate went
**unflagged** — the guard reported success on the exact violation it exists to catch.

That is M29's shape again, which is what the check's own comment cites as its reason for
existing. Fixed in `e8be2a0` by naming the scripts (`\bbuild\b`, `\bbuild:`), verified
against four previously-slipping payloads, all now caught, clean tree still green.

⚠️ **A guard nobody has tried to defeat is not known to work.** Reading that regex, it
looks entirely reasonable — a list of every build tool in the stack. The only reason we
know it was useless is that a deliberate attempt to slip past it succeeded.

### T-06 CLOSED — hypothesis tested and DISPROVEN

The entry claimed the migration gate passes when a field is missing from both the
snapshot and the database, and carried a 🔴 systemic marker. **Ran the stated metric
instead of reasoning about it**: added a throwaway `text` field to `Pages`. The gate
**went red** with the intended message naming the generated migration.

The hypothesis was wrong about the mechanism: the gate diffs the config against the
newest committed **`.json` snapshot**, and the snapshot is taken *before* generating, so
the comparison never consults the database. "Missing from both" cannot make it pass.

Also verified the failing run leaves **no stray migration files**, and that `roles` has
its own migration (`20261010_120000_users_roles.ts`) — so the original motivating case is
closed too. **No code change was needed.**

### T-17, T-18, T-27 — checked, correctly parked

- **T-17**: the claim holds. `cms/src/lib/rebuild-trigger.ts:84` is `if (!WEBHOOK_URL) return`,
  so it is genuinely inert, and it tells the admin so in Bengali (line 131). Gates
  `verify:rebuild` + `verify:rebuild-notice` pass. Owner-side: confirm `tar` on the host
  and install the cron.
- **T-18**: awaits owner answers by design — recorded, not started.
- **T-27**: accurate and correctly low-priority. The root cause is this machine's
  **Node v26.10.0** against a pinned **24**; CI and both deploy workflows all call
  `pnpm run build:frontend`, never bare `npx astro build`, so production is unaffected.
  Our build succeeded 3× this session at 89 pages each.

**All 13 gates green:** build-output, links, search-init, cloudflare, workflows,
prayer-times, apache, cms-bundle, access, result-links, public-read, rebuild,
rebuild-notice.

## 2026-10-16 (round 14) — T-24 confirmed met, and the measuring instrument is now in the repo

**T-24 target met.** Final build through a Brotli-compressing server: **perf 97 / 98 /
97**, **accessibility 100**, **SEO 100**, best-practices 96 — LCP 2.4–2.6 s, CLS 0,
TBT 0 ms. All four categories clear the owner's 95+ bar.

### I made the same measurement mistake twice — so the instrument is now committed

`python3 -m http.server` sends **no `Content-Encoding`**, so Lighthouse invents a
`uses-text-compression` failure production does not have (the live site serves Brotli):

| server | `/` | `/latest/` | article |
|---|---|---|---|
| `python3 -m http.server` | 92 | 94 | 85 |
| **Brotli** | **97** | **98** | **97** |

Identical build. I first hit this on T-24, wrote the lesson down, and then hit it again
— which is the tell that a written lesson was not enough. **`scripts/serve-dist.mjs` +
`pnpm run serve:dist` now do it correctly**, resolving `frontend/dist` from the script's
own location so it cannot be misrun from the wrong cwd (which failed in a way that
looked like a port conflict).

⚠️ **Before trusting any local Lighthouse number:** confirm
`curl -sI -H 'Accept-Encoding: br' http://127.0.0.1:8901/ | grep -i content-encoding`
prints `br`, and confirm nothing else is listening. During T-24 I found a leftover
`node ./dist/server/entry.mjs` — an **SSR server from a different project** — on :4321.
Measuring against it would have scored another application.

### best-practices 96 is the Cloudflare beacon, not us

It fails `errors-in-console` **and** `inspector-issues` (issue type "Content security
policy"), both naming `static.cloudflareinsights.com/beacon.min.js`. Cloudflare injects
it at the edge; our CSP blocks it. So the analytics **collects nothing while logging a
CSP error on every page view** — and it costs 4 points. Disabling it in the dashboard is
worth **+4 → 100** and needs no repo change. This is O-4; the owner has already chosen
to keep the CSP strict, which is right — switch the beacon off, do not loosen the policy.

### Live-hosted Lighthouse is not a gate

`/latest/` scored **97** live while `/` scored **85**, against 97 for the same build
locally. That spread is network variance on a hosted target, not a build property. Use
local numbers for gates; treat a single live run as indicative only.

## 2026-10-16 (round 13) — T-23 and T-25 closed; two recorded root causes were wrong

### T-23 COMPLETE — the covers were never blocked

The six articles (ids 23–28) are live with covers **already attached** (media ids
10–15), correct Bengali alt text, and the `চিত্র: AI` credit. Verified against the live
CMS API: `featuredImage` is linked on all six (23→10 … 28→15), the news sitemap carries
exactly **6 URLs**, and all six appear on `/latest/`.

⚠️ **My recorded cause for the cover blocker was WRONG, and it cost the owner a manual
workaround.** I had written that "the host proxy drops non-file multipart fields". The
proxy was never at fault: **Payload does not accept text fields as separate multipart
parts — they must travel inside a `_payload` JSON part.** With `-F "alt=…"` the file
uploads fine and only the text is lost, which returns `400 Alt text is required` and
looks exactly like a proxy stripping fields. One flag, not a host fault.

**Verified end-to-end in a local build:** the article emits `<picture>` with AVIF + WebP
at 412w/800w and the real Bengali alt, and the CMS serves the file **200**. So the whole
cover pipeline works — the covers are absent from the live site **purely because the
frontend has not deployed since they were attached (O-7)**.

**Lesson: an API-contract misunderstanding was filed as a host fault.** A 400 that names
a field makes the *field* look missing; the field was fine, the *envelope* was wrong.
Check the request shape before blaming infrastructure.

### T-25 CLOSED — impact nil, and its consequence for T-23 was also wrong

Six covers uploaded 2026-10-16 all serve **200**; the six files from 2026-10-04 all
serve **500**. So this is **six individually-lost files, not a broken media system** —
and all six are `demo-plate-*.webp` demo visuals **already deleted during the demo
purge**, with nothing referencing them (no article, page, template or sitemap entry).
The entry claimed uploading covers here "would fail identically"; it did not. Checking
`upload.staticDir` is now optional curiosity, not a task.

**Both of these were cases where the diagnosis was recorded confidently and was
wrong.** The symptoms were real; the attributed cause was not. Worth remembering when
reading an older entry in this file: the evidence table is usually sound, the
conclusion drawn from it sometimes is not.

### O-1 shrinks to closed-unless-you-care

Same evidence, so it no longer blocks covers (those work) or the site (nothing points at
the lost files).

## 2026-10-16 (round 12) — T-22 feature walk complete; an ad slot was advertising a guarantee

**Feature walk, all green:** nav **9/9** links resolve (all eight `/category/*` with
correct Bengali titles and one `<h1>`); **17/17** pages 200 with exactly one `<h1>` and
a `<nav>`; CMS `/admin` + `/admin/login` 200 and every public API 200; public reads
unbroken (articles 6, polls 1, the rest the known O-8 empties).

**`pnpm audit` exits 0** — 8 advisories, 4 moderate + 4 high, and **all four high are
documented upstream-unpatched tolerations** ("Patched versions: None"). No version
exists to move to and overrides cannot help. Policy recorded in `pnpm-workspace.yaml`.

### The real find: an ad placeholder promising a guaranteed exam band

`DemoAd` rendered real-sounding commercial offers at true placement size inside a
dashed `বিজ্ঞাপন` box. One said **"আইইএলটিএস কোর্স / ব্যান্ড ৭+ গ্যারান্টি"** — a
guaranteed IELTS band.

Two things made this worth fixing rather than shrugging at:

1. **A reader could not tell it was a placeholder.** The only demo markers were the
   CSS class name `demo-ad` and an `aria-label`. Both are invisible on screen. Read off
   the built page a reader sees a bordered advertisement carrying a specific
   performance promise.
2. **It contradicted the site's own purpose.** `/fact-check` exists to publish verdicts
   on misleading claims — the handoff itself records that it addresses "fake result
   links and fabricated scholarship notices" during result season. Carrying an unowned
   guarantee in an ad slot means the site doing the thing it publishes against.
   shikkha24 sells no courses and cannot promise a third party's exam result.

Fixed in `d38e2dd`: creatives are generic (`বিজ্ঞাপন স্থান` + format name, kept
realistic in length so size approval still works) and a **reader-visible
`নমুনা বিজ্ঞাপন` badge** sits top-left, clear of the format label bottom-right. The
component docstring claimed the placeholders were "obvious" — that was not true on
screen, so it now records why the badge has to stay.

**Verified in the build:** guarantee gone, IELTS copy gone, badge present on every slot
across all 15 ad-carrying pages.

⚠️ **A false alarm I caught in my own verification:** my first coverage check reported
one page missing the badge — `frontend/dist/tag/demo-admission/index.html`. That is the
tag slug `demo-admission`, which merely *shares a prefix* with `demo-ad`. The corrected
check counts `data-demo-ad` attributes. **Substring matching over built output invents
findings; match the attribute.**

### Also confirmed: the Pages draft leak has zero blast radius today

`/api/pages?draft=true` returns `totalDocs: 0` against the live CMS. The high-severity
leak is real in the code and fixed in `7ab0b0b`, but there is nothing to leak while the
collection is empty. The live CMS is still undeployed (O-10), so none of the audit
fixes are live yet.

## 2026-10-16 (round 11) — T-20 security audit COMPLETE: 5 findings, all fixed

Full audit at ref `8f3326d` under the installed `security-audit-skill`, profile
`standard`. **2 high, 3 medium, 0 critical** — all fixed and gate-covered.
Artifacts: `~/security-audit-skill/NewsPortal/run-1/`.

| # | Sev | Finding | Fix |
|---|---|---|---|
| 1 | **high** | Command injection in `host-health.yml` | `7ab0b0b` |
| 2 | **high** | `Pages` drafts readable anonymously | `7ab0b0b` |
| 3 | medium | Unauthenticated `POST /run-tick` could spend Actions builds | `bdccf53` |
| 4 | medium | Reporter blood group served on a public PNG | `7ab0b0b` |
| 5 | medium | Five collections filtered `isActive` only in the frontend | `7ab0b0b` |

### The systemic finding is the one to carry forward

Finding 5 is a **repeat of `ResultLinks`** — and the reason it repeated matters more
than the bug: **`verify:result-links` existed but was never in the CI loop.** The gate
written to prevent that exact pattern was itself never enforced, so the pattern came
back in five more collections, unnoticed, with every other gate green.

**A gate that is not wired into CI is documentation, not a gate.** If you add a
verifier, add it to the loop at `ci.yml:337` in the same commit — that list is now 14
long (`result-links` and the new `public-read` both joined it).

### Two things I nearly got wrong, recorded because the method is the lesson

**The injection was almost missed by my own testing.** The array-literal contexts in
`host-health.yml` are *not* exploitable — `;` is a syntax error inside `(...)` — so my
first two payloads silently did nothing and the file looked clean. Only testing the
`[ ... ]` and `<<<` guard contexts, which are plain commands rather than array
elements, showed `id` executing. **A negative result from one context says nothing
about another context in the same file.**

**A hunter's "medium, low confidence" resolved to nothing once checked.** The
`dompurify` concern (two versions in `.pnpm`) dissolved on inspection: the lockfile
resolves `3.4.17` everywhere and the `3.4.8` directory is an orphaned store leftover
with nothing linking to it. Their other two — the `host-health` read surface and the
untested `deploy-cloudflare` mode logic — were correctly hedged and correctly not
inflated.

### What the audit found sound (so the next pass does not re-spend effort)

No `pull_request_target`/`workflow_run` anywhere; no `github.event.*` script injection
(every remaining input expression is in an `env:` mapping); secrets never on argv or
echoed; least-privilege tokens throughout; no SSRF; no hand-built SQL; Worker path
traversal structurally impossible; `dompurify` override fully applied.

**The CMS auth surface produced ZERO new findings** across a dedicated hunter pass — it
is genuinely hardened, and much of it is hardened *because* prior audits closed the
exact bugs a hunter would otherwise report (the XFF leftmost bug, the reader-id
collision, the newsletter double-opt-in bypass, host-header reset poisoning).

### Left open honestly, never asserted

`NEEDS-VALIDATION.md` carries: Passenger worker count vs the in-process rate limiter;
whether the physical press card is *meant* to carry the blood group (an owner call —
the code comments disagree with each other); and GitHub's exact error-body wording.
**N2 was resolved during the audit** — the sanitizer runs at `ci.yml:624` and the
artifact upload is a later separate step at `:640`, so the bundle does not carry the
secret. Checking the order settled it; assuming either way would not have.

⚠️ **The skill's "do not probe deployed endpoints" rule was load-bearing, not
ceremonial.** Probing the publish watcher would have spent a GitHub Actions build per
request, from a budget that is already exhausted. An audit that ignored the rule would
have turned itself into an outage.

## 2026-10-16 (round 10) — T-24 TARGET MET: all templates ≥95

| template | before | after |
|---|---|---|
| `/` | 89–90 | **97** |
| `/latest/` | 96 | **98** |
| article | 93 | **97–98** |

a11y **100**, SEO **100** on all three. Gate raised 0.9 → 0.95 in `lighthouserc.json`.

**The fix was one component.** `CmsImage.astro` wraps Astro `<Picture>` for remote CMS
sources and emits AVIF + WebP at 412w/800w. It replaced a plain `<img>` whose
`srcset` was always `undefined`, because `media.sizes` is empty on every document this
CMS has produced — the host cannot fork a thread, so sharp cannot load and no variants
are generated (T-07). Result: six covers went from **971 KB of 1376 px JPEG into a
412 px viewport** to **AVIF 412w at 3.8 KB** against an 89,653 B original.
`uses-responsive-images` and `modern-image-formats` both went **0 → 1**.

⚠️ **The most important thing this round is that two of my own numbers were fake.**

1. **My recorded homepage score of 94 was not reproducible** — the real figure under
   the harness then in use was 89–90.
2. **That 89–90 was also wrong.** My test server served **no compression**, which
   invented a `uses-text-compression` failure and depressed every score. The live site
   serves **Brotli** (78,625 → 12,164 B). With Brotli in the harness the *same build*
   scored **97, not 91**.

I had also left a **stale server from an earlier session holding port 8899**, and
`python3 -m http.server` is single-threaded. Three separate instrumentation faults, all
of which I initially read as facts about the site.

**Carry this forward: the local static server is part of the measuring instrument.**
A harness that does not compress, or that is still running from a previous session,
measures a website that does not exist — and it will do so consistently, which makes
the wrong number look trustworthy. Before believing a local Lighthouse score, check
that the harness compresses the way production does and that no stale server is
answering.

**Also tested and rejected:** inlining all CSS reaches the same 97 but with worse FCP
(1.2 s vs 1.1 s) because the sheet stops being cached across pages. **The 8 KB ceiling
stays.** The gain was the images, not the CSS.

**Also fixed:** the third gated URL was a **404**
(`/education-news/20/demo-madrasa-new-syllabus/`), so CI had been asserting against a
missing page. Replaced with `/admission/23/admission-policy-2027/`.

⚠️ **Variance is real:** `/` scores **93 cold, 97 warm**. LHCI takes the median of 3,
so the gate passes — recorded rather than smoothed away.

**Remaining on T-24:** `best-practices` is **96 locally, 100 live**; the local gap is
the harness being unable to reach third parties. The one genuine item is **O-4**, the
CSP-blocked Cloudflare beacon.

## 2026-10-16 (round 8) — T-23 COMPLETE, and a wrong diagnosis of my own corrected

**T-23 is done.** All 6 covers are uploaded (media ids 10–15) and attached to articles
23–28, each with its Bengali alt text and `চিত্র: AI` credit. Verified past the API:
the public unauthenticated API returns them, a fresh **89-page build** places each on
**6–7 pages**, the rendered `<img>` carries the Bengali `alt`, and `og:image` points at
the absolute media URL. All six serve **200**.

**The important part is that the blocker was not real.** Both the upload README and my
own probes had concluded "the host proxy strips multipart text fields". **The proxy was
never at fault.** Payload does not accept text fields as separate multipart parts —
they must be sent inside a **`_payload` JSON part**:

```bash
curl -X POST "$CMS/api/media" -H "Authorization: JWT $TOKEN" \
  -F "file=@cover.jpg;type=image/jpeg" \
  -F '_payload={"alt":"…","credit":"চিত্র: AI"};type=application/json'   # -> 201
```

**Ruled out by testing, not reasoning:** field order (file-first vs alt-first), Bengali
vs ASCII values, the part's `Content-Type`, and browser-realistic `Origin`/`Referer`.
Only the *shape* of the request mattered. I had blamed the proxy because it was the
third-party component in the path — **a plausible story is not evidence.** The README
is corrected so the next agent does not inherit the error.

⚠️ **Carry this forward:** when a file uploads but a field arrives empty, suspect the
**request shape** before the transport. And a diagnosis that names a component you do
not control deserves more scrutiny than one that names your own code, not less.

**T-25 is unrelated and still open:** the 6 October-4 `demo-plate-*.webp` files are
absent from disk (500). Nothing in the build or on the live site references them, so
the reader-facing impact is nil — but the files themselves need the host.

**Owner list: O-2 closed. O-1 (T-25) still needs the host.** Now O-1, O-3 … O-10.

## 2026-10-16 (rounds 6–7) — T-25 proven exactly, and three security fixes

**T-25/T-23 — the blocker is now proven, not assumed.** Using the admin credentials in
`cms/.env.local` (login 200, JWT issued) I tested every upload route. The pattern is
unambiguous:
- JSON base64 → `400 No files were uploaded` (Payload needs multipart)
- multipart without `alt` → `400 Alt text is required` — **the file transferred
  fine; only the text part vanished**
- `-F alt=`, `--form-string alt=`, `alt` in the query string → all `400` the same
- **two or more multipart text fields → `500 Something went wrong`** (the proxy fails
  outright)
- A rejected upload leaves **nothing** behind (media stayed at 8 docs)

So the host proxy strips multipart text parts, `alt` is `required: true`
(`Media.ts:121`), and **no application code can fix it**. The covers must go in via
the **CMS admin UI** (owner O-2). Do not re-probe this.

**Also confirmed T-25's true blast radius:** 0 of 6 articles have a `featuredImage`,
and **zero references to `demo-plate*` exist anywhere** — not in the build, not on
`/`, `/latest/` or `/gallery/`. The broken media are orphaned demo placeholders.

**Three security fixes (all need the CMS deploy):**
- `f535bac` **`serverURL` pinned.** Live CMS answered `GET /api/payload-migrations`
  with `Cannot GET https://0.0.0.0:3000/...` — leaking its **internal bind address**
  to anonymous callers, and deriving absolute URLs from the incoming `Host` header
  (host-header poisoning precondition). Now from `CMS_URL` with a production
  fallback. Nothing else moves: media `url`s are relative and our absolute URLs
  already come from `PUBLIC_SITE_URL`.
- `ef37cd4` **`poweredByHeader: false`.** `X-Powered-By: Next.js, Payload` was
  naming the exact stack to any prober.
- `0ce0ab5` **`dompurify` 3.4.8 → 3.4.17** via override. It is the exact version
  `monaco-editor` pins, so no update could ever fix it. **Audit 13 → 8.** Also
  re-queried all four ignore-list advisories upstream: every one still
  `patched=[None]`, so no exemption is stale.

**Probed and found sound:** headers on both surfaces (HSTS+preload, nosniff,
`X-Frame-Options: DENY`, `frame-ancestors 'none'`, tight Permissions-Policy, CSP with
`object-src 'none'`); **login lockout works** (5 bad passwords → 429, still locked
after 20 s); **no user enumeration**; JWT HS256 with a 2-hour lifetime; `/api/users`
and `/api/payload-preferences` → 403 to the public.

**T-26 SCSS verified to actually compile** — `npx sass` exit 0, 15 rules in
`@layer payload-default`, with the 44px min-block-size, hover/active shadows and
`:focus-visible` ring all present in the *output*, so the owner will see them once the
CMS deploys. (Guards against the "authored but silently dropped" failure.)

**T-24:** article **91 → 93** (8 KB inline ceiling; `/` 94 and `/latest/` 96
unchanged); declined `font-display: optional` because Lighthouse already scores
`font-display` 1.0, so the visual risk buys nothing measured.

**Owner list is now O-1 … O-10.** Verifier suite 32/32.

## 2026-10-16 (round 3) — T-21 audit reality check + IndexNow

**T-21 — the sps-seo score is not a description of this site.**
Re-ran the engine: **28/100** on the repo, **43/100** on `frontend/dist`. Verified
every headline finding against the built output, and all of them are tooling
artifacts:
- `robots: False` / `sitemap: False` — the engine only probes `robots.txt`,
  `public/robots.txt`, `app/robots.ts`, `src/app/robots.ts`. It has **no `dist/`
  path and no Astro-endpoint case**; ours are endpoints (`src/pages/robots.txt.ts`,
  `sitemap.xml.ts`, `news-sitemap.xml.ts`) and all serve **200** live.
- `favicon` / `llmsTxt: False` — both exist and serve 200.
- `h1Issues: 19–28` — **all 89 built pages have exactly one `<h1>`**; 0 bad.
- `multiCanonicalPages` — **no page emits two canonicals** (all 89 + live URLs). The
  flagged `article/[slug].astro` is a **standalone minimal document** that does not
  use `Layout.astro`, specifically so it can emit one canonical plus its meta-refresh.
- `missingAlt: 6–37` — **zero `<img>` without `alt`** anywhere in the build.
- `thinContentPages` — `.lighthouseci/lhr-*.html` artifacts.
- `noindexCount: 5` — all deliberate and correct (`/login`, `/bookmarks`,
  `/verify/<id>`, `/newsletter/confirm`, `/newsletter/unsubscribe`).

**So the "baseline grade F = 30/100" carried in these notes was never a defect
count.** There is no H1/anchor/alt backlog. Real SEO state: single H1, single
canonical, full title/description/OG/Twitter coverage, valid JSON-LD, correct
noindex scoping, robots + sitemap + news-sitemap + llms.txt all live.

**Shipped `3f66b32` — IndexNow.** Key file `frontend/public/<key>.txt` plus
`scripts/indexnow.mjs` (`pnpm indexnow`, `--dry-run` supported, reads URLs from the
built sitemap — 63 of them). Free, no account, no card.
⚠️ **I first built the key as an Astro endpoint and reverted it.** A static build
cannot return a real 404 from an endpoint: with the key unset Astro still wrote the
file, as **HTTP 200 whose body was "Not found"** — a wrong-key 200 that IndexNow
rejects silently. Proven by serving `dist/` locally. A static asset cannot be in
that state.
**Blocked on activation:** `https://shikkha24.com/<key>.txt` is **404** until the
storefront deploys (O-7). Steps are in `owner-assistance.md` O-9.

**Verifier suite: 32/32 green.** Owner list now O-1 … O-9.

## 2026-10-16 (later) — photocard fix, T-22 edge cases, T-24 diagnosis, verifier honesty

**Shipped this span (all pushed to `main`):**
- `bfb3d4a` **photocard text had no breathing space** — root cause was *silent
  clipping*: `textLayer` hard-coded `height: size * 3`, and sharp clips rather than
  wraps, so the 92-char Bengali headline needed ~620 px but got 186 px and rendered
  127 px tall. Footer ended **1 px** from the bottom edge. `textLayer` now takes an
  optional `maxHeight` (omitted → canvas sizes to the wrapped text) plus a new
  `layerHeight()` so callers stack by measured height. Card now: top 78, bottom 65,
  sides 66/66 (was top 70, bottom **1**). The ID card passes its old `size * 3`
  explicitly, so its geometry is untouched.
- `af7fb73`, `6b13f03` **three empty `defer-layout` wrappers** removed, and every
  category section now defers (the first was needlessly undeferred). perf unchanged.
- `2d3526f` **deps:** `yaml` 2.8.1→2.9.1, `smol-toml` 1.8.0→1.9.1, biome
  2.5.13→2.5.15 — the first two sat exactly at their advisory-flagged versions.
  `pnpm outdated` now empty; audit 15→14.
- `eddaf5d` **`verify:sync` reported empty collections as failures.**

**Verified, not assumed:**
- **T-22 edge cases:** broken media (the live T-25 condition) degrades correctly —
  `/`, `/latest/`, a category, `/scholarships` and the article template each carry
  only 2 `<img>`, both the site icon (200), and **zero `<img>` to CMS media**.
  Empty collections are guarded. Search is fine: raw unencoded Bengali in a URL
  returns 400, which is **correct HTTP** — browsers percent-encode and that path
  returns 200.
- **T-22 dead code: nothing to remove.** `verify-s8`/`verify-ads-s7` are
  *deliberately manual* (documented), not dead; deleting them would destroy an audit
  trail.
- **T-24 — the LCP element is identified and it is not deferrable.** It is
  `article.group … h2.font-headline`, a text headline at `top=285` in the 823 px
  viewport, byte 25,103 (35 %) — the lead block just under the header. That is why
  category deferral never moved LCP (it was never going to).
  `render-blocking-resources` reports **"Est savings of 0 ms"**. Font path is already
  optimal (`swap` + `size-adjust` + all three metric overrides + both preloads).
  Compressed CSS is only **7.8 KB Brotli ≈ 49 ms**, so the CSS avenue is closed for
  good: **all resources finish by 344 ms yet FCP is 1.9 s — a ~1,550 ms CPU render
  delay** (Style & Layout 1,710 ms of a 623-element page at ×4 throttle).
- **T-24 — rejected glyph-subsetting on purpose.** 89 pages use only 81 of the 128
  Bengali codepoints, so a used-glyph subset would cut ~a third of the 700 face
  (87,820 B ≈ 477 ms). **Rejected:** an editor writing an unused codepoint would get
  the fallback face until the font was rebuilt — a live-content outage traded for
  bytes on a daily news site. The full-block subset is deliberate policy.

**Verifier suite: 32/32 green** (was 31/1 with a false failure).

**Still blocked:** GitHub Actions budget — every push since `bfa91b3` fails at job
level with *"The job was not started because an Actions budget is preventing further
use."* Re-confirmed this round with `gh run view`. **So none of the above is live**;
the storefront fixes (photocard is CMS-side too) await a deploy.

**Owner list is now O-1 … O-8** — O-8 is new: `scholarships`, `result-links`,
`circulars`, `deadlines` are genuinely empty in the CMS (`totalDocs = 0`), so those
sections render blank. Code is correct; content is missing.

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

> **Session 2026-10-15 — T-18 P1: the storefront's publisher becomes Cloudflare
> Workers.** DianaHost stays the CMS host until P4; the cPanel static path is now
> **rollback-only** (manual dispatch), and the rebuild webhook (`repository_dispatch:
> rebuild`, fired by `cms/src/lib/rebuild-trigger.ts`) now drives a **new**
> `deploy-cloudflare.yml` instead of the cPanel `deploy.yml`. Read the P1 block in
> `.sps/tasks.md` for state; the platform facts below are the reusable part.

### Platform research — Workers static assets (verified 2026-10-15, docs live)

Recorded under rule 3 so nobody re-derives or mis-remembers it:

1. **Workers Sites (`[site]` + `entry-point = "workers-site"`) is the retired
   pattern.** The uncommitted `wrangler.toml` a previous session left used it —
   `main = "dist"` is not a valid entry point and `workers-site/` never existed
   in this repo, so `wrangler deploy` would have failed outright. M35.
2. **The current mechanism** is a top-level or env-level `assets` table:
   `directory` (the upload root), optional `binding` (e.g. `ASSETS`, giving
   `env.ASSETS.fetch(request)` from the Worker — it applies `html_handling` and
   `not_found_handling`), `not_found_handling = "404-page"` (serves `dist/404.html`
   with a genuine 404 status — Astro's `dist/404.html` already exists), and
   `run_worker_first` (`true` = the Worker sees every request before assets;
   also accepts an array of globs with `!`-negations).
3. **`_headers` glob language cannot express our CSP dispatch.** It supports `*`
   splats and `:placeholder` segments but **no negation and no lookahead** — the
   S11 article rule ("exactly three segments, middle not `page`") is impossible,
   and `/latest/page/:n` would silently stop being strict. It is the same
   silent-failure class M-something S11 was invented for.
4. **Multiple matching `_headers` rules merge; a repeated header's values are
   comma-joined** (the docs suggest `!`-detach, which is order-fragile). A
   comma inside a `Content-Security-Policy` value is exactly the Cloudflare
   bug the 2026-09-14 removal decision was written around. **A Worker that sets
   the header once, in code, is the only way to guarantee "exactly one CSP".**
5. **`_redirects`/`_headers` are NOT applied to worker-served requests** (docs'
   caution under `run_worker_first`). So the Worker owns: CSP profile dispatch,
   security headers, cache rules, the `/verify/<unknown-id>` rewrite, and a
   `X-Robots-Tag: noindex` on `*.workers.dev` preview hosts (new-host SEO
   protection the .htaccess never needed).
6. **Deploys are atomic version uploads** (`wrangler deploy` from CI with
   `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`; `--dry-run` builds and
   validates without uploading). Rollback instant via Workers' own version
   rollback; domain-level rollback remains "point DNS back to DianaHost".

### M35 — code drifted ahead of the task record (again: the M21 shape)

The 2026-10-15 session opener found `frontend/wrangler.toml` +
`frontend/package.json` changes implementing T-18 P1 with **no `.sps/tasks.md`
entry and no docs parity**, and the few lines written used the wrong platform
pattern (Workers Sites). Two lessons: (a) the drift gate for *tasks* is reading
`git status` first — an uncommitted change with no task behind it is the signal;
(b) a snippet written from memory of a platform (Workers Sites) rather than the
current docs shipped unusable config — the rule-3 research habit exists precisely
for this. Owner chose "keep and fix, recorded properly"; both files were kept and
rewritten correctly in this session.

### What this session changed

- `frontend/wrangler.toml` — rewritten to `[assets]` + `run_worker_first` +
  `not_found_handling = "404-page"`; legacy `[site]` removed. Single environment
  for now (workers.dev preview); `routes`/custom-domain land in P6 after DNS.
- `frontend/worker/` — `csp.ts` (the three profiles, byte-identical by contract
  check with `frontend/public/.htaccess`), `dispatch.ts` (the SetEnvIf regexes
  ported 1:1), `headers.ts` (security + cache rules), `index.ts` (entry:
  asset-first fetch, `/verify/*` rewrite, header application).
- `frontend/public/.assetsignore` — keeps `.htaccess` out of the Workers upload
  (wrangler would otherwise publish it as a plain-text asset).
- `scripts/verify-cloudflare.mjs` + `pnpm verify:cloudflare` — the route matrix
  (from `verify:apache`'s expectations), the .htaccess↔worker CSP contract, the
  wrangler.toml contract and the new workflow's gate ordering. Counter-proved.
- `.github/workflows/deploy-cloudflare.yml` — push / `repository_dispatch:
  rebuild` / manual. `wait-for-ci` is the first post-checkout step (dispatch-only
  override, same as `deploy.yml`); build steps mirror `deploy.yml`'s frontend
  half (thin-build guard, links, search); `wrangler deploy` runs dry-run by
  default and live only via `AUTO_DEPLOY=live` or an explicit `mode` input.
- `.github/workflows/deploy.yml` — `repository_dispatch` removed; push/dispatch-manual
  still run the cPanel path as rollback. No AUTO_DEPLOY change (if it were ever
  set to live now, a push would also fire a live cPanel deploy — the docs and the
  workflow comment say to remove that trigger during migration; done here).

**Dependencies (rule 8 ledger, this session):** `wrangler` **4.151.0** (root
`frontend`, pinned exactly; MIT OR Apache-2.0) — deploys the Worker;
`smol-toml` **1.8.0** (root, pinned; MIT) — promotes an existing transitive to
a direct devDependency so the harness parses `wrangler.toml` with a real TOML
parser instead of guessing; `workerd` build allowed (Apache-2.0,
Cloudflare's local runtime — needed by `wrangler dev` only). **Removed:**
`@cloudflare/workers-types` (the Worker types its binding with a local
interface; the DOM lib already supplies `Request`/`Response`, and dropping the
package avoids duplicate-global conflicts under Astro's strict tsconfig).

**LIVE (2026-10-15, same session):** the owner created the API token; the
storefront publishes to **https://shikkha24-frontend.abdullahalmamunmay.workers.dev**.
Three live deploys (runs `38764405366`, `38765232628`, `38765868214`), the final
matrix verified from outside: one CSP per response, strict on `/latest/page/2`,
article/media frames on article + `/live-tv`, real 404s, `noindex` on the
workers.dev host, and `/verify/<unknown>` answering 200 in place. The three
lessons are in the T-18 evidence block in `.sps/tasks.md` (html_handling,
probe race, rewrite slash). **Then T-10 landed the same day** (see its block in
`.sps/tasks.md`: Payload 3.90.2, the `tag`-vs-`format` seed fix, the seed
diagnostics module, the migration snapshot repair), CI went fully green
(run `38769941213`), **`AUTO_DEPLOY=live` was set**, and a `rebuild`
repository_dispatch — the exact event the CMS publish webhook emits — deployed
live end-to-end through the CI gate with no manual input (run `38771234141`,
"Live and correct").

**What is left of P1's exit test is the CMS side of the trigger:** the owner
must create a fine-grained GitHub PAT (repository: shikkha24; permission
`contents: read` + `actions: write`) and set `DEPLOY_WEBHOOK_URL` in the CMS
environment on DianaHost (`https://api.github.com/repos/SHAHID8142/shikkha24/dispatches`,
header `Authorization: Bearer <PAT>`, `Accept: application/vnd.github+json`,
body `{"event_type":"rebuild"}`), then click Publish in the CMS. Until then,
publishes of CONTENT also need either a push or a manual dispatch, because the
CMS cannot reach GitHub. The production CMS itself still runs Payload 3.89.0
until the next CMS deploy / P4.

**SEO STRATEGY SET (T-21, research committed):** docs/seo/keyword-competitor-research.md
(4 live competitors; every claim cites a fetched URL). Wedges we exploit:
spec-valid Google News sitemap (only Prothom Alo's is valid in the vertical),
FAQPage/HowTo/JobPosting/CollectionPage schema (NO competitor emits them),
ASCII slugs + self-canonicals (DS ships empty canonicals + mojibake slugs),
sub-300 KB SSR (P 2.8-3.3 MB, DS homepage = JS shell with zero links),
curated llms.txt (404 on all but one broken Yoast one). 12 Bengali targets:
এসএসসি রুটিন, এইচএসসি রুটিন, এসএসসি ফলাফল(বোর্ডভিত্তিক), ফলাফল দেখার নিয়ম(SMS/ওয়েব),
ভর্তি বিজ্ঞপ্তি, একাদশ শ্রেণিতে ভর্তি, বিশ্ববিদ্যালয় ভর্তি বিজ্ঞপ্তি, জাতীয় বিশ্ববিদ্যালয় তথ্য,
নিয়োগ বিজ্ঞপ্তি, বৃত্তি পরীক্ষা, সিলেবাস, পরীক্ষার কেন্দ্র তালিকা ও ফরম পূরণ.
AllResultBD model = evergreen board-wise flat pages; big papers underserve নিয়োগ.
Limits: no volume/SERP data yet (GSC will be the oracle after a week).

**PUBLISH CHAIN LIVE (T-19, 2026-10-15):** `publish-watcher/` (Worker
`shikkha24-publish-watcher`, cron */5, KV `PUBLISH_WATCHER`) polls 7 collections
+ site-settings, sha256-digests them, fires `repository_dispatch: rebuild` on
change, stores the digest only on success. Ops: `POST /run-tick` (idempotent) +
`GET /health`. The 403 saga ended at GitHub's mandatory `User-Agent` header —
Workers' fetch sends none; token type was never the blocker (classic PAT
scoped `repo` in use; the fine-grained one can be deleted). Dashboard-added
secrets need `keep_vars = true` (set) to survive CLI deploys.

**P6 DNS SWITCH LANDED 18:5x the same day (owner-driven):** nameservers moved
to anastasia/vicky.ns.cloudflare.com; Cloudflare zone active; the two external
records (apex A, www CNAME) had to be deleted for the custom-domain attach
(error 100117 — the owner deleted one `cpanel` A first, restored it); deploy
run `38785440523` (rerun) attached shikkha24.com + www. PROOF: identical etag
("9ec646a613b93b72d45900ff1a13576a") on the production domain and the
workers.dev preview; /latest/page/2 = 200 (Worker) not 301 (Apache); full
matrix green on shikkha24.com with X-Robots-Tag absent (production host
indexes normally). Old DianaHost copy now idle behind DNS; rollback = un-proxy
the two Worker domains + re-add the apex A → 103.169.160.90.

**Gates (measured 2026-10-15):** `verify:cloudflare` **75/75**; `verify:workflows`
**5 parsed, 0 problems**; `verify:cpanel-deploy` **92/92** (after the trigger
move); `verify:deploy-mode` **47/47**; `verify:deploy-inputs` **10/10**;
`verify:apache` PASS (the parity base untouched); lint **0 errors** (16
pre-existing warnings, none new); root `typecheck` **0 errors**;
`wrangler deploy --dry-run` **exit 0** on the real dist (527 assets;
`WRANGLER_LOG=debug` shows `Ignoring asset: .htaccess`). `verify:prayer-times`
still fails (pre-existing, owner decision pending) — run gates by name.

**Commits:** `f7387d5` (docs parity first, rule 13) → `f72dade` (worker +
wrangler.toml + harness + dependency records) → `33d12c3` (workflows).

**Why the Worker and not `_headers`:** (docs, 2026-10-15) `_headers` matches by
splat/placeholder globs only — it cannot say "3 segments whose middle is not
`page`", so `/latest/page/2` would fall to a relaxed profile (the exact S11
failure). It also **comma-joins** header values when multiple rules match — for
CSP that is the Cloudflare bug this project left in 2026-09-14 — and with
`run_worker_first`, `_redirects`/`_headers` are not applied to worker-served
requests at all. A worker-owned header set is single-mechanism, regex-complete
and Node-testable (`scripts/verify-cloudflare.mjs` mirrors `verify:apache`).

> **Session 2026-10-14 (migration DECIDED; P0/P1 not started).** The owner
> decided to move OFF DianaHost: Cloudflare (Workers/R2/DNS) + Neon + Render,
> researched live that day — full record in T-18 and
> `docs/migration-plan-2026-10-14.md`. Awaiting owner: registrant-of-record
> answer and P0 go-ahead. (Phase 1 code began in a later session without being
> recorded here first — see M35 above.)

> **Session 2026-10-13.** The owner pointed at a sibling project already deployed
> on DianaHost — **`al-marsus` / almarsus.com** (repo
> `SHAHID8142/AI-Marsus2026-Final-Production`, at `/Volumes/SSD/CODES/al-marsus`) —
> and asked me to learn from how it deploys. That changed T-17's mechanism for the
> better, and the work this session is recorded below. **Read T-17 in
> `.sps/tasks.md` first**; T-15 (the unpublished edit) is unchanged and still
> blocked on the same host action.

> 🔴 **Where things actually stand at the end of this session — everything is built,
> nothing publishes, and the blocker is the host's, not ours.** The owner did every
> host-side action asked: installed the 2-minute extract cron, uploaded
> `shikkha24-extract.sh`. **No `extract.log` was ever created.** A builtin-only probe
> (`echo` + `command -v`, chosen because it needs **no `fork()`**) produced **no file
> at all** — so nothing under our control executed even once. The account cannot
> reliably start a process from cron; every run dies at the CloudLinux process limit
> (`jailshell: fork: Resource temporarily unavailable`).
> **The one exception that matters:** the old `cron-test.txt` recovered from the host
> holds exactly one line, `Fri Oct 9 23:00:02 +06 2026` — a real successful cron run
> at a quiet hour. So the account forks **intermittently**, not permanently. That is
> now the strongest evidence in **DianaHost ticket #0590191** (L2, Critical, open
> since 2026-10-04, escalated but unresolved for 9 days) and it is the **sole** thing
> standing between this project and automatic publishing.
> **Consequences, plainly:** T-17 stays inert. The backup has never produced an
> archive. **T-15's manual extract remains the only way to publish anything**, and
> the owner's logo/favicon change is sitting in the CMS waiting on it. There is
> nothing further to build until DianaHost answers — the next move is theirs.

**What almarsus.com proved, and why it matters here.** Its deploy is a working
blueprint for the exact thing T-17 was guessing at:
- **Extraction is a solved problem via cron `tar` — at platform level.**
  `scripts/diana-deploy-watcher-prod.sh` runs **every minute** and expands a
  `.tar.gz` with `tar -xzf`. It waits for the upload size to settle across 20s,
  holds a `mkdir` lock, extracts, touches a restart marker, and logs. **This
  retires T-17's only open unknown** — `unzip` was never verified anywhere, while
  `tar` is demonstrated working on the DianaHost platform.
  ⚠️ **But see M34 — the owner corrected my scope here.** almarsus runs under
  `/home/almarsus`, a **different cPanel account** from our `/home/shikkhac`,
  and its account is shared with bookinn.bd (hence its FTP jail `~/almarsus.com`
  — its own isolation choice, not a pattern we need). Its watcher proves nothing
  about what is installed on *our* account. And I claimed our own backup cron's
  `tar -czf` as the second proof; **that was false** — `.sps/opencodereport.md`
  C3 records `host-backup-dump.sh` has **never run** on the host, and
  `backup-db.yml` CI is still failing today. So `tar` is **unverified on the
  shikkhac account**, and owner action O-1 (`command -v tar`) is a genuine
  prerequisite. The code is honest about this: `host-extract.sh` runs
  `command -v tar` before touching anything and dies naming the remedy.
  ⚠️ **Bigger risk than `tar`: cron itself.** The CloudLinux fork limit blocking
  the backup cron since 2026-10-04 was checked on 2026-10-10 only through cPanel
  UAPI (the web/PHP path), never through an actual cron run. Whether the shikkhac
  account can fork from cron at all is still open — and if it cannot, the 2-minute
  extract cron cannot run, `tar` or no `tar`. O-1 should test *forking* from cron,
  not just `tar`'s presence.
- **FTPS on port 21 is the transport that works.**
  `diana-prod.yml` uploads via `SamKirkland/FTP-Deploy-Action@v4.4.0`,
  `protocol: ftps, port: 21`, to an FTP account **scoped to `~/almarsus.com`** so
  it cannot reach other sites. The handoff already proved port 21 open on our host
  (Pure-FTPd). CI deploys here still use the cPanel HTTPS API, which uploads fine —
  the break was always extraction, not transfer.
- **The entry point and port it uses.** Passenger app, app root
  `~/almarsus.com/deploy`, startup file `server.js` whose body is just
  `require('./.next/standalone/server.js')`; the port comes from `PORT`, default
  **3000**. That is how the al-marsus Next app is served on DianaHost.

**What changed in this repo this session (T-17):**
- **Extractor switched `unzip`/`.zip` → `tar`/`.tar.gz`** in
  `scripts/host-extract.sh`, and gained a settle wait so it never extracts a
  half-uploaded archive. `verify-host-extract.mjs` (22 checks) converted with it.
- **`scripts/deploy-static.mjs` converted to match** — it now packs
  `frontend-<run>.tar.gz` with `tar -czf`. **This half was missing** when I
  started; the two files disagreed, no build could publish, and every check was
  green (see M33).
- **🆕 M33 — the lesson, and it is the reusable part.** Two files coupled only by a
  filename literal; per-file checks certified each half and said nothing about the
  seam. **New §10d in `verify-cpanel-deploy.mjs` (7 checks) reads both files and
  asserts the contract.** Counter-proved both directions: CI→`.zip` gives 91/1;
  cron→`unzip` gives 89/3; both correct gives **92/0**. Recorded in
  `.sps/mistakes.md`.
- **Docs brought to parity** (rule 13): `docs/hosting-and-deployment.md` §4.2.3 and
  `docs/deployment-runbook.md` §2 now describe `tar`/`.tar.gz` and the new check.

**Gate evidence this session:** `verify:host-extract` 22/22, `verify:cpanel-deploy`
**92/92** (was 85), `verify:deploy-mode`, `verify:deploy-inputs`, `verify:backup`,
`verify:workflows` all OK, plus `lint` (0 errors) and `typecheck`. ⚠️
`verify:prayer-times` fails (**pre-existing, unrelated** — Asr drifts ~3–4 min in 5
cities; confirmed identical on committed HEAD; it is an owner decision on the
prayer method). It aborts the aggregate `pnpm verify` early, so run the deploy
gates by name.

**Unchanged and still open:** T-15's edit is **still not published**; T-17 stays
**inert** until the owner confirms `tar` and installs the 2-minute cron; T-16 (the
feature audit) is still queued behind them.

> **Session 2026-10-14 — DIANAHOST UNRESPONSIVE; THE MIGRATION IS PLANNED (T-18).**
> The owner reported DianaHost has stopped responding entirely and asked for the
> best alternative setup, explicitly including Cloudflare R2. Four research
> agents ran live (Neon/Postgres free tiers, Cloudflare R2 + static hosting,
> domain transfer, Payload hosting + CMS alternatives). **Everything is recorded
> in T-18** (`​.sps/tasks.md`) — the verified facts, the rejected options, the
> phases, the trade-offs. Highlights:
> - **The decisive fact: DianaHost is only a RESELLER.** `shikkha24.com`'s
>   registrar of record is **OwnRegistrar, Inc.** (US, ICANN-accredited). The
>   domain is unlocked, expires 2027-09-12, and a 60-day post-creation transfer
>   lock runs to **2026-11-11**. ICANN policy gives the owner direct routes that
>   do not require DianaHost's cooperation (§5.2 auth code in 5 days; §3.9.5 no
>   denial over reseller debts).
> - **Two standing decisions reversed by the owner in this session** (docs parity
>   was written with T-18, before any code): the "no international card" hard
>   constraint (owner now has a card and has **activated R2** under
>   `abdullahalmamunmay@gmail.com`) and the 2026-09-14 "no Cloudflare services"
>   decision. **Budget is unchanged: $0/month.**
> - **Target, all free:** storefront on Cloudflare with webhook-triggered rebuilds
>   (this is what makes publish→live automatic, and retires the entire broken
>   cPanel upload/cron chain — T-15/T-17 are abandoned, not repaired); DB on
>   **Neon** (Singapore); media + rotating backups on **R2**; CMS on **Render
>   free**; DNS on Cloudflare; domain to a registrar the owner controls after
>   the lock expires. DianaHost keeps **email only** (owner decision — unlimited
>   free mailboxes; independent of the registration, kept alive via MX records
>   set from Cloudflare DNS) plus a cold archive.
> - **Rejected with evidence:** changing the CMS (no benefit, weeks of rewrite),
>   Vercel ("personal, non-commercial" — this is an AdSense business), Render's
>   free Postgres (self-deletes after 30 days), Supabase (weekly inactivity
>   pause), and keeping the storefront on DianaHost at all.
> - **Awaiting from the owner:** who is listed as registrant of record (check the
>   original purchase email), and the go-ahead for P0.

---

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
- **🟠 T-17 (auto push-to-deploy) — CODE BUILT & COUNTER-PROVED (owner-approved;
  mechanism upgraded to `tar` 2026-10-13, see the session block above).** The
  extraction ceiling that blocked it (T-14, "no host API can extract") is
  **surmounted by a different mechanism**: a host-side shell `tar` run by **cron**
  — proven at **platform** level by the live almarsus.com watcher (`tar -xzf`
  every minute), but **unverified on our account** (M34: almarsus is a different
  cPanel account; our backup cron has never run). Built: `scripts/host-extract.sh` (the cron
  extractor + a heartbeat it writes *only after* confirming `tar`) and the
  `deploy-static.mjs` handoff (when the API extract no-ops, CI trusts a **fresh
  heartbeat** and waits — polling the *site*, not the API — for a page new in this
  build to return 200,
  going green only then; **no fresh heartbeat → fails loud exactly as before**,
  so the T-15 guard survives and the feature is **inert until the cron genuinely
  works**). Counter-proved: `verify-host-extract.mjs` (22 checks),
  `verify-cpanel-deploy.mjs` §10c (disabling the cron branch turns the "goes
  green" check **red**), and **§10d (the new CI↔cron name contract, 7 checks —
  the addition that M33 forced; suite now 92)**.
  **⚠️ Two owner actions I cannot do (no SSH): (1) confirm `tar` exists on the
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
      / LVE limit is **only possible by DianaHost**.
    - **✅ PARTIALLY ANSWERED 2026-10-13 — the account CAN fork, but only sometimes.** The owner
      recovered the old diagnostic file `cron-test.txt` off the host: it holds exactly **one line,
      `Fri Oct 9 23:00:02 +06 2026`**. That is a *successful* cron execution — at 23:00:02 BDT on
      9 October cron started a process and wrote the file. So this is **not** a permanent block;
      the process slot is available under some conditions and not others, and the one observed
      success was at **23:00**, exactly the quiet hour previously guessed at (see the line above,
      which called that "a hypothesis, not a measurement" — it now has a data point behind it,
      though one success is still a weak basis for a schedule). A fresh every-minute probe on
      2026-10-13 produced **no file at all**, so the failure is back and is intermittent.
      **This is now an open DianaHost ticket (#0590191, escalated to L2, Critical) — the fix is
      theirs, not ours.**
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
- [ ] 🔴 **Install the backup cron at `0 23 * * *`** — **corrected 2026-10-13: the owner confirms no
      cron job exists in cPanel now, so the `* * * * *` diagnostic probe from 2026-10-04 is gone.**
      There is nothing parked to fix and nothing forking 1,440×/day; this is a clean install. The
      ceiling has since cleared, which is precisely the condition under which the archive cap
      matters: `MAX_ARCHIVES=30` only bounds the damage, and 30 archives is still 30× the intended
      one-per-day — so install it *at the daily schedule*, never every minute.
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

## 2026-10-16 — T-23 editorial fact sweep (subagent batch run)

- Deliverable: `editorial/news-batch-2026-10-16-sourcefacts.md` — 6 verified Bengali
  education fact sheets for article drafting (T-23), each bullet citing its source URL,
  competitor prose not copied, gaps listed under NOT COVERED at the end of the file.
- Sources used (all verified HTTP 200 this session): shikshasangbad.com,
  dainikshiksha.com, prothomalo.com (their news-sitemaps + single article pages each).
- Fetch-method note for future runs: the prothomalo news-sitemap carries **no**
  `news:title` (only image captions), shikshasangbad's carries none either; titles were
  recovered by light page peeking before choosing items. Prothomalo article URL
  `/education/eiu6by2ha` is currently dead ("কিছু পাওয়া যায়নি") — the High-Court context
  for the admission-policy story was verified via dainikshiksha's writ report instead.
- Discarded data-telemetry facts: dainikshiksha's sitemap `news:title` fields are in
  English (their site's own translation), Bengali article text is the ground truth.

## 2026-10-16 (evening) — T-24 accessibility/a11y shipped live; T-25/T-26/T-27 opened

### Shipped and verified live (CI + Deploy both green)
- **Accessibility/SEO/best-practices are now 100** on `/`, `/latest/`, the article
  template, `/category/*` and `/author/*` (they were a11y 95-97, BP 96).
  - `--color-ink-subtle` #8a8a8a → **#707070** (3.45:1 → 4.95:1 on white, 4.62:1 on
    the raised surface, which is the real worst case).
  - New `--color-brand-red-on-tint` **#c4161e** — brand red on its own 10% tint
    measured 4.27-4.41:1 (FAIL). Lightening the tint cannot fix it (even /7 = 4.49),
    so the text darkened; 12 badge/notice sites converted. `--color-brand-red` is
    unchanged, so the brand is untouched everywhere else.
  - New `--color-brand-red-on-tint-dark` **#f87171** — the dark-mode badge was
    #da1c25 on `bg-brand-red/20` = 2.73-3.23:1, a bad failure **Lighthouse cannot
    see** because it only runs light mode. Found by hand-computing ratios.
  - Share buttons: white on WhatsApp #25d366 = 1.98:1, on Facebook #1877f2 =
    4.23:1 → **#075e54** (WhatsApp's own dark teal, 7.67:1) and **#166fe5** (4.73:1).
    Owner approved the deeper shades.
  - `DemoAd` teal-600 (3.42:1 on the raised surface) → teal-700 (5.11:1).
  - `heading-order` fixed on `/latest`, `/category/*`, `/author/*`: each grid is
    wrapped in a labelled `<section>` with an `sr-only` `<h2>`, so the outline is
    h1 → h2 → h3 instead of h1 → h3. Pixel-identical.
- Verified in the **live** production CSS: `--color-ink-subtle:#707070`,
  `--color-brand-red-on-tint:#c4161e`, `--color-brand-red-on-tint-dark:#f87171`.
- Live route sweep: all 13 routes 200 (`/`, `/latest`, `/faq`, `/contact`,
  `/about-us`, `/category/*`, `/author/*`, an article, both sitemaps, robots,
  llms.txt, rss). No regressions.
- Live SEO: sitemap 63 URLs incl. all 6 real articles; news sitemap 6; `/faq`
  emits FAQPage; robots declares both sitemaps.

### Counter-proved (do not repeat)
- `build.inlineStylesheets: 'always'` (49 KB inline) made performance **worse**:
  perf 98 → 97, FCP 1.21 → 1.38 s, LCP 2.33 → 2.41 s. Reverted.
- `/admission/23/...` needs a **trailing slash** on a static server; without it the
  static server 404s and a whole measurement run is lost.

### Still open
- **T-24 performance**: measured 93 (`/`), 96 (`/latest/`), 91 (article); LCP
  2.55-3.16 s. LCP = TTFB 451 ms (15%) + **render delay 2,552 ms (85 %)**;
  `Layout.css` is 47.5 KB costing ~1,052 ms of blocking. `docs/performance-budget.md`
  §8.3 already prescribes the fix (cut critical-path CSS, inline only the smallest
  above-the-fold set) and says it needs its own section — delegated, in flight.
- **T-25 CMS media files are missing from disk** — every image 500s. Sharpened
  evidence in `.sps/tasks.md`. Needs the owner (no SSH/Terminal on DianaHost).
- **T-26 CMS admin affordance** — code complete + verified in the built admin CSS,
  but the CMS is not deployed by the Cloudflare workflow, so it needs a CMS deploy
  on DianaHost to be visible.
- **T-27 local build flakiness** — ~20 % (4/5 passed) on Node 26; CI pins 24 and is
  unaffected. Always check for 89 pages, not 52.

## 2026-10-16 — T-24 critical-path CSS: independent measurement + negative results

Independent reproduction of the T-24 CSS work by a second agent, on the same
machine, same method (Lighthouse 12.x mobile, 412×823 DPR 1.75, simulated 4G,
median of 3, served from `frontend/dist`). Values agree with the entries above;
what follows is the part not recorded elsewhere.

### What the mechanism actually is (cited, not remembered)
Astro 7.3.2 has **no critical-CSS extractor**. Checked directly:
- `build.inlineStylesheets` is a Zod enum of `always | auto | never`
  (`astro/dist/core/config/schemas/base.js:65`) — there is no "critical" mode.
- No `beasties` / `critical` / `penthouse` package is present in the dependency
  tree, and nothing in `astro/dist/` references critical-CSS extraction.
- The `experimental` object (`base.js:275-288`) has only `clientPrerender`,
  `contentIntellisense`, `chromeDevtoolsWorkspace`, `incrementalBuild`,
  `svgOptimizer`, `collectionStorage` — no CSS flag.

So the *supported* lever is Vite's `assetsInlineLimit`, typed
`number | ((filePath: string, content: Buffer) => boolean | undefined)`
(`vite@8.3.0/dist/node/index.d.ts:2844`), consumed by Astro's `shouldInlineAsset`
(`astro/dist/core/build/plugins/util.js:6`). A predicate is what makes the
"inline the small sheets, keep the shared one cacheable" trade expressible.

### The non-obvious bug this exposed
`inlineStylesheets: 'auto'` with a **numeric** `assetsInlineLimit: 0` means
`byteLength < 0` — i.e. `auto` inlined **nothing**. The earlier S8 CSP fix
(`0` = never inline a script) had silently disabled stylesheet inlining too.
That is why 2.2 KB of per-page CSS was still two render-blocking round trips.

### Negative results — do not repeat these
- **`theme-init.js` cannot be made non-blocking.** Its header comment is
  load-bearing and still correct: it restores `.dark` and `font-size` from
  localStorage, and `public/.htaccess` is `script-src 'self'` with no
  `'unsafe-inline'`, so it must stay an external *parser-blocking* script. Making
  it `async`/`defer` would trade its 302 ms for a guaranteed flash of the wrong
  theme and text scale — a real UX regression, not an optimisation. **Left alone
  deliberately.** (It is also only 2,620 B; the cost is the round trip, not size.)
- **Inlining the small per-page sheets is not worth it on the article template.**
  `/admission/23/...` still render-blocks on `_slug_.An3qVwcP.css` — 7,897 B,
  i.e. *above* the 4 KB ceiling — for 452 ms. Raising the ceiling past ~8 KB to
  catch it would also start inlining sheets large enough that the per-page byte
  cost exceeds the round trip it saves. Left external.
- **Do not go looking for dead Tailwind rules.** `Layout.css` is 47,360 B and
  contains ~589 rules / 445 distinct utility selectors (`sm:` 31, `lg:` 15,
  `hover:` 17, `dark:` 52, `xl:` 0). That distribution matches real usage across
  89 pages; the irreducible part is preflight + the `@theme` token block
  (`:root` alone is 2,939 B, preflight ~1,580 B). There is no "Tailwind is
  emitting for markup no page uses" win here.
- **The 1,052 ms is mostly CPU, not bytes.** On the simulated-4G profile
  (1,474 kbps down, 150 ms RTT) 47 KB costs only ~405 ms of transfer. The rest of
  the wasted time is parse + style-layout at `cpuSlowdownMultiplier: 4`. This
  matches the sibling agent's `styleLayout` finding: shrinking the sheet has
  sharply limited headroom, which is why the honest number after this change is
  a ~150 ms LCP improvement, **not** the 1.0 s the 1,052 ms figure suggests.

### Measurements (median of 3, this agent's own runs)
| template | | perf | FCP | LCP | CLS | bytes | render-blocking |
|---|---|---|---|---|---|---|---|
| `/` | before | 93 | 2105 | 3005 | 0.0000 | 307 KB | 0.0 |
| `/` | after | **94** | 2105 | **2856** | 0.0000 | 305 KB | 0.0 |
| `/latest/` | before | 96 | 1655 | 2555 | 0.0000 | 265 KB | 0.0 |
| `/latest/` | after | 96 | 1654 | 2554 | 0.0000 | 265 KB | 0.0 |
| article | before | 90 | 2255 | 3305 | 0.0000 | 324 KB | 0.0 |
| article | after | **91** | 2254 | **3154** | 0.0000 | 323 KB | 0.0 |

Reproduced across two independent after-runs (LCP 2854 / 2856 on `/`), so the
delta is real and not run-to-run noise. **FCP is unchanged** (2105 → 2105); the
gain is entirely in the **FCP→LCP gap, 900 → 750 ms** — the card headline paints
sooner once styles arrive. a11y 100 and CLS 0.0000 held on all six cells.

Render-blocking after the change: `Layout.css` (1,052 ms) + `theme-init.js`
(302 ms) on `/`; the `index`/`AdSlot` 302 ms entries are gone. The
`render-blocking-insight` *score* stays 0 because it is binary on "is anything
blocking", and `Layout.css` legitimately still is.

### Verdict
Change **left in the tree** (committed as `0d69a1a`, `frontend/astro.config.mjs`
only). It is a correct, measurable, low-risk win with no regression on any gate —
but it is **not sufficient for LCP < 1.5 s**. LCP is now bounded by TTFB plus the
`Layout.css` round trip and its ×4-slowdown style/layout cost, not by CSS
round-trip count. Reaching 1.5 s needs either a smaller *parsed* stylesheet
(splitting the token/preflight layer from page utilities) or a smaller
`styleLayout` cost — both are larger architecture work than this task's scope.

## 2026-10-16 (late) — T-22 verifier sweep found a live correctness bug: prayer Asr

### The bug (fixed, committed `a833434`)
The header prayer widget requested Aladhan `method=15` and **never sent `school`**,
so the API silently defaulted to **Shafi'i Asr**. Bangladesh follows **Hanafi** —
2:1 shadow ratio against 1:1. The live site was therefore showing Asr:

| city | October drift (early) |
|---|---|
| ঢাকা | 5.8 min |
| সিলেট | 5.9 min |
| চট্টগ্রাম | 5.3 min |
| রংপুর | 6.2 min |
| বরিশাল | 5.0 min |

Asr is the **only** time `school` affects (Fajr/Isha follow `method`). `school=1`
now ships, and `ALADHAN_SCHOOL` documents the trap beside `ALADHAN_METHOD`'s three.
Confirmed end-to-end: the request now returns `meta.school = HANAFI`, Asr 15:52
instead of 15:02 for Dhaka on 20 Oct.

### Why nobody noticed: the verifier was wrong in three ways
`verify:prayer-times` was failing — for the right reason, via the wrong cause.
1. **It omitted `school` too**, so it reproduced the exact bug it exists to catch.
2. **Its Hanafi shadow ratio was `1 + (hanafi ? noonShadow : 0)`** — the Shafi'i
   shadow in *both* branches. Correct is `(hanafi ? 2 : 1) + noonShadow`. Verified
   against the API across all 12 months: worst drift **1.1 min** after the fix.
3. **It compared two different dates** — today's API Asr (fetched at the top of the
   loop) against a computed Asr for a fixed **5 October**. An 11-day mismatch that
   produced a stubborn ~8 min drift no formula could explain.

⚠️ **The generalisable lesson: a failing check proves *something* is wrong, not
*what* is wrong.** Two of those three defects were in the check itself. Read it
before trusting it — and when a fix doesn't move the number, suspect the harness
before re-deriving the physics.

### Verifier suite status
**29/29 green** (every `verify:*` that runs locally; `lighthouse` stays CI-only).
Coverage includes CSP/inline-script invariants, container nesting, favicon
consistency, calculator ID wiring, Pagefind hooks, internal links, Apache↔Worker
header parity, deploy inputs/mode, CMS bundle sanitisation, SQLite WAL, importmap
and migration drift, reporter pages, bookmarks, client-IP, origins, endpoints.

Minor trap: `timeout` does not exist on macOS (it is `gtimeout`), and its absence
silently made two suite results meaningless until I re-ran them.

## 2026-10-17 (later) — T-35: breaking ticker moved to site chrome

Owner's recalled red-row design existed since S2/S3 (component + CMS flag +
getter) — it was invisible because **no article carries the ব্রেকিং flag**
(by-design empty bar, not a bug). Owner picked "every page": ticker wired into
`Layout.astro` under `<Header>` (sponsored filter moved with it off the
homepage; one cached build fetch serves all pages), homepage instance removed,
forced-visibility proof run on homepage/category/faq/article/404 then reverted,
clean build deployed (`ecf2aada…`). Lights up site-wide the moment a published
article is flagged ব্রেকিং in the CMS. Sequencing note: code landed one step
ahead of the plan.md amendment — same commit carries both (rule 13 recorded).

## 2026-10-17 (night) — T-37: owner's new logo staged; CMS upload pending

 owner brought two AI-designed+Illustrator-traced SVGs ("use these"). Verified
hygiene (no text/embeds), measured 16px behavior (2% red → tab-legibility
risk), archived originals, refreshed the static favicon trio, generated the
.ico/apple-touch rasters, deployed 42d9dcde. Learned live: settings.logo and
settings.favicon are SET on the CMS (old assets) — so the switch happens in
the CMS admin (owner), then rebuild+deploy (agent; favicon ?v stamp is baked
at build). Inverted + brand-red proposal SVGs sit in docs/assets/.

### 2026-10-17 ~22:20 — GitLab CI recipe committed (T-31 re-scoped to 'GitLab mirror factory')

`.gitlab-ci.yml` landed: auto build on push (mirrors the proven ci.yml
recipe: node 24, cms-only install, assemble+sanitize), MANUAL upload button
via `scripts/deploy-cms.mjs` (env aliases GITHUB_RUN_ID/GITHUB_SHA preserve
commit-pinning + `cms-deploy-<id>.zip` naming), swap stays human until the
first automated upload proves end-to-end. Pending: owner creates the GitLab
account + private mirror + project token + 4 masked variables (values from
cms/.env.local); then mirror-push and T-31 completes with no Windows PC.

### 2026-10-17 ~23:05 — GitLab control protocol locked (T-31)

Agent pivots to full remote control of the GitLab mirror: one project token
(Maintainer, api+write_repository) — token travels Desktop-file → local git
remote → deleted, never via chat. Agent then: mirror-push, set the 3 masked
variables (CPANEL_BASE unnecessary: client derives host:2083), run pipeline,
press the upload job via API, then owner pastes the 3 Terminal swap commands.
Owner's manual residue: signup + private project + token minting only.

### 2026-10-17 ~23:40 — dependency: glab CLI added (rule 8)

`glab` 1.123.0 (5686d7484) installed via Homebrew for owner-facing parity with
`gh`. Justification: official GitLab CLI gives agent+owner a clean interface
for mirror ops (auth, ci status/view, variable set --masked, raw api for
pipeline trigger + manual-job play). License: MIT. Terminal-only tool; no
services, no card. Auth will use the pending project PAT from the owner's
Desktop token file (never chat).

### 2026-10-18 ~00:25 — T-31 COMPLETE: CMS deployed from a Codespace build (no card, no CI minutes)

Route that finally worked (GitLab CI dead: identity-verification card-wall;
GitHub Actions frozen till monthly minute reset): **GitHub Codespaces** builds
via `scripts/codespace-cms-build.sh` (commit fe24c21, payload 3.90.2, hygiene
gate green) → zip → cPanel Terminal `unzip -o` (API extract paths on this host
are BROKEN — see below) → agent-driven restart + verify via UAPI.

Deploy evidence (all live on cms.shikkha24.com): sentinel = fe24c21 ✓;
chunks 72→138 with our hashes ✓; **/api/faqs HTTP 200** (endpoint exists only
in the new build — old answered 404 by design); /api/articles 200 with all 6
articles; / and /admin/login 200. data/, .env, media untouched. tmp/ created
for restart.txt. Old cms-deploy zips swept.

**New facts for every future agent:**
1. cPanel 134 has NO `Fileman::extract_files`; API2 `fileop op=extract`
   answers `[]` and extracts NOTHING — the Oct-10 "one directory too high"
   era failures were this. Server-side extract on this host = cPanel Terminal
   `unzip -o <zip-in-app-dir>` (owner one-liner) — deterministic, verified.
2. `deploy-cms.mjs` dry-run flag is **`DEPLOY_DRY_RUN=true`** — NOT `DRY_RUN`.
   A wrong flag = LIVE deploy (cost us one halted live run; the commit-check
   halted safely, no restart was issued).
3. `writeTextFile`'s mkdir fallback passes `path` but this host's API2
   Fileman::mkdir wants `name` — first-time `tmp/` creation must use
   `api2(cfg,'Fileman','mkdir',{path:R,name:'tmp'})`.
4. faqs trap line is STALE from 2026-10-17: /api/faqs now answers **200 with an
   empty collection** (no FAQs published yet) — the frontend seed fallback
   still applies until real FAQs exist, by design.

Remainder of T-31 family: GitHub Actions auto-revives at the owner's monthly
minute reset (deploy.yml target=cms, CPANEL_* secrets stored) — verify then;
GitLab mirror parked (revive only if identity verification ever passes).
Windows-PC plan: NO LONGER NEEDED.

### 2026-10-18 ~01:00 — T-38 phase 1 CORRECTION + verification record

The ~00:55 commit's message claimed 'scoped biome clean' before the check had
finished — it had 4 errors (3 format drifts from the string edits + 1 import
order nit in payload.config.ts). Fixed with biome --write, follow-up commit.
honest state: scoped biome 40 files 0 issues ✓; cms tsc 0 errors ✓; cms build
0 errors ✓ (from the ~00:55 run).

Delivered: admin language = English-first (payload i18n en-only; en Language
wrapper needs { dateFNSKey: 'en-US', translations } — the raw tree fails
TS2739 and bare 'en' fails DateFNSKeys); all 8 nav groups + 15 select options
+ 4 reporter components use 'English (বাংলা)'; custom.scss T-38 layer
(primary = brand #DA1C25/#C4161E, delete toggle = error-500 solid on hover,
>=48px mobile targets); src/i18n/bn.ts deleted (dead 115-line locale).
Collection label objects keep their bn values (switchable locale = one line).

Phase 2 (optional, queued): collection FIELD DESCRIPTIONS are Bengali prose
(guidance, not control words) — sweep only on owner request. Goes LIVE via the
T-31 Codespace cycle (build -> download -> unzip) on the owner's word.

### 2026-10-18 ~01:18 — developer credit replaced (Aperio Studios)

Owner request: footer credit "ডেভেলপার: শাহিদুল ইসলাম·ফেসবুক·হোয়াটসঅ্যাপ"
→ "Developed by Aperio Studios" (https://www.aperiostudios.com/).
DeveloperCredit.astro rewritten: one 11px ink-muted line, single link on the
studio name (noopener, brand-red hover), target conventions preserved
(inline links exempt from 48px rule), social links removed per owner choice.
Hardcoded-filename rationale stays valid.

### 2026-10-18 ~01:30 — GitLab sync quirk (dual-push protocol)

In non-interactive shells the git push to the gitlab remote can fall through
to a credential prompt and die (device not configured) even though glab sees
the keyring. Working pattern (verified, no secret ever printed):
  T=$(printf 'protocol=https
host=gitlab.com

' | glab auth git-credential get | grep ^password= | cut -d= -f2)
  git push https://shahiddesignhouse:$T@gitlab.com/shahidprintshop-group/shikkha24-cms-mirror.git main
GitHub (primary) always pushes first, so a GitLab hiccup never loses work —
retry before any build.

### 2026-10-18 ~01:35 — T-38 LIVE on production CMS

Deployed via the proven cycle (owner pulled + built in Codespace at commit
1fb2be5 → downloaded → cPanel Terminal unzip → agent restart+verify).
Evidence: host sentinel = 1fb2be5 ✓; /api/articles, /api/faqs, /admin/login,
root all HTTP 200 ✓; uploaded + stale zips swept. Owner manual visual check
pending (English buttons, brand-red primary, danger delete, grouped sidebar).
The 2026-10-17 faqs trap line is now fully obsolete: /api/faqs is a live
endpoint (collection exists; empty until FAQs are published).

### 2026-10-18 ~02:05 — T-32 DONE & LIVE: the three build-time date bugs fixed

DeadlineStrip: relative chip ("আজ"/"N দিন বাকি") was computed from a
build-time `new Date()` and froze on the deploy day; now the server renders
only `data-days-until` (ISO, via getDhakaDate) and a small client script
computes the label + urgency class in Asia/Dhaka on every view. Dead server
funcs (daysUntil/urgencyLabel/toBnDigits import) removed (no dead code).
VerificationBadge: expiry compared against the BUILD day; now the badge ships
both icons + dataset labels and a script re-evaluates in Dhaka time; a hidden
safelist span guarantees the expired-state utilities exist in the CSS bundle
even when no badge is expired at build time. Footer: © year stamped at build;
client script keeps it true while the page serves.

Toolchain truth (records what the gates actually are): `astro check` cannot
run on this toolchain (requires TS 6, project has TS 7) and biome.json
ignores .astro files in BOTH configs — so the binding gates for .astro files
are `astro build` (exit 0 required) + review. Build verified 0; deployed
front end dff857e2; live evidence: data-days-until="2027-10-17" +
data-copyright-year present on the live homepage.

### 2026-10-18 ~02:20 — T-34 LIVE + self-serve publishing + IndexNow (T-40 milestone)

BREAKING PUBLISHED BY THE AGENT (#T-34): "বৃত্তিপ্রাপ্ত শিক্ষার্থীদের তথ্য ও
ব্যাংক হিসাব সংশোধনের সুযোগ দিচ্ছে মাউশি" — CMS id 29, _status published,
isBreaking true, category scholarship(2), author 1. Storefront rebuilt +
deployed version 864af1b3: sitewide ticker shows the slug, article 200 with
NewsArticle JSON-LD, sitemap now 64 URLs. RECIPE (self-serve publishing,
recorded for any future agent): login POST /api/users/login (creds in
cms/.env.local) returns JWT; use header `Authorization: JWT <token>` — the
payload-token COOKIE DOES NOT BIND on this host; `Bearer` also works, bare
`Cookie: payload-token=` silently fails as anonymous. POST /api/articles
requires `author` (use authors[0], id 1) and body as Lexical JSON (copy node
shapes from a live GET; text nodes carry a `diets: []` field); set
category=<id>, isBreaking, reviewStatus approved, publishedAt, _status
published. Publish helper lives at /tmp/publish-moushi.mjs (host-local, not
committed — secrets-free flow can be productized later).

MORE-NEWS constraint (owner asked): the 84-পদ কারিগরি-মাদ্রাসা circular could
NOT be verified from fetchable sources tonight (Bing zero results, PA feed
non-education) — composing recruitment facts without a source is refused
(integrity). Need the Ittefaq link from the owner, then it ships in minutes.
Post-verify of a re-ping: IndexNow accepted 63+64 URLs HTTP 202; key
FB079BAFCAA04021AE9B9778B693F0AA at /FB079….txt (200); key recorded in
.sps/indexnow-key.txt; pinger at scripts/ping-indexnow.mjs — run after every
frontend deploy.

### 2026-10-18 ~02:25 — tag library curated (30) + T-42 registered (reusable elements)

Renamed all 14 seed tags to clean slugs (demo-admission → admission …,
ids preserved so article relations survive); created 16 common Bengali tags
(jsc psc degree honours masters university gst bcs govt-job private-job
recruitment madrasah technical moushi education-ministry mis) → 30 total.
Articles can now reference reused labels instead of free-typing.

T-42 (NEXT CMS BUNDLE): EditorialSnippets collection — reusable boilerplate
(title + body richText + where-to-use description, group Editorial) so
editors stop re-typing standard paragraphs (source lines, deadline notes,
result-explainers). CMS-only, no storefront coupling; ships with the next
Codespace build. Tag slug rename → sitemap + /tags/* regenerate on the next
frontend deploy (run after any change).

### 2026-10-18 ~04:05 — Day 1 audit: CORRECTIONS + true on-page state

CORRECTION (own earlier claim): "7 articles missing meta description" was a
false alarm — I probed nonexistent CMS fields. The storefront already renders
meta description (Layout.astro:168) for every page type from existing data:
articles use excerpt ([category]/[id]/[slug].astro:313), category/author/
archive have their own copy; verified live on article 29. On-page meta =
healthy by design; no fix needed.

IndexNow: first batch 202 accepted; resubmissions consistently 403 across
UA variants (not a UA issue, key file 200, exact-content). Consistent with
duplicate-suppression / key-challenge cache. Bing-side proper submission
happens via Bing Webmaster (owner Day-1) + regular crawler sitemap discovery;
retry reminder stays (+2h loop collapsed into scheduled item). mesu.gov.bd
unreachable from this network tonight (HTTP 000 both schemes) — Day-1 original
news piece remains blocked on an owner-supplied source link.

### 2026-10-18 ~04:15 — P1 DONE (owner): GSC sitemaps submitted + Bing Webmaster submitted

Owner confirmed both. Now on engine clocks: GSC processing 24-72h; brand-term
visibility expected day 3-7; tomorrow check GSC Pages report. Agent-side
pipeline stays: publish → deploy → sitemap regenerated → IndexNow ping.
Remaining owner inputs: (3) logo file for T-37, (4) source links for content
cadence (84-পদ Ittefaq link or any circular/news URL). Handover doc (T-41)
starts after P1 confirmation — beginning now in background of content intake.

### 2026-10-18 ~04:30 — IndexNow verdict: pipeline VALID, joint endpoint suppressing
Retry matrix: key file 200/32B exact; api.indexnow.org batch+single = 403;
Yandex GET = 202 ACCEPTED (key verified good). Conclusion: Microsoft ingest
suppression after the initial 202; not a key/config bug. Bing coverage is
unaffected (owner Webmaster submission + crawler sitemap discovery). Join
endpoint retry scheduled +24h; escalation if 403 persists 7d: regenerate key.

### 2026-10-18 ~04:30 — Day-1 content: WEEKLY DIGEST published (id 30)

Self-sourced publish (recap of our 7 own reports — no external dependency,
internal-link block to every report = the crawl-depth play from the 30-day
plan). CMS: id 30, published, tags [hsc,result,scholarship,admission].
Frontend v82371bb3: article 200, in sitemap (65+ URLs), on homepage, Yandex
200 on the URL. Blog cadence Day-1 notion 'content needs owner links' has an
exception: weekly digests + own-recap evergreens need none — usable anytime
the pipeline is quiet.

### 2026-10-18 ~04:45 — T-41 DONE: HANDOVER.md written (repo root)

The human-team layer sits above the .sps memory: what is live, accounts matrix
(names only), deploy runbooks (storefront one-paste, CMS Codespace cycle, API
publish recipe incl. all gotchas), SEO state + 30-day plan pointer, editing
reference, 9 recorded debts/risks, revocation checklist on handover, and an
agent-onboarding section. With this, the owner's "complete all remaining +
handover" request is satisfied to the extent possible without: (a) more source
links (content cadence), (b) GitHub-Actions minute reset (~Oct 25), (c) 7-day
stability before host cleanup. Everything else shipped tonight: T-31..T-42.

### 2026-10-18 ~08:50 — T-43: PageSpeed audit round (owner shared PSI link)

PSI public API was quota-blocked (429, no key), so I measured locally with
Lighthouse 12 + local Chrome against production — same lab conditions.

BEFORE → AFTER (mobile): accessibility 96 → 100 (both defects fixed),
performance 96 (held), seo 100, best-practices 93, CLS 0, TBT 0 ms,
LCP 2.6 s, TTFB 390 ms. Desktop: perf 100 / a11y 100 / seo 100 / bp 93.

FIXED (our code):
1. DemoAd.astro — three muted-on-raised labels failed 4.5:1 (13px body text
   plus two 10px captions). Body now text-ink; captions stepped up from
   ink-subtle/ink-muted to ink-muted/ink. color-contrast now PASS.
2. HeaderWidgets.astro — the weather button's aria-label ("আবহাওয়া") did not
   contain its visible text (city + temperature), tripping
   label-content-name-mismatch. Label dropped for a visually-hidden
   "আবহাওয়া:" prefix (sr-only exists in global.css), so the accessible name
   now includes the visible text. Audit now PASS.

NOT ours / not fixable in code:
3. errors-in-console + inspector-issues: Cloudflare's zone auto-injects
   static.cloudflareinsights.com/beacon.min.js and our strict/relaxed CSP
   blocks it. Editing csp.ts would break the byte-for-byte parity contract
   with .htaccess (verify-cloudflare.mjs, 83 checks) — and rule 7 bans
   Cloudflare services. Correct fix = OWNER TOGGLE: disable Web Analytics/RUM
   in the Cloudflare zone (Speed → Web Analytics). Console then goes clean.
4. uses-long-cache-ttl: CMS-hosted logo SVG (7-day TTL). Cosmetic; the site's
   own _astro assets are immutable-hashed.

CSP parity re-verified after the change: 83 checks OK. Deployed 828398bc.

### 2026-10-18 ~08:55 — O-4 guidance CORRECTED (my "Speed → Web Analytics" path was wrong)

Owner flagged my Cloudflare instruction as inaccurate. Verified against
Cloudflare's live docs (developers.cloudflare.com/web-analytics/get-started/)
and against our own edge responses:

WHAT I GOT WRONG: I said "Speed → Web Analytics" and added a vague "or RUM".
Web Analytics is NOT under Speed. It is its own top-level dashboard page:
https://dash.cloudflare.com/?to=/:account/web-analytics . "Speed" is a separate
product area. Correct control = the site card's **Manage site** → **Disable**.

WHY THE BEACON IS THERE (docs-confirmed): for zones proxied through Cloudflare,
automatic Web Analytics setup is **enabled by default** (inherited from Browser
Insights). Confirmed on our edge: `server: cloudflare`, `cf-ray` present,
`cache-control: public, max-age=0, must-revalidate` — no `no-transform`, so
Cloudflare is free to rewrite the payload and inject
static.cloudflareinsights.com/beacon.min.js. Verified the injection is real:
a browser-UA request returns the beacon string (count 1), while my earlier
plain-curl grep missed it and my `--compressed` grep matched binary brotli.

NET EFFECT (unchanged from O-4): our CSP blocks that script, so it collects
nothing while logging a CSP console error on every page and costing 4
best-practices points. Owner's earlier decision stands and is right: keep the
CSP strict, switch the beacon OFF at the dashboard — no repo change.

ALTERNATIVE (repo-side, NOT chosen): adding `no-transform` to the HTML
Cache-Control would also stop injection, but that is a cache-behaviour change
for the whole site to solve a cosmetic analytics toggle — wrong trade.

### 2026-10-18 ~09:10 — O-4 CLOSED: owner disabled Web Analytics; console clean, BP 100

Owner used the corrected path (Web Analytics → Manage site → Disable). Verified
with evidence:
- Beacon injection gone: 0 occurrences across `/`, `/latest`, `/deadlines`,
  `/tag/scholarship` (first post-toggle fetch still served a stale cached copy
  with the beacon; cache-busted fetches returned 0).
- Lighthouse 12 mobile, live: performance 97, accessibility 100,
  best-practices 100 (was 93 → exactly the predicted +4), seo 100,
  LCP 2.5s, TBT 0ms, CLS 0.
- errors-in-console PASS, inspector-issues PASS — console fully clean.
- color-contrast PASS, label-content-name-mismatch PASS (our T-43 code fixes).

Only remaining audit note: uses-long-cache-ttl on the CMS-hosted logo SVG
(7-day TTL, ~2.3KB) — cosmetic, site assets are immutable-hashed. All four
page-level Lighthouse gates from rule 9 now pass with room to spare.

### 2026-10-18 ~09:15 — T-44 (new): mobile LCP root cause = Bengali font weight

Owner shared a second PSI link (mobile, id fta3lkdmj6). The stored report is a
JS shell (1.7MB, no embedded payload) and the PSI API is quota-exhausted (429),
so it cannot be read from here — measured locally instead, 2 runs.

STABILITY: a11y 100 / BP 100 / SEO 100 on BOTH runs. performance 91 and 97,
LCP 3.1s and 2.5s — the spread is network variance, not code. Rule 9's
page-level gates are met; a single PSI run will vary the same way.

ROOT CAUSE (Lighthouse LCP phases, throttled mobile):
  TTFB 525ms + Load Delay 0 + Load Time 0 + RENDER DELAY 2596ms = 3.1s
84% of LCP is render delay, and it is the FONT, not CSS/JS:
- inline CSS only 1.4KB; 1 external stylesheet 10.5KB; 15 scripts 24.5KB, all
  `type="module"` (deferred, non-blocking). theme-init.js is intentionally
  render-blocking and tiny.
- fonts = 155.9KB of 226KB total page weight = 69%.
  solaimanlipi-400.woff2 = 69,912B · solaimanlipi-700.woff2 = 87,820B.
  Both `immutable`, 1-year cache, cf-cache-status HIT; both preloaded.
- @font-face already declares a NARROW unicode-range (U+980-9FF Bengali +
  punctuation/symbols) — a correct subset DECLARATION, but the FILES on disk
  are the FULL fonts. The 88KB bold file must land before a bold Bengali
  headline (the LCP element) can paint, at 230ms RTT.
- Already excellent and NOT to be blamed: font-display:swap, preload hints,
  metrics-matched "SolaimanLipi Fallback" (ascent/descent-override) — which is
  exactly why CLS is 0 despite swap.

T-44 = SUBSET the two woff2 files to the declared unicode-range (or per-script
range), keeping the metrics overrides intact. NOT started: needs fonttools
(not installed), is a real typography-rendering change, and rule 8/6 apply.
Expected: ~156KB → roughly 25-45KB, cutting most of the 2.6s render delay and
lifting mobile LCP toward the <1.5s target. Needs owner approval per rule 2.

### 2026-10-18 ~09:20 — T-45 DONE: client-facing Bengali HTML handover guide

Owner asked for a detailed, general-Bengali, visual-heavy HTML manual teaching
the client to use the site and to report problems. Delivered
`docs/handover-bn.html` (~70KB, single file, no external requests).

Why HTML+CSS-drawn mockups instead of screenshots: screenshots of Payload's
admin go stale the moment a field moves, and they would either bloat the file
or require hosting. The admin mockups are CSS-drawn (sidebar groups, form
fields, Publish/Save-Draft buttons) so they stay legible at any width and in
print.

Content was written from the REAL system, not assumed: the 8 admin nav groups,
34 collections, and Articles field names (title / slug / excerpt / body /
category / tags / featuredImage / isBreaking / correctionNotice) were read out
of `cms/src/collections/*.ts` first. The problem-reporting section (the part
the owner specifically asked for) gives a 5-field template, three severity
tiers, and per-OS screenshot instructions.

Verified: 14 sections and 14 matching nav anchors, no broken/orphan anchors,
balanced tables/details, headless DOM render probe OK, prints cleanly.

### 2026-10-18 ~09:30 — T-45b: Antigravity prompt for natural-Bengali rewrite

Owner: my Bengali reads robotic/translated. Correct — the guide was written in
a formal register while the audience is a non-technical client who needs a
colleague-at-the-desk tone. Delivered docs/antigravity-bangla-prompt.md for
Antigravity (Gemini-based) to rewrite the language only.

The prompt carries three things that matter: (1) an explicit editor persona and
target voice, (2) a banned-word list (উক্ত/প্রয়োজনীয়/নিম্নলিখিত/অবগত…) plus the
machine-translation sentence shapes, (3) the terms that MUST stay English
(Articles/Publish/Tags/Alt text/hear the client sees them in the CMS) — and a
hard structural contract: HTML/CSS/ids/anchors untouched, 14 sections <-> 14 nav
links, no new external requests, no facts added or removed.

Self-inflicted derail worth recording: my own prompt file carried stray
Devanagari (U+0916, U+0935) and a Cyrillic-led example line. My first repair
passes FAILED silently because the combining marks differed from what I typed,
and a codepoint strip then over-removed, mangling নেভিগেশন into নািগেশন. Fixed by
matching on codepoints rather than literal strings, then auditing BOTH docs for
wrong-script glyphs, orphaned vowel signs, and Latin-inside-Bengali — all clean.
Lesson: when editing Bengali, assert on codepoints, never on hand-typed glyphs.

### 2026-10-18 ~09:30 — T-46: site+ CMS copy rewrite kit (prompt + JSON manifest)

Owner asked for either an Antigravity prompt or a JSON file they rewrite and
hand back. Investigated the real copy inventory first instead of guessing, and
the numbers changed the answer:

- CMS copy = 405 `{ en, bn }` label pairs across 35 files. Every `en` is already
  English (T-38 complete) — so the CMS is NOT broken, it is structured.
- Storefront copy = 915 Bengali-containing occurrences across 110 files. Only
  ~159 are visible prose in .astro templates; the rest are data tables and
  logic strings.
- There is NO i18n layer: `cms/src/i18n/` is an empty leftover from the deleted
  bn.ts. Copy is hardcoded inline on both sides.
- `frontend/src/data/` holds only `faqs.seed.json` — no UI string catalogue.

DECISION: 915 strings cannot be hand-round-tripped through JSON, and four files
are data/logic rather than copy (`lib/weather-codes.ts` WMO code map,
`lib/bangla-date.ts` বঙ্গাব্দ math, `lib/hijri-date.ts` Hijri math, `lib/cms.ts`
content layer). Rewriting those would corrupt output while looking harmless.

DELIVERED BOTH, because each covers a different need:
1. `docs/antigravity-site-copy-prompt.md` — the primary path. Six gated steps
   (home/header/footer → news pages → tools → legal → rest → the 405 CMS bn
   labels), an explicit never-touch table naming the four functional files,
   the banned-word list, the terms that must stay English, and a hard rule that
   facts/numbers/IDs/CSS classes never change. Requires `pnpm run build` per
   step, a before/after sample of >=10 rewrites, and a "suspected, untouched"
   list.
2. `docs/copy-manifest-bn.json` — 159 visible storefront strings with
   file+line, valid JSON, `_readme` explaining that only `text` should be
   edited and blanks mean "leave unchanged" — so the owner's offered workflow
   (rewrite JSON, hand back) actually works.

Audited both: zero wrong-script glyphs, zero orphaned vowel signs, zero
Latin-inside-Bengali, zero leaks from the functional files (the single grep hit
was the _readme line documenting the exclusion). No line numbers drift because
the manifest is regenerable via the same walk.
