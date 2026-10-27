/**
 * The three CSP profiles + the strict default, for the Workers publisher.
 *
 * These strings are extracted verbatim from `frontend/public/.htaccess` —
 * byte-for-byte, not retyped — because `scripts/verify-cloudflare.mjs` asserts
 * the equality as a contract. Apache (`.htaccess`, the rollback path) and
 * Workers (the live publisher) must never disagree about a security policy;
 * editing a profile on one side alone turns the check red.
 *
 * Why a Worker owns this at all: `_headers` can neither express the S11 rule
 * ("exactly three segments whose middle is not `page`") nor avoid the
 * comma-join that multiple matching `_headers` rules produce on CSP. See
 * `docs/hosting-and-deployment.md` section 10.3.
 */

/** The `strict` policy, copied byte-for-byte from `.htaccess`. */
export const CSP_STRICT =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cms.shikkha24.com https://media.shikkha24.com; font-src 'self'; connect-src 'self' https://cms.shikkha24.com https://shikkha24-cms-9vai.onrender.com https://api.aladhan.com https://api.open-meteo.com https://ipwho.is; media-src 'self' https://cms.shikkha24.com https://media.shikkha24.com; frame-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests"

/** The `relaxed` policy, copied byte-for-byte from `.htaccess`. */
export const CSP_RELAXED =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cms.shikkha24.com https://media.shikkha24.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.gstatic.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://cms.shikkha24.com https://shikkha24-cms-9vai.onrender.com https://api.aladhan.com https://api.open-meteo.com https://ipwho.is https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net; media-src 'self' https://cms.shikkha24.com https://media.shikkha24.com; frame-src https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://googleads.g.doubleclick.net; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests"

/** The `article` policy, copied byte-for-byte from `.htaccess`. */
export const CSP_ARTICLE =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cms.shikkha24.com https://media.shikkha24.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.gstatic.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://cms.shikkha24.com https://shikkha24-cms-9vai.onrender.com https://api.aladhan.com https://api.open-meteo.com https://ipwho.is https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net; media-src 'self' https://cms.shikkha24.com https://media.shikkha24.com; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.facebook.com https://web.facebook.com https://m.facebook.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://googleads.g.doubleclick.net; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests"

/** The `media` policy, copied byte-for-byte from `.htaccess`. */
export const CSP_MEDIA =
  "default-src 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cms.shikkha24.com https://media.shikkha24.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.gstatic.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://cms.shikkha24.com https://shikkha24-cms-9vai.onrender.com https://api.aladhan.com https://api.open-meteo.com https://ipwho.is https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net; media-src 'self' https://cms.shikkha24.com https://media.shikkha24.com; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://www.facebook.com https://web.facebook.com https://m.facebook.com https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://googleads.g.doubleclick.net; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests"
