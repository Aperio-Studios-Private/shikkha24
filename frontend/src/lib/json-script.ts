/**
 * JSON for embedding inside a `<script>` tag.
 *
 * ## Why JSON.stringify is not enough
 *
 * `JSON.stringify` does **not** escape `<`. A CMS-authored string that contains
 * `</script>` — an article headline is the obvious one — terminates the element
 * early when the browser parses the page, and everything after it is parsed as
 * live HTML. On the article/home CSP profiles (`script-src … 'unsafe-inline'`,
 * required by the ad loader) that is direct script execution; on strict
 * profiles it still corrupts the head. Found in the 2026-10-29 pentest (H1);
 * the exploit was reproduced locally against the built page shape.
 *
 * The fix is the HTML spec's own recommendation for `JSON.parse`-safe script
 * data: escape `<` (and, for completeness, the line separators U+2028/U+2029
 * which are valid JSON but illegal in JS string literals pre-ES2019) to their
 * `\uXXXX` escapes. The output stays valid JSON — `JSON.parse` on the reader
 * side decodes it identically — but can no longer close the script element.
 */
export function jsonForScriptTag(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}
