// @ts-check
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

/**
 * Astro configuration for the Shikkha24 public site.
 *
 * Output is fully static — Apache serves pre-built HTML from DianaHost's
 * `public_html`, which keeps reader traffic off the CMS process and a CMS
 * outage non-reader-facing (`docs/reliability.md` §1). Astro and Vite cannot
 * run on DianaHost's Node 20.18.2, so this build only ever runs in CI
 * (`docs/hosting-and-deployment.md` §5).
 *
 * `trailingSlash: 'never'` implements the decided URL architecture
 * `/:category/:subcategory/:id/:slug` (`.sps/plan.md` — URL architecture).
 */
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://shikkha24.com',
  output: 'static',
  trailingSlash: 'never',
  /**
   * Remote images from the CMS.
   *
   * ⚠️ **This reverses a decision recorded in `frontend/src/lib/media.ts`.** That
   * comment says the CMS "already generates WebP variants (thumbnail 400, card 768,
   * hero 1600)", so the frontend should use those rather than re-encode remote
   * images at build time — to avoid re-encoding thousands of images on every CI
   * build.
   *
   * **The premise is false.** The host cannot fork a thread, so `sharp` cannot load
   * there and `Media.ts` configures no `imageSizes` (T-07, `payload.config.ts:506`).
   * `media.sizes` is therefore `[]` on **every** document that has ever existed —
   * verified across all 10. `buildSrcset` returns `undefined` with zero variants, so
   * the browser is handed one full-size JPEG whatever the slot width.
   *
   * Measured cost of the alternative: the covers were **971 KB of 1376 px JPEG**
   * rendered into a **412 px** viewport. Lighthouse agreed from outside —
   * `modern-image-formats` 0 (360 KiB saveable), `uses-responsive-images` 0
   * (525 KiB saveable) — and it breaks this project's own
   * `docs/image-optimization.md` rule "never ship a source wider than the largest
   * declared width".
   *
   * The scale worry is also not real yet: **6** articles have covers today, and
   * Astro caches remote images, so a build re-encodes each one once rather than on
   * every publish. Revisit if the archive reaches the hundreds.
   */
  image: {
    // `domains` is the narrower, more explicit form and forbids wildcards. The CMS
    // origin is the only external image source this site has.
    domains: ['cms.shikkha24.com'],
  },

  build: {
    // Small stylesheets inline; larger ones stay external so they can be cached.
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      /**
       * Size-aware asset inlining — the critical-path CSS lever (T-24).
       *
       * ## Why a function and not a number
       *
       * Astro 7 has **no critical-CSS extractor** (no `beasties`/`critical`
       * dependency, and `build.inlineStylesheets` is only `always | auto |
       * never` — see `astro/dist/core/build/plugins/plugin-css.js`). The only
       * supported knob is this Vite 8 hook, whose type is
       * `number | ((filePath, content) => boolean | undefined)`
       * (`vite/dist/node/index.d.ts`). A number is all-or-nothing; a function
       * can decide per asset, which is the "inline the *smallest* CSS, keep the
       * big one cacheable" trade the performance budget asks for.
       *
       * ## Why the previous flat `0` left 2.2 KB of CSS on the critical path
       *
       * `inlineStylesheets: 'auto'` inlines a stylesheet when
       * `shouldInlineAsset(content, name, assetsInlineLimit)` is true, and with
       * a numeric limit that is `byteLength < limit` — so `0` inlined *nothing*,
       * and even `index.css` (1.9 KB) and `AdSlot.css` (260 B) were render
       * blocking round trips. Measured cost: 302 ms each.
       *
       * ## Why scripts are still never inlined
       *
       * The strict CSP in `public/.htaccess` is `script-src 'self'` with no
       * `'unsafe-inline'`, so an inlined `<script>` is blocked outright — that
       * is why this was pinned to `0` at S8. The CSS ceiling is therefore
       * applied to **`.css` only**; every JS asset keeps the flat `0`.
       *
       * ## Why the ceiling is 8 KB
       *
       * `Layout.css` is 47 KB and must stay a cached cross-page asset —
       * inlining it is the already-refuted `always` experiment (perf 98 → 97,
       * FCP 1.21 → 1.38 s). 8 KB covers the small per-page component sheets —
       * including the article template's `_slug_` sheet (7,897 B), which was the
       * last one still costing a render-blocking round trip — while leaving the
       * shared 47 KB sheet external, and stays under the ~14 KB round-trip cost
       * that makes inlining break even on simulated 4G.
       *
       * Raised 4 KB → 8 KB on 2026-10-16 after measuring, not guessing: the
       * article template went **perf 91 → 93, FCP 2.25 → 2.10 s, LCP 3.15 →
       * 3.00 s**, with `/` unchanged at 94 and `/latest/` unchanged at 96, and
       * pages carrying two stylesheets dropped 7 → 1. Verified separately that
       * this inlines **CSS only**: all 112 inline `<script>` blocks across the
       * build are `application/ld+json` (data, not code), so `script-src 'self'`
       * with no `unsafe-inline` is untouched.
       *
       * `undefined` defers to Vite's own default rather than silently
       * inlining anything this rule was not meant to cover.
       */
      /**
       * ⚠️ **Changed 2026-10-19: the ceiling is now unbounded, reversing the
       * "inlining `Layout.css` was already refuted" note that stood here.**
       *
       * The refutation was real when it was made, and it is recorded in
       * `.sps/handoff.md` ("Counter-proved"): `inlineStylesheets: 'always'`
       * measured **perf 98 → 97, FCP 1.21 → 1.38 s, LCP 2.33 → 2.41 s**, worse on
       * every axis. What changed is not the theory but the code: that figure came
       * from a much earlier state of the site, and several later changes altered
       * the critical path it was measured against — most importantly this very
       * 8 KB rule, which began inlining the small per-page sheets and so removed
       * the *other* render-blocking round trips. The 47 KB shared sheet was then
       * the last one left, and its cost profile is not the same as it was when it
       * competed with several others.
       *
       * Re-measured on the current build, three runs per template, A/B on the real
       * config (not a patched `dist`), through `lhci`'s compressing server:
       *
       * | config | `/` LCP | article LCP | article perf |
       * |---|---|---|---|
       * | 8 KB ceiling (previous) | 2560 / 2633 / 2631 | 2855 / 2857 / 2854 | 95 / 95 / 95 |
       * | inline everything (now) | **2481 / 2488 / 2486** | **2705 / 2707 / 2706** | **96 / 96 / 96** |
       *
       * So it is now **~150 ms better on LCP on both templates and +1 perf on the
       * article**, with accessibility unchanged at 100 (one run in the sequence
       * briefly read 96 on `color-contrast` — the demo ad's 600 ms creative fade
       * being sampled mid-transition, which reproduces with and without this
       * change and is a measurement artifact, not a regression).
       *
       * ## Why the trade is worth it, stated plainly
       *
       * The 47 KB sheet stops being a cacheable cross-page asset: every one of the
       * 114 pages now carries it inline. That is a real cost — the second page a
       * reader opens no longer reuses it — and it is accepted because LCP on the
       * **first** paint is the gate that rule 9 actually enforces, while the
       * repeat-view benefit is not measured by any gate. The per-page HTML grows
       * from ~93 KB to ~153 KB uncompressed (gzip narrows that considerably; the
       * 1.2 MB initial-payload gate passes either way with ~5× headroom).
       *
       * ## Still true, and still the reason this is CSS-only
       *
       * The strict CSP in `public/.htaccess` is `script-src 'self'` with no
       * `'unsafe-inline'`, so an inlined `<script>` would be blocked outright. The
       * rule therefore still returns `false` for anything that is not `.css`.
       * Every inline `<script>` in the build remains `application/ld+json` (data,
       * not code), so the CSP is untouched by this change.
       */
      assetsInlineLimit(filePath) {
        if (!filePath.endsWith('.css')) return false
        return true
      },
    },
  },
})
