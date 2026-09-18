# Project Memory — Shikkha24

Durable truths only. Detail → `.sps/handoff.md` + `.sps/section-todos/S*.md`. Traps → `sandbox-build-traps` skill. If derivable from repo or skill, it does not belong here.

## What this is
**Shikkha24 (শিক্ষা২৪)** — Bengali-only **education** news portal, `shikkha24.com`. Build input: `docs/education-feature-inventory.md`. `docs/master-plan.md` + `docs/competitive-analysis.md` → reference only.

## Hard constraints (never violate)
1. **Owner has no international card** → no service needing a card at signup (Oracle, Railway, Render, paid SMTP/TTS/data/storage).
2. **Zero recurring cost** beyond DianaHost PNR + domain. 3. **Bengali-only UI.**
4. **One section at a time** (S0→S12), approval-gated, docs before code (rule 13). 5. "Please continue" = approve last + build next.

## Infrastructure
DianaHost PNR 2 GB, Node 20.18.2 (EOL) → build in CI only. Frontend: **DianaHost `public_html` via rsync** (Cloudflare removed 2026-09-14 — nothing on Cloudflare). Media: **host disk** (R2 descoped). Payload as Next `output: 'standalone'`. 15–20 articles/day, burst 40+, team of 5.

## ⚠️ The frontend is STATIC — a CMS edit does not change the site
The CMS is read **at build time only**. Editing `/admin` changes the database and nothing else; a rebuild is what publishes it. **When the owner says "I changed it in the CMS and nothing happened", check the build before the code.** Locally: `scripts/with-cms.sh bash -c "pnpm run build:frontend"` (a plain `build:frontend` is a **34-page thin build**; the real one is **147 pages**). In production `DEPLOY_WEBHOOK_URL` is what triggers it — currently **unset**, and the CMS says so in its own admin description now.
- ⚠️ **Media URLs must go through `mediaUrl()`.** Payload stores a **relative** `/api/media/file/…` and the static host serves no `/api/`, so a raw `src={x.url}` is a silent 404 in the browser (green build, valid markup). `AdCreative.astro` shipped that bug until 2026-09-18. `verify:links` catches this class — but only once content referencing it exists.
- ⚠️ **`cmsFetch`'s response cache is disabled in dev** (`CACHE_ENABLED = !import.meta.env.DEV`). It is a build-time concurrency control; with no invalidation it froze CMS data for the life of an `astro dev` process.

## Verified facts (don't re-research)
- Next.js `>=16.2.6 <17.0.0`, `react` 19.2.x, `graphql` 16.x. TS 7 → `tsc --noEmit` + Biome (ESLint/`@astrojs/check` reject TS 7).
- Free no-key APIs: Aladhan, Open-Meteo, open.er-api.com / exchangerate.host / Frankfurter. No free source for cricket/DSE/gold → descoped.

## Typography
**SolaimanLipi only** (SIL OFL, vendored, 154 KB). ⚠️ **Subsetting must keep OpenType layout features** — Bengali conjuncts are shaped; verify `akhn, blwf, half, liga, nukt, pstf, vatu`. Rejected: Hind Siliguri, Noto, Anek, Inter.

## Top standing decisions (owner-directed)
- Light mode default; dark opt-in. Do NOT follow `prefers-color-scheme`.
- IP geolocation via **ipwho.is** (ipapi.co behind Cloudflare interstitial). Never use browser Geolocation API.
- Hijri needs **−2 day correction** vs Aladhan. Match transliterated strings by **normalisation**, not enumeration. Bangla calendar = **Bangladesh variant**.
- 8 top-level categories. স্কুল-কলেজ rejected → covered by Level filter.

## Top contracts (easy to break unknowingly)
- **`AD_POSITIONS` = contract.** No raw-HTML ad field, no `clickCount`. AdSense on `requestIdleCallback`, zero requests when unconfigured.
- **Two-profile CSP in `.htaccess` via `SetEnvIf Request_URI` + `Header ... env=`.** ⚠️ **`<LocationMatch>` is ILLEGAL in `.htaccess`** — it returns HTTP 500 sitewide. ⚠️ `<FilesMatch>` matches the **basename, not the path**. ⚠️ `Request_URI` **includes the query string** (patterns need `(\?.*)?$`). **A route is relaxed because it RENDERS AN AD SLOT** (`data-ad-slot`) — not because of its JSON-LD type or its listing-ness; `/latest` is a listing and is correctly strict. Article rule = 3 segments **minus** a middle `page` (`(?!page/)`), because `/latest/page/:n` is also 3 segments. Verified by `pnpm verify:apache` — a **real Apache** over the real `dist/`; never by reimplementing the matching, and never by asserting a proxy.
- **Self-hiding islands:** `getPublicCmsOrigin()` null → control not rendered (live-blog, poll, bookmark, reminder, social login).
- **⚠️ `overrideAccess: true` bypasses field-level access** on public handlers — protection is the key-by-key whitelist.
- **Newsletter = resumable batch** (`sentThroughId`). Cron triggers disabled while token unset. Readers: no password, email optional. Account linking deliberately not implemented.
- **`vite.build.assetsInlineLimit: 0`** — Astro inlines small scripts; strict CSP blocks them. Assert 0 inline scripts.
- **Mid-article ads need ≥6 paragraphs.** Sponsored: excluded from masthead/ticker, kept in feed with «বিজ্ঞাপন». Feed excludes masthead story by **slug**.
- **⚠️ THREE CMS-host values — do not confuse.** `CMS_URL` = read at **build** time, all content is fetched from it. `PUBLIC_CMS_ORIGIN` = **browser-facing** origin for interactive islands (empty ⇒ self-hide). `PUBLIC_MEDIA_BASE_URL` = **browser-facing** origin for media; `mediaUrl()` prefixes the CMS's relative `/api/media/file/…` with it, and **unset it emits that path as-is so every article image 404s** (the static host serves no `/api/`). Setting only `PUBLIC_CMS_ORIGIN` gives a **green 32-page thin build** instead of 84. A green build ≠ a full build: always assert the **page count**, never the exit code.
- **IP forwarding:** `clientIp()` reads `x-forwarded-for` → `x-real-ip` → `unknown` (no `cf-connecting-ip` — Cloudflare removed).
- **⚠️ All date formatting MUST use `formatBnBd()` from `bangla-date.ts`.** Never call `toLocaleDateString('bn-BD')` without `timeZone: 'Asia/Dhaka'` — in UTC CI it shows the wrong day and the date-filter month key disagrees with the byline. Use `getDhakaYearMonth()` for `YYYY-MM` filter keys, never `toISOString().slice(0,7)`.
- **⚠️ `.astro` frontmatter is NOT typechecked.** `tsc` only sees `.ts/.tsx`; `@astrojs/check` (which would cover `.astro`) rejects TS 7, which is why Biome was adopted. So an identifier used in frontmatter without an import is **neither a type nor a lint error** — it is a `ReferenceError` at build time, thrown **only if that component actually renders**. The 2026-09-16 timezone fix shipped two such imports (`CommentSection`, `DeadlineStrip`) and the thin build hid both. Gate: **`pnpm verify:astro-imports`**. (Related: a thin build hides crashes, not just missing pages.)
- **⚠️ Publishing is guarded by `guardPublishStatus`, not by collection access.** `Articles.update` is `isEditorial` — it **must** include reporters so they can save drafts, so it cannot restrict publishing, and `_status` has no field-level access. The hook throws on the transition into `published` for non-editors (it throws rather than stripping, so a reporter is never told a stripped write succeeded).
- **⚠️ `isSelfOrAdmin` is for `users` only — never `authors`.** It compares the document id to the **user** id, which is right where the two are the same row and wrong for `authors`, whose link is `Users.authorProfile → authors`; the `where` matches nothing and the reporter gets a flat 403 on their own record. Use `isOwnAuthorProfileOrEditor`.
- **⚠️ The `verify-` namespace is reserved** for `verify:reporter` fixtures (author/category slugs, user emails). The harness purges it at startup and cleans up in a `finally`; a crashed run's leftovers otherwise generate **real pages** (`/reporters/verify-a-…` appeared in `dist/`).

## Environment traps (top 5; rest in `sandbox-build-traps` skill)
1. **`HTTP_PROXY` set → CMS fetches fail 502.** `NO_PROXY=localhost,127.0.0.1,::1`.
2. **Safe-delete shim aborts `astro build`** after pages written. `CODEBUDDY_SAFE_DELETE_ENABLED=0`.
3. **Parallel edits to same file silently lose writes.** Serialize; read back. ⚠️ It also drops an edit when the edits are sequential but interleaved with other tool calls — always read the value back, and after any bulk edit run a check that would catch a missing line (this is how the two missing `formatBnBd` imports were found, late).
4. **Drizzle stale-index trap:** after column change or DROP, every push fails `index … already exists`. Fix: backup DB, `DROP INDEX IF EXISTS <name>`, retry. Hit 3× in S9. ⚠️ Adding a **collection** triggers it too (`payload_locked_documents_rels` rebuilds) — expect several in a row and iterate.
5. **⚠️ Shell `grep` with `\|` alternation silently returns nothing here (zsh).** Cost two false "my edits did not land" conclusions. **Use the Grep tool**, never shell grep for alternation.

## Known defects & owner gates
~~`getAllArticleSlugs()` caps at 500~~ → ✅ Fixed (paginates now). Pagefind: no Bengali stemming. Bookmark→CMS sync needs merge-policy decision. ~~Backup must include `data/media/`~~ → ✅ Done (docs updated). S11 feeds built ahead of sequence. Full owner-gate list in `.sps/task.md`.
