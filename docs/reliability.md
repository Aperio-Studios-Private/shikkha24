# Reliability, Failure Handling & Overload Plan — Shikkha24

**Created:** 2026-09-11 · **Status:** S0/S12 input. **Crash handling, overload management and monitoring had no coverage before this document.**
**Why this exists:** the project had no analysis of what breaks, in what order, or what to do about it.

---

## 1. Architecture recap (needed to reason about failure)

| Component | Runs where | Failure impact on readers |
|---|---|---|
| Astro static site | **Cloudflare Pages** | Site down |
| Media | **Cloudflare R2** | Images broken |
| Payload CMS + admin | **DianaHost 2 GB shared host** | **Readers unaffected** — only publishing stops |
| Build pipeline | **GitHub Actions** | New content cannot be published |
| Newsletter delivery | Free-tier ESP | Newsletter fails |

**The most important structural fact:** because the frontend is static on Cloudflare Pages, **a CMS outage does not take the site down.** Editorial can keep publishing only if the CMS is up, but readers keep reading. This is the single biggest reliability win in the architecture and it should be preserved — never move reader-facing rendering onto the shared host.

---

## 2. Failure mode analysis

Ranked by realistic likelihood × impact.

| # | Failure | Impact | Likelihood | Detection | Mitigation |
|---|---|---|---|---|---|
| 1 | **Passenger kills the idle Node process** (common on shared hosting) | CMS offline; publishing stops | **High** | Uptime monitor on `/admin` | Auto-restart via cPanel; accept a cold-start delay; document the manual restart step |
| 2 | **CI minutes exhausted** (2,000/month, private repo) | No new content published | **Medium** — depends on measured build time | Actions quota warning | Adaptive batching; or public repo for unlimited minutes. See `docs/hosting-and-deployment.md` |
| 2b | **Cloudflare Pages 500 builds/month exhausted** | No new deployments | **Medium–High** if Pages builds are Git-triggered | Pages build log | Verify whether `wrangler` direct upload bypasses the quota; else batch harder, or fall back to DianaHost `public_html` |
| 2c | **Cloudflare Pages 20,000-file ceiling reached** | Cannot deploy new pages | **Low** now, certain in ~2–3 years | Deploy failure | Keep images on R2; plan the Workers Static Assets or `public_html` migration |
| 2d | **Node.js 20 end-of-life on the host** | Unpatched vulnerabilities in the CMS runtime | **Standing** | Not detectable by monitoring | Select Node 22/24 in the cPanel Node.js Selector; otherwise compensate with admin hardening (`docs/security.md` §3) |
| 3 | **2 GB storage full** | Uploads fail; account may be suspended | **High** over months | Storage alert at 80% | Media on R2, not the host; storage monitor |
| 4 | **Payload 3.89.0 regression** (pinned one day after release) | Varies | Medium | Smoke test after deploy | S0 hold-vs-pin decision; pin and upgrade deliberately |
| 5 | **SQLite lock contention** during simultaneous publishes | Individual publish failures | Medium | Editor reports; logs | WAL mode (validated at S0); serialise heavy writes |
| 6 | **R2 unavailable** | Broken images | Low | Image 404 rate | Cloudflare cache holds previously-fetched media |
| 7 | **Free-tier ESP down or rate-limited** | Newsletter fails; transactional email fails | Medium | Bounce/failure logs | cPanel SMTP as documented fallback |
| 8 | **Viral traffic spike** | None for readers (static on Pages) | Medium | Traffic analytics | See §5 — the frontend is already the mitigation |
| 9 | **Cloudflare misconfiguration** | Site-wide outage | Low | Immediate | Instant rollback (Pages keeps every deployment) |
| 10 | **200 GB origin bandwidth exceeded** | Throttling | Low | Bandwidth alert | Frontend is on Pages, not the origin — this mostly protects itself |
| 11 | **DianaHost account suspension** | CMS offline | Low | Uptime monitor | Keep the account in good standing; keep an export of the SQLite DB |
| 12 | **Domain or DNS loss** | Total outage | Very low | Immediate | Keep registrar and Cloudflare credentials recoverable; document renewal dates |

---

## 3. Error handling and error pages

**Nothing existed here.** Required:

| Case | Behaviour |
|---|---|
| **404** | Branded Bengali page, search box, links to the 8 categories and the education hubs. **Never a bare server default.** |
| **500 / build failure** | Static site: the last good deployment stays live. Cloudflare Pages does not replace a working deployment with a failed build. |
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

- **Reader traffic: effectively unbounded.** Cloudflare Pages serves static assets from the edge with unlimited bandwidth on the free tier. A viral spike is a non-event for readers.
- **The real bottlenecks are editorial, not reader-facing:**
  1. **Publishing throughput** — bounded by **two** quotas, not by server capacity: GitHub Actions (2,000 min/month) and Cloudflare Pages (**500 builds/month**). Full detail in `docs/hosting-and-deployment.md`.
  2. **Storage** — 2 GB on the host (media is offloaded to R2, so this is mostly the app + DB). R2 itself is capped at 10 GB, and a payment method is on file, so overage is **billable** — set an 80% alert.
  3. **Simultaneous editors** — SQLite WAL, validated at S0 for 5+ concurrent writers.
  4. **Deployed file count** — Cloudflare Pages allows 20,000 files/site; reached in roughly 2–3 years at the target publishing rate.
  5. **Runtime patch level** — Node 20 is end-of-life on the host.
- **The CMS origin sees only editor traffic.** A reader spike does not touch it.

### Traffic spike playbook

On a viral day (a result publication, an admission circular):

1. Confirm Cloudflare is caching (Pages handles this automatically)
2. **Do not** increase build frequency — batch harder; a spike is when CI minutes vanish
3. If the CMS is under load, pause non-essential editorial work
4. If a heavy feature is misbehaving, disable it via a **feature flag** rather than redeploying
5. Watch storage and bandwidth, not CPU

**Action item:** build a small **feature-flag mechanism** so heavy or fragile features (live blog, widgets, comments) can be switched off without a code change. This is an S0/S8 design requirement, not a nice-to-have.

---

## 6. Monitoring and alerting

**Nothing existed here.** Free options only — the owner has no card, so **every tool must be verified as card-free before adoption.**

| What to watch | How | Alert threshold |
|---|---|---|
| Site up (frontend) | Uptime monitor on the homepage | Any failure, 2 consecutive checks |
| CMS up | Uptime monitor on `/admin` | Any failure |
| Build failures | GitHub Actions notifications | Any failed run |
| CI minutes | GitHub Actions quota | 80% of monthly quota |
| Host storage | cPanel / manual check | 80% of 2 GB |
| Origin bandwidth | DianaHost cPanel | 80% of 200 GB |
| R2 usage | Cloudflare dashboard | 80% of 10 GB |
| Error rate | Cloudflare analytics | Spike over baseline |
| Domain/cert expiry | Calendar reminder + Cloudflare SSL alerts | 30 days before |

**Honest gap:** there is no error-tracking tool selected. Sentry-style services are the norm but must be checked for card-free free tiers. If none qualifies, the fallback is Cloudflare analytics plus manual log review — document that as an accepted limitation rather than pretending monitoring is complete.

**Owner note:** with a single operator, alerting must be to a channel that is actually checked. A dashboard nobody opens is not monitoring.

---

## 7. Incident response (single-operator playbook)

1. **Detect** — alert fires, or a reader/editor reports it
2. **Assess** — is the reader-facing site affected, or only the CMS? (Usually only the CMS.)
3. **Mitigate before diagnosing** — if the site is down, roll back first, investigate after
4. **Roll back** — Cloudflare Pages keeps every deployment; revert to the last good one in one click. For code, `git revert` and let CI redeploy.
5. **Communicate** — if readers are affected, post a short Bengali notice
6. **Record** — write it into `.sps/mistakes.md` with the root cause and the prevention
7. **Fix forward** — then restore the feature

**Pre-requisites to establish at S0:** know the rollback path, have the CMS restart step written down, keep credentials recoverable offline.

---

## 8. Scheduled maintenance

- Dependency and security updates: reviewed deliberately, never auto-merged to production
- Database maintenance: SQLite `VACUUM` occasionally; check WAL size
- Backup verification: see `docs/backup-and-recovery.md` — restore is tested, not assumed
- Certificate renewal: automatic via Cloudflare, but verify

---

## 9. Open items

- [ ] Select a card-free uptime monitor and error-tracking option (§6) — **must be verified, not assumed**
- [ ] Decide the alerting channel (email? a messaging app?) — it must be one the owner actually reads
- [ ] Build the feature-flag mechanism (§5)
- [ ] Write the CMS restart procedure for DianaHost
- [ ] Confirm Cloudflare Pages retains failed builds without replacing the live deployment
- [ ] Decide whether any reader-facing rendering ever moves off Cloudflare Pages — **recommendation: never**
