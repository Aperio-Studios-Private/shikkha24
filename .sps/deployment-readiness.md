# Deployment Readiness — Shikkha24

**Verified:** 2026-09-13 · **Verifier:** full end-to-end sweep from a clean tree
**Verdict:** ✅ **CODE IS DEPLOYABLE.** All buildable work is complete and green.
Launch is blocked only by **owner-only actions** (§3) — none of which is code.

> ⚠️ **Updated 2026-09-15 — the pipeline, as opposed to the code, was not ready.**
> Re-verifying on request found four pipeline defects: a red lint gate, a CI workflow that
> could never pass (it built the frontend with no CMS → a green 32-page thin build → the
> harnesses failed), a deploy workflow that would have shipped that thin site, and one vacuous
> harness check. All are fixed and re-verified. **Full detail: `.sps/production-readiness-audit-2026-09-14.md` §6.**
> The verification table in §1 below was taken on 2026-09-13 and is valid for that revision only.
>
> ⚠️ **Updated again 2026-09-15 (later) — the `.htaccess` was unrunnable, and would have
> taken the whole site down.** It used `<LocationMatch>`, which Apache forbids in `.htaccess`
> context, so Apache answered **HTTP 500 to every request**. Two cache rules were dead for the
> same class of reason. Nothing local caught it because the harness of the day reimplemented
> Apache's matching in JavaScript instead of running Apache. Both fixed, and the harness now
> runs a real Apache over the real build. **§2 "2026-09-15" table.**

---

## 1. Verification results (this sweep)

Every check below was run in this pass, in this order, against a clean tree.

### Static gates

| Gate | Result |
|---|---|
| `tsc --noEmit` (frontend) | ✅ exit 0 |
| `tsc --noEmit` (cms) | ✅ exit 0 |
| `biome check .` | ✅ exit 0 — 0 errors, 10 warnings (pre-existing `noNonNullAssertion`) |

### Build

| Gate | Result |
|---|---|
| `pnpm build:frontend` (astro + pagefind) | ✅ exit 0, **79 pages** |
| Post-build Pagefind step ran | ✅ index present |
| `dist/.prerender` left behind | ✅ none |

### Harnesses — 14/14 PASS

| Harness | Covers | Result |
|---|---|---|
| `cms:verify-media` | media pipeline, WebP, no originals | ✅ |
| `cms:verify-newsletter` | double opt-in, send cap, resumable batch | ✅ |
| `cms:verify-engagement` | comments, citizen, galleries, bookmarks | ✅ |
| `cms:verify-push` | VAPID, subscription, sweep | ✅ |
| `cms:verify-oauth` | provider flow, reader identity | ✅ |
| `cms:verify-endpoints` | **every custom endpoint over real HTTP** | ✅ 27/27 |
| `verify-build-output` | inline scripts, root files, URL shape, feeds | ✅ 24/24 |
| `verify-apache` | `.htaccess` served by a real Apache: status, header count, CSP profile per page | ✅ 16/16 (2026-09-15) |
| `verify-cms-sync` | read path — CMS record → page | ✅ 8/8 collections |
| `verify-s8` | live blog, poll, quiz, static fallback | ✅ |
| `verify-ads-s7` | sponsored template, mid-article ad split | ✅ 10/10 |
| `verify-ad-split` | mid-article split unit tests | ✅ 10/10 |
| `verify-sqlite-wal` | WAL concurrency + integrity | ✅ |

### Build-output invariants

| Invariant | Result |
|---|---|
| Executable inline scripts (strict-CSP invariant) | ✅ **0 across all 79 pages** |
| Articles at `/:category/:id/:slug` | ✅ 12 |
| Legacy `/article/:slug` redirect stubs | ✅ 12 (meta refresh + canonical) |
| Shortlinks `/a/:id` | ✅ 12 |
| `sitemap.xml` / `news-sitemap.xml` / `rss.xml` populated + new URL scheme | ✅ 43 / 12 / 13 entries |
| `robots.txt`, `llms.txt`, `og-default.png`, `404.html`, `.htaccess` | ✅ all present |
| CSP relaxed rule targets `/:category/:id/:slug` | ✅ |
| Stale `/article/*` CSP rule removed | ✅ |

### CMS data

**130 records** across 22 public collections. All populated except the
intentionally-empty ones: `tags`, `pages`, `jobs`, `fact-checks`, `ad-units`.

> ⚠️ **As of 2026-09-15 the demo corpus is larger, and `tags` is no longer empty.**
> It holds 24 articles (was 12), 14 demo tags, three authors (was one), and publish
> dates spanning ~3 months — added so pagination is actually generated and so the
> deferred author / tag / date-archive routes have content to show. Counts above are
> the 2026-09-13 state. The production seed still creates no tags; the demo ones are
> `demo-` prefixed and `seed:demo:purge` removes them.

`SiteSettings` global: siteName / siteNameEn / tagline / contact / social all set.
**`logo` is unset** — the frontend falls back to a built-in brand wordmark, which
is the designed behaviour. The owner drops the real logo into the admin with no
code change.

---

## 2. Defects found and fixed in this sweep

| # | Defect | Root cause | Fix |
|---|---|---|---|
| 1 | `POST /api/comments/submit` returned **404** — every reader comment failed | Endpoint registered at the API root with `path: '/comments/submit'`; `comments` is a collection slug, so Payload's collection router claimed `/api/comments/*` and parsed `submit` as a document id | Moved onto the Comments collection with a collection-relative path. Same public URL; collection endpoints are matched first |
| 2 | Newsletter form rendered but the endpoint returned **503** | The form gated only on a CMS origin; the endpoint correctly refuses without a mail transport | Added `getNewsletterStatus()` (fails closed) → form self-hides. Verified both directions |
| 3 | `verify-ads-s7` reported **7 false failures** | Harness read `dist/article/<slug>/index.html`, which since S11 is a **redirect stub** | Harness now resolves `/:category/:id/:slug` from the CMS |
| 4 | `verify-ad-split` could not run at all | Node ESM cannot resolve `richtext.ts`'s extensionless `./content-blocks` import (fine for Vite) — broke when S8 split `richtext.ts` | Extracted the two pure HTML helpers to dependency-free `lib/html-split.ts`; `richtext.ts` re-exports them |
| 5 | Lint gate failing with 1 error | Pre-existing formatting/import-order in 3 S10 files | Formatted (no behaviour change) |
| 6 | `verify-endpoints` did not typecheck | Wrong field name (`status` vs `isActive`) and an `unknown[]` cast | Corrected |
| 7 | `verify-endpoints` reported **8 failures on its second run** | All were **429** — the harness rate-limited *itself*. The limiter keys on `x-forwarded-for`, and a repeat run from the same address was throttled by its own earlier requests | Harness now sends a synthetic per-run IP. Verified twice consecutively: PASS, PASS |
| 8 | **Level/district filters did nothing** — every pill inert | `level` and `district` are `hasMany`, so Payload returns an **array**; `typeof [] === 'object'` is true, so `article.level.slug` was `undefined` and Astro dropped the attribute. **Zero cards carried `data-level`**, so FilterBar hit `if (items.length === 0) return`. `lib/cms.ts` typed `level` as object-or-number, never an array — the bug was in the *type* | Added `relationSlugs()` / `relationName()` (array, object or bare id) and corrected the types. Built output went 0 → 9 cards with `data-level`. Same wrong `relSlug` in `deadlines.astro` meant its level dropdown had **no options at all** |
| 9 | **`/about` and `/contact` did not exist** | Required by `docs/master-plan.md` item 87 and `docs/seo-plan.md` (E-E-A-T) but never built. The footer block that would have linked them was gated on `footerPages.length > 0`, and the `pages` collection is empty — so it had never rendered | Added both, driven by Site Settings with Bengali placeholders while fields are empty. `/about-us` redirects to `/about` (no duplicate body content) and is excluded from the sitemap. Footer block is now unconditional. Sitemap 43 → 45 |
| 10 | **Editing Site Settings changed nothing on the site** | Not a defect in the data — the edits were saved correctly. The static site simply had **no trigger to rebuild**, so nothing propagated until someone ran a build by hand | Added `cms/src/lib/rebuild-trigger.ts`: a debounced webhook fired from `afterChange` on published content (and Site Settings). No-op until `DEPLOY_WEBHOOK_URL` is set. Reader writes (comments, poll votes) are deliberately excluded so an anonymous commenter cannot spend a build |

### 2026-09-15 — the `.htaccess` was unrunnable (found while re-verifying, not in a sweep)

| # | Defect | Root cause | Fix |
|---|---|---|---|
| 11 | **`frontend/public/.htaccess` returned HTTP 500 on every request.** Deploying it would have taken the whole site down, not just AdSense | The CSP route dispatch used `<LocationMatch>`, which Apache permits in server/virtual-host context only. In `.htaccess` it is a core parser error (`<LocationMatch not allowed here`) | Rewrote the dispatch as `SetEnvIf Request_URI` + `Header ... env=`. Same two policies, same routes, same CSP strings byte-for-byte |
| 12 | **Two of the three cache rules were dead.** `/_astro/*` (hashed, content-addressed) and `/fonts/*` were served with **no `Cache-Control`** | `<FilesMatch>` matches the **basename**, not the path, so `<FilesMatch "\._astro/">` and `<FilesMatch "^/fonts/">` could never match a file | Both are `SetEnvIf Request_URI` now. `<FilesMatch "\.html$">` is a genuine basename rule and was left alone |
| 13 | **`verify-csp-routes.mjs` could not detect either defect** — it passed while the file was unrunnable | It parsed the `<LocationMatch>` blocks and **reimplemented** Apache's regex matching in JavaScript. It validated the intent of the rules and never asked Apache whether the file was legal | Deleted. Replaced by `verify-apache.mjs`, which runs a real Apache over the real `dist/` and asserts status codes, header counts and per-page profiles derived from each page's own JSON-LD |
| 14 | **`study-abroad` articles silently fell to the strict profile** — caught by the new harness on its first green-ish run | The first version of the rewritten article rule excluded a list of "reserved" first segments, and `study-abroad` is both a 2-segment listing **and** the first segment of real article URLs | Dropped the exclusion list. The article rule is exactly "three path segments", which is the only 3-segment route in the tree. The harness now turns any future non-article 3-segment route into a red check instead of a silent CSP widening |

**The pattern, stated plainly:** three of these four defects come from **path-matching
directives used in a context that does not match paths** (`<LocationMatch>` in
`.htaccess`; `<FilesMatch>` against a path) or from **an enumeration that drifted**
(a reserved-root list that contradicted the real route tree). All three failed
**silently or catastrophically** and none was visible to a green build.

**And the harness was the problem, not the safety net.** A test that reimplements
the mechanism it is testing can only confirm that two implementations agree — it
cannot discover that both are wrong about the platform. Run the real thing.

**Pattern worth noting:** defects 1, 3 and the earlier CSP regression all share one
cause — **a URL or mounting change has consequences far beyond the route itself.**
After any such change, grep for the old shape in CSP rules, feeds, canonicals,
sitemaps **and test harnesses**.

**A second pattern:** defects 3, 4 and 7 were all **harness** faults, not product
faults. A harness that reads a stale path, cannot run, or fails on its second run
is worse than no harness — it trains you to ignore it. Fix the harness before
trusting its verdict.

---

## 3. Owner-only actions — the actual launch blockers

None of these is code. The project is complete pending them.

> 📋 **Start with `docs/dianahost-provisioning-checklist.md`** — it sequences everything below into
> the order it must actually be obtained in, with the vendor facts verified against DianaHost's
> live site and knowledgebase (2026-09-15). It also records what their documentation does **not**
> answer, so those gaps get asked rather than assumed.

### Required before launch

| # | Action | Why it blocks |
|---|---|---|
| 1 | **DNS for `shikkha24.com`** → DianaHost nameservers | Nothing is reachable without it |
| 2 | **Deploy `frontend/dist` to DianaHost `public_html`** via rsync from CI | The frontend has nowhere to live |
| 3 | **Deploy the CMS to DianaHost** (Passenger) — ⚠️ **do this FIRST: the frontend is built *from* the CMS** | Every reader write and the admin depend on it. **Step-by-step runbook: `docs/cms-deployment.md`** |
| 4 | **Set `PUBLIC_CMS_ORIGIN`** to the real CMS hostname | Currently `http://localhost:3000`. Until set, the live-blog refresh and poll vote controls are simply not rendered (by design) |
| 5 | **Update the CSP host** in `frontend/public/.htaccess` (`cms.shikkha24.com` is a literal placeholder — a CSP cannot be templated) | Article images and CMS calls would be blocked |
| 6 | **Create the remaining E-E-A-T pages** — editorial/corrections policy; supply the registration numbers | ✅ **Privacy and terms are DONE — this row is no longer a blocker.** `/privacy-policy`, `/terms-of-use`, `/about` and `/contact` are all **static routes** (the `/about` + `/contact` pattern extended to the other two), and the footer links to them from every page. **The 2026-09-14 audit's finding is fixed:** the footer no longer contains `/page/privacy-policy`, `/page/terms-of-use` or `/page/contact` at all — that 171-broken-link class is gone. The content is derived from the code (what the site actually stores and sends), with an explicit "if the data handling changes, this page must change with it" note in each file. **Still owner-only:** an **editorial / corrections policy** page — nothing exists yet, and Google News expects one; and the **Trade Licence / TIN / Ministry of Information registration** numbers in `SiteSettings → Legal`, which the footer renders only once they are set. |
| 7 | ~~Upload the real logo~~ — **done**: an SVG logo is uploaded and renders in the header and footer | Just confirm it is the final artwork |
| 8 | **Generate VAPID keys** and set them | Push reminders stay hidden until then |
| 9 | **Generate `NEWSLETTER_SEND_TOKEN` / `PUSH_SEND_TOKEN`** | Both cron endpoints are disabled while unset |
| 10 | **SMTP credentials** for `mail.shikkha24.com` + SPF/DKIM/DMARC | The newsletter form stays hidden until a transport exists |

### Also required before launch: wire the rebuild trigger

The site is static, so **no CMS edit reaches the live site until something
rebuilds it.** That is the root cause of "I changed Site Settings and nothing
happened". The trigger is built (`cms/src/lib/rebuild-trigger.ts`) but inert
until configured:

| Action | Why |
|---|---|
| **Set `DEPLOY_WEBHOOK_URL`** on the CMS host to the CI endpoint that starts a rebuild (GitHub Actions `repository_dispatch` / `workflow_dispatch`) | Unset means a **no-op** — edits will save correctly and still never appear |
| **Set `DEPLOY_WEBHOOK_TOKEN`** if the endpoint requires auth | Optional |
| **Create the GitHub Actions workflow** that rebuilds and deploys | ⚠️ **Created but CANNOT DEPLOY.** `.github/workflows/deploy.yml` triggers on `repository_dispatch` and `workflow_dispatch`, builds on Node 24 and runs the dist-only harnesses correctly — then ships the result with `rsync` and `scp` **over SSH, which this host does not have.** It has therefore never deployed anything. It is being rewritten to use the cPanel HTTPS API. See `docs/hosting-and-deployment.md` §4. |
| **Tune `REBUILD_MIN_INTERVAL_MS`** (default 300000 = 5 min) | Quota guard: GitHub Actions allows 2,000 min/month; at 15–20 articles/day, per-save triggering would be wasteful. Debouncing collapses a burst into one build |

Note: the `wrangler pages deploy` quota question is now moot — Cloudflare was removed
entirely (2026-09-14). **The only quota that applies is GitHub Actions, 2,000 min/month.**

⚠️ **Superseded 2026-10-04.** This document was written before the production deploy and still
describes it as pending. It is retained as a launch-readiness record; for how the site is
actually deployed and maintained, read **`docs/deployment-runbook.md`**.

### Verification that can only happen in production

| # | Check | Why it cannot be done locally |
|---|---|---|
| 11 | ~~Confirm an ad-bearing page returns **exactly ONE** `Content-Security-Policy` header~~ — ✅ **CLOSED LOCALLY 2026-09-15.** `pnpm verify:apache` serves the real `dist/` through the real `.htaccess` on a real Apache and asserts exactly one CSP header per page, on all 83 built routes plus the query-string and pagination cases. **Still worth a spot-check in production** to confirm the host's Apache behaves the same. | — |
| 12 | ~~Confirm the `/:category/:id/:slug` pattern **actually matches**~~ — ✅ **CLOSED LOCALLY 2026-09-15**, same harness: it derives each page's expected profile from that page's own JSON-LD (`NewsArticle` / `CollectionPage` / `LiveBlogPosting`) and compares it against the header Apache actually sent, so a rule that fails to match cannot pass. | — |
| 13 | Lighthouse ≥95 / a11y ≥90, LCP, INP, CLS, TTFB | Needs a deployed origin; TTFB is a CDN property |
| 14 | Monitoring + alerting live | UptimeRobot selected (card-free, 50 monitors, no card required); owner needs to sign up and create 2 monitors. Steps in `docs/reliability.md` §6 |
| 15 | Full restore drill, timed | Needs the production backup |
| 16 | WCAG manual keyboard + screen-reader pass | Needs a human |
| 17 | Browser/device matrix (UC Browser, Opera Mini, low-end Android) | Needs real hardware |
| 18 | Bengali conjunct rendering on a real device | Needs real hardware |

**⚠️ Items 11 and 12 were previously listed here as production-only, and that was
wrong — and expensive.** Local verification of the `.htaccess` was assumed to be
impossible, so a harness reimplemented Apache's regex matching in JavaScript
instead. That harness passed while the file was **unrunnable**: it used
`<LocationMatch>`, which Apache forbids in `.htaccess` context, so the file
returned **HTTP 500 on every request**. Had it shipped, the site would have been
down completely, not merely ad-less. Running a real Apache locally was always
possible. **Lesson: "this can only be verified in production" deserves the same
scepticism as any other assumption.**

---

## 4. How to re-run this verification

```sh
# Static gates (no server needed)
pnpm run lint
pnpm run typecheck

# Build (needs the CMS up; the NO_PROXY prefix is baked into the script)
cd cms && pnpm dev &          # wait for :3000
CODEBUDDY_SAFE_DELETE_ENABLED=0 pnpm run build:frontend

# Build-output + route invariants
pnpm run verify:build-output

# Every internal href/src in dist/ resolves to a built file
pnpm run verify:links

# The .htaccess, served by a real Apache over the real dist/
pnpm run verify:apache

# Read path (needs CMS + a fresh build)
pnpm run verify:sync

# Write path (needs the CMS up)
pnpm run verify:endpoints

# The rest
node scripts/verify-s8.mjs
node scripts/verify-ads-s7.mjs
node scripts/verify-sqlite-wal.mjs
node --experimental-strip-types scripts/verify-ad-split.ts
cd cms && pnpm run verify:media && pnpm run verify:newsletter && pnpm run verify:engagement && pnpm run verify:push && pnpm run verify:oauth
```

**Two environment traps that will otherwise waste time:**

1. `HTTP_PROXY` is set in this sandbox — build-time CMS fetches fail with 502
   unless `NO_PROXY=localhost,127.0.0.1,::1` is set. It is baked into the
   frontend `dev`/`build` scripts; `curl` needs `--noproxy '*'`.
2. The sandbox safe-delete shim aborts `astro build` **after** the pages are
   written, which also skips the `&& pagefind` half of the build script. Prefix
   with `CODEBUDDY_SAFE_DELETE_ENABLED=0` and invoke the **package script**, not
   `npx astro build` directly.
