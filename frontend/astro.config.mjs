// @ts-check
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

/**
 * Astro configuration for the Shikkha24 public site.
 *
 * Output is fully static — Cloudflare Pages serves pre-built HTML, which is what
 * keeps reader traffic effectively unbounded and a CMS outage non-reader-facing
 * (`docs/reliability.md` §1). Astro and Vite cannot run on DianaHost's Node
 * 20.18.2, so this build only ever runs in CI (`docs/hosting-and-deployment.md` §5).
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
  },
})
