/**
 * Route → CSP profile dispatch, for the Workers publisher.
 *
 * This is the port of `.htaccess`'s `SetEnvIf Request_URI` block, kept 1:1 —
 * same regexes, same precedence — so a rollback deploy to Apache and the
 * Workers publisher agree on every URL. `scripts/verify-cloudflare.mjs` runs
 * the same route matrix `verify:apache` runs; changing either side alone turns
 * it red.
 *
 * ### Why regex and not `_headers` globs
 *
 * `_headers` supports splats and `:placeholders` only — no negation, no
 * lookahead. The S11 article rule ("exactly three segments whose middle is
 * not `page`") is inexpressible there, and `/latest/page/:n` would silently
 * inherit AdSense permissions it must not have.
 *
 * ### Precedence
 *
 * In `.htaccess` every `Header always set` replaces its predecessor in file
 * order: strict → relaxed → article → media. This port therefore checks
 * `media`, then `article`, then `relaxed` — the same outcome even on paths
 * that hypothetically match two rule families.
 *
 * ### Input contract
 *
 * Callers pass `URL.pathname` (no query string). The Apache patterns end in an
 * optional `(\?.*)?`-style tail, which is exactly "may have a query" — the
 * query never affects which segment shapes match, so dispatching on the
 * pathname alone is equivalent for every input.
 */

/** The four profiles `headersForPath` can return. `strict` is the default. */
export type CspProfileName = 'strict' | 'relaxed' | 'article' | 'media'

/**
 * Homepage — 4 ad slots + the poll + newsletter.
 * Port of: `^/(\?.*)?$`
 */
const RELAXED: RegExp[] = [/^\/(\?.*)?$/]

/**
 * Category listing (+ pagination) — 1 ad slot.
 * Port of: `^/category/[^/?#]+(/page/[0-9]+)?/?(\?.*)?$`
 */
RELAXED.push(/^\/category\/[^/?#]+(?:\/page\/[0-9]+)?\/?(\?.*)?$/)

/**
 * Live blog — 1 ad slot + the refresh island. (`/live-tv` is NOT here: it
 * frames YouTube and Facebook, which neither strict nor relaxed permits.)
 * Port of: `^/live/[^/?#]+/?(\?.*)?$`
 */
RELAXED.push(/^\/live\/[^/?#]+\/?(\?.*)?$/)

/**
 * Quiz — 2 ad slots.
 * Port of: `^/quiz(/[^/?#]+)?/?(\?.*)?$`
 */
RELAXED.push(/^\/quiz(?:\/[^/?#]+)?\/?(\?.*)?$/)

/**
 * Article — 3 ad slots + comments + bookmarks + video embeds. Exactly three
 * segments, and the middle one is not `page` — that negative lookahead is the
 * structural test separating `/education-news/27/post-x` (an article) from
 * `/latest/page/2` (a strictly-profiled paginated listing). It cannot rot with
 * a future route: `verify:apache` derives the expectation from the page's own
 * `AdSlot` markers, not from this regex.
 * Port of: `^/[^/?#]+/(?!page/)[^/?#]+/[^/?#]+/?(\?.*)?$`
 */
const ARTICLE: RegExp[] = [/^\/[^/?#]+\/(?!page\/)[^/?#]+\/[^/?#]+\/?(\?.*)?$/]

/**
 * The dedicated media routes (S15/S17): `/live-tv` frames YouTube AND
 * Facebook; `/video` features a click-to-load player, so its pagination shape
 * is included too — without it, page 2 would fall to strict and the player
 * would die silently.
 * Port of: `^/live-tv/?(\?.*)?$` and `^/video(/page/[0-9]+)?/?(\?.*)?$`
 */
const MEDIA: RegExp[] = [/^\/live-tv\/?(\?.*)?$/, /^\/video(?:\/page\/[0-9]+)?\/?(\?.*)?$/]

/**
 * Which CSP profile this path must be served under.
 *
 * @param pathname - `URL.pathname` with no query string (see input contract).
 */
export function profileForPath(pathname: string): CspProfileName {
  if (MEDIA.some((re) => re.test(pathname))) return 'media'
  if (ARTICLE.some((re) => re.test(pathname))) return 'article'
  if (RELAXED.some((re) => re.test(pathname))) return 'relaxed'
  return 'strict'
}
