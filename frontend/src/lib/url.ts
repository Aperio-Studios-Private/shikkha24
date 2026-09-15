/**
 * URL helpers for article links.
 *
 * The approved URL architecture (`docs/seo-plan.md` §2, `.sps/plan.md`) is
 * `/:category/:subcategory/:id/:slug`. The education category tree is flat
 * (no subcategories — see `docs/education-feature-inventory.md`), so the
 * `:subcategory` segment is omitted in practice: **`/:category/:id/:slug`**.
 *
 * The `:id` is the stable part — a headline edit changes the slug but not
 * the URL, because the ID does not move. This is why the plan chose the
 * ID-in-URL scheme over a slug-only scheme: "changing article URLs without
 * 301 redirects" is listed among the fatal SEO mistakes.
 *
 * ## Shortlink
 *
 * `/a/:id` is the ultra-short form for social sharing. It 301-redirects to
 * the full URL. On WhatsApp/Facebook a short link that still resolves is
 * more important than SEO keywords in the share URL — the `<title>` and
 * `<h1>` carry the keyword weight, not the shared URL string.
 */

/** Minimal shape needed to build an article URL. */
export interface ArticleRef {
  id: number | string
  slug: string
  category?: { slug?: string } | number | null
}

/**
 * Build the canonical article URL path: `/:category/:id/:slug`.
 *
 * Falls back to `/article/:slug` when the category slug is unknown — this
 * keeps the old route working during the transition and for articles whose
 * category relation is not populated.
 */
export function articleUrl(article: ArticleRef): string {
  const categorySlug =
    article.category && typeof article.category === 'object' ? article.category.slug : undefined

  if (categorySlug) {
    return `/${categorySlug}/${article.id}/${article.slug}`
  }
  // Fallback: old-style URL. The redirect page handles this.
  return `/article/${article.slug}`
}

/**
 * Build the shortlink path: `/a/:id`.
 *
 * The redirect route resolves the ID to the full URL at request time.
 * Shortlinks are stable and never reused.
 */
export function shortLink(articleId: number | string): string {
  return `/a/${articleId}`
}

/**
 * The archive month as a single path segment: `YYYY-MM`.
 *
 * The month is **one** segment, not two. `/archive/2026/09` would be a
 * three-segment path, and the `.htaccess` article rule matches any
 * three-segment path (minus a middle `page`) — so it would be served the
 * *article* CSP profile despite carrying no ad slot. One segment avoids that
 * collision structurally rather than adding another exclusion to the rule.
 *
 * Lives here rather than in the page's frontmatter because `getStaticPaths` is
 * hoisted to module scope and **cannot see a frontmatter `const`** — it can only
 * use imports. That mistake is a build failure, not a warning:
 * `monthSegment is not defined`.
 *
 * Callers build `/archive/${archiveMonthSegment(y, m)}`.
 */
export function archiveMonthSegment(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}
