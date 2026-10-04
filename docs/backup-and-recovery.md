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

> 🔴 **THERE IS NO WORKING AUTOMATED BACKUP. This is the highest operational risk in the
> project.** `.github/workflows/backup-db.yml` has failed **6 runs out of 6** — 2026-09-28,
> 09-29, 09-30, 10-01, 10-02, 10-03 — every run, each dying in under 10 seconds. The cause is
> structural, not flaky: the workflow pulls the dump with `ssh` and `scp`, and **this host has no
> SSH.** It was written before SSH access was refused.
>
> The site is live. **There is currently no off-host copy of the editorial archive.** If the
> DianaHost account is lost, every article, every reader account and every uploaded image goes
> with it. Treat a manual dump (§6.2) as mandatory until §6.3 is working.

### 6.1 Why the obvious approaches do not work here

The original list, annotated with what actually happened:

1. ~~**A scheduled GitHub Actions workflow that connects over SSH**~~ — ❌ **this is what exists, and
   it fails every time.** No SSH on this host.
2. **A cPanel cron job that dumps locally** — ✅ *would* work, but the dump lands **on the same
   account as the database**, so it protects against corruption and against a bad migration, but
   **not** against account loss. Still worth doing as a second layer.
3. **Manual download** — ✅ the only method that works today. See §6.2.
4. **Have the CMS push the dump off-host itself** — the CMS runs *on* the host, can read
   `data/`, and can make outbound HTTPS calls. It could `POST` a `tar` of `data/` to a private
   GitHub repository using a token in its environment. This needs no SSH, no card and no paid
   service, and is the planned fix. **Not implemented.**

### 6.2 The manual procedure that works today

Run in the cPanel **Terminal** (a shell *inside* cPanel — not SSH):

```sh
cd ~/shikkha24-cms && sqlite3 data/payload.db ".backup /tmp/prepurge-$(date +%F).db" && tar -czf /tmp/shikkha24-data-$(date +%F).tar.gz data/payload.db data/media/ && ls -lh /tmp/shikkha24-data-*.tar.gz
```

Then download `/tmp/shikkha24-data-<date>.tar.gz` through **cPanel File Manager** to a machine
that is not the host, and put a copy somewhere else. ⚠️ A backup left only on the host is not a
backup.

⚠️ The dump must include **`data/media/`, not just the SQLite file.** Media moved to the host disk
in S9 and is now as critical as the database. A dump that only grabs `payload.db` leaves every
gallery image behind if the host is lost.

⚠️ **The database is `data/payload.db` — not `data/db/payload.db`.** Earlier revisions of this
document said `data/db/`. A restore against the wrong path fails silently at the worst possible
moment, so check the path against `DATABASE_URI` before trusting any runbook — including this one.

### 6.3 What to do about it

- [ ] **Immediate:** run §6.2 and get at least one archive off the host, outside the account
- [ ] Implement the CMS-pushes-the-dump approach (§6.1 option 4) — no SSH, no card
- [ ] Add a cPanel cron job doing the local dump, as a second layer
- [ ] Alert if the daily dump fails or has not run in 48 hours
- [ ] Ask DianaHost whether account-level backups exist and can be restored on request

---

## 7. Verification

- [ ] 🔴 **Obtain at least one real off-host backup.** There is currently none, so there is
      nothing to restore from.
- [ ] **Perform a full restore from a real backup, into a throwaway environment.** This must include
      both the SQLite database AND the `data/media/` directory — record the result and how long it
      took. ⚠️ **This has never been run, and the site is already live**, so it is now overdue rather
      than a pre-launch check.
- [ ] Repeat the restore test every 6 months
- [ ] Alert if the daily dump fails or has not run in 48 hours
- [ ] **Verify the archive includes `data/media/` files, not just the SQLite file** — a backup that
      silently omits media is worse than no backup because it hides the gap

---

## 8. Open items

- [ ] 🔴 **Fix the backup.** `backup-db.yml` has never succeeded. See §6.3
- [ ] **Ask DianaHost** whether account-level backups exist and can be restored on request
- [ ] Confirm the RPO/RTO targets in §4 are acceptable
- [ ] **Ensure every dump includes `data/media/` alongside the SQLite file** — the dump must `tar`
      both, not just the database
- [ ] Set up the secrets export (§3, tier 3) and store it offline
- [ ] Record registrar renewal dates with auto-renew enabled
- [ ] Schedule the first restore test
