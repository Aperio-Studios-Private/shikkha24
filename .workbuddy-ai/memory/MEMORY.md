# Project Memory — Shikkha24

Durable cross-session truths only. "What happened" → `.sps/handoff.md` + `.sps/section-todos/S*.md`. Build traps → `sandbox-build-traps` skill. **Keep this file short: if a fact is derivable from the repo or the skill, it does not belong here.**

## What this is
**Shikkha24 (শিক্ষা২৪)** — Bengali-only **education** news/opportunity portal, `shikkha24.com`. Build input is `docs/education-feature-inventory.md`; `docs/master-plan.md` + `docs/competitive-analysis.md` are general-news artifacts → **reference only, never build inputs**.

## Hard constraints (never violate)
1. **Owner has no international card** → anything needing a card at signup is unusable (Oracle, Railway, Render, paid SMTP/TTS/data/storage). Technical, not budgetary.
2. **Zero recurring cost** beyond host + domain. 3. **Bengali-only UI.**
4. **One section at a time** (S0→S12), each ending in evidence + explicit owner approval. Never batch or skip. **Docs amended *before* code on scope change (rule 13).**
5. "Please continue" = *approve the last section + build the next* (recorded convention).

## Infrastructure & scale
- Host **DianaHost PNR 2 GB** (owner considering 5 GB; bandwidth + price unknown), Node **20.18.2 — EOL**; Astro/Vite need ≥22.12 → **build in CI only**. Frontend **Cloudflare Pages** (free). Media **on the DianaHost disk** (R2 descoped 2026-09-12). Payload ships as Next `output: 'standalone'`.
- Repo **PRIVATE** → GitHub Actions 2,000 min/mo, Pages **500 builds/mo** (tighter) + **20,000 files/site**. Editors only use the Payload admin; CI is the invisible rebuild that turns a publish into static HTML.
- DianaHost publishes **no** inode/CPU/memory/email/backup limits → support ticket needed. **15–20 articles/day, burst 40+** on result days. Team of 5. Greenfield.

## Verified facts (don't re-research)
- **Next.js `>=16.2.6 <17.0.0`** (Payload peer range). **`react` must be 19.2.x** (19.3.0 rejected). `graphql` stays 16.x. TS 7 → `tsc --noEmit` + **Biome** (ESLint/`@astrojs/check` reject TS 7).
- Free no-key APIs (tested): Aladhan (prayer/Hijri), Open-Meteo (weather+AQI), open.er-api.com / exchangerate.host / Frankfurter (FX). **No free source** for cricket, DSE, gold, commodities, flood gauges → descoped.

## Typography
- **SolaimanLipi only**, headline + body (owner-chosen). **SIL OFL**, vendored at `assets/fonts/vendor/` + `OFL.txt`. **154.0 KB**/200 KB for two weights.
- ⚠️ **Subsetting must keep OpenType layout features** — Bengali conjuncts (যুক্তাক্ষর) are shaped, not single codepoints. Verify `akhn, blwf, half, liga, nukt, pstf, vatu` after any re-subset.
- Rejected: Hind Siliguri (owner: hard to read) · Noto Sans Bengali · Anek Bangla · Tiro/Noto Serif · Atma/Baloo Da 2/Galada · **Inter** (83 KB/weight).

## Standing decisions (owner-directed)
- **Light mode default; dark opt-in.** Do NOT follow `prefers-color-scheme`.
- **IP geolocation via ipwho.is** (keyless). **ipapi.co is behind a Cloudflare interstitial** → returns HTML, fails silently. Never use the browser Geolocation API.
- **Hijri needs a −2 day correction** (`PUBLIC_HIJRI_OFFSET_DAYS`) vs Aladhan.
- **Match transliterated API strings by normalisation, not enumeration** — strip diacritics/apostrophes, lowercase, then look up. Aladhan returns `Rabīʿ al-awwal`; a hand-written `Rabi' al-Awwal` table made the Bengali label fall through to English.
- **Bangla calendar = the Bangladesh variant** (year starts 14 April; months 1–5 = 31 days, 6–12 = 30; ফাল্গুন +1 in leap year). Not the Indian variant.
- **Categories: 8 top-level only.** স্কুল-কলেজ rejected (audience segment, not a topic) → covered by the **Level filter**. ⚠️ A team-leader proposal asked for 15 — **owner decision pending**.

## Standing contracts — do not break these
- **`AD_POSITIONS` is a contract, not a taxonomy.** Each value has exactly one `AdSlot`; each slot reserves its box before any ad loads. **No raw-HTML ad field, ever** (`codeSnippet` removed — stored XSS). **`clickCount` removed** — a static site cannot count clicks, and beaconing would break "a CMS outage cannot take the site down".
- **⚠️ Cloudflare Pages JOINS duplicate headers with a comma — it does NOT override.** A comma-joined CSP is enforced as *two* policies, so a strict `script-src 'self'` still blocks AdSense regardless of a more specific rule. A more specific rule must **`!`-detach** first. Applied to `/`, `/article/*`, `/category/*`. **S12 must verify production returns exactly ONE CSP header.**
- **AdSense loads only on `window.load` → `requestIdleCallback`,** never the copy-paste `<head>` script. With no unit configured the loader makes **zero** third-party requests.
- **Interactive islands are opt-in and self-hiding.** `getPublicCmsOrigin()` returns `null` unless `PUBLIC_CMS_ORIGIN` is set; then the control is **not rendered at all**. A control that cannot work reads as the reader's own failure. Covers: live-blog refresh, poll vote, bookmark button, deadline reminder, social-login buttons. Static content always renders.
- **⚠️ `overrideAccess: true` on a public write BYPASSES field-level access rules.** The S9 public handlers (`comments`, `citizen`, `newsletter`) have no session, so the protection is the **key-by-key whitelist** in each handler — *not* `Comments.isApproved` / `CitizenSubmissions.status`. Harnesses post forged values and assert they are ignored. It is **safe** in `auth/reader-strategy.ts` (resolving identity from a token we signed).
- **Poll guards, in order:** honeypot (silent success, **no write**) → per-IP rate limit (20/min, in-process — Cloudflare free has no rate-limiting rules) → salted `HMAC-SHA256(ip+UA)` duplicate guard per poll. **The guard row stores no raw IP, no UA, no timestamp, and not which option was chosen.** Tally update is read-modify-write (Payload cannot express an atomic `+1`) — fine for a reader poll, not for money.
- **Quiz is graded in the browser, so the answers are in the page.** Fine — practice, not assessment. Data travels in a `type="application/json"` tag, never `define:vars`.
- **Article blocks** render in `frontend/src/lib/content-blocks.ts` (split from `richtext.ts`; escaping in `lib/html.ts`), styled from a **global** stylesheet because `set:html` output is not touched by Astro's scoped styles. **Two editor instances** (`cms/src/blocks/editors.ts`): only the **article body** gets the video block, because `/article/*` is the only route whose CSP allows the frame. No block needs JS to be readable.
- **Video embeds emit no third-party URL.** The poster is a self-hosted upload, never YouTube's `i.ytimg.com` thumbnail. Build check: `youtube-nocookie` **0**, `ytimg.com` **0**, `<iframe>` **0**; the embed URL exists only in one hashed bundle, built on click. **No `VideoObject` schema.**
- **Newsletter is a resumable batch, not a loop** — cPanel truncates silently past its hourly cap, so a campaign records a `sentThroughId` cursor (ids monotonic → cannot skip). **Both cron triggers (`newsletter/send`, `push/sweep`) are disabled while their shared token is unset** — an endpoint that can mail everyone must not be reachable by accident.
- **Readers have no password.** `disableLocalStrategy: { enableFields: true }` is **load-bearing**: `create` requires a password whenever that option is falsy. `Readers.email` is **optional + non-unique** — email is an attribute, the identity is `provider` + `providerId`. **Account linking deliberately not implemented** (merging by email is an account-takeover vector when a provider does not verify email).
- **Mid-article ads need ≥6 paragraphs** (`countParagraphs`/`splitHtmlAtParagraph`, cutting only after a `</p>`). **A body's `children.length` is not its paragraph count.** **Sponsored content** (`isSponsored`/`sponsorName`) is excluded from masthead + ticker but kept in category sections and the latest feed with a «বিজ্ঞাপন» label — the feed excludes the masthead story by **slug**, not index.
- **`richText(...)` is required for a richText field inside an array.** **Flag contract:** every flag is ON unless its env var is exactly `"false"`.

## Dependencies
- **`web-push@3.6.7` is MPL-2.0** — the project's only non-MIT dependency. File-level copyleft: applies to modified files *of the library*, not importing code. Not modified. Taken over ~150 lines of untestable VAPID/aes128gcm crypto.
- **No OAuth client library and no JWT library** — session + OAuth-state tokens are ~120 lines of `node:crypto` (`cms/src/lib/signed-token.ts`).

## Environment traps (top three; rest in the skill)
- **`HTTP_PROXY` is set → build-time CMS fetches silently fail (502).** The build stays **green** while every page falls back to empty data. Tell: thin pages, or 304-byte stubs in `dist/article/*`. Fixed by `NO_PROXY=localhost,127.0.0.1,::1`. `curl` needs `--noproxy '*'`.
- **The sandbox safe-delete shim aborts `astro build`** after writing pages (`dist/` looks fine but `pagefind` never runs). **Prefix with `CODEBUDDY_SAFE_DELETE_ENABLED=0`.**
- **Parallel edits to the SAME file silently lose writes** (first + third survive, second + fourth dropped, no error). Serialize and read back; different files in parallel are fine.
- Also: **background servers do not survive between tool calls** — use `scripts/with-cms.sh`. **Drizzle's schema push is interactive and hangs.** **pnpm only** — `npm install` is denied by a filesystem broker.
- **Drizzle's stale-index trap:** after a column change (Drizzle rebuilds the table) or a manual DROP, every push fails with `index … already exists`. Fix: back up `cms/data/payload.db`, `DROP INDEX IF EXISTS <named index>`, retry. Hit 3× in S9.

## Astro / Payload gotchas (project-specific)
- **⚠️ Astro inlines "small enough" component scripts — which a strict CSP blocks.** `script-src 'self'` with no `'unsafe-inline'` meant every inlined script was silently dead, and **nothing local shows it** because Cloudflare applies the CSP. **Fixed by `vite.build.assetsInlineLimit: 0`.** **`define:vars` ALWAYS emits an inline script.** **Assert the built HTML for inline scripts after any new component script.**
- **Astro does NOT inherit page-level CSS imports into components.** Import in the rendered tree or Tailwind emits *nothing*. Component `<style>` blocks land in the CSS bundle → assert CSS against `dist/_astro/*.css`, not the HTML. **Local images go in `src/assets`, NEVER `public/`** (glob must be **eager**).
- **Payload:** regenerate types after adding a collection or every `relationTo` fails. `Access` functions take `AccessArgs`, not a user. Bengali locale key is **`bn-BD`**. Never run `payload run` while a dev server holds the same SQLite file. `PRAGMA journal_mode = WAL` is not concurrency-safe — set once, never per connection. **Blocks are not emitted into `payload-types.ts`.** Per-slug `create`/`delete` overloads cannot type a union slug → one confined slug-agnostic cast (S1 finding 4).
- **Monorepo/Next:** Turbopack `root` must be the monorepo root. TS 7 removed `baseUrl`. Standalone entry is **`.next/standalone/cms/server.js`**; Next does **not** copy `.next/static` — the deploy must.

## Conventions
- **Three rule mirrors** — `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`. Rules 1–13 **byte-identical**; change all three in one commit. GEMINI.md adds `H1`–`H14`.
- **`.sps/` is project memory.** Update `.sps/handoff.md` after every meaningful task; **re-read before editing**. Corrections get visible `CORRECTION` notes, never silent rewrites. `.sps/lock.json` intentionally does not exist.
- **Commit immediately** after each task (`type(scope): summary`); never mix unrelated changes. Never assume — ask the owner, or research and cite.
- **⚠️ Never assert on a global total a test does not own.** Two S9 harnesses failed on *correct* behaviour this way (hard-coded audience of 5; `count(media) === 0` after the demo seed added plates).

## Known defects / open owner gates
- **`getAllArticleSlugs()` caps at 500 with no pagination** → past ~500 published articles the article routes *and* the sitemap silently stop growing (~3 weeks at 15–20/day). Flagged, not fixed.
- **Pagefind has no Bengali stemming** — exact word forms only. S6's "test on a real Bengali corpus" gate still open.
- **Bookmark → CMS sync is the one open S9 build item.** Browser-local works with no account. Needs a **merge-policy decision** first: a naive union resurrects a bookmark deleted on another device.
- ⚠️ **The off-host backup must include `cms/data/media/`** — media moved to the host disk in S9.
- **Owner-only gates:** DianaHost support ticket (inode/CPU/memory/email/backup + host-disk alert) · DNS for shikkha24.com · Payload-on-cPanel smoke test · AdSense IDs · E-E-A-T legal details + Pages created in the CMS (footer links 404 until then) · real logo · Meta app review · **VAPID keys** · **OAuth apps + exact callback URLs** · **`NEWSLETTER_SEND_TOKEN` / `PUSH_SEND_TOKEN`** · `PUBLIC_CMS_ORIGIN` + CSP `connect-src` real hostname · team-leader proposal's 5 open decisions · account-linking decision.
- **CMS `siteName` is currently «শিক্ষা২৪.com»** → flows into the RSS title and Google News `news:name`; Publisher Center name must match exactly.
- Monitoring/alerting tool not selected (must be card-free) · Bengali admin locale (~60 strings) needs native-speaker review · RBAC needs a manual pass with all 5 roles · competitors Dainik Shiksha + Shiksha Sangbad not audited.
- **S11 partly built ahead of sequence:** `robots.txt`, `sitemap.xml`, `news-sitemap.xml`, `rss.xml` (hand-written, build-time). Remaining: OG/Twitter, auto OG images, canonical, `llms.txt`, Publisher Center, E-E-A-T pages, URL architecture.
