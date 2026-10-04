# Backup & Disaster Recovery Plan — Shikkha24

**Created:** 2026-09-11 · **Status:** automation **built 2026-10-04**, **not yet running**.
**Updated 2026-10-04** — the broken `ssh`/`scp` workflow was replaced with a host-cron + FTPS split
(§6). All Cloudflare services remain removed per owner decision; no R2.
**Why this exists:** the entire editorial archive — every article, every education record, every reader account — lives in **one SQLite file on a shared hosting account**. Losing it ends the business.

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
| **1. Database + media dump** | SQLite online backup (`.backup`, **never `cp`**) **+ `media/` directory**, tarred with both **at the archive root** | Host-side cPanel cron → `/home/shikkhac/shikkha24-backup/` → fetched by CI over **FTPS** → **GitHub Actions artifact** (30-day retention) + owner local download | **Daily, 19:00 UTC** | 14 days on the host + 30 days as an artifact + owner-managed longer retention |
| **2. Code & config** | Git repository | GitHub | Every commit | Indefinite |
| **3. Secrets** | Encrypted export of `.env` and service credentials | Encrypted archive, stored offline by the owner (password manager or encrypted USB) | On change | Current + 1 previous |
| **4. Vendor backup** | cPanel's own backup tool | Vendor infrastructure | Weekly, if available | Confirm with DianaHost |
| **5. Newsletter list** | Periodic subscriber export (CSV) | GitHub Actions artifact, alongside the DB dump | Weekly | 12 weeks |

⚠️ **Open question:** does DianaHost provide account-level backups, and can they be restored on request? The vendor's PNR page does not say. **Ask them** — this is the cheapest possible safety net.

⚠️ **Limitation of GitHub Actions artifacts:** artifacts **expire**, and the storage quota on a
**private** repository is not documented anywhere I could verify — `docs.github.com` returned 404
for every attempt. That is an assumption, not a fact, and it is why the workflow sets 30-day
retention and *warns* rather than asserts when the archive passes 100 MB. **Download the artifact
and keep it somewhere else.** The copy that matters is the one you have moved.

⚠️ **Retention on the host is 14 days, and that is the ceiling for "the host dies but the backups
survive."** Beyond 14 days the only copies are artifacts the owner has downloaded. There is no
second off-host store — see §8.

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

> ⚠️ **Archive layout (pinned 2026-10-04).** Every automated archive holds **`payload.db` and
> `media/` at the *root* of the tarball** — not under a `data/` prefix. `scripts/host-backup-dump.sh`
> builds it that way and `scripts/backup-verify.mjs` checks for exactly that, so an archive with a
> different layout is *rejected* rather than accepted and then restored from the wrong path.
>
> ```sh
> tar -xzf shikkha24-20261004T190000Z.tar.gz      # → ./payload.db  and ./media/
> ```
>
> A restore that points at a path that does not exist is the failure mode. If you ever change the
> dump script's layout, change `backup-verify.mjs` in the same commit or the backups stop being
> accepted.

**Scenario A — database corrupt or lost, host intact**

> ⚠️ **The `-C` flag is not optional.** The tarball holds `payload.db` and `media/` at its
> **root**. Extracting it inside `data/` without `-C` puts them at `data/payload.db` and
> `data/media` — one level too high, which is exactly where they already are, so it *looks*
> like it worked and then silently restores the *broken* database you were trying to escape.
> Always extract **into** `data/`, never into its parent.

1. **Download the artifact.** GitHub → the repo → **Actions** → *Backup database + media* →
   the newest green run → **Artifacts** → download `shikkha24-backup-<run id>` and unzip it
   locally. You should see `shikkha24-<stamp>.tar.gz` inside.
2. **Stop the CMS.** cPanel → **Setup Node.js App** → your app → **Stop**. Wait for it to go
   red. Nothing may be writing to the database while you swap it.
3. **Move the broken database aside FIRST, before extracting anything.**
   ```sh
   cd /home/shikkhac/shikkha24-cms/data
   mv -n payload.db payload.db.broken-$(date +%F)
   rm -f payload.db-wal payload.db-shm
   ```
   > ⚠️ **This step is first because of the next one.** `tar` **overwrites** whatever is
   > already there, so extracting first and moving afterwards was tested and produces this
   > exact state:
   >
   > ```
   > payload.db                    0 bytes     ← the real one was overwritten by tar, then moved away
   > payload.db.broken-2026-10-04  36 KB       ← the GOOD database, sitting in the file named "broken"
   > ```
   >
   > The CMS would then either refuse to boot, or — worse — boot against the 0-byte file and
   > come up as an **empty site with every article gone**. A 0-byte SQLite database is not a
   > detectable error: `PRAGMA integrity_check` on it returns **`ok`**. This was not reasoned
   > about; it was run.
   >
   > `-n` is *no clobber*: if `payload.db.broken-<date>` already exists, the `mv` refuses
   > rather than overwriting it, so a second run cannot destroy your one remaining copy of
   > the original.
   >
   > `rm -f payload.db-wal payload.db-shm` is not optional either. **A `-wal` left over from
   > the old database is replayed over the one you just restored and can resurrect the
   > corruption** — the site boots, `/admin` loads, and the damage is back.
4. **Now extract into `data/`:**
   ```sh
   tar -xzf /path/to/shikkha24-20261004T190000Z.tar.gz -C /home/shikkhac/shikkha24-cms/data
   ls -l payload.db && ls media | head
   ```
   Confirm `payload.db` is a few hundred KB or more and **not** 0 bytes. A 0-byte result
   means the archive was the wrong file — go back to step 1, do not continue.
5. **Start the CMS.** cPanel → **Setup Node.js App** → **Start**, wait ~30 s, then reload
   `https://cms.shikkha24.com/admin`. A login page means it booted.
   > The CMS applies its committed migrations at boot (`docs/cms-deployment.md` §3.7), so
   > restoring an older archive forward-migrates it to the current schema on first start.
   > That is expected. It also means the schema can only move *forward*, which is why the
   > archive must be extracted before the app is started, not after.
6. **Verify, then rebuild.** Check `/admin` and a sample of articles **including their
   images** — a restored database with a missing media directory looks healthy until you
   look at an article. Then re-run a frontend build (§6.3) so the public site matches.
   Only once the site is confirmed good: `rm -f payload.db.broken-*`.

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

> ## ⚠️ BUILT 2026-10-04. NOT YET RUN END TO END.
>
> The automation is written, reviewed and green: `backup-db.yml` runs nightly, the host script is
> in `scripts/host-backup-dump.sh`, the fetcher refuses anything it cannot prove restorable, and
> `pnpm verify:backup` counter-proves all of it with 47 checks.
>
> **It cannot succeed until the owner completes the four setup steps in §6.4** — an FTP account, the
> script installed on the host, a cron entry, and three GitHub Secrets. Until then there is still
> no off-host copy, and **§6.2 (the manual procedure) remains the only thing actually protecting
> the editorial archive.** Run it.

### 6.1 What replaced the broken workflow, and why it is a split

The old workflow failed **6 runs out of 6** — 2026-09-28 through 10-03, each dying in under ten
seconds. The cause was structural, not flaky: it pulled the dump with `ssh` and `scp`, and **this
host has no SSH.**

The replacement uses **FTPS** — because **port 21 is open**. An earlier revision of
`docs/hosting-and-deployment.md` recorded the open ports as "only 443, 2083 and 2087", and that
wrong note is what kept this workflow on an `ssh` transport. The port table is now corrected
there.

```
 ON THE HOST                    IN CI
 ───────────                    ─────
 cPanel cron, 19:00 UTC         .github/workflows/backup-db.yml
   └─ sqlite3 ".backup"  ──┐        ├─ 1. verify-backup.mjs  (prove the gate still gates)
      (consistent snapshot │        ├─ 2. backup-fetch.mjs  (FTPS → verify → accept)
       while serving)     │        └─ 3. upload-artifact    (30-day retention)
      tar payload.db media┘
      write latest.txt
      prune to 14 days
```

**Why it has to be a split, and not one clever job:**

- **FTP cannot run `sqlite3`.** It moves bytes. It cannot take a consistent snapshot of a database
  that is being written to — `cp`-ing a live SQLite file can capture a torn state, which is the
  precise failure a backup must not have.
- **An HTTP client cannot reach the host's filesystem.** The cPanel API can write files, but its
  file functions are text-shaped; base64-ing a multi-megabyte SQLite file is not a design to sign
  off on.
- So the host takes the snapshot and CI only carries it. Each half does the one thing it is
  actually able to do.

### 6.2 The three ways a backup can lie, and how each one is prevented

This is the part that matters. A backup job that *runs* is not evidence that the archive is
restorable — and the failure is discovered at the worst possible moment, when the site is already
down.

| How it lies | What it looks like from outside | Prevention | Where |
|---|---|---|---|
| **The host cron silently stops** | **Green runs forever.** The fetch keeps succeeding on last week's archive | **Staleness check.** An archive older than 30 h fails the run, naming cPanel's cron page. 30 h gives a day of slack for a job at 19:00 UTC | `backup-fetch.mjs` — `MAX_AGE_HOURS` |
| **The transfer truncates** | Green run, an artifact that will not open | **`PRAGMA integrity_check` + a full extract test.** Nothing is stored unless the archive extracts *and* the database passes | `backup-verify.mjs` |
| **Media is silently omitted** | Green run, a healthy-looking database and **every image gone** | **Refusal.** No `media/` — or an empty one — is a hard failure | `backup-verify.mjs` |

A fourth, quieter one: **an empty-but-valid database restores to a blank site with no error
anywhere.** That is caught too — every core table present, non-zero, with row counts reported in
the run log (`articles`, `categories`, `media`, `users` — *not* Payload's default `posts`, which
this project does not have).

> ⚠️ **What is a failure and what is only a warning.** `foreign_key_check` findings are a
> **warning, not a rejection.** The live `payload.db` has three orphaned rows in `users_sessions`
> — reader accounts deleted months ago whose sessions Payload does not cascade. The first version
> of this gate treated that as corruption and **rejected a perfectly good backup of the real
> database.** A gate that rejects every real backup is as useless as one that accepts everything.
> Corruption is what `integrity_check` catches, and that is the check that means it.

### 6.3 What each file does

| File | Side | Job |
|---|---|---|
| `scripts/host-backup-dump.sh` | host | POSIX `sh`. `sqlite3 ".backup"` (never `cp`), tars `payload.db` + `media/` **at the root**, writes `latest.txt`, prunes to 14 days, and **dies loudly** if `sqlite3` is missing, the DB is 0 bytes, or `media/` is absent |
| `scripts/backup-verify.mjs` | CI | Decides whether an archive is worth keeping. `integrity_check`, core tables, row counts, media presence. Uses **`node:sqlite`** — no install step, no shell quoting, no version skew |
| `scripts/backup-fetch.mjs` | CI | FTPS fetch. Writes a **`.netrc` mode 0600** in a temp dir (the password is never in `argv`, where `ps` would show it) and deletes it in a `finally` either way. Staleness check. Strict filename pattern — `latest.txt` cannot inject a path |
| `scripts/verify-backup.mjs` | CI + local | **47 checks** that counter-prove the above. Run `pnpm verify:backup` |
| `.github/workflows/backup-db.yml` | CI | Nightly at 19:00 UTC (01:00 Dhaka). Runs the harness first, then the fetch, then stores the artifact |

### 6.4 ⚠️ SETUP — the owner must do this once, before anything works

1. **cPanel → FTP Accounts →** create an account whose Directory is
   `/home/shikkhac/shikkha24-backup`. Give it a **dedicated password — not the main account
   password.** This credential's only job is to read backups; it must never be able to reach
   `.env`. No privileges are needed.
2. **Put the script on the host.**
   - cPanel → **File Manager** → open **`/home/shikkhac`** → **+ Folder** → name it `bin`.
   - With `bin` open, click **Upload** and upload `scripts/host-backup-dump.sh` from this
     repo. It will land as `host-backup-dump.sh`; rename it to **`shikkha24-backup-dump.sh`**.
   - cPanel → **Terminal**:
     ```sh
     mkdir -p ~/bin ~/shikkha24-backup
     chmod +x ~/bin/shikkha24-backup-dump.sh
     ~/bin/shikkha24-backup-dump.sh
     ```
   ⚠️ **There is deliberately no `cp` line to paste.** There is no SSH to this host, so the
   file has to arrive through File Manager, and a `cp` left here as a comment is the kind of
   instruction that gets pasted, appears to run, and silently does nothing.
   ⚠️ **Run it by hand and read the output.** A good run ends with
   `done — 1 archive(s) retained in …`. If it fails here it will fail 30 times a month,
   silently — except that the 30-hour staleness check now turns that silence into a red run.
   If it reports that `sqlite3` is not installed, that is the one dependency it cannot work
   around: installing it (CloudLinux: `yum install sqlite`) is the fix, **not** switching to
   `cp`, which can capture a torn database.
3. **cPanel → Cron Jobs →** once daily. **⚠️ The hour you type is SERVER-LOCAL time, and this
   account is on Asia/Dhaka (UTC+6)** — measured, not assumed: the host's FTP banner reported
   "Local time is now 18:19" at 12:19 UTC. Type **`23:00`**:

   ```
   Minutes   Hour   Day   Month   Weekday   Command
   0         23     *     *       *         /bin/sh /home/shikkhac/bin/shikkha24-backup-dump.sh
   ```

   That is 17:00 UTC, two hours before the 19:00 UTC GitHub fetch. **The order matters:** if the
   dump runs *after* the fetch, CI picks up yesterday's archive — which still passes the 30-hour
   staleness check, so **nothing goes red and you quietly lose a day of freshness every cycle.**

   The dump script prints both clocks on its first line, so a wrong schedule is visible in the
   output rather than something to work out later.
4. **GitHub → Settings → Secrets and variables → Actions → Secrets:** `FTP_HOST`, `FTP_USER`,
   `FTP_PASSWORD`.

> ⚠️ **Never put `FTP_PASSWORD` in a commit, an issue, or chat.** If it is ever exposed, delete the
> FTP account in cPanel and create a new one.

### 6.5 The manual procedure — still the only working backup today

Run in the cPanel **Terminal** (a shell *inside* cPanel — not SSH). Until §6.4 is done, **this is
what protects the archive**:

```sh
~/bin/shikkha24-backup-dump.sh && ls -lh ~/shikkha24-backup/
```

then download `/home/shikkhac/shikkha24-backup/shikkha24-*.tar.gz` through **cPanel File Manager**
(or FTP) to a machine that is not the host, and put a copy somewhere else. ⚠️ A backup left only
on the host is not a backup.

⚠️ The dump must include **`media/`, not just the SQLite file.** Media moved to the host disk in S9
and is now as critical as the database. A dump that only grabs `payload.db` leaves every gallery
image behind if the host is lost.

⚠️ **The database is `data/payload.db` — not `data/db/payload.db`.** Earlier revisions of this
document said `data/db/`. A restore against the wrong path fails silently at the worst possible
moment, so check the path against `DATABASE_URI` before trusting any runbook — including this one.

---

## 7. Verification

Two different things are verified here, and conflating them is how a backup system ends up
trusting a check that stopped checking.

**7.1 — Does the *code* still catch a bad archive?** ✅ Done, and re-run in CI on every backup
job, because this job's entire output is a decision made by `backup-verify.mjs`. A gate that
quietly stopped rejecting bad input would make a week of green runs mean nothing.

```sh
pnpm verify:backup     # 47 checks
```

Every check is proved against the specific defect it claims to catch, using real SQLite files
rather than mocks — truncated transfer, corrupted pages, missing DB, 0-byte DB, no media, a
perfectly-shaped but entirely empty database, **another project's database**, and the archived
orphaned-session case that must *warn* rather than reject. It costs seconds and needs no `pnpm
install`: these scripts have no dependencies.

⚠️ *The counter-proving rule* (`.sps/mistakes.md`): a check that has never been seen to fail is not
evidence. Each of these was first run against a deliberately broken fixture and watched fail.

**7.2 — Does the *system* still work?** 🔴 None of this has been run yet.

- [ ] 🔴 **Complete the §6.4 setup.** Until then there is no off-host copy of the editorial
      archive at all. **Run §6.5 manually today.**
- [ ] 🔴 **Watch one real run of `backup-db.yml` end to end** and confirm the artifact appears,
      with row counts for `articles` / `categories` / `media` / `users` in the log. A green first
      run is the moment to notice a wrong FTP host or a jailed-to-the-wrong-directory account.
- [ ] 🔴 **Perform a full restore from a real backup into a throwaway environment** — both the
      database AND `media/`. Record the result and how long it took. ⚠️ **This has never been
      run, and the site is already live**, so it is overdue rather than a pre-launch check.
- [ ] **Download the artifact off GitHub.** A copy that has not been moved is not off-site.
- [ ] Repeat the restore test every 6 months
- [x] ~~Verify the archive includes `media/` alongside the SQLite file~~ — **enforced, not
      checked.** `backup-verify.mjs` refuses an archive with no media, so this can no longer be
      forgotten: a backup that silently omits media is worse than no backup because it hides the
      gap.
- [x] ~~Alert if the daily dump fails or has not run~~ — **built.** GitHub alerts on a failed run;
      the 30-hour staleness check covers the "did not run" case, which a failure alert cannot.

---

## 8. Open items

- [ ] 🔴 **Owner setup (§6.4) — 4 steps.** Until these are done the backup cannot succeed.
- [ ] 🔴 **First real restore test** (§7.2)
- [ ] ⚠️ **There is still only ONE off-host store, and it is GitHub Actions artifacts**, which
      expire and whose private-repo quota I could not verify. Two copies in two places, one of
      which is not a GitHub artifact. Not solvable within the budget guard (rule 7) without a
      free service that does not need a card — worth revisiting, not worth pretending is handled.
- [ ] **Ask DianaHost** whether account-level backups exist and can be restored on request
- [ ] Confirm the RPO/RTO targets in §4 are acceptable — the 24 h RPO is set by the host cron
      interval, so a 6-hourly cron would need a matching CI change
- [ ] Set up the secrets export (§3, tier 3) and store it offline
- [ ] Record registrar renewal dates with auto-renew enabled
- [ ] **Confirm the private-repo artifact quota in the repository's own settings** — the workflow
      warns above 100 MB but does not know the real ceiling
- [ ] **Record an unverified assumption while it is still cheap to check:** that a private
      repository's artifact quota accommodates a growing media library
