# Backup & Disaster Recovery Plan — Shikkha24

**Created:** 2026-09-11 · **Status:** S0/S12 input. **Updated 2026-09-14** — all Cloudflare services removed per owner decision. No R2. Backups to GitHub Actions artifacts + owner local download.
**Why this exists:** the entire editorial archive — every article, every education record, every reader account — lives in **one SQLite file on a shared hosting account**. Losing it ends the business. There was no backup plan at all.

---

## 1. What must be protected

| Asset | Where it lives | If lost |
|---|---|---|
| **SQLite database** | DianaHost (CMS `data/payload.db`) | **Total loss of all content** — the single most critical asset |
| **Media library** | DianaHost (CMS data directory: `data/media/`) | All images lost — no article or gallery has a picture |
| **Code, config, schema** | GitHub | Recoverable — already versioned |
| **Secrets** (`.env`, API keys, OAuth secrets) | Local + GitHub Actions secrets | Recoverable only if documented separately |
| **DNS config** | DianaHost / registrar | Painful to rebuild by hand |
| **Domain registration** | Registrar | Business-ending if it lapses |
| **Newsletter subscriber list** | Payload (self-hosted) | Legal and commercial problem |

---

## 2. The core risk

A 2 GB shared hosting account with a single SQLite file **and the entire media library on the same disk** is a **single point of failure with no redundancy**. Shared hosts lose accounts to suspension, hardware failure, and billing mistakes. cPanel backups, if the vendor runs them, are not under the owner's control and are not a strategy.

**The rule: an untested backup is not a backup.** Every backup mechanism below must have a restore that has actually been performed at least once.

---

## 3. Backup tiers

| Tier | What | Where | Frequency | Retention |
|---|---|---|---|---|
| **1. Database + media dump** | SQLite `.dump` / file copy **+ `data/media/` directory** | **GitHub Actions artifact** (7-day retention) + owner local download | **Daily** | 7 daily (artifact) + owner-managed longer retention |
| **2. Code & config** | Git repository | GitHub | Every commit | Indefinite |
| **3. Secrets** | Encrypted export of `.env` and service credentials | Encrypted archive, stored offline by the owner (password manager or encrypted USB) | On change | Current + 1 previous |
| **4. Vendor backup** | cPanel's own backup tool | Vendor infrastructure | Weekly, if available | Confirm with DianaHost |
| **5. Newsletter list** | Periodic subscriber export (CSV) | GitHub Actions artifact, alongside the DB dump | Weekly | 12 weeks |

⚠️ **Open question:** does DianaHost provide account-level backups, and can they be restored on request? The vendor's PNR page does not say. **Ask them** — this is the cheapest possible safety net.

⚠️ **Limitation of GitHub Actions artifacts:** free-tier artifacts have a 500 MB limit and 7-day retention. The SQLite DB + media tar must stay under 500 MB. If media grows past ~400 MB, the tar must split or exclude media (DB-only backup). The owner must download artifacts to local storage for longer retention.

---

## 4. Targets

| Metric | Target | Why |
|---|---|---|
| **RPO** (max data loss) | **24 hours** | Daily dump of SQLite + media. Acceptable for a news site; could tighten to hourly if the dump is cheap |
| **RTO** (max downtime) | **4 hours** | Time to provision, restore the DB, redeploy from git, and repoint DNS |

These are proposals — confirm they are acceptable before building.

---

## 5. Restore runbook

Written to be followed under pressure, by one person, possibly years from now.

**Scenario A — database corrupt or lost, host intact**
1. Download the most recent backup artifact from GitHub Actions (contains both the SQLite file and `data/media/`)
2. Stop the CMS (cPanel → stop the Node app) so nothing writes mid-restore
3. Replace the SQLite file (and delete stale `-wal` / `-shm` files)
4. If the media directory was also lost, restore `data/media/` from the archive
5. Start the CMS, verify `/admin` and a sample of articles (including their images)
6. Re-run a build to confirm the frontend regenerates

**Scenario B — host account lost entirely**
1. Provision a new DianaHost account (or equivalent) and note the new paths
2. Restore the SQLite DB from the backup artifact (Scenario A, steps 1–4)
3. Restore the `data/media/` directory from the backup artifact
4. Redeploy the CMS build from GitHub Actions
5. Update DNS to point at the new origin
6. Verify media files resolve correctly
7. Rebuild and redeploy the frontend to the new `public_html`

**Scenario C — media directory lost (host intact)**
1. Restore `data/media/` from the daily backup artifact
2. If the most recent backup is stale, any editorial copies on local machines fill gaps — **this is the weakest link**; verify the daily dump actually includes the media directory, not just the SQLite file

**Scenario D — domain lost**
1. Restore from registrar grace period immediately — this is time-critical
2. Keep registrar credentials and renewal dates recorded offline, with auto-renew enabled

---

## 6. Automating the dump

The daily DB dump must not depend on someone remembering. Options, in order of preference:

1. **A scheduled GitHub Actions workflow** that connects over SSH and pulls a dump, storing it as a workflow artifact — reuses existing infrastructure and CI credentials, no new service, no card
2. **A cPanel cron job** that dumps to a directory, plus a sync step
3. Manual download — **only as a stopgap**

⚠️ Whatever is chosen, the dump must land **off the host**. A backup stored on the same account as the database protects against corruption but not against account loss. GitHub Actions artifacts qualify as off-host (they live on GitHub's infrastructure).

⚠️ **The backup must include `data/media/`, not just the SQLite file.** Media moved to the host disk in S9 — the media directory is now as critical as the database. A dump that only grabs the SQLite file leaves every article and gallery image behind if the host is lost. The daily backup `tar`s both `data/payload.db` and `data/media/` into one archive (`.github/workflows/backup-db.yml`).

⚠️ **The database is `data/payload.db` — not `data/db/payload.db`.** Earlier revisions of this document said `data/db/`; the CI backup workflow, `cms/.env.example` and the real tree all use `data/payload.db`. A restore performed against the wrong path fails silently at the worst possible moment, so check the path against `DATABASE_URI` before trusting any runbook — including this one.

⚠️ Also note: the daily dump runs through the same CI minutes budget that is already tight (see `docs/reliability.md`). Budget for it, or run it on the host via cron instead.

---

## 7. Verification

- [ ] **Perform a full restore from a real backup, into a throwaway environment, before launch.** This must include both the SQLite database AND the `data/media/` directory — record the result and how long it took.
- [ ] Repeat the restore test every 6 months
- [ ] Alert if the daily dump fails or has not run in 48 hours
- [ ] **Verify the daily backup archive includes `data/media/` files, not just the SQLite file** — a backup that silently omits media is worse than no backup because it hides the gap

---

## 8. Open items

- [ ] **Ask DianaHost** whether account-level backups exist and can be restored on request
- [ ] Confirm the RPO/RTO targets in §4 are acceptable
- [ ] Choose the dump automation approach (§6) and confirm it fits the CI-minutes budget
- [ ] **Ensure the daily backup includes `data/media/` alongside the SQLite file** — the dump script must `tar` or `rsync` both, not just the database
- [ ] Set up the secrets export (§3, tier 3) and store it offline
- [ ] Record registrar renewal dates with auto-renew enabled
- [ ] Schedule the first restore test
