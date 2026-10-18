# F2 — CI/CD health and deployability: measurements

**Audit dimension:** F2 ("Live services answered, but CI/deployability was not executed or fully audited"), previously 1/3.
**Mode:** read-only. No application code, workflow, or script was modified. The only file written is this report.
**Measured:** 2026-10-19 (Asia/Dhaka), against `main` @ `a712a27a`.
**Repo:** `SHAHID8142/shikkha24` (local worktree `/Volumes/SSD/CODES/NewsPortal`).

> Every number below is backed by the command output quoted next to it. Where something
> could not be tested, it is listed in §8 with the reason — not silently omitted.

---

## 1. Method and commands run

| Purpose | Command | Result |
|---|---|---|
| Workflow inventory | `ls -la .github/workflows/` | 5 files |
| Structure outline | `grep -nE '^(name\|on\|jobs):…' .github/workflows/<f>.yml` | see §2 |
| Run history (narrow) | `gh run list --limit 30 --json name,conclusion,createdAt,headSha,event,status,databaseId` | 30 runs |
| Run history (wide) | `gh run list --limit 100 --json name,conclusion,createdAt,event,headSha` | 100 runs |
| Failure causes | `gh run view <id> --log-failed`, `gh run view <id> --json jobs` | per-step conclusions |
| Gate logic | read `scripts/wait-for-ci.mjs` | §3 |
| Deploy artifacts | `cat frontend/wrangler.toml`, `ls frontend/worker/`, read `scripts/verify-cloudflare.mjs` | §4 |
| Verification suite | `pnpm run --silent verify:<name>` × 23 | §5 |
| Secrets surface | `grep -oE 'secrets\.[A-Za-z0-9_]+' .github/workflows/*.yml` | §6 |

Auth: `gh auth status` → logged in as `SHAHID8142`, token scopes `gist, read:org, repo, workflow`.

---

## 2. CI inventory

### 2.1 `.github/workflows/ci.yml` — `CI`

- **Triggers:** `push` (`branches: [main]`), `pull_request`, `workflow_dispatch`. `concurrency: ci-${{ github.ref }}`, `cancel-in-progress: true`. `permissions: contents: read`.
- **Jobs:** exactly **one** — `verify` ("Verify"), 41 steps. There is no matrix and no second job, so every gate below shares one machine and one install.
- **Can it fail the run?** Yes — every step is a plain `run:`/`uses:` with no `continue-on-error`, so the first failing step fails the job and the run.

What each step actually verifies (mapped to a real gate):

| Gate class | Steps (ci.yml line) |
|---|---|
| Lint | `Lint` (54) |
| Workflow-schema | `Verify the GitHub workflows parse` (59) |
| Verify-script | `.astro` frontmatter imports (65), GPA (82), CGPA (93), bookmark merge (101), ad split (112), payload-types staleness (127), migrations staleness (139), import-map staleness (160), client IP spoofability (180), SQLite WAL (198), backup gate (217), CMS bundle sanitiser (231) |
| Build | `Astro sync` (243), `Build (frontend) against the seeded CMS` (342), `Build (CMS, standalone)` (509), `Assemble and measure the standalone deploy bundle` (529) |
| Typecheck | `Typecheck (frontend)` (248), `Typecheck (CMS)` (523) |
| Integration | `Seed the CMS database` (254), `CMS harnesses (local API)` (286) |
| Output verification | `Build output size ceiling` (365), `Verify .htaccess against a real Apache` (386), `Verify build output` (408), `Verify internal links` (415), `Verify the search-page bootstrap` (423), `Verify CMS read and write paths` (438) |
| Performance | `Lighthouse gate (performance, accessibility, payload)` (457) |
| Dependency | `Dependency audit` (665) |

**What CI does NOT cover** (measured absences, not opinions):

- `verify:deploy-mode` and `verify:deploy-inputs` are **not invoked in ci.yml** — `grep -oE 'verify:[a-z-]+' .github/workflows/ci.yml` returns neither. They are only reachable from `deploy.yml`. Both gate the *deploy* path, so a change that breaks deploy-mode resolution is caught only by the deploy workflow itself (and `verify:deploy-mode` currently fails on macOS bash 3.2, §5).
- No `verify:cloudflare` in ci.yml — the Cloudflare contract is checked **only inside `deploy-cloudflare.yml`** (line ~199), i.e. the gate runs on the deployer, after the CI gate, not in CI.
- No `verify:sync`, `verify:archive-buckets`, `verify:host-extract`, `verify:pnpm-fallback`, `verify:dark-tokens`, `verify:site-name`, `verify:bengali-spacing`, `verify:prayer-times` in ci.yml (`verify:*` set in ci.yml is listed in §5.2). Ten existing verification scripts are never run by any workflow.
- `pull_request` is triggered, but there is no branch protection measurement here (out of scope / requires admin API) — see §8.

### 2.2 `.github/workflows/deploy-cloudflare.yml` — `Deploy (Cloudflare)`

- **Triggers:** `push` (`main`), `repository_dispatch: types: [rebuild]`, `workflow_dispatch` (inputs `reason`, `mode`, `skip-ci-gate`). `permissions: contents: read` + `actions: read`.
- **Jobs:** one — `deploy` ("Build + deploy to Cloudflare Workers"), `timeout-minutes: 30`.
- **Order:** checkout → **Wait for CI to pass** → pnpm/node setup → install → mode resolve → astro sync → build → `verify:build-output` → `verify:links` → `verify:search-init` → `verify:cloudflare` → `wrangler deploy`/`--dry-run` → live probe (live mode only).
- **Can it fail?** Yes. The live probe is a real gate: it retries 12× and asserts the homepage body contains `শিক্ষা২৪` and that exactly one `Content-Security-Policy` header is returned.
- **Default is dry-run:** `mode` resolves from the `AUTO_DEPLOY` repo variable for push and `repository_dispatch`; anything but `live` runs `wrangler deploy --dry-run`. Measured consequence: this is why many green-but-unpublished runs look "successful".

### 2.3 `.github/workflows/deploy.yml` — cPanel (rollback path)

- **Triggers:** `push`, `workflow_dispatch` (inputs incl. `skip-ci-gate`, `target`, `confirm-risk`). Same gate-first ordering. Deliberately does **not** consume `repository_dispatch` anymore (asserted by `verify:cloudflare`).
- 27,542 bytes / largest workflow; carries the `verify:apache`, `verify:cpanel-deploy`, `verify:deploy-mode`, `verify:deploy-inputs` gates.

### 2.4 `.github/workflows/backup-db.yml` — `Backup database + media`

- **Triggers:** schedule + dispatch. Secrets: `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`. 1 run in the 100-run window; it **failed** (0% success on n=1).

### 2.5 `.github/workflows/host-health.yml` — `host-health`

- **Triggers:** `workflow_dispatch` only (confirmed by `verify:workflows` output: `✓ host-health.yml [workflow_dispatch]`). Secrets: `CPANEL_HOST`, `CPANEL_USER`, `CPANEL_TOKEN`. No runs in the 100-run window — it cannot run on push by construction, so it gates nothing automatically.

---

## 3. Real CI history — measured numbers

`gh run list --limit 100 --json name,conclusion,createdAt,event,headSha`, aggregated:

| Workflow | runs | success | failure | cancelled | success rate (settled) |
|---|---|---|---|---|---|
| **CI** | 46 | 11 | 32 | 3 | **23.9%** |
| **Deploy (Cloudflare)** | 53 | 8 | 45 | 0 | **15.1%** |
| Backup database + media | 1 | 0 | 1 | 0 | 0.0% |
| host-health | 0 | — | — | — | n/a (dispatch-only) |

Events on `ci.yml` in a 60-run window: `push: 59`, `workflow_dispatch: 1`.

### 3.1 The narrowed 30-run window (the task's requested command)

`gh run list --limit 30 …` → 15 CI runs and 15 Deploy runs, perfectly paired by SHA and second. Last 6 SHAs: `a712a27a`, `a76b3db6`, `3e580c57`, `676b2d0d` **success**; `ebf0963e`, `b87c7f90`, `314d937a` **both CI and Deploy failure**.

**Headline correction:** the recent 30 runs look healthy (4 of the last 5 green pairs), but the wider 100-run window shows the true rate is **23.9% for CI**. The green trend is recent (from 2026-10-18T17:41Z onward); before that the tree was red for most of 2026-10-17 and 2026-10-18.

### 3.2 Failure causes — classified, not guessed

`gh run view <id> --json jobs` → failing step name, for four sampled CI failures (`39150518022`, `39150062478`, `39149209295`, `39133563532`):

```
FAILED STEP: Lint     (all four)
```

`gh run view 39150518022 --log-failed`:

```
biome.json:2:14 deserialize
  i The configuration schema version does not match the CLI version 2.5.15
    2 │   "$schema": "https://biomejs.dev/schemas/2.5.13/schema.json",
```

So the dominant CI failure cause is **not** a product regression — it is a **biome schema/CLI version drift** (`biome.json` pins schema `2.5.13`; the installed CLI is `2.5.15`). This reproduces locally:

```
$ pnpm exec biome --version
Version: 2.5.15
$ pnpm run --silent lint
  × Formatter would have printed the following content:
Found 1 error.
```

The unformatted file is `scripts/lib/deploy-recovery.mjs` (line ~208). **Caveat — this offender is untracked work-in-progress, not a committed defect:** `git cat-file -e HEAD:scripts/lib/deploy-recovery.mjs` → *"exists on disk, but not in 'HEAD'"*, and `git status --porcelain scripts/lib/` → `?? scripts/lib/`. HEAD CI is green (`a712a27a success`). So the local lint failure is an artifact of the dirty tree; the *schema drift* warning is real and is what CI actually tripped on.

### 3.3 Deploy failures — two distinct causes

Per-step conclusion extraction across the 7 failing Deploy runs:

| Run | SHA | Failing step |
|---|---|---|
| 39150518042 | ebf0963e | `Wait for CI to pass` |
| 39150062391 | b87c7f90 | `Wait for CI to pass` |
| 39149209292 | 314d937a | `Wait for CI to pass` |
| 39146726991 | f52d922d | `Wait for CI to pass` |
| 39146507542 | 1990b4b2 | `Wait for CI to pass` |
| 39140327530 | 0dee0b2d | `Wait for CI to pass` |
| 39139133445 | 7918aee2 | `Verify the published Worker` |

**Cause A — gate working as designed (6 of 7).** The gate correctly refused to deploy a red tree. From `39150518042`:

```
CI_GATE: waiting for a CI verdict on ebf0963
CI_GATE: refusing to deploy. CI concluded "failure" for ebf0963.
CI_GATE: see https://github.com/SHAHID8142/shikkha24/actions/runs/39150518022
```

Also note the five cancelled CI runs (3 in the window) propagate: `f52d922d`, `1990b4b2`, `0dee0b2d` had CI `cancelled` and Deploy **failure** — i.e. a cancel is treated as not-success. This is correct fail-closed behaviour, but it means **cancelling a CI run also fails the paired deploy**, which is a real operational consequence worth knowing.

**Cause B — a genuine false-negative in the live probe (1 of 7).** `39139133445` failed at `Verify the published Worker`, and the log shows the bug explicitly:

```
Probing https://shikkha24-frontend.abdullahalmamunmay.workers.dev/
line 21: printf: write error: Broken pipe     ← ×12 attempts
The published homepage never came up …
```

The workflow's own comment documents the fix ("bash's own substring test, NOT `printf | grep -q`"), and the shipped code uses `[[ "$body" == *'শিক্ষা২৪'* ]]`. The run's failing line 21 was the **pre-fix** version. Given the commit timeline, this is a repaired historical failure — the false-negative is **no longer reproduced** in the current file. It is recorded here as measured history, not as an open defect.

---

## 4. Gate integrity — the claim "red CI blocks deploy"

**Verdict: the primary claim holds. The gate is fail-closed on every path I could test.** Bypasses found are listed as F2-B1…B4; none is a "red CI deploys anyway" hole.

What `scripts/wait-for-ci.mjs` does (read in full):

- `findCiRun()` queries `…/actions/workflows/ci.yml/runs?head_sha=${sha}&per_page=5`, prefers a `completed` run, else `runs[0]`.
- Missing run → hard fail: `CI_GATE: no CI run exists for … Failing closed — an untested commit must not publish.` with `process.exit(1)`.
- `run.status !== 'completed'` after the deadline → `exit(1)`.
- `run.conclusion !== 'success'` → `exit(1)`. Because this is an **allow-list**, `cancelled`, `timed_out`, `action_required`, `skipped` and `startup_failure` are all rejected. Verified empirically in §3.3: cancelled CI → Deploy failure.
- 401/403/404 are treated as **fatal** (no 15-minute retry), which is what makes the missing `actions: read` fail fast. `actions: read` **is** present (`deploy-cloudflare.yml` line 83), and `verify:cloudflare` asserts it.
- There is **no `|| true` and no default-to-proceed branch anywhere** in the file — every terminal path is `exit(1)` or an explicit success log.

Gate ordering is enforced by `scripts/verify-cloudflare.mjs` (§7 in the script, lines ~380–400): it locates the gate step index, asserts nothing matching `/next build|astro build|astro sync|wrangler deploy|pagefind|build:frontend|build:cms/` appears above it, asserts the override `if:` mentions `workflow_dispatch`, and includes a **negative control** (injecting a "sneaky build" above the gate must be detected). Output:

```
✓ negative control: a re-added push trigger on deploy.yml trips the guard
verify:cloudflare — OK (83 checks, every section + its negative control)
```

### Bypass findings

**F2-B1 — `skip-ci-gate` is a designed human bypass (accepted risk, not a hole).**
`deploy-cloudflare.yml:97` — `if: ${{ !(github.event_name == 'workflow_dispatch' && inputs.skip-ci-gate) }}`; `:117` mirrors it.
A human dispatching the workflow with `skip-ci-gate=true` deploys an **unverified SHA**, and the workflow only prints `::warning::` (not `::error::`). The stated justification is in `deploy.yml:148` — CI is red on the dependency audit (T-10, Payload 3.90.2), so a strict gate would freeze every CMS deploy.
Concrete sequence: dispatch `deploy-cloudflare.yml` with `mode=live`, `skip-ci-gate=true` on any commit → gate step is **skipped entirely** → build → `wrangler deploy` live.
Mitigations that *do* hold: it is dispatch-only (a push can never set it), `verify:workflows.mjs:133` and `verify:cloudflare.mjs` both assert that, and the warning is on the record. **Residual risk: the override is not restricted to `mode=dry-run`, so a single checkbox publishes unverified code to production.** Highest-value hardening: make `skip-ci-gate` force `dry_run=true`, or require an explicit second input echoing the SHA being deployed.

**F2-B2 — the gate matches CI runs by SHA only, not by event. (Real, latent.)**
`scripts/wait-for-ci.mjs` — `findCiRun()` filters on `head_sha` and takes `runs.find(completed) ?? runs[0]`. It never inspects `run.event` or `run.name`.
`ci.yml` has `workflow_dispatch` as a trigger (line 24), and **such a run measurably exists**: `gh run list --workflow=ci.yml` → `39133563532 failure workflow_dispatch ada86824 2026-10-18T13:53:50Z`.
Concrete sequence to trip it: SHA *X* has a **failing** `push` CI run *and* someone later re-runs CI via `workflow_dispatch` on *X*; if that dispatch run turns green, the gate reads green and deploys *X* — even though the run it actually validated was a different, possibly differently-parameterised invocation. The inverse race is worse: if a `workflow_dispatch` run on *X* is green while the `push` run on *X* is red, `runs.find(completed)` returns **whichever the API lists first**, and with `per_page=5` there is no deterministic preference for the `push` run. Both runs share a `head_sha`, so the gate cannot tell them apart.
Impact today is low (only 1 dispatch vs 59 push runs), but the ordering guarantee is absent by construction.
**Fix direction:** add `&event=push` to the API URL, or filter `runs.filter(r => r.event === 'push' && r.head_sha === SHA)` before choosing.

**F2-B3 — a deploy that starts *before* CI does can still pass, and the gate does not require the CI run to be for the same *workflow version*. (Latent.)**
The poll loop is time-based (`DEADLINE_MS` default 900 000 ms, `POLL_MS` 15 000). If CI has not yet been created for SHA *X* when the deploy starts, the first iterations see `runs = []` and `continue` polling — a later CI run on the same SHA is then accepted. That is intended and safe. The gap is the deadline: `CI_GATE_TIMEOUT_MS` is `vars.CI_GATE_TIMEOUT_MS || '900000'` (`deploy-cloudflare.yml:100`), while the job timeout is `timeout-minutes: 30`. A CI run that takes >15 min (e.g. a Lighthouse step queued behind a slow runner) makes the gate `exit(1)` with *"CI did not conclude within 15 minutes"* — fail-closed, but it **silently kills the publish path** while CI is still legitimately running. Consequence for the CMS publish chain: an editor's publish produces a failed deploy even though CI later goes green, and nothing retries — the `repository_dispatch` is consumed. There is no "re-run on CI success" trigger. Not a security bypass; an availability/durability defect in the publish chain.

**F2-B4 — the CMS publish path can be starved, and the dispatch has no `head_sha`. (Latent.)**
`publish-watcher/wrangler.toml` — `crons = ["*/5 * * * *"]`, `name = "shikkha24-publish-watcher"`. It fires `repository_dispatch: rebuild` with `client_payload { reason, at }` and **no SHA**; `deploy-cloudflare.yml` then checks out the default branch tip. So a `rebuild` deploy always evaluates the *tip of main*, not the commit an editor's content was validated against. If two publishes land within one deploy, the second is coalesced into the first (fine), but if a publish fires while `main`'s tip has a red CI run — e.g. an unrelated in-progress merge — the editor's publish **fails at the gate with no retry**, and the content stays unpublished until the next cron tick changes the CMS hash. "Publish succeeded in the CMS" and "published to the site" can therefore diverge silently.
Note also `keep_vars = true` is set specifically so the dashboard-added `GITHUB_TOKEN` survives redeploys — a correct but fragile coupling (it is not in the repo and `wrangler.toml` says so explicitly).

**Explicitly checked and found clean:**
- Does `repository_dispatch` skip the gate? **No.** The gate step's `if:` only excludes the `workflow_dispatch && skip-ci-gate` case; for `repository_dispatch` the condition is `!(false && …)` → the gate **runs**. Verified by reading `deploy-cloudflare.yml:97` and by `verify:cloudflare`'s "the gate override stays dispatch-only" assertion passing.
- Does a push path skip the gate? **No** — same condition; `if: ${{ !(github.event_name == 'workflow_dispatch' && inputs.skip-ci-gate) }}` is true for `push`.
- "No CI run found" → **fails closed** (`exit(1)`), not proceed. Confirmed by code read; the branch is exercised by the script's own `!run` guard.
- Cancelled CI → **rejected** (`conclusion !== 'success'`). Confirmed in production by runs `f52d922d`, `1990b4b2`, `0dee0b2d`.
- Gate placed above any build → asserted, with a negative control, and passing.
- Missing `actions: read` → would be fatal, not retried; but it **is** present, and asserted.

**Unrepaired injection path (reported, NOT fixed, per instructions):** `deploy-cloudflare.yml` writes user/variable-controlled values into `$GITHUB_OUTPUT` — `REASON="${PAYLOAD_REASON:-$INPUT_REASON}"` then `echo "reason=$REASON" >> "$GITHUB_OUTPUT"`. `PAYLOAD_REASON` comes from `github.event.client_payload.reason`, which is attacker-influenceable by anything holding a token that can send `repository_dispatch` (the publish-watcher's dashboard `GITHUB_TOKEN`, scope unknown — `gh auth status` shows the *local* token has `repo` + `workflow`, i.e. broad). A crafted reason containing a newline produces a **multi-line output injection** into `GITHUB_OUTPUT`. Note the mode/target/dry_run lines are safe (they are validated by the `case "$MODE" in live|dry-run)` allow-list and normalised with `tr`), so the exposure is limited to `reason`, which is only echoed. Another agent is concurrently hardening `$GITHUB_OUTPUT` in the two deploy workflows, so this is recorded as an **existing finding** and left untouched.

---

## 5. Deployability smoke checks

### 5.1 `frontend/wrangler.toml` — coherent

| Property | Measured value | Coherent? |
|---|---|---|
| `name` | `shikkha24-frontend` | ✅ matches the live probe URL prefix `https://shikkha24-frontend.<subdomain>.workers.dev/` |
| `main` | `./worker/index.ts` | ✅ `frontend/worker/index.ts` exists |
| `compatibility_date` | `2026-10-15` | ✅ valid `YYYY-MM-DD`, and `verify:cloudflare` asserts it is past-or-today |
| `routes` | `{ pattern = "shikkha24.com", custom_domain = true }`, `{ pattern = "www.shikkha24.com", custom_domain = true }` | ✅ exactly 2; asserted |
| `workers_dev` | `true` | ✅ required by the live probe (it probes workers.dev) |
| `[assets] directory` | `./dist` | ✅ matches the Astro build output |
| `html_handling` | `drop-trailing-slash` | ✅ documented Apache-parity choice |
| `run_worker_first` | `true` | ✅ the Worker is the single source of header truth |

### 5.2 The `worker/` ↔ `.htaccess` byte-identical invariant — enforced and PASSING

The correct path is **`frontend/worker/`** (not `worker/` at repo root — that does not exist; `ls -la worker/` → *No such file or directory*, and `wrangler.toml`'s `./worker/index.ts` is relative to `frontend/`). Contents: `csp.ts`, `dispatch.ts`, `headers.ts`, `index.ts`.

The invariant **is** enforced by `scripts/verify-cloudflare.mjs`:
- line 39–42 imports the four CSP constants and the three functions from `../frontend/worker/*` so the checks run against the shipped modules, not copies;
- line 68 reads `frontend/public/.htaccess`; line 162 `cspFromHtaccess(htaccess)`; line 170 asserts each profile is `byte-identical with .htaccess`;
- it also asserts the HSTS value matches (262), the `/_astro/*` immutable regex is identical (287), the media rule covers only the hub + pagination as in `.htaccess` (229), and the `/verify` rewrite is a faithful port of the `RewriteCond` pair (312);
- line 76 asserts `cfConfig.main === './worker/index.ts'` **and** `existsSync('frontend/worker/index.ts')`.

**I ran it.** Result:

```
$ pnpm run --silent verify:cloudflare
  ✓ negative control: a re-added push trigger on deploy.yml trips the guard
verify:cloudflare — OK (83 checks, every section + its negative control)
exit=0
```

83 checks, every section carrying a negative control. This is the strongest single artifact in the repo's verification surface.

### 5.3 CMS bundle route — scripts exist, but docs drift

`docs/hosting-and-deployment.md` was checked for the named scripts:

| Script | Exists on disk? | Referenced in `docs/hosting-and-deployment.md`? |
|---|---|---|
| `scripts/codespace-cms-build.sh` | ✅ `-rwx--x--x 3566` | ❌ **not referenced** |
| `scripts/deploy-cms.mjs` | ✅ `-rw-r--r-- 21090` | ✅ line 194, line 357 |
| `scripts/assemble-cms-bundle.mjs` | ✅ exists | ✅ (bundle assembly described) |
| `scripts/sanitize-cms-bundle.mjs` | ✅ exists | ✅ (excluded-file invariant, line 357) |

**Finding F2-D1 — doc/code drift.** The documented CMS route describes `deploy-cms.mjs` and the bundle invariants, but the **actual Codespace build entry point the operator is told to run** (`bash scripts/codespace-cms-build.sh`) is documented only in `.sps/tasks.md`, `.sps/handoff.md` and `HANDOVER.md` — not in `docs/hosting-and-deployment.md`. An engineer following only the canonical deployment doc cannot reproduce the last proven CMS build route. (`codespace-cms-build.sh` self-documents: *"Runs unattended on: GitHub Codespaces (default container), WSL2 Ubuntu on a Windows PC, or any Linux with Node 20.9+/zip"*, and notes it mirrors the proven Oct-11 CI bundle, zipping with `-y` because "without `-y` the upload dies on extraction (run 38060359694 died exactly that way on 2026-10-10)"). This is a documentation gap, not a broken script.

`publish-watcher/` is coherent with the task's description: `name = "shikkha24-publish-watcher"`, `crons = ["*/5 * * * *"]`, `CMS_ORIGIN = "https://cms.shikkha24.com"`, `GITHUB_REPO = "SHAHID8142/shikkha24"`, and the source exports `scheduled()` (cron) + `fetch()` (an on-demand `/run-tick`). The 5-minute cron claim is **verified from config**, not from docs.

---

## 6. Verification-script results (the repo's de-facto test suite)

### 6.1 Locally runnable and PASSING — 21 of 23

| Script | Exit | What it asserted (last lines of output) |
|---|---|---|
| `verify:workflows` | **0** | `5 workflows parsed, 0 problem(s)` |
| `verify:dark-tokens` | **0** | `9 passed, 0 failed` |
| `verify:site-name` | **0** | `allow-listed fallback locations: 4 (all equal to canonical)`, `paths: 15` |
| `verify:bengali-spacing` | **0** | `.astro files scanned: 102`, `fused-word sites found: 0` |
| `verify:prayer-times` | **0** | `cities checked: 5`, `Asr matches an independent Hanafi computation within 2 min` |
| `verify:gpa` | **0** | `All GPA checks passed.` |
| `verify:cgpa` | **0** | `All CGPA checks passed.` |
| `verify:bookmarks` | **0** | `All bookmark merge checks passed.` |
| `verify:ad-split` | **0** | `All checks passed.` |
| `verify:client-ip` | **0** | `counter-proof: the previous leftmost read WAS fooled by a forged header` → `All client-IP checks passed.` |
| `verify:sqlite-wal` | **0** | `integrity_check: ok`, `VERDICT: PASS` |
| `verify:cms-bundle` | **0** | `16 passed, 0 failed` (incl. "the secret is genuinely still there — so the throw was honest") |
| `verify:cloudflare` | **0** | `OK (83 checks, every section + its negative control)` |
| `verify:deploy-inputs` | **0** | `10 passed, 0 failed` |
| `verify:astro-imports` | **0** | `156 exports checked`, `every lib export used in .astro frontmatter is imported` |
| `verify:cpanel-deploy` | **0** | `92 passed, 0 failed` |
| `verify:links` | **0** | `All internal links resolve.` |
| `verify:search-init` | **0** | `search-init.js behaves correctly.` |
| `verify:pnpm-fallback` | **0** | `All pnpm fallback checks passed.` |
| `verify:host-extract` | **0** | `Every scenario behaved — the extractor fails loud and only when it must.` |
| `verify:backup` | **0** | `54 passed, 0 failed` |

### 6.2 FAILING — 2 of 23, with causes

**`verify:deploy-mode` → exit 1. Cause: the local shell is bash 3.2.57, the script hard-codes `bash`.**

```
$ bash --version | head -1
GNU bash, version 3.2.57(1)-release (arm64-apple-darwin26)

$ pnpm run --silent verify:deploy-mode
   - a push needs no confirm-risk and is not refused for a missing input — bash: line 171: syntax error near unexpected token `<<'
   - an input cannot redirect a push at the CMS — mode<<EOF_19eacb90d2ae0bddb1395d892982f86e
exit=1
```

Root cause read from the source: `scripts/verify-deploy-mode.mjs:107` runs `execFileSync('bash', [], { input: script, … })` — it extracts the *real* step shell out of the workflow YAML and pipes it to whatever `bash` resolves to. macOS ships bash 3.2.57 (GPLv2-pinned); GitHub's `ubuntu-latest` runner ships bash 5.x. Bash 3.2 cannot parse the modern `mode<<EOF_…`/heredoc-in-command-substitution constructs the workflow uses. Secondary observation: the failing run still printed `EXIT=0` from my wrapper because `pnpm run --silent` masks it — the authoritative signal is the bare `exit=1` captured in §6.2's loop, re-confirmed in isolation (`verify:deploy-mode exit=1`).

**This is an environment finding, not a product defect** — but it is a real reproducibility gap: the repo's own deploy-mode counter-proof **cannot be run on the owner's Mac**, which is the primary operator machine. Installing bash ≥4 (e.g. `brew install bash`) would fix it; so would making the script discover a modern bash or skip with a clear message on bash <4. I did not install anything (read-only).

**`verify:build-output` → exit 1. Cause: stale/partial local `dist/`, thin-build floor not met.**

```
FAIL  the build is above the thin-build floor (no CMS_URL to compare against) — 9 article page(s), floor 10
…
1 build-output check(s) FAILED.
```

38 checks PASS (`.htaccess` CSP profiles, no nested `.container-page` across 114 pages, favicon versioning, pagefind hooks, GPA/CGPA DOM selectors, sitemap/RSS/news-sitemap well-formedness). The single FAIL is the thin-build guard: it needs a CMS-backed build with ≥10 articles (or `CMS_URL` to compare against) and the checked-in `frontend/dist` is a 9-article local build with no `CMS_URL`. **In the real deploy this check runs after a CMS-backed build with `CMS_URL` set** (`deploy-cloudflare.yml` passes `CMS_URL: ${{ secrets.CMS_URL }}` into the verify step, and CI seeds the CMS then builds "against the seeded CMS"). So this is an expected local-only failure. It is nevertheless the repo's **thin-build gate** — the control that stops a CMS outage from publishing a fraction of the site — so its correctness matters, and I could not exercise its passing path locally (§8).

### 6.3 Coverage gap

`grep -oE 'verify:[a-z-]+' .github/workflows/ci.yml` returns `verify:access, verify:ad-split, verify:apache, verify:astro-imports, verify:backup, verify:bookmarks, verify:build-output, verify:cgpa, verify:client-ip, verify:cms-bundle, verify:cms-bundle-sanitize, verify:endpoints, verify:gpa, verify:id-card, verify:lighthouse, verify:links, verify:payload-importmap, verify:payload-migrations, verify:payload-types, verify:rebuild, verify:reporter, verify:result-links, verify:search-init, verify:sqlite-wal, verify:sync, verify:workflows`.

Present as scripts but **absent from every workflow**: `verify:dark-tokens`, `verify:site-name`, `verify:bengali-spacing`, `verify:prayer-times`, `verify:pnpm-fallback`, `verify:host-extract`, `verify:archive-buckets`, `verify:deploy-mode` (deploy.yml only), `verify:deploy-inputs` (deploy.yml only), `verify:cloudflare` (deploy workflows only, never in CI). All ten pass locally (except deploy-mode's bash issue), so this is **unused coverage, not broken coverage** — a cheap CI win.

---

## 7. Secrets / credential surface (names only — no values printed)

| Workflow | Secrets referenced | Assessment |
|---|---|---|
| `ci.yml` | *(none)* | ✅ Correct — CI needs no credentials. |
| `deploy-cloudflare.yml` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CMS_URL`, `PUBLIC_CMS_ORIGIN`, `GITHUB_TOKEN` | `CLOUDFLARE_API_TOKEN` is documented in-file as the **"Edit Cloudflare Workers" template** — correctly scoped, *not* a global API key. `GITHUB_TOKEN` is the auto-provided one, used only for the read-only Actions API poll; `permissions:` narrows it to `contents: read` + `actions: read`. ✅ |
| `deploy.yml` | `CPANEL_HOST`, `CPANEL_USER`, `CPANEL_TOKEN`, `CMS_URL`, `PUBLIC_CMS_ORIGIN`, `GITHUB_TOKEN` | cPanel token — DianaHost-side, scope not verifiable from here. |
| `host-health.yml` | `CPANEL_HOST`, `CPANEL_USER`, `CPANEL_TOKEN` | Dispatch-only, so not exposed to push/PR code. ✅ |
| `backup-db.yml` | `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` | **FTP** credentials. Plain FTP is cleartext; worth confirming it is FTPS/SFTP, and that this account is not the same principal as the cPanel API token. |

**Misconfiguration checks:**

- `secrets: inherit` → **zero occurrences** in any workflow (`grep -c 'secrets: inherit'` = 0 for all five). ✅ No workflow inherits a parent's secrets wholesale.
- Referenced-but-undocumented: `CLOUDFLARE_ACCOUNT_ID` is described in `deploy-cloudflare.yml`'s header ("the numeric account id (dashboard → Workers)"). `PUBLIC_MEDIA_BASE_URL` and `PUBLIC_SITE_URL` are correctly used as **`vars`**, not secrets (they are public). ✅
- Misspelled secrets: all `secrets.*` identifiers appear consistently across workflows (`CMS_URL` / `PUBLIC_CMS_ORIGIN` spelled identically in both deploy workflows). No typo found. ✅
- **Cannot verify** whether each named secret is actually *set* in the GitHub repo: `gh secret list` requires admin scope on the repo, and this is a read-only audit. See §8. The strongest indirect evidence that the Cloudflare three are set is that live deploys **succeeded** (run `39153540967` = success) and the live probe read the account's `workers.dev` subdomain (`shikkha24-frontend.abdullahalmamunmay.workers.dev`) using `CLOUDFLARE_API_TOKEN`.
- **No secret value was printed by any command in this audit.** `gh run view --log-failed` redacts them as `***` (visible in the captured output above), and I never ran `gh secret` / `gh variable` get commands that return values.

### 7.1 Related risk: local gitignore hygiene

`.gitlab-ci.yml` exists at repo root (`-rw------- 3809 bytes`) alongside `.github/workflows/`. It is dead configuration (no GitLab remote is in play per the task context) but is a place a future contributor could paste credentials. Not a finding on its own; noted for completeness.

---

## 8. Top risks in priority order

1. **F2-B1 — `skip-ci-gate` lets a human publish unverified code live.** `deploy-cloudflare.yml:73,97,117`. The override is dispatch-only (well-guarded) but is **not restricted to dry-run**, and the gate bypass prints only a `::warning::`. One checkbox → production on a red tree. *Fix: force `dry_run=true` when `skip-ci-gate` is true, or require a typed confirmation of the SHA.*
2. **CI's true success rate is 23.9% (11/46), Deploy 15.1% (8/53).** Not a healthy pipeline; the recent green streak is 5 SHAs long. The dominant single cause is a **biome schema/CLI drift** (`biome.json` schema `2.5.13` vs CLI `2.5.15`) that failed the `Lint` step in every sampled CI failure. *Fix: bump the schema string (or pin the biome version), which is a one-line change that removes most historical red.*
3. **F2-B2 — the CI gate matches by SHA but ignores `event`.** `scripts/wait-for-ci.mjs` `findCiRun()`. A `workflow_dispatch` CI run on the same SHA is indistinguishable from the `push` run, and `runs.find(completed)` picks whichever the API returns first. *Fix: add `&event=push`.*
4. **F2-B3 — the publish chain has no retry when CI outlives the 15-minute gate.** `CI_GATE_TIMEOUT_MS` default 900 000 ms vs `timeout-minutes: 30`. A publish whose CI run is slow fails permanently; the `repository_dispatch` is consumed and nothing re-triggers on CI success. *Fix: a `workflow_run` trigger on CI success, or a longer/shared deadline.*
5. **F2-D1 — the documented CMS deploy route omits its own entry point.** `docs/hosting-and-deployment.md` never names `scripts/codespace-cms-build.sh`, the last proven build route. A fresh operator following the canonical doc cannot rebuild the CMS.
6. **Reproducibility gap on the owner's machine.** `verify:deploy-mode` cannot run under macOS bash 3.2.57 (it hard-codes `execFileSync('bash', …)`), so the deploy-mode counter-proof is unrunnable on the primary operator workstation.
7. **Ten passing verification scripts are wired to no workflow** (§6.3) — free coverage left unclaimed, including `verify:cloudflare` (83 checks) which runs only *inside* the deployer, after the CI gate.
8. **`backup-db.yml` over plaintext FTP** with a 0/1 success record in the window — the one backup workflow measured is both weak-transport and currently failing.

### Priority note for the parent agent

Items 1, 2 and 5 are cheap and high-value (one-line schema bump; one input-guard; one doc paragraph). Item 3 is a small edit to `wait-for-ci.mjs`. **None of these were applied** — this was a read-only audit. Given another agent is editing the two deploy workflows for `$GITHUB_OUTPUT` hardening, item 1 touches the same file and should be coordinated to avoid a conflicting edit.

---

## 9. What I could NOT test, and why

| Not tested | Why |
|---|---|
| **Actual live deploy (`wrangler deploy`)** | Hard rule: must not be executed. `deploy-cloudflare.yml` was never run, dispatched, or re-run by me. Deploy success is inferred **only** from `gh run list` conclusions. |
| **The live Worker probe under real edge propagation** | Same — requires an actual publish. The `39139133445` broken-pipe failure is documented from its **historical log**, and I verified by reading the current file that the shipped code uses the substring test, not `printf \| grep -q`. I did **not** re-execute a live probe. |
| **Whether each secret is actually set in the repo** | `gh secret list` / `gh variable list` need admin scope and would be outside a read-only audit's remit. Indirect evidence only (§7). |
| **`AUTO_DEPLOY` variable's current value** | Needs `gh variable get` (admin scope). Its value decides live-vs-dry-run, so I can state the *logic* (`MODE="${AUTO_DEPLOY:-dry-run}"`, allow-list `live\|dry-run`) but **not** whether pushes currently publish for real. |
| **Branch protection / required-status-checks** | Needs admin API. I cannot confirm that a red CI **blocks merge to `main`** — only that it blocks *deploy*. These are different controls and the task's "red CI blocks deploy" claim is about the latter, which I did verify. |
| **The passing path of `verify:build-output`'s thin-build floor** | Needs a CMS-backed build with ≥10 articles or a reachable `CMS_URL`. Building would write to `frontend/dist` and hit the network; the local `dist` is a 9-article partial build. |
| **Full multi-job CI behaviour** | `ci.yml` has a single 41-step `verify` job; nothing to fan out. Not tested: whether each of the 41 steps actually fails the run — I inferred this from the absence of `continue-on-error` rather than by injecting failures, since that would require modifying workflows. |
| **`verify:lighthouse` (Lighthouse gate)** | Excluded from my fast read-only sweep: it needs a built site + a server, and would write into `.lighthouseci/`. `ci.yml:457` runs it, so it is covered in CI; not covered here. |
| **`verify:apache`** | Needs a real Apache (CI uses one at `ci.yml:386`). Not runnable read-only on this Mac. |
| **`verify:sync`, `verify:endpoints`, `verify:reporter`, `verify:access`, `verify:id-card`, `verify:result-links`, `verify:rebuild`, `verify:archive-buckets`** | Not run: several are `--filter @shikkha24/cms` scripts needing a live/seeded CMS or the Payload build; `verify:archive-buckets` was outside the fast set. They are exercised by CI (except `archive-buckets`). |
| **The `payload-*` shell verifiers** (`verify-payload-types.sh`, `verify-payload-migrations.sh`, `verify-payload-importmap.sh`) | Run in CI at `ci.yml:127,139,160`; not run locally because they need the `cms/` Payload build (`payload-types.ts` generation) to be meaningful, and would write generated files. |
| **Whether a `repository_dispatch` actually arrives from the publish-watcher** | Would require triggering the cron/`/run-tick`, which mutates production state. The wiring is verified from source + config only. |
| **Any `$GITHUB_OUTPUT` injection exploit** | Reported as an existing finding (§4) not fixed, per instructions. I did not attempt to trigger it — that would require sending a crafted `repository_dispatch`, which is a production mutation. |

---

## 10. Bottom line for F2

- **Gate integrity holds on the paths that matter.** Red CI does block the Cloudflare deploy, fail-closed, with no default-to-proceed branch. This is measured, not assumed: 6 of 7 failing deploys failed *at the gate*, refusing a red or cancelled CI verdict. Cancelled CI is correctly treated as not-success.
- **But the pipeline is not healthy.** CI 23.9%, Deploy 15.1% over the last 100 runs, dominated by one fixable biome schema drift.
- **Four real bypass/drift findings** (F2-B1 designed-but-unbounded, F2-B2 event-agnostic SHA match, F2-B3 no retry when CI outlives the gate, F2-D1 doc drift), plus one existing unfixed `$GITHUB_OUTPUT` injection path reported but deliberately not touched.
- **Deployability artifacts are coherent and the headline invariant is genuinely enforced** — `verify:cloudflare` passes 83 checks including byte-identical CSP parity between `frontend/worker/csp.ts` and `frontend/public/.htaccess`, with negative controls.
- **21 of 23 verification scripts pass**; the 2 failures are environmental (macOS bash 3.2 for `verify:deploy-mode`; stale local `dist` for `verify:build-output`), both explained with command output rather than assumed.

---

*Read-only audit. This file is the only artifact written; no application code, workflow, or script was modified, and `.sps/tasks.md` / `.sps/handoff.md` were not touched.*
