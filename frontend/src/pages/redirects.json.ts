import type { APIRoute } from 'astro'
import { getAllArticlePaths } from '../lib/cms'
import { articleUrl } from '../lib/url'

/**
 * `redirects.json` — the slug → canonical-path manifest the Worker reads.
 *
 * **Why this exists:** the clean start (T-18) renumbered article IDs — the
 * content migrated from the production SQLite DB into Neon with fresh serials,
 * so `admission-policy-2027` moved from `/admission/23/…` to `/admission/10/…`.
 * Google had already indexed the old-ID URLs (GSC, 2026-10-28: four old-ID
 * URLs with impressions), and every one of them now 404s. On the Apache path a
 * `RewriteMap` could fix this; on Workers the equivalent is a manifest file the
 * Worker consults on an article-shaped 404.
 *
 * The manifest is generated at build time from the same `getAllArticlePaths`
 * call that feeds `sitemap.xml`, so the two can never disagree: a slug is in
 * the manifest exactly when it is published and in the sitemap. It is keyed by
 * slug (not slug+ID) because the slug is the part old URLs and new URLs share —
 * the old ID is stale by definition, that is the whole problem.
 *
 * The Worker imports it at request time via the ASSETS binding (see
 * `worker/redirects.ts`); the file ships in `dist/` like any asset.
 */
export const GET: APIRoute = async () => {
  const paths = await getAllArticlePaths().catch(() => [])
  const map: Record<string, string> = {}
  for (const p of paths) {
    if (!p.slug) continue
    map[p.slug] = p.categorySlug
      ? articleUrl({ id: p.id, slug: p.slug, category: { slug: p.categorySlug } })
      : `/article/${p.slug}`
  }

  return new Response(JSON.stringify(map), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
