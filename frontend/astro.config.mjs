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
       * ## Why the ceiling is 4 KB
       *
       * `Layout.css` is 47 KB and must stay a cached cross-page asset —
       * inlining it is the already-refuted `always` experiment (perf 98 → 97,
       * FCP 1.21 → 1.38 s). 4 KB covers the small per-page component sheets
       * while leaving the shared one external, and is below the ~14 KB
       * round-trip cost that makes inlining break even on simulated 4G.
       *
       * `undefined` defers to Vite's own default rather than silently
       * inlining anything this rule was not meant to cover.
       */
      assetsInlineLimit(filePath, content) {
        if (!filePath.endsWith('.css')) return false
        return content.byteLength < 4096
      },
    },
  },
})
