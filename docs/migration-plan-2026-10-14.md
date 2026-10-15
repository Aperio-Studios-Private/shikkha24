# Migration Plan — DianaHost → Cloudflare + Neon + Render

**Created:** 2026-10-14  
**Status:** Proposed, awaiting owner approval to begin Phase 0  
**Owner:** abdullahalmamunmay@gmail.com  
**Request:** DianaHost has stopped responding entirely; evaluate and recommend the best alternative solution for hosting, database, and CMS synchronization.

---

## Executive Summary

DianaHost is unresponsive to support tickets (critical ticket #0590191 open 10+ days). The site cannot automatically publish because the host's extraction mechanism is broken and cannot be fixed from outside. The goal is a **fully automatic, zero-hassle publishing flow** where an admin (non-technical) clicks Publish in the CMS and the live site updates instantly, with no manual steps.

**Target architecture (all $0/month, card only for R2 billing fallback):**

| Component | Current | Target | Why |
|---|---|---|---|
| **Storefront (static site)** | DianaHost `public_html` (manual unpack) | Cloudflare (static assets / Workers) | Automatic webhook-triggered rebuilds; no cron, no manual extraction |
| **CMS (Payload 3)** | DianaHost Passenger (Node 20, EOL) | Render free web service | Always-on CMS, can receive security updates, deploy actually works |
| **Database** | SQLite file on DianaHost disk | Neon free Postgres (AWS ap-southeast-1) | 1 GB free, no card, no time limits, sub-second wake, official Payload support |
| **Media storage** | DianaHost disk | Cloudflare R2 | Zero egress fees, owned by you, not the host; card activated under abdullahalmamunmay@gmail.com |
| **Backups** | Broken cron, never ran | Nightly Neon pg_dump → R2 (GitHub Actions) | Runs from CI, not host cron; actually works |
| **DNS** | DianaHost nameservers | Cloudflare free DNS | Decouples DNS from an unresponsive provider |
| **Domain registration** | DianaHost reseller (OwnRegistrar Inc. of record) | A registrar you control (Porkbun recommended) | Insurance — a dead reseller can't hold the domain hostage |
| **Email** | DianaHost cPanel | **KEPT at DianaHost** | Owner decision: unlimited free mailboxes; independent of registration |

**Cost:** $0/month (R2 card is for billing-fallback only; domain transfer ~$11/year includes renewal).  
**Timeline:** Phased, each phase ends with something working. Publishing is fixed in Phase 1.  
**Risk:** None — DianaHost stays live until the very end. Rollback is trivial (point DNS back).

---

## Research Verified (2026-10-14)

All facts were verified from primary vendor pages by live fetch (no assumptions).

### 1. Domain Reality Check
- **DianaHost is a reseller, NOT the registrar.** `shikkha24.com`'s registrar of record is **OwnRegistrar, Inc.** (US, ICANN-accredited, IANA ID 1250).
- **Domain status:** Unlocked, created 2026-09-12, **expires 2027-09-12**.
- **Nameservers:** `ns1/ns2/ns3.dianadns.com` (DianaHost's own DNS).
- **60-day transfer lock:** Runs to **2026-11-11** (ICANN §3.7.5). Cannot transfer until after this date.
- **ICANN Transfer Policy:** §5.2 forces the registrar to hand over the auth code within **5 calendar days** of request; §3.9.5 forbids denying a transfer over a reseller's debts to the registrar.
- **If DianaHost vanishes:** The registration survives at OwnRegistrar. The realistic risk is losing DNS/email service (if their nameservers or mail servers die), not losing the domain name itself. ICANN's De-Accredited Registrar Transition Procedure would bulk-transfer all names to a healthy registrar at no cost to you.

### 2. Cloudflare R2
- **Free tier:** 10 GB storage, 1M writes, 10M reads, **zero egress fees**.
- **Card requirement:** **REQUIRES CARD to enable** (the owner has now added a card and activated R2 under `abdullahalmamunmay@gmail.com`).
- **Billing behavior:** Does NOT cap usage; it **bills** on overshoot. At 2.2 MB of media, overshoot is practically impossible, but a billing alert will be set up.
- **Account confirmed:** `wrangler whoami` returns `abdullahalmamunmay@gmail.com` (account `0e2e4a69…`) with R2 permissions.

### 3. Neon Free Postgres
- **Free tier:** No card, no time limits, **1 GB storage per project** (you need 3.3 MB), 100 projects, 100 CU-hours/month, 5 GB egress, 6-hour PITR + 1 manual snapshot.
- **Pause behavior:** Scale-to-zero after 5 minutes idle; **wakes in under a second** (sub-100ms typical).
- **Data safety:** Limits **suspend** (never delete) when hit. Avoid deprecated Azure regions (inactive DBs there get deleted after 90 days; use AWS ap-southeast-1 Singapore).
- **Payload compatibility:** Officially supported via `@payloadcms/db-postgres`. **Critical:** Run migrations against the **direct** (non-`-pooler`) connection string; runtime traffic uses the pooled string.

### 4. Static Hosting Options
| Option | Free? | Bandwidth | Commercial OK? | Verdict |
|---|---|---|---|---|
| **Cloudflare Workers static** | Yes | Unlimited static egress | Yes | **CHOSEN** — webhook-triggered, no rebuild cap documented |
| Cloudflare Pages | Yes | Unmetered | Yes | Soft-deprecated in favor of Workers static |
| Vercel Hobby | Yes | 100 GB | **No** ("personal, non-commercial only") | Rejected — terms violation |
| Netlify Free | Yes | ~15 GB (credit-based) | Yes | Too tight for a news site |
| Render Free | Yes | 5 GB | Yes | Too tight for a news site |
| GitHub Pages | Yes (public repo) | 100 GB soft | Gray area | Rejected — repo is private |

### 5. CMS Hosting Options
| Option | Free? | Payload Support | Verdict |
|---|---|---|---|
| **Render free** | Yes | Yes (Node service) | **CHOSEN** — ephemeral disk (use Neon, not SQLite), sleeps after 15 min idle (admin-only impact) |
| Vercel Hobby | Yes | Official adapter | Rejected — terms (non-commercial only) |
| Cloudflare Workers | Yes | Unverified | Rejected — 10 ms CPU, V8-not-Node, no official Payload support |
| Fly.io | No (card after trial) | — | Rejected — card required |

### 6. CMS Alternatives (Rejected)
All alternatives would require **full API-layer rewrite** on the Astro frontend + content-model rebuild. None buy you anything over fixing the host.
- **Strapi 5:** Free self-host, but needs external Postgres on Render (SQLite wiped on redeploy). Switching cost: moderate.
- **Directus:** Same as Strapi. Switching cost: moderate-high.
- **KeystoneJS:** GraphQL-only, schema-as-code. Switching cost: high.
- **Sanity:** Free plan has **only 2 user roles** (Administrator + Viewer). Fails your reporter/editor/admin need outright. No self-host. Switching cost: highest.

**Verdict: Keep Payload 3.**

---

## Reversed Decisions (Rule 13 — Docs First)

Two standing project decisions are **reversed by the owner in this session** and must be recorded before any code is written:

1. **Rule 7 — "no international credit or debit card, ever"** → **REVERSED**  
   The owner now has a card and has activated Cloudflare R2 under `abdullahalmamunmay@gmail.com`. The card is for R2 billing-fallback only; **budget remains $0/month**.

2. **2026-09-14 — "No Cloudflare services at all"** → **REVERSED**  
   Cloudflare is now the chosen provider for: R2 (media/backups), DNS, static hosting (Workers), and CDN. This is a deliberate owner decision.

**Commit:** These reversals are recorded in `.sps/tasks.md` (T-18) and `.sps/handoff.md` before any implementation begins.

---

## Trade-offs (Honest)

| Component | Trade-off | Mitigation |
|---|---|---|
| **Render free (CMS)** | ~1-minute cold start for admin panel after idle | Readers unaffected (static site on Cloudflare); editors accept this for free |
| **Neon free** | 6-hour PITR + 1 manual snapshot | Nightly automatic pg_dump to R2 from GitHub Actions |
| **R2** | Bills (doesn't cap) on overshoot | Billing alert set; at 2.2 MB media, overshoot is practically impossible |
| **Cloudflare Workers** | No documented rebuild cap, but build cost = Actions minutes | Measure real build time; batch rebuilds if needed |
| **Email at DianaHost** | If DianaHost dies, email dies with it | Document Zoho Mail free (5 users) as fallback |

---

## Phases (One at a Time)

Each phase **ends with something working**. Nothing is "big bang." DianaHost stays live until Phase 6. Rollback = point DNS back.

### Phase 0 — Protect the Irreplaceable (Owner Action, ~10 minutes)
**Goal:** Ensure the domain and data can never be held hostage.

| Step | Action | Owner/Me | Evidence of Done |
|---|---|---|---|
| 0.1 | Locate the EPP/auth code for `shikkha24.com` in DianaHost panel | Owner | Screenshot or code text |
| 0.2 | If not found, email OwnRegistrar (`abuse@ownregistrar.com`) requesting auth code per ICANN §5.2 | Owner | Email sent confirmation |
| 0.3 | Download full copy of CMS database (`payload.db`) from cPanel File Manager | Owner | File exists locally |
| 0.4 | Download full copy of `cms/data/media/` folder from cPanel File Manager | Owner | Folder exists locally |
| 0.5 | Verify R2 is enabled on `abdullahalmamunmay@gmail.com` (already done: `wrangler whoami` confirms) | Done | Command output saved |

**Metric:** Auth code in hand + DB + media copied off-host.  
**Blocker:** None — DianaHost still works for downloads.

---

### Phase 1 — Fix Publishing (Me, ~1 day)
**Goal:** Admin clicks Publish → site updates **automatically**, with zero manual steps.

| Step | Action | Details |
|---|---|---|
| 1.1 | Create Cloudflare Workers project for the static site | `wrangler pages dev` or static Workers route; configure custom domain `shikkha24.com` |
| 1.2 | Wire the publish webhook | Point `lib/rebuild-trigger.ts` at Cloudflare's rebuild webhook URL (already built in your codebase) |
| 1.3 | Deploy the current static build to Cloudflare | First deploy; verify the site loads from Cloudflare |
| 1.4 | Test end-to-end | Admin publishes a test article in CMS → verify it appears on the live site within the rebuild time |

**Metric:** Publish in CMS → live site updates with **zero manual steps**.  
**Rollback:** Point DNS back to DianaHost.

---

### Phase 2 — Move Database to Neon (Me, ~1 day)
**Goal:** Database is on a managed Postgres with no card, no time limits, and the schema is correct from day one.

| Step | Action | Details |
|---|---|---|
| 2.1 | Create Neon project in AWS ap-southeast-1 (Singapore) | Avoid deprecated Azure regions |
| 2.2 | Create a Postgres database with connection string | Note both **direct** (for migrations) and **pooled** (for runtime) strings |
| 2.3 | Write and run one-off migration script | SQLite → Postgres: 26 articles + 64 districts + 8 categories + 6 media + users (T-01's missing `roles` column is fixed structurally) |
| 2.4 | Install `@payloadcms/db-postgres` in CMS | Replace `@payloadcms/db-sqlite` |
| 2.5 | Update CMS `.env` with Neon connection string | Use the **pooled** string for runtime |
| 2.6 | Deploy CMS to DianaHost (temporary) with new DB | Verify the CMS loads and edits work |

**Metric:** CMS connects to Neon; edits save and load; no `roles` errors.  
**Note:** CMS still runs on DianaHost temporarily — this phase only moves the database.

---

### Phase 3 — Move Media to R2 (Me, ~1 day)
**Goal:** Media is on R2, served from a custom subdomain, and uploads no longer depend on any host's disk.

| Step | Action | Details |
|---|---|---|
| 3.1 | Create R2 bucket named `shikkha24-media` | Region: auto (closest to Singapore) |
| 3.2 | Create a public-access bucket with custom domain `media.shikkha24.com` | Cloudflare will provision a certificate automatically |
| 3.3 | Upload existing media (2.2 MB) to R2 | From the local copy made in Phase 0 |
| 3.4 | Update Payload's `Media` collection to use R2 upload adapter | Configure `@payloadcms/storage-r2` or a custom upload handler |
| 3.5 | Update frontend CSP to allow `media.shikkha24.com` | Small code change in `frontend/src/lib/csp.ts` or equivalent |
| 3.6 | Test upload from CMS admin | Verify new uploads land in R2 and serve on the site |

**Metric:** Media loads from `media.shikkha24.com`; uploads work; CSP allows the new origin.

---

### Phase 4 — Move CMS to Render (Me, ~1 day)
**Goal:** CMS runs on a host where deploying actually works, so security updates can land.

| Step | Action | Details |
|---|---|---|
| 4.1 | Create a new Web Service on Render (free) | Region: Singapore (or closest) |
| 4.2 | Configure environment variables | `DATABASE_URL` (Neon pooled), `PAYLOAD_SECRET`, etc. |
| 4.3 | Deploy Payload CMS to Render | Use `payload build` + `payload start` in Render's build command |
| 4.4 | Update the rebuild webhook to point at Render | So CMS publish triggers the Cloudflare rebuild |
| 4.5 | Test end-to-end | Publish → CMS on Render saves → Cloudflare rebuilds → site updates |
| 4.6 | **Unblocks T-10** | The 3-critical Payload upgrade can finally deploy |

**Metric:** CMS runs on Render; publish flow still works; security updates can deploy.
**Note:** The admin panel will have ~1-minute cold start after idle. Readers are unaffected.

---

### Phase 5 — Backups & Monitoring (Me, ~1 day)
**Goal:** Automatic, reliable backups and uptime alerts.

| Step | Action | Details |
|---|---|---|
| 5.1 | Create GitHub Actions workflow for nightly Neon pg_dump | Runs from CI, not host cron |
| 5.2 | Upload dump to R2 with rotating schedule | Keep last 30 days |
| 5.3 | Set up free uptime monitor | e.g., UptimeRobot (free, 50 monitors) |
| 5.4 | Set R2 billing alert | In Cloudflare dashboard, alert at $1 threshold |

**Metric:** Backups exist in R2; alerts configured.

---

### Phase 6 — Transfer Domain & Close DianaHost (Owner + Me, ~1 week)
**Goal:** Domain is under your direct control; DianaHost is decommissioned.

| Step | Action | Details |
|---|---|---|
| 6.1 | **After 2026-11-11** (60-day lock expires) | Cannot start before this date |
| 6.2 | Transfer domain to a registrar you control | **Recommended: Porkbun** ($11.08 transfer includes 1-year renewal, free WHOIS privacy) |
| 6.3 | Point DNS at Cloudflare (if not already) | Nameservers: Cloudflare's pair |
| 6.4 | Verify DNS propagation | Use `dig shikkha24.com +trace` |
| 6.5 | Keep DianaHost for email only | Mailboxes stay on DianaHost; MX records set from Cloudflare DNS |
| 6.6 | Let DianaHost hosting expire naturally | Or close it when the subscription ends |

**Metric:** Domain registered under your direct account; DNS points at Cloudflare; email still works.

---

## What Stays at DianaHost

- **Email mailboxes** (owner decision: unlimited free mailboxes)  
  → These are on DianaHost's *hosting servers*, not the registration. They keep working as long as the hosting account is active and the MX records point at DianaHost.
- **Cold archive of old files** (optional)  
  → Old static builds, logs, etc. can stay as a backup until the hosting subscription ends.

---

## What Gets Retired

- The entire cPanel upload + extraction machinery (T-15, T-17) — **abandoned, not repaired**  
- The manual File Manager unpack step — **eliminated**  
- The broken cron — **eliminated**  
- The Node 20 EOL risk — **eliminated** (Render runs a supported Node version)  
- The security vulnerabilities (T-10) — **unblocked** (can finally deploy the Payload 3.90.2 upgrade)  

---

## Rollback Plan

If anything goes wrong at any phase:

1. **Phase 1–5:** Point DNS back at DianaHost (`ns1/ns2/ns3.dianadns.com`). The old site still works.
2. **Phase 2–4:** The old SQLite database and media are still on DianaHost. Revert CMS config to SQLite.
3. **Phase 6:** Transfer can be cancelled within 5 days of initiation (ICANN policy).

**No phase bricks the site permanently.**

---

## Open Questions (Need Owner Input)

1. **Who is the registrant of record for `shikkha24.com`?**  
   Check the original purchase email from DianaHost — does it list *you* (your name/email), or DianaHost/privacy service? This decides how easy the transfer is.

2. **Confirm the EPP/auth code location.**  
   Found in DianaHost panel? If not, we'll email OwnRegistrar (`abuse@ownregistrar.com`) with the ICANN-policy email template.

3. **Do you want to proceed with Phase 0 now?**  
   This is the only blocker to starting the migration.

---

## Files to Update (Rule 13 — Docs First)

- [ ] `.sps/profile.md` — hosting architecture section, CDN/deploy target, database, media storage
- [ ] `.sps/plan.md` — stack table, hosting architecture, scope amendment
- [ ] `docs/hosting-and-deployment.md` — full rewrite for new architecture
- [ ] `docs/deployment-runbook.md` — new day-to-day procedures
- [ ] `frontend/src/lib/csp.ts` (or equivalent) — add `media.shikkha24.com` to CSP img-src
- [ ] `cms/package.json` — add `@payloadcms/db-postgres`, remove `@payloadcms/db-sqlite`
- [ ] `cms/src/payload.config.ts` — switch `db` adapter to Postgres

---

## Budget Summary

| Item | Cost | Paid By |
|---|---|---|
| Cloudflare R2 | $0/month (billing-fallback card on file) | Card |
| Neon Postgres | $0/month | None |
| Cloudflare Workers/Static | $0/month | None |
| Render free | $0/month | None |
| Cloudflare DNS/CDN | $0/month | None |
| Domain transfer + renewal | ~$11/year | Card |
| **Total** | **$0/month** + ~$11/year | |

---

## Success Criteria

- [ ] Admin publishes article → live site updates **automatically** (zero manual steps)
- [ ] No single point of failure (domain, DNS, hosting, database are all on separate providers)
- [ ] All data (DB, media, backups) is under your direct control
- [ ] CMS can receive security updates (Payload 3.90.2 upgrade deploys successfully)
- [ ] Email at DianaHost continues to work
- [ ] Lighthouse performance targets unchanged (static site + CDN)

---

## Glossary (For Non-Technical Owner)

| Term | Plain English |
|---|---|
| **EPP code / Auth code** | A password for your domain that proves you own it. Needed to move it to a different registrar. |
| **DNS** | The phone book of the internet. Tells browsers where to find your website and email. |
| **Nameservers** | The specific phone book entries. Currently point at DianaHost; will point at Cloudflare. |
| **Static site** | Your website is pre-built HTML files, like a PDF. It doesn't need a server running all the time. |
| **CMS** | The admin panel where editors write articles. Needs a server (Render). |
| **Database** | Where articles, users, and settings are stored. Moving from a file on DianaHost to a managed service (Neon). |
| **Media storage** | Where images and uploads live. Moving from DianaHost disk to Cloudflare R2. |
| **Webhook** | A ping from the CMS to the site builder saying "rebuild me." |
| **Cold start** | First visitor after a quiet period waits ~1 minute for the CMS admin to wake up. Readers never notice. |
