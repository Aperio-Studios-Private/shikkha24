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
       * Force every asset — and crucially every **component script** — to be
       * emitted as a separate file with a `src` attribute.
       *
       * Astro inlines a `<script>` that is "small enough" directly into the HTML.
       * That silently breaks the site under the strict CSP in
       * `public/_headers`, which is `script-src 'self'` with no `'unsafe-inline'`:
       * every inlined script — the theme toggle, the mobile menu, the text
       * resizer, the share button — is blocked by the browser and the control
       * simply does nothing.
       *
       * Found at S8 by asserting the built HTML, not by looking at it: the CSP is
       * applied by Apache `.htaccess`, so nothing local ever showed the failure.
       * Vite's default is 4096 bytes; `0` means "never inline".
       */
      assetsInlineLimit: 0,
    },
  },
})
