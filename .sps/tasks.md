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

### T-07 — The admin CSP does not name the CMS media host
- **Status:** `todo`
- **Hypothesis:** the admin sends `img-src 'self' data: blob:`, which omits the
  media host, so cross-origin media is blocked (M20 — the same shape of defect,
  already recorded once for the allow-list).
- **Asset:** the header source that emits the admin CSP.
- **Metric:** an admin page loads its media with zero CSP violations.
- **Budget:** 2 hypotheses.
- ⚠️ Not reproduced yet. Do not fix before reproducing.

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