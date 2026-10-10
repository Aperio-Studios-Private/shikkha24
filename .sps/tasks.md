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
- **Fix — three parts, and part 3 needs an owner decision:**
  1. Generate a migration adding `users.roles` (not-null, default `reporter`).
     The existing gate cannot be trusted to produce it — see above.
  2. Apply it on the host: `PAYLOAD_BOOTSTRAP_SCHEMA=true` in
     `~/shikkha24-cms/.env`, one restart, then **remove the flag** (it is a footgun
     by design — `.env.example` says so). Requires the owner; no Terminal exists.
  3. **Bootstrap superAdmin.** With the column present, the seeded user gets
     `['reporter']`, and nothing in the API can promote them — by construction.
     Options: a data step inside the migration (an `UPDATE` setting the existing
     user to `superAdmin`), or a one-time server-side script run through
     "Run JavaScript Script". **Owner must choose** — an `UPDATE` in a migration is
     simple and durable but writes to a table by hand; a script is re-runnable.
  4. Close the gate gap: the migration check must compare the config against the
     *schema Payload would generate*, not against a snapshot that may share the
     same blind spot.
- **Separate, still open:** the admin's CSP sends `img-src 'self' data: blob:`
  without naming the CMS media host, so cross-origin media is blocked. Not
  reproduced; tracked, not folded in.

---

## 🟠 Queued

### T-02 — Fix the article-template CLS (the one red CI step)
- **Status:** `todo` · **Blocks:** CI green
- Lighthouse gate: CLS **0.0439** vs a **0.02** gate on
  `/education-news/20/demo-madrasa-new-syllabus/`. `KeyTakeaways` shifted 227px,
  the ad below it a further 90px.
- **Root cause found:** `font-display: swap` with a generic system-font fallback
  and **no metric overrides** — 0 occurrences of `size-adjust` in `fonts.css`.
  Additionally only weight **400** was preloaded, while the article H1 is bold
  (700), so the largest text on the page swapped last.
- **Fix prepared, NOT yet committed or deployed:**
  - `global.css` — a `SolaimanLipi Fallback` family carrying the font's real
    vertical metrics, read from the vendored file: ascent 95.3125%,
    descent 28.418%, line-gap 8.9844%, `size-adjust: 99.2%`.
  - `Layout.astro` — preload `solaimanlipi-700.woff2` as well.
- **Verify in CI only.** Local Lighthouse passes while CI fails; it is not
  representative. Do not trust a local green.

### T-03 — Rotate `PAYLOAD_SECRET` and confirm it took effect
- **Status:** `todo` (owner reports the value was changed; restart unconfirmed)
- Cross-linked to **T-01**.

### T-04 — Fix the staging Node app's startup file
- **Status:** `todo` · **Priority:** low
- Configured `cms/server.js`, but the bundle root holds `server.js` with no
  nested `cms/`. The app is `stopped` and is no longer gating anything — the
  production deploy succeeded on its first probe. Leave it stopped so it holds no
  process slots.

### T-05 — Deploy the frontend once CI is green
- **Status:** `blocked` by T-02
- Nothing frontend-side is pending today: `git log ff195bb..HEAD -- frontend/` is
  empty. The site currently serves the last successful live build and is **not**
  stale. Do not deploy unverified work to "catch up" — there is nothing to catch
  up to.

---

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