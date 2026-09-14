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
| 2b | ~~Cloudflare Pages 500 builds/month exhausted~~ | ~~No new deployments~~ | **Removed 2026-09-14.** No Cloudflare Pages. Frontend deploys via rsync to `public_html`. |
| 2c | ~~Cloudflare Pages 20,000-file ceiling reached~~ | ~~Cannot deploy new pages~~ | **Removed 2026-09-14.** No Cloudflare Pages file ceiling. DianaHost inode quota is the new ceiling (ask support). |
| 2d | **Node.js 20 end-of-life on the host** | Unpatched vulnerabilities in the CMS runtime | **Standing** | Not detectable by monitoring | Select Node 22/24 in the cPanel Node.js Selector; otherwise compensate with admin hardening (`docs/security.md` §3) |
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
| **500 / build failure** | Static site: the last good deployment stays live. CI does not replace the working `public_html` with a failed build — the rsync only runs after all gates pass. |
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
  4. **Runtime patch level** — Node 20 is end-of-life on the host.
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
4. **Roll back** — `git revert` and let CI redeploy (rsync replaces `public_html`). For a bad `.htaccess`, fix and redeploy.
5. **Communicate** — if readers are affected, post a short Bengali notice
6. **Record** — write it into `.sps/mistakes.md` with the root cause and the prevention
7. **Fix forward** — then restore the feature

**Pre-requisites to establish at S0:** know the rollback path, have the CMS restart step written down (see §7.1), keep credentials recoverable offline.

### 7.1 CMS restart procedure (DianaHost cPanel + Phusion Passenger)

DianaHost runs the CMS as a Node.js application behind Phusion Passenger via cPanel. Passenger kills idle processes — the most common cause of CMS unavailability. The reader-facing site is unaffected (it is static on Cloudflare Pages); only the admin and publishing are down.

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
- The application may be managed via **Passenger App** under the **Software** section instead
- Or via **Terminal/SSH**: find the Passenger process (`ps aux | grep node`) and send `SIGUSR2` to restart without downtime (`kill -USR2 <pid>`); if that fails, `kill -TERM <pid>` and Passenger will respawn it

**Cold start note:** the first request after a restart takes 5–15 seconds while Node initializes and Payload boots. This is normal — do not restart again thinking it failed.

**After a code deploy:**
1. SSH in (or use cPanel Terminal)
2. Navigate to the CMS application directory
3. `pnpm install --frozen-lockfile` (if dependencies changed)
4. Copy the new standalone build: `cp -r ../../.next/standalone/cms/* .` (adjust paths)
5. Copy static assets: `cp -r ../../.next/static ./.next/static`
6. Restart via cPanel (steps 1–6 above)

**Keep written down offline:** the cPanel URL, username, the CMS application name, and the SSH path to the app directory. An operator under pressure should not be searching for these.

---

## 8. Scheduled maintenance

- Dependency and security updates: reviewed deliberately, never auto-merged to production
- Database maintenance: SQLite `VACUUM` occasionally; check WAL size
- Backup verification: see `docs/backup-and-recovery.md` — restore is tested, not assumed
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
