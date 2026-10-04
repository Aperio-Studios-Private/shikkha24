/**
 * Which browser origins may call this API **with credentials**.
 *
 * ## ⚠️ The CMS's own origin must be in this list
 *
 * This list started out holding only the public site. The admin panel is served
 * from a *different* origin (`cms.shikkha24.com`), and every request its browser
 * makes carries `Origin: https://cms.shikkha24.com` — so Payload threw the
 * cookie away on every one of them:
 *
 * ```js
 * // payload/dist/auth/extractJWT.js
 * const origin = headers.get('Origin')
 * if (origin) {
 *   if (payload.config.csrf.length === 0 || payload.config.csrf.includes(origin)) {
 *     return cookieToken          // cookie auth accepted
 *   }
 *   return null                    // cookie auth DISCARDED
 * }
 * ```
 *
 * Two user-visible symptoms came out of that one omission, and neither pointed
 * at it. The media library returned **403** and no image could be uploaded, and
 * logout did nothing at all — because Payload's own admin client swallows the
 * failure:
 *
 * ```js
 * // @payloadcms/ui providers/Auth — logOut()
 * await requests.post(`${apiRoute}/${user.collection}/logout`)
 * } catch (_) {
 *   // fail silently and log the user out in state
 * }
 * ```
 *
 * It clears local state, shows a **success** toast, and redirects to the login
 * page — while the cookie and the server-side session are both still there. The
 * next page load re-authenticates. It looks exactly like a no-op.
 *
 * The rule: **a server must accept credentialed requests from its own origin.**
 * An allow-list is there to stop *other people's pages* riding your cookies, and
 * the admin is not another person's page.
 */

/**
 * The CMS's own public origin — the one the admin panel is served from.
 *
 * `PUBLIC_CMS_ORIGIN` is the name this project already uses for it in the
 * deploy workflow, so it is reused rather than invented a second time. The
 * fallback is the live host: on DianaHost this env var is not set in the CMS
 * `.env`, so without a default the list would be empty in production and the
 * allow-list would stop working the moment the variable went missing — which is
 * the failure mode that caused this in the first place.
 */
export const CMS_ORIGIN = process.env.PUBLIC_CMS_ORIGIN || 'https://cms.shikkha24.com'

/**
 * Origins allowed to call this API from a browser.
 *
 * Payload's default is to allow every origin. That was fine while nothing but
 * the admin used the API, but S8 introduced **reader-facing** calls — the
 * live-blog refresh, the poll vote — and S9 adds the comment form, the
 * newsletter signup, the bookmark sync and the push subscription. So the
 * allow-list is explicit.
 *
 * Both halves are needed and they are not interchangeable:
 * - `PUBLIC_SITE_URL` — the static site on DianaHost `public_html`. A different
 *   origin, so without it the browser blocks the call before it is sent.
 * - `CMS_ORIGIN` — the admin, talking to its own API. See the note above.
 */
export const ALLOWED_ORIGINS = [
  process.env.PUBLIC_SITE_URL || 'https://shikkha24.com',
  CMS_ORIGIN,
  /*
   * ⚠️ Local development only. These were unconditional until 2026-09-30, so a
   * production deployment also trusted `http://localhost:4321` and
   * `http://localhost:3000` — meaning a page served from a reader's own machine
   * could call this API with their cookies attached. Narrow, but the whole point
   * of an explicit allow-list is that it is explicit.
   *
   * `NODE_ENV` is `production` under `next start` (which is how DianaHost runs it)
   * and `development` under `next dev`, so the switch follows the deployment.
   */
  ...(process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:4321', 'http://localhost:3000']),
]

/**
 * Whether a cookie-authenticated request from `origin` would be accepted.
 *
 * A **pure** restatement of the branch in `extractJWT.js` above, so the rule can
 * be asserted directly and fed the broken value to watch it fail — an allow-list
 * containing the right-looking strings proves nothing about whether the server
 * would accept them (M18). Keep the three cases in step with Payload's:
 *
 * - an empty list means Payload permits every origin;
 * - a present origin must match exactly;
 * - a request with **no** Origin header never reaches this function — Payload
 *   falls back to `Sec-Fetch-Site`, which is not modelled here and is not
 *   claimed to be.
 */
export const cookieAuthAcceptedFor = (
  origins: string[],
  origin: string | null | undefined,
): boolean => origins.length === 0 || (origin != null && origins.includes(origin))
