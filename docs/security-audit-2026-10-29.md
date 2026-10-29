# Security Audit — shikkha24 (2026-10-29)

**Scope:** full stack — Astro storefront (Cloudflare Workers), Payload CMS (Render/Neon),
R2 media, GitHub Actions CI/CD, publish-watcher.
**Method:** three parallel static-review tracks (auth/access-control; injection/XSS/SSRF;
secrets/config/supply-chain), 22 passive production probes (GET/HEAD only — no writes, no
login attempts beyond a single fake-credential enumeration probe), and local adversarial
tests against isolated copies of the real rendering code.
**Production constraint compliance:** zero writes to the live database; zero mutations via
any API; all adversarial payloads executed locally against cloned modules.

---

## Executive summary

**No critical vulnerability found. No reader-to-reader attack path found. No secret has ever
reached git history (independently re-verified).** The access-control layer is unusually
strong for this project's size: all 34 collections closed to anonymous writes, field-level
guards on every escalation path, 58+ regression assertions.

The real findings cluster in three themes:

1. **Editor-trust-boundary XSS (the one theme that matters most).** The system's stated
   trust model is "CMS = trusted authoring, content = untrusted." Two sinks break that
   model: JSON-LD script tags and the header search suggestions. A compromised or malicious
   *reporter-level* account can currently execute script in reader browsers.
2. **Over-scoped operational tokens.** Two GitHub PATs hold far more power than their jobs
   need; their compromise chains to full site takeover.
3. **A public-repo data-exposure seam.** The repo is PUBLIC and the daily backup workflow
   would publish the full database (password hashes, subscriber PII) as a downloadable
   artifact any day its host fetch succeeds.

---

## Findings (consolidated, deduplicated, prioritized)

### HIGH

| # | Finding | Where | Impact |
|---|---|---|---|
| H1 | **`</script>` breakout in JSON-in-`<script>` sinks.** `JSON.stringify` does not escape `<`; CMS-authored strings (article title, author name, category name, site name, FAQ text, quiz explanation) land raw inside `<script type="application/ld+json" set:html={JSON.stringify(…)}>`. A title containing `</script><img src=x onerror=…>` executes on the article page — article/relaxed CSP profiles allow `unsafe-inline`. **Locally reproduced.** | `frontend/src/layouts/Layout.astro:240`, `frontend/src/components/Breadcrumbs.astro:74`, `frontend/src/components/QuizRunner.astro:62` | Stored XSS on the main origin from a reporter-level account |
| H2 | **Header search suggestions inject Pagefind metadata unescaped.** `list.innerHTML = items.join('')` with `data.meta.title` (derives from CMS article title) and `data.url` unescaped. Same trust boundary as H1; every reader who searches a matching term gets the payload. | `frontend/src/components/Header.astro:517-524` | Stored XSS via search UI |
| H3 | **GraphQL mutations bypass the login/forgot-password per-IP rate limits.** The hand-built REST rate-limit wrappers don't cover the separately-mounted GraphQL route; Payload ships `loginUser`/`forgotPassword`/`unlockUser` mutations. Per-account lockout (5/10 min) still bounds per-account attempts → password-spraying exposure, not full brute force. | `cms/src/app/(payload)/api/users/login/route.ts:32-40`, `cms/src/app/(payload)/api/graphql/route.ts:5-6` | Unthrottled password spraying |
| H4 | **Rebuild PAT over-scoped: Contents Read/Write where only Actions Write is needed.** Compromise of the CMS process → push commits to the repo → CI auto-deploys → full storefront takeover. | `DEPLOY_WEBHOOK_TOKEN` on Render (`.sps/tasks.md:5510` records the "Actions+Contents RW" scope) | Privilege chain to code-write + deploy |
| H5 | **Repo is PUBLIC + daily DB-backup workflow active.** `backup-db.yml` uploads a verified tar.gz of the database + media as a GitHub artifact (30-day retention) — reader password hashes, newsletter subscribers, comments. Artifacts on public repos are downloadable by anyone. **Current artifacts: 0** (runs fail because DianaHost is frozen), but the workflow is `active` and the exposure returns the moment a fetch succeeds. The workflow also backs up the LEGACY SQLite DB — production moved to Neon, so it publishes frozen PII without backing up the real database. | `.github/workflows/backup-db.yml:119-127`; visibility verified live via GitHub API | PII + credential-hash exposure |

### MEDIUM

| # | Finding | Where | Impact |
|---|---|---|---|
| M1 | **Watcher's classic PAT scoped `repo`** (full read/write to ALL the owner's repos). Worker compromise → every repo writable. | `publish-watcher` (`.sps/tasks.md:49-50`) | Cross-repo takeover |
| M2 | **Deployed publish-watcher `/run-tick` is unauthenticated** (hardening committed but never deployed; 2026-10-16 live probe confirmed open). Bounded impact — a tick only polls the CMS and dispatches on digest change — but it's an open control plane that can be hammered. | `publish-watcher/src/index.js:168-174` (repo version is correct; deployment lags) | Rebuild-loop abuse, info disclosure via `/health` |
| M3 | **Staff session cookie lacks `Secure`.** Payload default `secure: false`; Users collection sets everything except `cookies`. Reader-session and OAuth cookies do it correctly — the most valuable cookie is the only one that doesn't. | `cms/src/collections/Users.ts:38-44` | First-visit downgrade window (HSTS preload mitigates repeat visits) |
| M4 | **SVG uploads allowed; media-origin headers unverified.** SVGs with embedded script served from `media.shikkha24.com` (separate origin — main-site cookies safe) would give malware/phishing hosting on the brand domain. MIME check trusts the client header; no magic-byte sniff. | `cms/src/collections/Media.ts:70-77,194` | Brand-domain malware hosting (direct navigation only; `<img>` embeds are safe) |
| M5 | **`/telemetry` unauthenticated, unthrottled, unbounded body parse.** Payload fields are validated after parse; no content-length cap; no same-origin check. Flood burns Workers free quota + pollutes RUM. | `frontend/worker/telemetry.ts:55`, `frontend/worker/index.ts:101-107` | Quota-burn DoS, RUM pollution |
| M6 | **Recent searches rendered unescaped from localStorage** (self-XSS, same sink as H2). | `frontend/src/components/Header.astro:477` | Self-XSS only |

### LOW

| # | Finding | Where |
|---|---|---|
| L1 | `unlock` endpoint usable by every staff role (defeats lockout with insider cooperation) | `Users.ts` (no `access.unlock` override) |
| L2 | Rate limiter collapses header-less clients into one shared `'unknown'` bucket | `cms/src/lib/http.ts:70-84` |
| L3 | Push-subscribe accepts arbitrary endpoint URLs → blind HTTPS SSRF on sweep (allowlist push-service hosts) | `cms/src/endpoints/push.ts:126-131` |
| L4 | Uncaught `decodeURIComponent` crashes the Worker (1101 page) on malformed article-shaped 404s | `frontend/worker/redirects.ts:49` |
| L5 | `safeUrl` backslash bypass: `/\evil.com` resolves off-site (policy consistency; plain external links are already permitted by design) | `frontend/src/lib/richtext.ts:86` |
| L6 | CGPA term label self-XSS (reader's own input, own page) | `frontend/src/pages/cgpa.astro:306` |
| L7 | `pressCardNo` publicly readable (quasi-public by design; impersonation enablement) | `cms/src/collections/Authors.ts:98-104` |
| L8 | `minimumReleaseAge` supply-chain gate is INERT (exclude list without the base setting) and its list is stale (names next@16.3.5; installed is 16.4.3) | `pnpm-workspace.yaml:162-175` |
| L9 | graphql-scalars override is a forced major bump on the live GraphQL path — no runtime verification recorded | `pnpm-workspace.yaml:153` |
| L10 | HSTS `preload` committed — one-way door; deliberate but undocumented as a decision | `frontend/worker/headers.ts:40`, `cms/next.config.ts` |
| L11 | Hygiene: `cms/.env.bak-1790836104` (stale credentials, untracked) and `cms/.next/standalone/cms/.env` on local disk; `frontend/package-lock.json` stray lockfile | local disk |
| L12 | CSP `connect-src` names the Render origin (`shikkha24-cms-9vai.onrender.com`) — recon-only disclosure | `frontend/worker/csp.ts` |

### Verified-clean (attacked, held)

- Rich-text pipeline: **12/12 hostile payloads neutralized locally** (script tags, event
  handlers, `javascript:`/`vbscript:`/`data:` URIs incl. mixed-case and tab-smuggled,
  protocol-relative, quote-breakout, unknown-node smuggling, heading-tag injection).
- Comments: plain-text storage, framework-escaped rendering, no `set:html`, server-side
  whitelist + honeypot + rate limit + `create: noOne` second control.
- All 34 collections: **zero anonymous create/update/delete**; drafts not publicly
  readable (probed live: draft query returns empty); privilege escalation closed
  (roles/email/authorProfile all field-level superAdmin-only).
- Pango card rendering: single interpolation site, attributes are code constants —
  injection closed. Path-traversal guard on media filenames correct.
- Worker redirects: Location always built via `new URL()` (no header injection); manifest
  targets all internal (verified live); no ReDoS (all regexes linear, tested on 100k inputs).
- Secrets: no credential ever committed (pickaxe across token formats/connection strings
  across all history); `.env.example` placeholder-only; `.gitignore` correct.
- CI/CD: no `pull_request_target`, all untrusted input env-bound, gates fail closed,
  least-privilege permissions.
- Production probes: security headers on every response incl. 404s; http→https + www→apex
  301s; media 403s on all sensitive collections; login returns generic errors (no
  enumeration); GraphQL endpoint 405 on GET; preview host noindexed.

---

## Remediation plan (priority order, production-safe)

**P0 — do now (owner action, ~30 min, zero downtime):**
1. **Rotate + re-scope the rebuild PAT** (H4, M1): create a fine-grained PAT — single repo
   `shikkha24`, permission **Actions: Read/Write only** (Contents: Read). Update
   `DEPLOY_WEBHOOK_TOKEN` on Render + the watcher's token. Delete the classic `repo`-scoped
   PAT. (Render env update triggers a redeploy — do in a quiet hour.)
2. **Pause the backup workflow** (H5): disable `backup-db.yml` in the GitHub Actions UI
   (or we commit a `if: false` guard). It currently fails daily and protects nothing —
   production is Neon now; the Neon backup story needs its own design (see P2-4).
3. **Confirm no `shikkha24-backup-*` artifacts** (verified today: 0) — nothing to purge.

**P1 — code fixes, ship this week (all verified-safe, gate-tested):**
4. **JSON-LD breakout** (H1): add a shared `jsonForScriptTag()` helper
   (`JSON.stringify(x).replace(/</g, '\\u003c')`) and use it at the three sinks.
5. **Search suggestions** (H2, M6): rebuild the `<li>` with `createElement` + `textContent`
   (pattern already exists in `bookmarks.astro`).
6. **GraphQL rate limit** (H3): simplest safe fix — disable GraphQL in production
   (`graphQL: false`); nothing in the frontend uses it. Alternative: wrap the GraphQL
   route with the existing per-IP limiter.
7. **Session cookie `Secure`** (M3): `auth: { cookies: { secure: true } }` on Users.
8. **Worker decode crash** (L4): try/catch around `decodeURIComponent`, return null.

**P2 — near-term (this month):**
9. **Deploy the hardened publish-watcher + set `TICK_SECRET`** (M2) — already written,
   needs deploy + secret.
10. **SVG policy** (M4): drop `image/svg+xml` from the allowlist (logos can be PNG/WebP),
    or add magic-byte sniffing + confirm the media origin sends `nosniff` + a
    `default-src 'none'; sandbox` CSP.
11. **Telemetry bounds** (M5): reject `content-length > 1KB` before parsing; optionally
    require `Sec-Fetch-Site: same-origin`.
12. **Neon backup design** (replaces H5's workflow): scheduled `pg_dump` to a PRIVATE
    store (R2, private bucket) — never GitHub artifacts on a public repo.
13. **Push-endpoint allowlist** (L3), **unlock access** (L1), **'unknown' rate-bucket**
    (L2), **safeUrl backslash** (L5), **CGPA escape** (L6).

**P3 — decide/document:**
14. `minimumReleaseAge`: enable (with a refreshed exclude list) or delete the dead block (L8).
15. Record the HSTS-preload decision + the `unsafe-inline`-for-ads trade-off in
    `docs/security.md` so future changes don't silently drift (L10, documented trade-off).
16. Exercise the GraphQL phone fields once to close the override-verification gap (L9).
17. Local hygiene: delete `cms/.env.bak-*`, the standalone-bundle `.env`, and the stray
    `frontend/package-lock.json` (L11).

---

*Audit artifacts: XSS test harness output (12/12 neutralized), probe log in session
transcript, three sub-agent reports (auth/access-control; injection/XSS/SSRF;
secrets/config/supply-chain). No production data was modified at any point.*
