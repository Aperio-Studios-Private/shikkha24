# Handoff Report — Migration off DianaHost (T-18)

**Date:** 2026-10-14  
**Session:** Owner requested migration due to DianaHost unresponsiveness  
**Author:** Claude Code (agent)  
**Status:** Plan recorded, awaiting owner approval to begin Phase 0

---

## What Happened in This Session

1. **Owner reported:** DianaHost has stopped responding entirely and is not replying to support tickets. The owner now has a credit card and has activated Cloudflare R2 under `abdullahalmamunmay@gmail.com`.

2. **Owner requested:** Evaluate and recommend the best alternative solution for:
   - Migrating the CMS away from Payload (evaluated, **rejected** — no benefit, high cost)
   - Switching the database to Neon or another large free-tier option (evaluated, **Neon chosen**)
   - Using Cloudflare R2 for rotation backups and CDN while keeping DianaHost for storage only (evaluated, **partially chosen** — R2 yes, but storefront must leave DianaHost)

3. **Four research agents** were launched to verify facts live from primary vendor pages (no assumptions):
   - Payload CMS hosting + alternatives + migration path
   - Cloudflare R2 + static hosting card requirements
   - Free managed PostgreSQL options (Neon, Supabase, Turso, Aiven, etc.)
   - Domain transfer from unresponsive registrar

---

## Decisions Made

### 1. Do NOT change the CMS
- **Verdict:** Keep Payload 3.
- **Reason:** The CMS isn't the problem — the host is. Every alternative (Strapi, Directus, Keystone, Sanity) would require a full API rewrite + content-model rebuild for zero benefit. Sanity's free plan fails your needs outright (only 2 user roles).
- **Evidence:** Research agent report (a800dca92f795786a).

### 2. Database: Neon Free Postgres
- **Verdict:** Move from SQLite to **Neon free Postgres** (AWS ap-southeast-1 Singapore).
- **Why:** 1 GB free (you need 3.3 MB), no card, no time limits, sub-second wake, official Payload support.
- **Gotchas:**
  - Avoid deprecated Azure regions (inactive DBs get deleted after 90 days).
  - Run migrations against the **direct** (non-`-pooler`) connection string; runtime uses pooled.
- **Evidence:** Research agent report (a800dca92f795786a).

### 3. Static Site: Cloudflare Workers Static
- **Verdict:** Move storefront from DianaHost to **Cloudflare Workers static assets**.
- **Why:** Automatic webhook-triggered rebuilds; no cron, no manual extraction; unlimited static egress; your code already has the webhook (`lib/rebuild-trigger.ts`).
- **Gotchas:**
  - Cloudflare Pages is soft-deprecated in favor of Workers static.
  - Vercel Hobby rejected due to "personal, non-commercial only" terms (you run ads).
- **Evidence:** Research agent report (af74c7c0dc2d901f3).

### 4. CMS Host: Render Free
- **Verdict:** Move CMS from DianaHost Passenger to **Render free web service**.
- **Why:** Always-on CMS (can receive security updates), deploy actually works, no card.
- **Gotchas:**
  - ~1-minute cold start for admin panel after idle (readers unaffected).
  - Ephemeral disk — SQLite cannot live here; must use Neon Postgres.
- **Evidence:** Research agent report (a800dca92f795786a).

### 5. Media Storage: Cloudflare R2
- **Verdict:** Move media from DianaHost disk to **Cloudflare R2**.
- **Why:** Zero egress fees, owned by you, not the host; card activated under `abdullahalmamunmay@gmail.com`.
- **Gotchas:**
  - R2 **bills** (doesn't cap) on overshoot — set billing alert at $1.
  - At 2.2 MB of media, overshoot is practically impossible.
- **Evidence:** Research agent report (af74c7c0dc2d901f3). Confirmed active via `wrangler whoami`.

### 6. Domain: Transfer After 2026-11-11
- **Verdict:** Transfer `shikkha24.com` to a registrar you control **after 2026-11-11** (60-day post-creation lock).
- **Why:** Insurance. DianaHost is only a **reseller**; the real registrar is **OwnRegistrar, Inc.** (US, ICANN-accredited). If DianaHost vanishes, you lose DNS/email service but not the domain name itself — but a transfer under a deadline is stressful.
- **Recommended registrar:** **Porkbun** ($11.08 transfer includes 1-year renewal, free WHOIS privacy).
- **DNS:** Move to Cloudflare free DNS **now** (independent of transfer).
- **Email:** **Keep at DianaHost** (owner decision — unlimited free mailboxes; independent of registration).
- **Evidence:** Research agent report (af5245d0b1a27d61b).

---

## Reversed Project Decisions (Rule 13)

Two standing project decisions were **reversed by the owner in this session**:

1. **CLAUDE.md / AGENTS.md / GEMINI.md Rule 7:**  
   **OLD:** "Hard constraint: the owner has no international credit or debit card. Every service requiring a card at signup is unusable."  
   **NEW:** Owner now has a card and has activated Cloudflare R2 under `abdullahalmamunmay@gmail.com`. **Budget remains $0/month** (card is for R2 billing-fallback only).

2. **2026-09-14 Cloudflare Removal Plan:**  
   **OLD:** "No Cloudflare services at all — all data and hosting on DianaHost only."  
   **NEW:** Cloudflare is now the chosen provider for R2 (media/backups), DNS, static hosting (Workers), and CDN. This is a deliberate owner decision.

**These reversals are recorded in:**
- `.sps/tasks.md` (T-18)
- `.sps/handoff.md`
- `docs/migration-plan-2026-10-14.md`

---

## Current State

| Component | Status | Location | Notes |
|---|---|---|---|
| **Storefront** | Live, stale | DianaHost `public_html` | Manual unpack broken; T-15 symptom |
| **CMS** | Live, broken edits | DianaHost Passenger | Node 20 EOL; T-01 bug (missing `roles`) |
| **Database** | Live | DianaHost disk (SQLite) | `payload.db` = 3.3 MB |
| **Media** | Live | DianaHost disk | 2.2 MB |
| **Domain registration** | Live | OwnRegistrar (via DianaHost reseller) | Expires 2027-09-12; unlocked |
| **DNS** | Live | DianaHost nameservers | `ns1/ns2/ns3.dianadns.com` |
| **Email** | Live | DianaHost cPanel | Unlimited free mailboxes (owner wants to keep) |
| **Cloudflare** | Active | `abdullahalmamunmay@gmail.com` | R2 enabled; `wrangler whoami` confirms |

---

## Plan Summary

### Goal
Fully automatic, zero-hassle publishing: admin (non-technical) clicks Publish in CMS → live site updates instantly, with no manual steps.

### Target Architecture
- **Storefront:** Cloudflare Workers static
- **CMS:** Render free web service
- **Database:** Neon free Postgres (AWS ap-southeast-1)
- **Media:** Cloudflare R2 (`media.shikkha24.com`)
- **Backups:** Nightly Neon pg_dump → R2 (GitHub Actions)
- **DNS:** Cloudflare free
- **Domain:** Transfer to Porkbun after 2026-11-11
- **Email:** Keep at DianaHost

### Phases (Each Ends with Something Working)
1. **Phase 0 (Owner):** Get auth code + download DB/media off-host
2. **Phase 1 (Me):** Move storefront to Cloudflare + wire webhook → publishing fixed
3. **Phase 2 (Me):** Move DB to Neon + one-off migration
4. **Phase 3 (Me):** Move media to R2 + update CSP
5. **Phase 4 (Me):** Move CMS to Render → security updates unblocked
6. **Phase 5 (Me):** Set up backups + monitoring + billing alerts
7. **Phase 6 (Owner + Me):** Transfer domain + close DianaHost

### Budget
- **$0/month** (R2 card is for billing-fallback only)
- **~$11/year** for domain transfer + renewal (Porkbun)

---

## What a New Agent Needs to Know

### If You're Taking Over This Migration

1. **Read these files first:**
   - `docs/migration-plan-2026-10-14.md` — the full plan, phases, and trade-offs
   - `.sps/tasks.md` (T-18) — the task entry with detailed reasoning
   - `.sps/handoff.md` — current state and recent history

2. **The owner has confirmed:**
   - They have a credit card and have activated Cloudflare R2 under `abdullahalmamunmay@gmail.com`.
   - They want to use Cloudflare services (reversing the 2026-09-14 decision).
   - They want to keep DianaHost email (unlimited free mailboxes).
   - Budget: $0/month (card only for R2 billing-fallback).

3. **The current blocker:**
   - **Phase 0 is not started** — the owner needs to locate the EPP/auth code for `shikkha24.com` (or email OwnRegistrar for it).
   - Nothing else can start until this is done.

4. **The highest-value thing:**
   - **Phase 1 fixes publishing** — moving the storefront to Cloudflare with the webhook wired makes publish→live automatic. This is the thing the owner is actually hurting from.

5. **The domain reality:**
   - DianaHost is a **reseller**; OwnRegistrar is the real registrar.
   - Transfer lock expires **2026-11-11** (cannot start before this date).
   - Email OwnRegistrar at `abuse@ownregistrar.com` if the auth code isn't in DianaHost's panel.

6. **Commands to verify current state:**
   ```bash
   # Verify Cloudflare login
   npx wrangler whoami
   
   # Verify R2 is enabled (should list buckets or succeed)
   npx wrangler r2 bucket list
   
   # Check current DNS
   dig shikkha24.com +trace
   ```

---

## Open Questions for the Owner

1. **Who is the registrant of record for `shikkha24.com`?**
   - Check the original purchase email from DianaHost.
   - Does it list *you* (your name/email), or DianaHost/privacy service?

2. **Have you found the EPP/auth code for `shikkha24.com` in DianaHost's panel?**
   - If yes: provide it (or confirm you have it saved).
   - If no: we'll email OwnRegistrar (`abuse@ownregistrar.com`) with the ICANN-policy template.

3. **Do you want to proceed with Phase 0 now?**
   - This is the only blocker to starting the migration.

---

## How to Switch Agents

If you (the owner) are switching to a different Claude session or agent:

1. **Give the new agent this file** (` .sps/handoff-migration-2026-10-14.md`) and `docs/migration-plan-2026-10-14.md`.
2. **Tell them:**
   - "Read the handoff report and migration plan first. Do not start any work until you understand the full context."
3. **The new agent's first task:**
   - Verify Cloudflare login: `npx wrangler whoami`
   - Verify R2 is enabled: `npx wrangler r2 bucket list`
   - Confirm Phase 0 is complete (auth code + DB/media downloaded)

---

## Evidence Collected in This Session

| Check | Command | Result | Saved |
|---|---|---|---|
| Cloudflare account | `wrangler whoami` | `abdullahalmamunmay@gmail.com` (account `0e2e4a69…`) | Yes |
| R2 enabled | `wrangler r2 bucket list` | Command succeeded (no buckets yet) | Yes |
| Domain registrar | Verisign RDAP/WHOIS | OwnRegistrar, Inc. (reseller: DianaHost) | Yes |
| Domain status | Verisign RDAP | Unlocked, expires 2027-09-12 | Yes |
| 60-day lock | ICANN policy | Runs to 2026-11-11 | Yes |

---

## Files Changed in This Session

| File | Change | Commit |
|---|---|---|
| `.sps/tasks.md` | Added T-18 (migration plan) | `08217e1` |
| `.sps/handoff.md` | Updated with T-18 context | `08217e1` |
| `docs/migration-plan-2026-10-14.md` | **NEW** — Full migration plan | Pending |
| `.sps/handoff-migration-2026-10-14.md` | **NEW** — This handoff report | Pending |

---

## Next Steps

1. **Owner:** Complete Phase 0 (get auth code + download DB/media).
2. **Owner:** Answer the open questions above.
3. **Agent:** Once Phase 0 is confirmed, begin Phase 1 (move storefront to Cloudflare + wire webhook).

**Do not start any phase until the previous one is complete and verified.**

---

## Contacts

| Service | Contact | Notes |
|---|---|---|
| **OwnRegistrar (real registrar)** | abuse@ownregistrar.com | Request auth code per ICANN §5.2 |
| **Cloudflare** | support.cloudflare.com | R2/Workers/DNS support |
| **Neon** | support@neon.com | Postgres support |
| **Render** | support@render.com | CMS hosting support |
