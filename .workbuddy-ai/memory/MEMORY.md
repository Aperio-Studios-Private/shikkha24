# Project Memory — Shikkha24

Durable truths only. Detail → `.sps/handoff.md` + `.sps/section-todos/S*.md`. Traps → `sandbox-build-traps` skill. If derivable from repo or skill, it does not belong here.

## What this is
**Shikkha24 (শিক্ষা২৪)** — Bengali-only **education** news portal, `shikkha24.com`. Build input: `docs/education-feature-inventory.md`. `docs/master-plan.md` + `docs/competitive-analysis.md` → reference only.

## Hard constraints (never violate)
1. **Owner has no international card** → no service needing a card at signup (Oracle, Railway, Render, paid SMTP/TTS/data/storage).
2. **Zero recurring cost** beyond DianaHost PNR + domain. 3. **Bengali-only UI.**
4. **One section at a time** (S0→S12), approval-gated, docs before code (rule 13). 5. "Please continue" = approve last + build next.

## Infrastructure
DianaHost PNR 2 GB, Node 20.18.2 (EOL) → build in CI only. Frontend: Cloudflare Pages (free, 500 builds/mo). Media: **host disk** (R2 descoped). Payload as Next `output: 'standalone'`. 15–20 articles/day, burst 40+, team of 5.

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
- **~~Cloudflare JOINS duplicate CSP headers with a comma~~** → **REMOVED 2026-09-14.** Apache `.htaccess` `Header set` replaces cleanly — no comma-join. Two-profile CSP via `<LocationMatch>` regex. S12: verify ONE CSP header.
- **Self-hiding islands:** `getPublicCmsOrigin()` null → control not rendered (live-blog, poll, bookmark, reminder, social login).
- **⚠️ `overrideAccess: true` bypasses field-level access** on public handlers — protection is the key-by-key whitelist.
- **Newsletter = resumable batch** (`sentThroughId`). Cron triggers disabled while token unset. Readers: no password, email optional. Account linking deliberately not implemented.
- **`vite.build.assetsInlineLimit: 0`** — Astro inlines small scripts; strict CSP blocks them. Assert 0 inline scripts.
- **Mid-article ads need ≥6 paragraphs.** Sponsored: excluded from masthead/ticker, kept in feed with «বিজ্ঞাপন». Feed excludes masthead story by **slug**.
- **IP forwarding:** `clientIp()` reads `x-forwarded-for` → `x-real-ip` → `unknown` (no `cf-connecting-ip` — Cloudflare removed).

## Environment traps (top 4; rest in `sandbox-build-traps` skill)
1. **`HTTP_PROXY` set → CMS fetches fail 502.** `NO_PROXY=localhost,127.0.0.1,::1`.
2. **Safe-delete shim aborts `astro build`** after pages written. `CODEBUDDY_SAFE_DELETE_ENABLED=0`.
3. **Parallel edits to same file silently lose writes.** Serialize; read back.
4. **Drizzle stale-index trap:** after column change or DROP, every push fails `index … already exists`. Fix: backup DB, `DROP INDEX IF EXISTS <name>`, retry. Hit 3× in S9.

## Known defects & owner gates
~~`getAllArticleSlugs()` caps at 500~~ → ✅ Fixed (paginates now). Pagefind: no Bengali stemming. Bookmark→CMS sync needs merge-policy decision. ~~Backup must include `data/media/`~~ → ✅ Done (docs updated). S11 feeds built ahead of sequence. Full owner-gate list in `.sps/task.md`.
