# Cloudflare Removal Plan — Shikkha24

**Created:** 2026-09-14 · **Status:** Scope amendment, recorded before code changes (rule 13).

**Owner decision (2026-09-14):** Remove ALL Cloudflare services from the project. Everything — databases, media, hosting, DNS, security headers, analytics — must reside on DianaHost infrastructure only. No third-party services involved in storage or data management, to maintain security and avoid dependency-related or payment-related issues.

---

## 1. What is being removed

| Cloudflare service | Current role | Replacement |
|---|---|---|
| **Cloudflare Pages** | Frontend static hosting (free, unlimited bandwidth) | DianaHost `public_html` — Apache serves the static HTML directly |
| **Cloudflare CDN/DNS proxy** | Edge caching, DDoS protection, SSL termination, security headers | DianaHost direct (no CDN); SSL via DianaHost AutoSSL; Apache `.htaccess` for headers |
| **Cloudflare R2** | Off-host backups (Tier 1 dump destination) | On-host backup + GitHub Actions artifact retention (7 days). Off-host backup via GitHub Actions artifact download to owner's machine. |
| **Cloudflare Web Analytics** | Traffic analytics | Removed. UptimeRobot covers uptime. No analytics tool replaces it (all free card-free options are CDN-locked). |
| **`_headers` file** | Cloudflare Pages header format for CSP + security headers + cache rules | Apache `.htaccess` with equivalent directives |
| **`cf-connecting-ip` header** | Client IP identification (Cloudflare-specific) | `x-forwarded-for` + `x-real-ip` only (Apache mod_remoteip if behind a proxy, or direct socket IP) |

---

## 2. Architectural consequences

### 2.1 Frontend hosting: Cloudflare Pages → DianaHost `public_html`

The static Astro output (`frontend/dist/*`) is deployed to DianaHost's `public_html` directory via SSH/rsync from CI. Apache serves it directly.

**Impact:**
- The 200 GB/month bandwidth cap now applies to ALL traffic, including static HTML and media.
- No edge caching — every request hits the origin.
- A viral spike can exhaust the 2 GB process or 200 GB bandwidth.
- The reliability property "CMS down ≠ site down" is **preserved** — the static HTML files exist on disk and Apache serves them without Node.js. Only the CMS admin goes down when Passenger kills the idle process.

**Mitigations:**
- Apache `mod_deflate` + `mod_cache` for origin-level caching (limited effectiveness on shared hosting).
- `Cache-Control` headers on static assets (set via `.htaccess`) so browser caching reduces repeat-visit bandwidth.
- The 200 GB/month cap must be monitored. At ~50 KB/page × 100K pageviews/month = ~5 GB HTML bandwidth; media is the real consumer (~100 KB per image × 5/page = 500 KB/article view × 100K views = 50 GB). The cap is comfortable at moderate traffic but a result-day spike could approach it.

### 2.2 SSL: Cloudflare → DianaHost AutoSSL

DianaHost provides free AutoSSL (Let's Encrypt via cPanel). The certificate covers `shikkha24.com` and `cms.shikkha24.com`. No Cloudflare edge certificate is needed.

### 2.3 Security headers: `_headers` → Apache `.htaccess`

The Cloudflare Pages `_headers` format is replaced by Apache `.htaccess` directives:
- `Header always set` for security headers (HSTS, X-Content-Type-Options, etc.)
- `Header always set Content-Security-Policy` for CSP — **but Apache does NOT have the comma-join problem** that Cloudflare Pages has. Apache's `Header set` replaces the value; `Header always set` applies to all responses. The `!`-detach trick is Cloudflare-specific and is removed.
- `<IfModule mod_headers.c>` blocks for portability.
- `Cache-Control` via `<FilesMatch>` for hashed assets and fonts.

**CSP route matching:** Apache uses `<LocationMatch>` or `<FilesMatch>` with regex, not the Cloudflare placeholder/splat system. The two-profile CSP (strict + relaxed) is expressed via `<LocationMatch>` blocks matching the same URL patterns.

### 2.4 Backups: R2 → on-host + GitHub Actions artifacts

The backup strategy changes:
- **Tier 1 (daily dump):** A GitHub Actions workflow connects over SSH, creates a tar of `data/payload.db` + `data/media/`, and stores it as a workflow artifact with 7-day retention. The owner can download these to local storage. This replaces the R2 upload.
- **Limitation:** GitHub Actions artifacts have a 500 MB limit on free tier and 7-day retention. The SQLite DB + media tar must stay under this. If media grows past ~400 MB, the tar must split or exclude media (DB-only backup).
- **Tier 5 (vendor backup):** Still depends on DianaHost cPanel's own backup mechanism — unchanged.

### 2.5 Analytics: Cloudflare Web Analytics → removed

No replacement analytics tool is introduced. The owner has no card, and all card-free analytics tools (Cloudflare, Plausible self-hosted, etc.) require either a CDN or a VPS. UptimeRobot covers uptime monitoring. Traffic analysis falls to Apache access logs (available via cPanel).

### 2.6 IP forwarding: `cf-connecting-ip` removed

The `clientIp()` function in `cms/src/lib/http.ts` and `cms/src/endpoints/poll-vote.ts` currently reads `cf-connecting-ip` as a fallback. With Cloudflare gone, this header will never be set. The function is simplified to read `x-forwarded-for` (first entry) → `x-real-ip` → `unknown`.

On DianaHost, Passenger passes the client IP via `x-forwarded-for`. There is no Cloudflare-specific header to trust.

---

## 3. Files to update

### 3.1 `.sps` docs (rule 13 — docs first)

| File | Changes |
|---|---|
| `.sps/profile.md` | Hosting architecture section, CDN/deploy target lines, CI/CD quotas, R2 open items, Cloudflare account mention. |
| `.sps/plan.md` | Stack table (CDN/frontend host, media storage, analytics), hosting architecture table, scope amendment section, CI constraints section, S0/S12 deliverables, build gates. |
| `.sps/handoff.md` | Hosting summary, deployment model, R2 references, Cloudflare account references, open items list. |
| `.sps/task.md` | R2 gate, Cloudflare Pages wiring, wrangler quota gates. |
| `.sps/deployment-readiness.md` | DNS step, Pages project step, CSP check, deploy webhook. |

### 3.2 `docs/` files

| File | Changes |
|---|---|
| `docs/hosting-and-deployment.md` | Cloudflare Pages quotas → removed; deploy pipeline → rsync to DianaHost; escalation ladder → DianaHost only; Node version section (Cloudflare Pages split justification removed). |
| `docs/backup-and-recovery.md` | R2 references → GitHub Actions artifacts; restore runbook → no R2 download; automating the dump → SSH + artifact upload. |
| `docs/security.md` | Rate limiting (Cloudflare free tier note → removed); security headers (set at Cloudflare → Apache `.htaccess`); PII/privacy (Cloudflare as processor → removed); CSP cloudflare join warning → Apache note. |
| `docs/reliability.md` | Architecture table (Cloudflare Pages → DianaHost `public_html`); failure modes (Pages quota → removed; Pages deploy → rsync); monitoring (Cloudflare analytics → Apache logs); traffic spike playbook (Cloudflare cache → origin); incident response (Pages rollback → git revert + rsync). |

### 3.3 Source code

| File | Changes |
|---|---|
| `frontend/public/_headers` | **Renamed/replaced** by `frontend/public/.htaccess` (Apache format). Same CSP profiles, same security headers, same cache rules — different syntax. |
| `cms/src/lib/http.ts` | `clientIp()`: remove `cf-connecting-ip` header check. Comment updated. |
| `cms/src/endpoints/poll-vote.ts` | `clientIp()`: remove `cf-connecting-ip` header check. Comment updated. |
| `frontend/astro.config.mjs` | Comments referencing Cloudflare Pages → DianaHost `public_html`. |
| `frontend/package.json` | Description: "deployed to Cloudflare Pages" → "deployed to DianaHost". |
| `frontend/src/lib/cms.ts` | Comment: "pre-built static HTML on Cloudflare Pages" → "on DianaHost". |
| `frontend/src/lib/widgets.ts` | Comment: "Cloudflare Pages" → "DianaHost". |
| `frontend/src/lib/media.ts` | Comment: "R2" reference already says "not on R2" — update to remove the R2 comparison. |
| `frontend/src/pages/article/[slug].astro` | Comments: "Cloudflare Pages" and "Cloudflare's edge" → Apache/DianaHost. |
| `frontend/src/pages/search.astro` | Comment: "Cloudflare Pages" → "DianaHost". |
| `frontend/src/components/TrendingList.astro` | Comment: "Cloudflare Web Analytics" → removed or replaced with "Apache access logs". |
| `cms/src/payload.config.ts` | Comment: "Cloudflare Pages" → "DianaHost". |
| `cms/src/globals/SiteSettings.ts` | Bengali string mentioning "Cloudflare Web Analytics" → remove or replace. |
| `cms/src/payload-types.ts` | Generated type with same Bengali string. |
| `cms/src/lib/rate-limit.ts` | Comment: "Cloudflare's free tier" → "no CDN rate limiting". |
| `cms/src/lib/rebuild-trigger.ts` | Comment: "Cloudflare Pages allows 500 builds/month" → removed. |
| `cms/src/lib/media-quota.ts` | Comment: "Cloudflare R2" → removed. |
| `cms/src/collections/Media.ts` | Comments: R2 references → DianaHost disk. |
| `cms/src/collections/Pages.ts` | Comment: "Cloudflare R2" → DianaHost. |
| `cms/src/lib/http.ts` | Comment: Cloudflare-specific header logic → DianaHost. |
| `scripts/verify-csp-routes.mjs` | Comments: "Cloudflare" → "Apache `.htaccess`". |
| `scripts/verify-build-output.mjs` | Comment: "Cloudflare Pages" → "DianaHost". |
| `.github/workflows/ci.yml` | Comments: Cloudflare Pages quota, deploy pipeline. |

### 3.4 Verification scripts

The CSP route verification (`scripts/verify-csp-routes.mjs`) validates that `_headers` rules match built routes. This needs to be updated to parse `.htaccess` `<LocationMatch>` patterns instead of `_headers` rules. The matching semantics change from Cloudflare's placeholder/splat to Apache regex.

> **✅ RESOLVED 2026-09-15 — better than planned.** `verify-csp-routes.mjs` was
> **deleted**, not rewritten. It parsed the rules and re-implemented Apache's regex
> matching in JavaScript, so it could only ever prove that two implementations
> agreed — never that either was right about Apache. (It passed for three days while
> the `.htaccess` was unrunnable, because `<LocationMatch>` is illegal in
> `.htaccess` and returned HTTP 500 sitewide.)
>
> It is replaced by **`scripts/verify-apache.mjs`**, which starts a **real Apache**
> over the real `dist/` and asserts status codes, header counts and per-page
> profiles. See `.sps/handoff.md` (the M16 note: the harness must derive the
> expected profile from the **cause** — an ad slot — not from a correlated field
> like the JSON-LD type).

---

## 4. What does NOT change

- The frontend is still static Astro HTML. It is still pre-built in CI on Node 24. The CMS is still Payload on Next.js standalone on DianaHost.
- The reliability property "CMS down ≠ site down" is preserved — Apache serves static HTML without Node.js.
- The CSP two-profile design (strict + relaxed for AdSense routes) is preserved — only the delivery mechanism changes.
- The `assetsInlineLimit: 0` invariant is preserved — still zero inline scripts.
- All Bengali UI, performance targets, and feature flags are unchanged.

---

## 5. Risks and accepted limitations

1. **No CDN = no DDoS protection.** DianaHost shared hosting has no DDoS mitigation. A targeted attack or a viral spike that overwhelms the origin could take the site down. This is an accepted risk per the owner's decision.
2. **200 GB/month bandwidth is now the ceiling for everything.** Media is the biggest consumer. At 15–20 articles/day with 2–3 images each at ~100 KB WebP, daily media growth is ~3–6 MB; monthly media bandwidth depends on pageviews. Moderate traffic (~100K pageviews/month) consumes ~50 GB; a result-day spike could add 20–30 GB in a day.
3. **No off-host backup beyond GitHub Actions artifacts (7-day retention, 500 MB limit).** The owner must download artifacts to local storage for longer retention. This is weaker than R2's 30-day + 12-month retention, but R2 is removed per the owner's decision.
4. **No analytics.** Traffic analysis relies on Apache access logs via cPanel. No real-time dashboard.
5. **SSL renewal** depends on DianaHost AutoSSL (Let's Encrypt via cPanel). If AutoSSL fails, there is no Cloudflare fallback.
6. **No edge caching.** Repeat-visit performance relies entirely on browser caching (`Cache-Control` headers).
