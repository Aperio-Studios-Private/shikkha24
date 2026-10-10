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
- **Status:** `doing` · **Severity:** 🔴 production, owner-blocking
- **Reported:** 2026-10-10 — "You are not allowed to perform this action." on
  every create/edit/upload in the Payload admin. Console also shows a CSP
  violation (`img-src 'self' data: blob:`) and `403` on
  `/api/globals/site-settings`.
- **Known:** that endpoint returns **200 with valid data** from outside, so the
  403 is session-specific, not a blanket access failure.
- **Suspects, none confirmed:**
  - `PAYLOAD_SECRET` was rotated by the owner on 2026-10-10. If the app was not
    restarted afterwards the old secret is still in memory; if it *was* restarted
    every existing session is invalidated and the owner must log in again.
    **Unconfirmed which happened.**
  - The access-rule changes shipped in `5bca852` / `6653570` may be broader than
    intended. `6653570` added `serverManagedField`; a wrong match there denies
    writes.
  - The stale-file cleaner never fired (fixed in `a18816f`, see handoff), so old
    code may persist alongside the new bundle.
- **Next:** confirm with the owner whether the CMS was restarted after the
  rotation and whether they are logged in. Then read
  `cms/src/access/roles.ts` for over-broad matches.
- **Do not** close this on "the endpoint returns 200" — that proves the API is
  up, not that the owner can write.

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