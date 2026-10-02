# QA Audit & DianaHost Deployment Status — 2026-10-02

**Status:** 🟡 **BLOCKED — one CI failure, one branch defect, one infra unknown.**
**Branch audited:** `agents/deploy-project-dianahost-ssh-key` @ `3bec83e`
**Baseline:** `main` @ `2d90a96` (contains the F-04 fix)

Every claim below was verified against the repository or the GitHub API on
2026-10-02. Nothing here is inferred from the prior agent's summary.

---

## 1. Executive summary

A full source audit (43,205 LOC — Astro 7 static frontend + Payload 3.89 CMS)
found **2 High, 5 Medium, 6 Low** issues. The architecture is sound and the
security work (RBAC, XSS, CSRF, secrets) is genuinely production-grade.

**One High finding is fixed and committed** (F-04). The rest are recorded in
§5 and unscheduled.

Separately, the **deployment branch cannot currently produce a working
artifact**: CI run `37012800533` failed. The cause is identified and is a
two-line fix.

---

## 2. BLOCKER: CI run 37012800533 failed

**Status:** ❌ Failed at `Seed the CMS database` (54s). All later steps skipped.

```
LibsqlError: SQLITE_ERROR: no such table: levels
  at upsert (cms/src/seed/index.ts:50)
  query: 'select count(*) from "levels" where "levels"."slug" = ?'
```

### Root cause — confirmed, not guessed

Commit `dadaca7 "fix(cms): opt in to SQLite schema push"` added to
`cms/src/payload.config.ts`:

```ts
// Schema push is opt-in so production cannot alter its database implicitly.
push: process.env.DB_PUSH === 'true',
```

On `main` there is **no `push:` key at all**, so Payload auto-creates the schema
on boot and the seed works. On the deploy branch the push is conditional, and
**`DB_PUSH` is not set anywhere in CI** — so the seed runs against an empty
schema and dies on the first table it touches.

This is the *same* error reported on DianaHost, which means the branch broke
**both** the CI artifact and the production seed. One root cause, two failures.

### The fix (NOT yet applied — needs approval)

Set `DB_PUSH=true` on the seed step in `.github/workflows/ci.yml`. It is
build-time only and touches a throwaway `file:./data/ci.db`, so it is safe. It
is deliberately **not** set for the CMS runtime.

⚠️ `DB_PUSH` is also **undocumented in `cms/.env.example`**. It should be added
there, with a warning that it must never be left on in production.

---

## 3. Branch defect: `.sps/handoff.md` is destroyed

**Severity: High (data loss, not runtime).** `dadaca7` also replaced
`.sps/handoff.md` — **1,493 lines of project memory → a 16-byte file** whose
entire content is the literal text `@.sps/handoff.md`.

Verified: the deploy tip's handoff is 0 lines and contains **zero** occurrences
of "dianahost". The entire deployment history is gone from that branch.

**Scope check (good news):** every blob at the deploy tip was scanned for this
corruption pattern:

| File | Verdict |
|---|---|
| `.sps/handoff.md` | 🔴 **genuinely corrupt** (16 bytes) |
| `frontend/src/styles/global.css` | ✅ false positive — valid CSS starting `@import`, byte-identical to main |
| all other 375 files | ✅ clean |

`cms/src/payload.config.ts` was **also** destroyed by `dadaca7` (16,619 → 26
bytes) but was correctly **restored in `3bec83e`**. The only real difference
between `main` and the deploy tip for that file is the intended 2-line
`DB_PUSH` opt-in. The corruption pattern hit two files; one was fixed, one was
not.


---

## 4. Branch divergence from `main`

`main` is **ahead** of the deploy branch on two things it lacks:

| Item | On deploy branch? | Note |
|---|---|---|
| **F-04 thin-build guard** (2 commits) | ❌ **missing** | `verify-build-output.mjs` is 109 lines shorter than main |
| Prior session's university/bookmark work (~50 files) | ❌ **missing** | still uncommitted on `main` |

⚠️ **Operational risk:** the deploy branch's `deploy.yml` has **no thin-build
guard**, so the destructive `rsync --delete` scenario in F-04 remains live on
the branch that actually deploys to production.

---

## 5. Remaining QA findings

### P0 — next
- **F-13 (High)** `cms/src/lib/http.ts:34` trusts `X-Forwarded-For[0]`, a
  client-controlled header. Rotating it bypasses **every** rate limit (comments,
  newsletter, polls, bookmarks, account deletion) and defeats the poll/reaction
  duplicate-vote guards. **Needs the owner's answer on DianaHost's proxy
  behaviour** before the correct fix can be chosen.

### P1 — this month
- **F-01 (High)** Four hardcoded pagination caps in `frontend/src/lib/cms.ts`
  (500 / 1000 / 200 / 200) silently truncate. Worst: the sitemap's `lastmod` map
  stops at 500 articles (**~25 days** at 20/day) and `getArchiveBuckets` stops at
  1000 (**~50 days**), after which existing archive URLs return 404.
- **F-05 (Medium)** `cms/src/endpoints/reactions.ts:81` — reaction counts are a
  full table scan per request; viral traffic hits a 2 GB host.
- **F-16 (Medium)** Lighthouse / Core Web Vitals gates are declared in
  `.sps/plan.md` but **never automated**; the ≥95 budget is currently
  unmeasured.
- **F-02 (Medium)** Five harnesses are orphaned — `verify-ad-split`,
  `verify-ads-s7`, `verify-s8`, `verify-sqlite-wal`, `verify-cms-sync`. The last
  is listed in the feature register as a gate but has never run in CI.

### P2 — this quarter
- **F-06 (Medium)** In-memory rate limiter resets on restart; no shared store.
- **F-08 (Low)** Set `disablePlaygroundInProduction` explicitly.
- **F-14 (Low)** Fail CI when `payload-types.ts` is stale.
- **F-03 (Low)** `cms/src/endpoints/id-card.ts:167` hardcodes
  `https://shikkha24.com` while its sibling reads `PUBLIC_SITE_URL`.
- **F-18 (Low)** Add an automated axe pass.

### Owner decisions
- **F-07** Cookie consent for AdSense — required for a BD-only site? Legal call,
  then ~1 day of code if yes.
- **F-17** Editorial/corrections policy page (Google News expects one); plus
  Trade Licence / TIN / Ministry registration numbers.

---

## 6. Deploy status — PARKED by owner (2026-10-02)

**Deployment work is paused. This section is a resume point, not a work list.**

State left behind, clean and green:

| Item | State |
|---|---|
| `main` | pushed, clean, CI `37019764650` **success** |
| `agents/deploy-project-dianahost-ssh-key` | pushed, clean, CI `37016011953` **success**, both artifacts produced |
| Branch divergence | merged to convergence — same deps, same guards |

Resolved since the first draft of this document:
- ✅ **CI 37012800533** — root-caused and fixed (`DB_PUSH=true` on the seed step); run `37016011953` is green.
- ✅ **`.sps/handoff.md` destroyed on the deploy branch** — restored from `main` (181 KB, not the 16-byte stub). Re-scanned the whole tip: **0 corrupt files**.
- ✅ **Branches** — 3 worktrees reduced to 2, both healthy; the stale `.kilo` worktree removed; the unborn-HEAD worktree repaired.
- ✅ **Security advisories** — Next.js RCE (critical) + 3 devalue (high) were fixed on the deploy branch only; backported to `main` with a matching lockfile.

Still outstanding whenever deployment resumes:

| # | Blocker | Note |
|---|---|---|
| 1 | Production DB empty, no schema; `payload migrate` is a no-op (no migrations dir) | needs `DB_PUSH=true` **once**, then remove |
| 2 | External SSH `b201.serverdiana.com:22` → connection refused | **auto-deploy cannot be configured**; cPanel File Manager only |
| 3 | First Super Admin not yet created | after schema + seed succeed |
| 4 | `PUBLIC_CMS_ORIGIN` / CSP `connect-src` is a placeholder host | must match the real CMS hostname exactly, or AdSense breaks silently |
| 5 | `DEPLOY_WEBHOOK_URL` unset | publishing stays a manual rebuild until set |
| 6 | No working backup (`backup-db.yml` fails daily; SSH not granted) | **no backup of any kind exists** |

**Safety constraints observed throughout:** no `git reset --hard`, no force-push, no
secret values requested or displayed, no files deleted without approval.

---

## 7. QA work queue

The audit findings in §5 stand. Ordering, with what each needs:

**1. F-01 (High) — pagination caps.** Self-contained; no owner input needed.
Highest value of the remaining set because the failure is silent and
time-based: archive URLs begin returning 404 at ~50 days of publishing.

**2. F-13 (High) — `X-Forwarded-For` trust.** **Blocked on one owner
answer:** does the DianaHost proxy append to or overwrite the inbound
`X-Forwarded-For`? The correct fix differs — "trust the last hop" if it
appends, "ignore the header, use the socket address" if the origin is
directly reachable. Everything else about the fix is already determined.

**3. F-05 (Medium)** reaction counts; **4. F-02 (Medium)** five orphaned
harnesses, including `verify-cms-sync` which the feature register already
claims as a gate; **5. F-16 (Medium)** Lighthouse automation.

**6. F-06 / F-08 / F-14 / F-03 / F-18** — all small and self-contained.

**Owner decisions:** F-07 (cookie consent — legal call first), F-17
(corrections policy page + Trade Licence/TIN/Ministry numbers).

---

## 8. Provenance

- **F-04** was fixed and committed on `main` as `b65bbd4` + `2d90a96`. All four
  branches of the new guard were counter-proven (thin build → exit 1; healthy
  build → pass; no-CMS floor → pass; unreachable CMS → exit 1).
- **Git index corruption** (54 missing blobs, repaired 2026-10-02) is recorded
  in `.sps/handoff.md`. No work was lost.
- The `main`-vs-deploy-branch comparison and the CI failure analysis were both
  re-derived from the repository and the GitHub API, not taken from the handoff
  message.
- Two further CI failures were found and fixed after this document's first
  draft (the dependency audit, then `--frozen-lockfile`); both are recorded in
  `.sps/handoff.md`.

