# DianaHost Provisioning Checklist — Shikkha24

**Created:** 2026-09-15 · **Status:** not yet started — nothing in this document has been requested from DianaHost.
**Audience:** the owner. Every item is something only the account holder can obtain or confirm.
**Vendor research:** all DianaHost facts below were read from their live site and knowledgebase on **2026-09-15**, not assumed. Sources are cited inline. Where their own documentation is silent, that is stated rather than filled in.

**Why the order matters.** The sequence is a dependency chain, not a preference. The CMS is built *from* the CMS host, the frontend is built *from* the CMS, and DNS gates SSL. Doing these out of order means repeating work.

---

## Phase 0 — Access (nothing else can start)

| # | Item | Where | Notes |
|---|---|---|---|
| 0.1 | **cPanel login URL, username, password** | Welcome email, or `http://<yourdomain>/cpanel` / `http://<server-ip>/cpanel` | DianaHost KB #18. cPanel also answers on **port 2083** (`https://<host>:2083`). Bookmark it. |
| 0.2 | **Server IP address** | cPanel right sidebar, or welcome email | Needed for DNS and for SSH if the hostname does not resolve yet. |
| 0.3 | ~~**Request SSH / Shell access**~~ | — | **⚠️ ANSWERED 2026-10-04: no. SSH is not available on this account.** TCP 22, 2222, 222, 2200 and 2022 all refuse. The PNR plan lists *"SSH/Shell Access: Yes **(On Demand)**"*, but on-demand was never granted and the host has been reconfigured without it. **Do not spend a support ticket on this** — the deploy runs over the cPanel HTTPS API and the backup over FTPS instead. |
| 0.4 | ~~SSH connection details~~ | — | Not obtainable, per 0.3. |
| 0.5 | ~~Your public key installed~~ | — | Not possible, per 0.3. **CI authenticates with a cPanel API token instead** — `CPANEL_USER` + `CPANEL_API_TOKEN`, not `DIANAHOST_SSH_KEY`. See `docs/hosting-and-deployment.md` §4.2. |
| 0.6 | **cPanel → Terminal** — a shell *inside* cPanel | cPanel → Advanced | ✅ **This is the shell, and it exists.** It is how the host-side backup cron is installed and how `sqlite3` is run by hand. **This is not a fallback — it is the only shell on this account.** |

---

## Phase 1 — Domain and DNS

| # | Item | Where | Notes |
|---|---|---|---|
| 1.1 | **⚠️ Establish where `shikkha24.com` is actually registered** | Your own records | **Currently undocumented in this repo — resolve this first.** It changes every step below. DianaHost sells domains and the hosting FAQ mentions a free domain, but nothing confirms this domain is one of theirs. |
| 1.2 | **Registrar login** for that domain | Registrar | Needed to change nameservers. |
| 1.3 | **Point the domain at DianaHost's nameservers** | Registrar → DNS / Nameservers | Replace any existing nameservers with all three:<br>`ns1.dianadns.com`<br>`ns2.dianadns.com`<br>`ns3.dianadns.com`<br>(DianaHost KB #85. There are **three**, not two.) |
| 1.4 | **Wait for propagation** | — | DianaHost states **4–48 hours**. Nothing SSL-related can be issued until this completes. |
| 1.5 | **Confirm the domain is added to cPanel as the primary domain** | cPanel → Domains | If the domain was registered elsewhere and only pointed here, it may still need adding. |
| 1.6 | **Enable auto-renew and record the renewal date offline** | Registrar | `docs/backup-and-recovery.md` §5 Scenario D calls domain loss "business-ending". |

**Verify:** `dig +short NS shikkha24.com` should return the three `dianadns.com` nameservers.

---

## Phase 2 — Host configuration (before any deploy)

| # | Item | Where | Notes |
|---|---|---|---|
| 2.1 | **⚠️ Check which Node.js versions are offered** | cPanel → **Software → Select Node.js Version** | DianaHost's default is **20.18.2, which reached end-of-life on 2026-04-30** and gets no security patches. This CMS holds editor credentials and reader PII. Open the *Change Node.js version* dropdown and **select the newest offered (22.x or 24.x)**. Their KB (#6) confirms the dropdown exists but does not list versions. |
| 2.2 | **⚠️ If only 20.x is available → support ticket** | Support ticket | Ask them to enable Node 22 or 24 on your server. If they decline, this becomes a **documented accepted risk** (`docs/hosting-and-deployment.md` §5). Do not silently proceed. |
| 2.3 | **Create the CMS subdomain** `cms.shikkha24.com` | cPanel → Domains → *Create A New Domain* | The plan includes **30 subdomains**; you need 1. It must exist before AutoSSL can issue a certificate for it. |
| 2.4 | **⚠️ Keep that subdomain's document root OUT of the app directory** | Same screen | The SQLite database and the whole media library live in `data/`. A document root pointing there would serve the newsroom archive to anyone who guesses the path (`docs/security.md` §2). |
| 2.5 | **AutoSSL issued for both hostnames** | cPanel → SSL/TLS Status → *Run AutoSSL* | Free Let's Encrypt, included. Confirm certificates for **both** `shikkha24.com` and `cms.shikkha24.com`. |
| 2.6 | **Confirm cron jobs are available** | cPanel → Advanced → **Cron Jobs** | **Required, not optional.** Three scheduled jobs depend on it: the newsletter send endpoint, the push-notification sweep, and the daily database+media backup. Not documented by DianaHost — check the panel directly. |
| 2.7 | **Storage headroom check** | cPanel → Disk usage | **⚠️ The real constraint.** The plan has **2 GB total**, shared by the ~114 MB CMS bundle, the SQLite database, the media library and logs. At the target publishing rate media grows **150–270 MB/month**, so a 2 GB plan fills in **7–13 months**. Decide now whether to upgrade to PNR 5 GB (৳9,999/yr, 1 TB bandwidth) rather than during an incident. |

---

## Phase 3 — Ask support (one ticket, five questions)

DianaHost's knowledgebase documents **none** of the following — I checked their Web Hosting category (29 articles) and it contains only generic how-tos. Their backup article describes **manual** cPanel File Manager backups only, with no vendor-side backup promised. So these must be asked, not assumed:

| # | Question | Why it matters |
|---|---|---|
| 3.1 | **What is the inode / file-count limit?** | A Node.js application contains tens of thousands of files. Exceeding an undocumented inode cap suspends the account. |
| 3.2 | **What are the CPU, memory and entry-process limits?** | Determines whether the Payload CMS is viable on this plan, and explains Passenger restarts under load. |
| 3.3 | **What is the email sending limit per hour?** | The newsletter sends in resumable batches. An undocumented cap means deliveries silently stop mid-campaign. |
| 3.4 | **Do you provide account-level backups, and can they be restored on request?** | The single cheapest safety net available. If yes, it is a second backup tier; if no, the off-host backup is the only one. |
| 3.5 | **Is `mod_setenvif`, `mod_headers` and `mod_rewrite` enabled, and is `AllowOverride` set to `All`?** | The entire two-profile CSP in `.htaccess` depends on `SetEnvIf` + `Header` being permitted as `FileInfo`-level overrides. This is the one thing that could silently break the deployed site. |

**Also worth asking while the ticket is open:** whether the 200 GB bandwidth figure in the plan table or the "unlimited bandwidth" claim in their FAQ applies — **their own pages contradict each other** on this.

---

## Phase 4 — Email and SMTP (only if you want the newsletter live)

The plan includes **unlimited email accounts**, so no purchase is needed. Each of these is a prerequisite for newsletter sending; while unset, the subscribe form **self-hides by design** rather than showing a control that cannot work.

| # | Item | Where |
|---|---|---|
| 4.1 | **Create the sending mailbox** — e.g. `no-reply@shikkha24.com` | cPanel → Email Accounts |
| 4.2 | **SMTP settings**: host, port, encryption, username, password | cPanel → Email Accounts → *Connect Devices*. Expect `mail.shikkha24.com`, port **465 (SSL)** or **587 (STARTTLS)**. The project's `.env.example` defaults to `SMTP_PORT=465`, `SMTP_SECURE=true`. |
| 4.3 | **SPF, DKIM and DMARC DNS records** | cPanel → **Email Deliverability** → *Repair*. DKIM keys are generated there; the SPF and DMARC records must be added to DNS. |
| 4.4 | **Confirm outbound port 25 / 465 / 587 is not blocked** | Support ticket (fold into Phase 3) | Shared hosts commonly block 25. The app uses 465 by default, which is usually open — confirm anyway. |

---

## Phase 5 — GitHub wiring (derived values — do these last)

Every value below comes *from* Phases 0–4. Nothing here can be filled in before the CMS is reachable.

### Repository secrets

| Secret | Value | Source |
|---|---|---|
| `CPANEL_HOST` | `b201.serverdiana.com` (cPanel answers on **:2083**) | Phase 0.1 / 0.2 |
| `CPANEL_USER` | cPanel username | Phase 0.1 |
| `CPANEL_TOKEN` | a cPanel API token — cPanel → *API Tokens* | Phase 0.1 |
| `CMS_URL` | `https://cms.shikkha24.com` | Phase 2.3 + 2.5 |
| `PUBLIC_CMS_ORIGIN` | `https://cms.shikkha24.com` | same |
| `FTP_HOST` / `FTP_USER` / `FTP_PASSWORD` | the **dedicated, jailed** backup FTP account | `docs/backup-and-recovery.md` §6.4 |

> ⚠️ **Corrected 2026-10-04.** This table used to require `DIANAHOST_SSH_HOST`, `DIANAHOST_SSH_USER`,
> `DIANAHOST_SSH_KEY` and `DIANAHOST_PUBLIC_HTML`. **None of those exist and none can be set** —
> this host has no SSH (Phase 0.3). The deploy authenticates with a **cPanel API token**, which is
> *not* OAuth: it is a plain `Authorization: cpanel <user>:<token>` header, and the paths the
> deploy uses are configured inside the workflow rather than in a secret.

### Repository variables

| Variable | Value | Why |
|---|---|---|
| `PUBLIC_SITE_URL` | `https://shikkha24.com` | canonical URLs, feeds, sitemap |
| `PUBLIC_MEDIA_BASE_URL` | `https://cms.shikkha24.com` | **⚠️ New — see below.** |

> ⚠️ **`PUBLIC_MEDIA_BASE_URL` is a third CMS-host value and was missing from the deploy workflow until 2026-09-15.** `mediaUrl()` prefixes the CMS's *relative* `/api/media/file/...` path with it. Unset, that path is emitted as-is, and the static host serves no `/api/` — so **every article image 404s**. A site with no pictures, from a green build. The new `verify:links` gate caught it on the runner. Both workflows now default it to the production CMS host; the variable overrides that default.

**Also required, and easy to forget:** the CMS hostname must be added to the CSP `connect-src` **and** `img-src` in `frontend/public/.htaccess`. A CSP cannot be templated, so it is a literal edit. Without it the browser blocks every CMS call and every CMS-hosted image before the request is sent.

---

## Phase 6 — After the CMS is live

| # | Item | Where |
|---|---|---|
| 6.1 | **Set the CMS environment variables** | cPanel → Setup Node.js App → your app → *Add Environment variables* (KB #6 confirms this UI). Values: `docs/cms-deployment.md` §3.5. |
| 6.2 | **Generate `PAYLOAD_SECRET`** | Local: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| 6.3 | **Set up the rebuild webhook** (`DEPLOY_WEBHOOK_URL` + token) | Without it, **publishing saves correctly and the live site never changes** — the single most confusing failure mode in this architecture. |
| 6.4 | **Create the cron jobs** | cPanel → Cron Jobs. Two host jobs: `cms/src/endpoints/newsletter.ts`, `cms/src/endpoints/push.ts`. ⚠️ **The backup is a third host job, not a GitHub workflow** — `/bin/sh /home/shikkhac/bin/shikkha24-backup-dump.sh` at 19:00 UTC. FTPS cannot run `sqlite3`, so the snapshot has to be taken on the host; CI only fetches the result. Full setup in `docs/backup-and-recovery.md` §6.4. |
| 6.5 | **Set bandwidth and storage alerts at 80%** | cPanel. 200 GB/month bandwidth; media images are the dominant consumer. |
| 6.6 | **Confirm `data/` is not reachable over HTTP** | `curl https://cms.shikkha24.com/data/payload.db` must return **404**. If it returns the file, stop and fix before announcing the site. |

---

## The critical path, stated plainly

```
SSH access (0.3) ─────────────┐
                              ├──> CMS deploy (Phase 6) ──> CMS_URL ──> frontend build ──> rsync to public_html
Node version (2.1/2.2) ───────┤
Subdomain + AutoSSL (2.3/2.5) ┘

Domain → nameservers (1.3) ──> propagation (1.4) ──> AutoSSL (2.5) ──> HTTPS works
```

**Four things can block everything else**, and all four are requests, not configuration:

1. **SSH access** — on demand, must be asked for (0.3)
2. **A Node version above EOL 20.18.2** — may require a ticket (2.2)
3. **DNS propagation** — 4–48 hours of waiting (1.4)
4. **`AllowOverride` / `mod_setenvif`** — unverified, and the CSP depends on it (3.5)

---

## What is *not* needed from DianaHost

Recorded so nobody goes looking:

- **No MySQL database.** Payload uses SQLite on the filesystem. The 50 included databases are unused.
- **No Cloudflare.** Removed entirely 2026-09-14 by owner decision; all data and hosting are on DianaHost only.
- **No Python or Ruby.** The PNR plan supports all three; this project uses only Node.
- **No paid SSL.** AutoSSL (Let's Encrypt) is included and sufficient.
- **No CDN or object storage.** Media is served from host disk; R2 was descoped.
- **The frontend is never built on the host.** Astro 7 and Vite 8 require Node ≥22.12 and DianaHost runs 20.18.2 — the frontend is built in CI and deployed as static files.

---

## Open questions this document could not close

| Question | Why it is still open |
|---|---|
| Where is `shikkha24.com` registered? | Not recorded anywhere in this repository. Blocks Phase 1 entirely. |
| Which Node.js versions does the server offer? | Only visible inside cPanel (2.1). |
| Inode / CPU / memory / email limits | Not published; DianaHost's KB has no article on any of them. Phase 3. |
| Vendor-side backups | Their only backup article describes manual File Manager backups. Phase 3.4. |
| Is bandwidth 200 GB or "unlimited"? | DianaHost's plan table and FAQ disagree. Phase 3, closing note. |

---

## Sources

All read live on 2026-09-15:

- PNR plan specifications — `dianahost.com/pnr-hosting-python-nodejs-ruby/`
- Nameservers — `clients.dianahost.com/knowledgebase/85/`
- Node.js app management (cPanel UI, version dropdown, npm install, env vars) — `clients.dianahost.com/knowledgebase/6/`
- Backups (manual only) — `clients.dianahost.com/knowledgebase/78/`
- cPanel login — `clients.dianahost.com/knowledgebase/18/`
- AutoSSL — `clients.dianahost.com/knowledgebase/11/`
- Subdomains — `clients.dianahost.com/knowledgebase/17/`
- Absence of limit documentation — `clients.dianahost.com/knowledgebase/9/` (Web Hosting, 29 articles)

**Related:** `docs/cms-deployment.md` (the step-by-step runbook this checklist feeds), `docs/hosting-and-deployment.md` §8 (the original list of undocumented vendor facts), `.sps/deployment-readiness.md` §3 (owner-only launch blockers).
