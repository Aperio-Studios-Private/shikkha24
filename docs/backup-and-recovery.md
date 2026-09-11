# Backup & Disaster Recovery Plan — Shikkha24

**Created:** 2026-09-11 · **Status:** S0/S12 input. **This domain had no coverage before this document.**
**Why this exists:** the entire editorial archive — every article, every education record, every reader account — lives in **one SQLite file on a shared hosting account**. Losing it ends the business. There was no backup plan at all.

---

## 1. What must be protected

| Asset | Where it lives | If lost |
|---|---|---|
| **SQLite database** | DianaHost (CMS data directory) | **Total loss of all content** — the single most critical asset |
| **Media library** | Cloudflare R2 | All images and video gone |
| **Code, config, schema** | GitHub | Recoverable — already versioned |
| **Secrets** (`.env`, API keys, OAuth secrets) | Local + GitHub Actions secrets | Recoverable only if documented separately |
| **DNS / Cloudflare config** | Cloudflare account | Painful to rebuild by hand |
| **Domain registration** | Registrar | Business-ending if it lapses |
| **Newsletter subscriber list** | Payload (self-hosted) | Legal and commercial problem |

---

## 2. The core risk

A 2 GB shared hosting account with a single SQLite file is a **single point of failure with no redundancy**. Shared hosts lose accounts to suspension, hardware failure, and billing mistakes. cPanel backups, if the vendor runs them, are not under the owner's control and are not a strategy.

**The rule: an untested backup is not a backup.** Every backup mechanism below must have a restore that has actually been performed at least once.

---

## 3. Backup tiers

| Tier | What | Where | Frequency | Retention |
|---|---|---|---|---|
| **1. Database dump** | SQLite `.dump` / file copy | **Cloudflare R2** (separate bucket from media) — off-host by construction | **Daily** | 30 daily + 12 monthly |
| **2. Media** | R2 objects | R2 versioning / lifecycle, or a periodic sync to a second bucket | Continuous (versioning) | 30 days of versions |
| **3. Code & config** | Git repository | GitHub | Every commit | Indefinite |
| **4. Secrets** | Encrypted export of `.env` and service credentials | Encrypted archive, stored offline by the owner (password manager or encrypted USB) | On change | Current + 1 previous |
| **5. Vendor backup** | cPanel's own backup tool | Vendor infrastructure | Weekly, if available | Confirm with DianaHost |
| **6. Newsletter list** | Periodic subscriber export (CSV) | R2, alongside the DB dump | Weekly | 12 weeks |

⚠️ **Open question:** does DianaHost provide account-level backups, and can they be restored on request? The vendor's PNR page does not say. **Ask them** — this is the cheapest possible safety net.

---

## 4. Targets

| Metric | Target | Why |
|---|---|---|
| **RPO** (max data loss) | **24 hours** | Daily DB dump. Acceptable for a news site; could tighten to hourly if the dump is cheap |
| **RTO** (max downtime) | **4 hours** | Time to provision, restore the DB, redeploy from git, and repoint DNS |

These are proposals — confirm they are acceptable before building.

---

## 5. Restore runbook

Written to be followed under pressure, by one person, possibly years from now.

**Scenario A — database corrupt or lost, host intact**
1. Download the most recent dump from R2
2. Stop the CMS (cPanel → stop the Node app) so nothing writes mid-restore
3. Replace the SQLite file (and delete stale `-wal` / `-shm` files)
4. Start the CMS, verify `/admin` and a sample of articles
5. Re-run a build to confirm the frontend regenerates

**Scenario B — host account lost entirely**
1. Provision a new DianaHost account (or equivalent) and note the new paths
2. Restore the SQLite DB from R2 (Scenario A, steps 1–4)
3. Redeploy the CMS build from GitHub Actions
4. Update DNS in Cloudflare to the new origin
5. Verify media still resolves from R2 (unaffected — this is why media is off-host)
6. Rebuild and redeploy the frontend to Cloudflare Pages

**Scenario C — R2 bucket lost**
1. Restore media from R2 versioning, or from the periodic second-bucket sync
2. If unrecoverable, re-upload from any local editorial copies — **this is the weakest link**; verify R2 versioning is actually enabled

**Scenario D — domain lost**
1. Restore from registrar grace period immediately — this is time-critical
2. Keep registrar credentials and renewal dates recorded offline, with auto-renew enabled

---

## 6. Automating the dump

The daily DB dump must not depend on someone remembering. Options, in order of preference:

1. **A scheduled GitHub Actions workflow** that connects over SSH and pulls a dump to R2 — reuses existing infrastructure and CI credentials, no new service, no card
2. **A cPanel cron job** that dumps to a directory, plus a sync step
3. Manual download — **only as a stopgap**

⚠️ Whatever is chosen, the dump must land **off the host**. A backup stored on the same account as the database protects against corruption but not against account loss.

⚠️ Also note: the daily dump runs through the same CI minutes budget that is already tight (see `docs/reliability.md`). Budget for it, or run it on the host via cron instead.

---

## 7. Verification

- [ ] **Perform a full restore from a real backup, into a throwaway environment, before launch.** Record the result and how long it took.
- [ ] Repeat the restore test every 6 months
- [ ] Alert if the daily dump fails or has not run in 48 hours
- [ ] Confirm R2 versioning is enabled and that deleted objects are actually recoverable

---

## 8. Open items

- [ ] **Ask DianaHost** whether account-level backups exist and can be restored on request
- [ ] Confirm the RPO/RTO targets in §4 are acceptable
- [ ] Choose the dump automation approach (§6) and confirm it fits the CI-minutes budget
- [ ] Enable R2 versioning on the media bucket
- [ ] Set up the secrets export (§3, tier 4) and store it offline
- [ ] Record registrar and Cloudflare renewal dates with auto-renew enabled
- [ ] Schedule the first restore test
