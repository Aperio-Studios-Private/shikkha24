# Hosting & Deployment Model — Shikkha24

**Created:** 2026-09-11 · **Status:** S0 input. **Updated 2026-09-14** — all Cloudflare services removed per owner decision. Everything on DianaHost only.
**Why this exists:** the owner asked a fair question — *"why do I need CI for an article to upload? The admin can't access GitHub, the admin is general people."* The answer is not obvious, and the quotas behind it were undocumented.

---

## 1. Why CI exists at all — the short version

**Editors never touch GitHub.** They log into the Payload admin panel — a normal web CMS, like WordPress. Write, click Publish. That is the entire editor experience.

But the public website is **pre-built into HTML files ahead of time**. That is precisely why it is fast and cheap: Apache serves a finished file from `public_html`, and no server has to generate anything per reader.

So when an editor publishes an article, a new HTML file must be **created**. That is what CI does, automatically and invisibly:

```
Editor clicks Publish (in Payload)
   → Payload fires a webhook
   → GitHub Actions rebuilds the site
   → the new HTML is deployed (rsync to public_html)
   → the article is live
```

Nobody sees GitHub. It is plumbing.

### The alternative, and why we are not using it

A "dynamic" site generates each page when a reader requests it — no rebuild needed. But then **every reader request hits the 2 GB shared host**, which is slower, risks the TTFB and Lighthouse targets, and falls over under a viral spike.

Given Lighthouse ≥95 on a 2 GB shared host, **static is the right architecture**. The cost of that choice is: publishing needs a rebuild.

---

## 2. The rebuild quota — one hard limit

| Quota | Limit | Source |
|---|---|---|
| **GitHub Actions minutes** | **2,000 / month** (private repo) | GitHub free plan |

~~Cloudflare Pages builds (500/month)~~ — **removed 2026-09-14.** No Cloudflare Pages. The frontend deploys to DianaHost `public_html` via rsync from CI. There is no separate build quota for the deploy target — only the GitHub Actions minutes cap applies.

### The arithmetic

At the owner's chosen **baseline 15–20 articles/day plus bursts**, expect roughly **600–900 publishes/month**.

| Scenario | Builds/month | Minutes used | Verdict |
|---|---|---|---|
| One build per publish, 30s incremental | 900 | ~450 | ✅ Fits 2,000 |
| One build per publish, 2 min | 900 | ~1,800 | ⚠️ Tight |
| One build per publish, 5 min full rebuild | 900 | ~4,500 | ❌ Over |
| Batched every 10 min (worst case) | ~4,300 | 2,150+ | ❌ Over |

⚠️ **If an Astro incremental build is genuinely ~30 seconds, the quota is comfortable.** The real number is unknown and must be measured — see §6.

---

## 3. Recommended deploy pipeline

```
GitHub Actions (Node 24)
   ├─ build Astro site + Pagefind index
   ├─ build Payload/Next standalone bundle
   ├─ run quality gates (typecheck, lint, Lighthouse CI, link check, schema)
   ├─ deploy static output → DianaHost public_html (rsync over SSH)
   └─ deploy Payload bundle → DianaHost CMS directory (SSH)
```

**Key point:** both builds happen in CI on **Node 24**, and only the *artifacts* ship. This is not optional — see §5.

**Batching strategy (adaptive):**
- Quiet hours: one build every 15–30 minutes
- Peak hours (results day, admission day, circular day): every 5 minutes
- Breaking news: an on-demand build triggered by the `is_breaking` flag

Editors see "published" immediately in the CMS; the public page appears within the batch window. The CMS must tell the editor this honestly ("প্রকাশিত — সাইটে যুক্ত হচ্ছে") rather than implying instant publication.

---

## 4. Escalation ladder if the quota is hit

In order of preference:

1. **Batch harder** — increase the rebuild interval. Free, but content appears later.
2. **Make the repository public** → unlimited GitHub Actions minutes. The code is not a competitive secret; no secrets are committed. **Owner decision.**
3. **Self-hosted GitHub Actions runner** — no minutes limit, but requires a machine to run it.

---

## 5. Node.js version — a real finding

DianaHost runs **Node.js 20.18.2**.

| Tool | Requires | Runs on 20.18.2? |
|---|---|---|
| `astro@7.3.2` | `>=22.12.0` | ❌ **No** |
| `vite@8.3.0` | `^20.19.0 \|\| >=22.12.0` | ❌ **No** (20.18.2 < 20.19.0) |
| `next@16.3.4` | `>=20.9.0` | ✅ Yes |
| `@payloadcms/next@3.89.0` | `^18.20.2 \|\| >=20.9.0` | ✅ Yes |
| `typescript@7.0.2` | `>=16.20.0` | ✅ Yes |

**Two consequences:**

1. **Astro and Vite cannot run on DianaHost.** They must build in CI — which is already the architecture. The frontend is built in CI and deployed as static HTML to `public_html`.
2. **Payload + Next 16 *can* run on Node 20.18.2** — the engines allow it.

### But Node 20 is end-of-life

Node 20 reached **end of life on 2026-04-30** — over four months ago. It receives **no security patches**. Running a public-facing CMS admin that handles editor credentials and reader PII on an EOL runtime is a genuine security risk, and 20.18.2 itself is from late 2024.

### The fix is probably one click

DianaHost's cPanel exposes a **Node.js Selector** with a *"Change Node.js version"* drop-down (documented in their knowledge base). 

**Owner action:** cPanel → Software → *Select Node.js Version* → Edit the application → **Change Node.js version** → check whether **22.x or 24.x** is offered.

- **If 22 or 24 is available** → select it. Problem solved.
- **If only 20.x is available** → the stack still works (Next/Payload accept ≥20.9), but it runs on an EOL runtime. That becomes a **documented, accepted risk** with mitigations: keep the admin panel rate-limited, minimise exposed surface, and ask DianaHost to add a newer Node.

---

## 6. S0 gates this document creates

- [ ] **Measure a real Astro incremental build time** — this decides the entire batching strategy and whether the CI quota is comfortable or critical
- [ ] **Check the cPanel Node.js Selector drop-down** for Node 22/24; select the newest available
- [ ] Decide the repository visibility (private = quota risk; public = unlimited minutes)

---

## 7. Bandwidth and storage ceilings

With Cloudflare removed, the **200 GB/month bandwidth cap** applies to ALL traffic — HTML pages, CSS/JS assets, and media images. There is no CDN to absorb the load.

**HTML bandwidth:** at ~50 KB/page × 100K pageviews/month = ~5 GB. Comfortable.

**Media bandwidth:** at ~100 KB per WebP image × 5 images per article view × 100K pageviews = ~50 GB. This is the real consumer. A result-day spike could add 20–30 GB in a single day.

**Storage:** 2 GB total, shared by the CMS standalone bundle (~114 MB), SQLite database, media library, and logs. Media grows 150–270 MB/month at the target publishing rate. On the 2 GB plan, storage fills in 7–13 months; on a 5 GB plan, 18–33 months.

**Mitigations:**
- Aggressive WebP conversion, originals discarded
- Per-day upload cap
- Browser caching via `Cache-Control` headers (set in `.htaccess`)
- Monitor bandwidth via cPanel; alert at 80% of 200 GB

---

## 8. DianaHost facts not published anywhere

The vendor's knowledge base (18 Web Hosting articles) documents **none** of the following. They must be obtained from support:

- **Inode / file-count quota** — critical, because a Next.js install contains tens of thousands of files
- CPU / memory / process (entry process) limits
- Email sending limits per hour
- Whether account-level backups exist and can be restored on request

**Owner action:** raise one support ticket covering all four.
