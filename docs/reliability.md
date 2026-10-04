# Reliability, Failure Handling & Overload Plan — Shikkha24

**Created:** 2026-09-11 · **Status:** S0/S12 input. **Crash handling, overload management and monitoring had no coverage before this document.**
**Why this exists:** the project had no analysis of what breaks, in what order, or what to do about it.

---

## 1. Architecture recap (needed to reason about failure)

| Component | Runs where | Failure impact on readers |
|---|---|---|
| Astro static site | **DianaHost `public_html`** (Apache) | Site down |
| Media | **DianaHost disk** (`data/media/`) | Images broken — and if the host is down, the CMS is down too |
| Payload CMS + admin | **DianaHost 2 GB shared host** | **Readers unaffected** — only publishing stops |
| Build pipeline | **GitHub Actions** | New content cannot be published |
| Newsletter delivery | Free-tier ESP | Newsletter fails |

**The most important structural fact:** because the frontend is static HTML on disk, **a CMS outage does not take the site down.** Apache serves the pre-built files without needing Node.js. Editorial can keep publishing only if the CMS is up, but readers keep reading. This is the single biggest reliability win in the architecture and it should be preserved — never move reader-facing rendering onto the shared host.

---

## 2. Failure mode analysis

Ranked by realistic likelihood × impact.

| # | Failure | Impact | Likelihood | Detection | Mitigation |
|---|---|---|---|---|---|
| 1 | **Passenger kills the idle Node process** (common on shared hosting) | CMS offline; publishing stops | **High** | Uptime monitor on `/admin` | Auto-restart via cPanel; accept a cold-start delay; document the manual restart step |
| 2 | **CI minutes exhausted** (2,000/month, private repo) | No new content published | **Medium** — depends on measured build time | Actions quota warning | Adaptive batching; or public repo for unlimited minutes. See `docs/hosting-and-deployment.md` |
| 2b | ~~Cloudflare Pages 500 builds/month exhausted~~ | ~~No new deployments~~ | **Removed 2026-09-14.** No Cloudflare Pages. |
| 2c | ~~Cloudflare Pages 20,000-file ceiling reached~~ | ~~Cannot deploy new pages~~ | **Removed 2026-09-14.** No Cloudflare Pages file ceiling. DianaHost inode quota is the new ceiling (ask support). |
| 2d | **Node.js runtime version unverified** | *If* the host runs EOL Node 20, unpatched vulnerabilities in the CMS runtime | **Standing** | Not detectable by monitoring | Run `node -v` in the cPanel Terminal — see `docs/security.md` §3. The evidence now points to **Node 24**, which would close this entirely |
| 2e | **No working off-host backup** | The entire editorial archive is unrecoverable if the host is lost | **Critical — live** | ⚠️ `backup-db.yml` has failed **6 runs out of 6** (2026-09-28 → 2026-10-03), every run, because it uses SSH | **Do not rely on any automated backup today.** Manual `sqlite3 .backup` to off-host storage is the only working method. See `docs/backup-and-recovery.md` |
| 3 | **2 GB storage full** | Uploads fail; account may be suspended | **High** over months | Storage alert at 80% | Media is on host disk now (R2 descoped in S9) — monitor disk usage; media cleanup keeps only WebP |
| 4 | **Payload 3.89.0 regression** (pinned one day after release) | Varies | Medium | Smoke test after deploy | S0 hold-vs-pin decision; pin and upgrade deliberately |
| 5 | **SQLite lock contention** during simultaneous publishes | Individual publish failures | Medium | Editor reports; logs | WAL mode (validated at S0); serialise heavy writes |
| 6 | **Host disk I/O degraded or media directory lost** | Broken images; new uploads fail | Low | Image 404 rate; upload errors | Daily off-host backup includes `data/media/` (see `docs/backup-and-recovery.md`); browser cache holds previously-fetched media |
| 7 | **Free-tier ESP down or rate-limited** | Newsletter fails; transactional email fails | Medium | Bounce/failure logs | cPanel SMTP as documented fallback |
| 8 | **Viral traffic spike** | Origin overload possible (no CDN) | Medium | Traffic analytics | See §5 — static HTML mitigates, but origin bandwidth can be consumed |
| 9 | **Apache misconfiguration** | Site-wide outage | Low | Immediate | Fix `.htaccess` and redeploy via CI |
| 10 | **200 GB origin bandwidth exceeded** | Throttling | Medium (no CDN to absorb) | Bandwidth alert | Monitor via cPanel; alert at 80% |
| 11 | **DianaHost account suspension** | CMS offline | Low | Uptime monitor | Keep the account in good standing; keep an export of the SQLite DB |
| 12 | **Domain or DNS loss** | Total outage | Very low | Immediate | Keep registrar credentials recoverable; document renewal dates |

---

## 3. Error handling and error pages

**Nothing existed here.** Required:

| Case | Behaviour |
|---|---|
| **404** | Branded Bengali page, search box, links to the 8 categories and the education hubs. **Never a bare server default.** |
| **500 / build failure** | Static site: the last good deployment stays live. Nothing replaces `public_html` unless someone deliberately uploads a new zip, so a failed build cannot take the site down. |
| **CMS unavailable** | Editors see a clear error; readers unaffected. |
| **Widget/data failure** | Hide the widget or show the last cached value. Never render a broken box. |
| **Image failure** | Serve a branded placeholder at the correct dimensions — **preserve layout, never shift** (CLS). |
| **JS disabled / failed** | The site must remain fully readable — static HTML, progressive enhancement only. |
| **Offline** | Not required. No service worker needed for a news site unless push notifications are added (S9). |

---

## 4. Graceful degradation, per feature

| Feature | If it fails |
|---|---|
| Ads | Collapse the reserved container after a timeout — no empty gap, no layout shift |
| Comments | Hide the section entirely |
| Search (Pagefind) | Hide the search UI; category browsing still works |
| Weather / prayer times | Hide the widget (values are baked at build time, so they rarely fail) |
| Live blog | Fall back to a static list of entries |
| Quiz / polls | Hide; do not break the article |
| Newsletter signup | Show a mailto fallback or a clear error |

---

## 5. Capacity and overload

### What the stack can actually take

- **Reader traffic: bounded by the 200 GB/month origin bandwidth cap.** With no CDN, every request hits the origin. Static HTML is small (~50 KB/page), so moderate traffic (~100K pageviews/month) consumes ~5 GB of HTML bandwidth. Media is the real consumer (~100 KB/image × 5/article × 100K views = ~50 GB). A result-day spike could add 20–30 GB in a day. Browser caching (`Cache-Control` via `.htaccess`) reduces repeat-visit bandwidth.
- **The real bottlenecks are editorial, not reader-facing:**
  1. **Publishing throughput** — bounded by **one** quota: GitHub Actions (2,000 min/month). Full detail in `docs/hosting-and-deployment.md`.
  2. **Storage** — 2 GB on the host, shared by the app, the SQLite database, **and the media library** (media moved to host disk in S9 — R2 was descoped due to card-on-file overage risk). This is the tightest constraint: WebP conversion keeps image sizes small, but the directory grows with every article. A daily off-host backup of `data/media/` (see `docs/backup-and-recovery.md`) is the safety net; a host-disk usage alert (via DianaHost support) is the early warning.
  3. **Simultaneous editors** — SQLite WAL, validated at S0 for 5+ concurrent writers.
  4. **Runtime patch level** — the host's Node version is currently **unverified**; evidence points to 24. See `docs/security.md` §3.
- **The CMS origin sees only editor traffic.** A reader spike does not touch it.

### Traffic spike playbook

On a viral day (a result publication, an admission circular):

1. Confirm Apache is serving cached assets (check `.htaccess` Cache-Control headers)
2. **Do not** increase build frequency — batch harder; a spike is when CI minutes vanish
3. If the CMS is under load, pause non-essential editorial work
4. If a heavy feature is misbehaving, disable it via a **feature flag** rather than redeploying
5. Watch storage and bandwidth, not CPU

**Action item:** build a small **feature-flag mechanism** so heavy or fragile features (live blog, widgets, comments) can be switched off without a code change. This is an S0/S8 design requirement, not a nice-to-have.

---

## 6. Monitoring and alerting

**Nothing existed here.** Free options only — the owner has no card, so **every tool must be verified as card-free before adoption.**

### Recommended: UptimeRobot (free, no card required)

Researched 2026-09-13 against the three leading free uptime monitors:

| Service | Free monitors | Check interval | Card required? | Alert channels |
|---|---|---|---|---|
| **UptimeRobot** | **50** | 5 min | **No** — explicitly stated on homepage | Email, SMS, Voice, Push, Telegram, Slack, Discord, Webhooks |
| Better Stack | 10 | 3 min | Not explicitly stated | Email, SMS, Slack, Teams, Push |
| HetrixTools | 15 | 1 min | Not explicitly stated | Email, SMS, Phone, Telegram, Slack, Discord, Webhooks |

**UptimeRobot is the recommendation.** It explicitly states "No credit card required" on the signup page, offers 50 free monitors (the project needs 2), 5-minute checks are adequate for a news portal where the CMS going down for 5 minutes is not reader-visible (the frontend is static HTML on disk), and email alerts are the primary channel the owner will actually check. The 20+ integrations include Telegram and webhooks for future expansion.

**Setup (owner action, ~5 minutes):**
1. Sign up at `dashboard.uptimerobot.com/sign-up/` (email only, no card)
2. Create monitor 1: HTTP(S) → `https://shikkha24.com` — homepage up
3. Create monitor 2: HTTP(S) → `https://cms.shikkha24.com/admin` — CMS up
4. Configure alert contact: email (primary); Telegram (if the owner uses it)
5. Set 2-consecutive-failure threshold (UptimeRobot confirms before alerting)

**What this covers and what it does not:**

| What to watch | How | Alert threshold |
|---|---|---|
| Site up (frontend) | UptimeRobot monitor on the homepage | 2 consecutive failures (10 min) |
| CMS up | UptimeRobot monitor on `/admin` | 2 consecutive failures (10 min) |
| Build failures | GitHub Actions notifications | Any failed run |
| CI minutes | GitHub Actions quota | 80% of monthly quota |
| Host storage (incl. media) | cPanel / manual check | 80% of 2 GB |
| Origin bandwidth | DianaHost cPanel | 80% of 200 GB |
| ~~R2 usage~~ | ~~Cloudflare dashboard~~ | R2 removed 2026-09-14. No Cloudflare R2. |
| Error rate | Apache access logs (cPanel) | Spike over baseline |
| Domain/cert expiry | UptimeRobot (domain + SSL monitoring, free tier) | 30 days before |

**Honest gap:** there is no error-tracking tool (Sentry-style) selected. UptimeRobot covers uptime and domain/SSL expiry. No analytics tool replaces Cloudflare Web Analytics (removed 2026-09-14). For application error tracking, the fallback is manual CMS log review and Apache access logs via cPanel — document this as an accepted limitation rather than pretending monitoring is complete. If a card-free Sentry alternative emerges, revisit.

**Owner note:** with a single operator, alerting must be to a channel that is actually checked. An email inbox that is read daily is better than a Slack channel that is not. A dashboard nobody opens is not monitoring.

---

## 7. Incident response (single-operator playbook)

1. **Detect** — alert fires, or a reader/editor reports it
2. **Assess** — is the reader-facing site affected, or only the CMS? (Usually only the CMS.)
3. **Mitigate before diagnosing** — if the site is down, roll back first, investigate after
4. **Roll back** — ⚠️ **there is no automatic redeploy.** `git revert` does nothing to production here: `deploy.yml` cannot reach the host (no SSH). Roll back by **rebuilding from the previous commit and re-uploading the zip** — `git checkout <last-good-sha> && pnpm --filter frontend build`, then `docs/deployment-runbook.md` §2.1. For a bad `.htaccess`, fix it directly in cPanel File Manager.
5. **Communicate** — if readers are affected, post a short Bengali notice
6. **Record** — write it into `.sps/mistakes.md` with the root cause and the prevention
7. **Fix forward** — then restore the feature

**Pre-requisites to establish at S0:** know the rollback path, have the CMS restart step written down (see §7.1), keep credentials recoverable offline.

### 7.1 CMS restart procedure (DianaHost cPanel + Phusion Passenger)

DianaHost runs the CMS as a Node.js application behind Phusion Passenger via cPanel. Passenger kills idle processes — the most common cause of CMS unavailability. The reader-facing site is unaffected (it is static HTML served by Apache from `public_html`); only the admin and publishing are down.

**When to restart:**
- UptimeRobot reports `/admin` is down (2 consecutive failures = 10 min)
- An editor reports they cannot log in or the admin is very slow
- After deploying a new CMS bundle (Passenger may need a restart to pick it up)

**Restart steps:**
1. Log into cPanel (`https://<diana-host>:2083` — bookmark this URL)
2. Navigate to **Software → Setup Node.js App** (or **Application Manager** — the exact label varies by cPanel version)
3. Find the Shikkha24 CMS application in the list
4. Click **Restart** (not "Stop" — a stop leaves it down until you start it again)
5. Wait 10–30 seconds for Passenger to spin up the Node process
6. Verify: open `https://cms.shikkha24.com/admin` in a browser — the Payload login page should load
7. If it does not load within 60 seconds, check the application logs (cPanel → **Terminal** or **Logs** section)

**If the restart button is not visible:**
- The application may be managed via **Passenger App** or **Application Manager** under the
  **Software** section instead
- ⚠️ **There is no SSH on this host** (verified 2026-10-04), so the `kill -USR2` fallback that
  earlier versions of this document recommended **does not exist**. The cPanel Terminal is a shell
  *inside* cPanel; nothing can connect to it from outside, and there is no documented API to
  restart a Passenger app headlessly. **The button is the mechanism.** If it is genuinely absent,
  the escalation is a support ticket to DianaHost.

**Cold start note:** the first request after a restart takes 5–15 seconds while Node initializes and Payload boots. This is normal — do not restart again thinking it failed.

**After a code deploy:**
1. Build the standalone bundle locally and assemble it (the traps — the `cms/` path segment, the
   missing `.next/static`, the venv symlink loop — are documented in
   `docs/deployment-runbook.md` §3.1–§3.4)
2. Zip the assembled bundle, confirming it contains **no `data/` directory**
3. Upload and extract via the cPanel **File Manager** (there is no `rsync`/`scp` — no SSH)
4. Recreate the venv symlinks if the extraction disturbed `node_modules`
   (`docs/deployment-runbook.md` §3.4)
5. **RESTART** via cPanel — once. A second restart does not help and delays recovery.

**Keep written down offline:** the cPanel URL, username, and CMS application name. An operator
under pressure should not be searching for these. ⚠️ There is **no SSH path** to record — it does
not exist on this host.

---

## 8. Scheduled maintenance

- Dependency and security updates: reviewed deliberately, never auto-merged to production
- Database maintenance: SQLite `VACUUM` occasionally; check WAL size
- Backup verification: 🔴 **there is still no backup to restore from.** The automation was
  built 2026-10-04 (host-cron snapshot + FTPS fetch, `pnpm verify:backup` at 38 checks) but needs
  the owner's 4 setup steps before it runs. See `docs/backup-and-recovery.md` §6.4 — and a full
  restore has still never been tested, which is the item that matters
- Certificate renewal: automatic via DianaHost AutoSSL (Let's Encrypt via cPanel), but verify

---

## 9. Open items

- [x] **Select a card-free uptime monitor** — ✅ **UptimeRobot** (free, 50 monitors, no card, 5-min checks, email + Telegram alerts). Researched 2026-09-13. Setup steps in §6.
- [x] **Decide the alerting channel** — ✅ Email (primary), Telegram (optional). Documented in §6.
- [ ] **Error-tracking tool** — still open; Sentry's free tier requires a card. Fallback: Apache access logs + manual log review. Revisit if a card-free Sentry alternative emerges.
- [x] Build the feature-flag mechanism (§5) — ✅ `frontend/src/lib/feature-flags.ts` (14 flags, default-ON, env-gated) + `cms/src/lib/feature-flags.ts`. Used across 18 files.
- [x] Write the CMS restart procedure for DianaHost — ✅ Written in §7.1 (cPanel + Passenger restart, SSH fallback, cold-start note, post-deploy steps)
- [ ] ~~Confirm Cloudflare Pages retains failed builds~~ — **Removed 2026-09-14.** No Cloudflare Pages. CI rsync only runs after all gates pass.
- [ ] Decide whether any reader-facing rendering ever moves off static HTML — **recommendation: never**
- [ ] **Set `DEPLOY_WEBHOOK_URL` in production** — until it is set, no edit republishes the site automatically. See §10.

---

## 10. "I edited the CMS and nothing changed" — the failure mode with no error

**Reported by the owner, 2026-09-18.** It is the single most likely thing to be
mistaken for a backend fault in this architecture, and it deserves its own section
because *nothing is broken* — publishing is genuinely two steps and nothing said so.

### 10.1 Why it happens

The public site is **pre-built static HTML**. The CMS is read **at build time
only**. Editing `/admin` changes the database and nothing else; a rebuild is what
publishes it. The documented pipeline is:

```
editor saves → Payload fires a webhook → CI rebuilds → new HTML deploys
```

### 10.2 The three things that made it look broken

| # | Cause | Status |
|---|---|---|
| 1 | **The rebuild was silent.** With `DEPLOY_WEBHOOK_URL` unset, `rebuild-trigger.ts` does nothing **and says nothing** — the editor saves, Payload says "Saved successfully", and the site does not change. No error, no warning, no clue. | ✅ fixed — every rebuild-triggered config now shows a Bengali notice at the top of its edit view, stating which state it is in |
| 2 | **The dev server cached the CMS forever.** `cmsFetch`'s module-level response cache is right for a **build** (short-lived, fetch once, exit) and wrong for `astro dev` (runs for hours) — it had **no invalidation at all**, so the first response per path was cached for the life of the server. | ✅ fixed — `CACHE_ENABLED = !import.meta.env.DEV` |
| 3 | **A CMS-uploaded ad banner was 404ing.** `AdCreative.astro` rendered `src={image.url}` **raw**; Payload stores media as a relative `/api/media/file/…` and the static host serves no `/api/`. Every other image already went through `mediaUrl()` — this was the one exception. | ✅ fixed |

⚠️ **Cause 1 is the one to remember.** The state is now stated where the editor is
looking, and the notice says **which** of the two states it is — configured (be
patient) or not (a rebuild must be run):

> ⚠️ স্বয়ংক্রিয় rebuild চালু নেই (DEPLOY_WEBHOOK_URL সেট করা হয়নি)। সাইটটি স্ট্যাটিক HTML, তাই সংরক্ষণ করলেই পরিবর্তন দেখা যাবে না — rebuild চালাতে হবে।

Counter-proved by `verify:rebuild-notice` (**10/10**): present on all five
triggered configs, **absent** on `Comments` / `PollVotes` / `Assignments` / `Users`,
and it does not replace the collection's own description. The absent direction is
the one a careless helper would break, so it is asserted rather than assumed.

### 10.3 The rebuild is debounced, and that is deliberate

One quota constrains rebuilds: GitHub Actions **2,000 minutes/month** on a private
repo. A newsroom publishing 15–20 articles a day would exhaust a per-save trigger.
So saves are debounced (default 5-minute quiet period, 30-minute maximum wait), and
**breaking news bypasses the wait entirely**.

### 10.4 ⚠️ Do not trust `req.user` for relationship fields

Found while building the reporter workspace. `req.user.authorProfile` and
`/api/users/me` both return `undefined` even though the column is set and a depth-0
read returns the id. Code that reads `req.user.<relationship>` gets `null` and
fails **silently**, in a way that looks like missing data rather than a bug.

**Read the document back explicitly** with `findByID` + `user` +
`overrideAccess: false`, so the real access rule still governs.
