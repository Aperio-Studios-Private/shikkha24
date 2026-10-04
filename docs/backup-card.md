# Your Backup — One Page

Everything about the backup of shikkha24.com, with nothing you do not need.

Full technical detail: [`docs/backup-and-recovery.md`](backup-and-recovery.md).
This page is the version you actually read.

---

## What is at risk, and why it matters

Every article ever published, every reader account, every uploaded image, and the newsletter
list are **all in one file on one web host**. There is no second copy anywhere.

If that host is lost — suspended, deleted, out of billing, or simply broken — **all of it goes.**
No other website of yours can bring it back. This is the single largest risk to the business.

---

## How the backup works, in one diagram

```
   Your web host (DianaHost)              GitHub
   ┌──────────────────────┐                ┌──────────────────────┐
   │  Every night 1:00am  │                │  Every night 1:00am  │
   │  a scheduled job     │   ──FTPS──▶    │  a scheduled job     │
   │  copies the whole    │   (secure,    │  checks it is real   │
   │  site into one       │    encrypted) │  and keeps a copy    │
   │  archive file        │                │                      │
   └──────────────────────┘                └──────────────────────┘
        14 days kept                          30 days kept
```

**You do nothing for this to happen.** It runs by itself.

---

## Is it working right now? — one click

1. Open **GitHub** → your **NewsPortal** repository
2. Click the **Actions** tab (left side)
3. Click **Backup database + media**

| What you see | What it means |
|---|---|
| ✅ **green tick** | Today's backup worked and was checked. Nothing to do. |
| ❌ **red X** | Something is broken. **The Action page tells you exactly what.** Send me that screenshot. |

> **Why a green tick is worth trusting:** the system does not just check that a file arrived. It
> opens the backup and confirms it is genuinely restorable — that the database is not corrupt, that
> the articles are actually in it, and that the images are there too. A backup that only *looks*
> fine is worse than no backup, because it hides the problem. **This system refuses to call a
> backup good unless it has been opened and checked.**

---

## What you have to do

### Once, to set it up — about 15 minutes

Until this is done, **there is no backup at all.** Four things, all in your web host's control
panel (the site your hosting company gave you, usually called **cPanel**):

| # | Do this | Why |
|---|---|---|
| 1 | **FTP Accounts** → create an account named anything, with its **own new password** — not your main one — pointing at the folder `shikkha24-backup` | This is the door the backup comes through. Its own password means it can never reach your other files. |
| 2 | **Terminal** → run the backup script once by hand | To prove it works *before* trusting it to run by itself. |
| 3 | **Cron Jobs** → add a daily job at **23:00** | This is the "every night" job above. |
| 4 | GitHub → **Settings → Secrets and variables → Actions** → add three entries: `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD` | Tells GitHub how to use that door. |

**Full click-by-click instructions are in [`docs/backup-and-recovery.md` §6.4](backup-and-recovery.md).**
Ask me and I will walk you through it one screen at a time.

> ⚠️ **Never write the FTP password into a document, a message, or a commit.** If it is ever
> exposed, delete that FTP account and make a new one. That is the whole recovery.

### Then, once a month — about 5 minutes

1. Actions → **Backup database + media** → click the latest green run
2. At the bottom, download the file
3. Put it somewhere else — a USB drive, or your own cloud folder

**Why bother, when GitHub already has it?** Because GitHub deletes these files after 30 days. The
copy that actually protects you is the one you have moved somewhere. Three copies in three places
is the rule that stops this from ever depending on a single thing going right.

---

## Your site is broken and you need this — do this

Written to be followed at 3am, alone, with no training.

1. **Do not panic, and do not delete anything on the host.** A broken file is evidence. Deleting it
   removes the only evidence of what went wrong.
2. Open the Actions tab and find the **most recent green backup run**.
3. Download the archive from that run.
4. **Send it to me** along with this line: *"restore from backup."* I have the restore procedure
   written and tested — it is in [`docs/backup-and-recovery.md` §5](backup-and-recovery.md).

**What you need to know:** the archive contains everything — the articles, the reader accounts,
and the images — in one file. Restoring it puts the whole site back as it was on that date.

> ⚠️ **The one thing this cannot help with** is your domain expiring or your hosting account being
> deleted on purpose. Everything else, yes.

---

## Two things that are not your problem, because they are automatic

| Worry | Why you do not need to think about it |
|---|---|
| "Will it definitely run tonight?" | If it fails, **GitHub emails you** and the run turns red. You will not find out by accident. |
| "What if it silently stopped a month ago?" | The system checks that today's backup is actually *new*. An old one is treated as a failure, not a success. |

---

## What is *not* backed up, and what that means

| Not covered | Why, and what to do |
|---|---|
| Your **domain name** | It is not on the web host — it is with whoever you registered it with. **Keep that login safe and know its renewal date.** This is the one failure that can end the site permanently. |
| Your **hosting account itself** | Backups do not bring back a deleted account. They bring back your *content* into a new one. |
| Anything you type directly into the cPanel file manager | Only changes made through the normal system get backed up. |

---

## The short version

- **Set it up once** (15 min) or there is no backup at all. → §6.4
- **Check the green tick** occasionally. That is the whole job.
- **Download once a month.** That is what makes it real.
- **Something red? Send me the screenshot.**