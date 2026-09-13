/**
 * Pure HTML string helpers for positioning the mid-article ad.
 *
 * ## Why these live apart from `richtext.ts`
 *
 * They are plain string utilities over rendered HTML — they know nothing about
 * Lexical, Payload, or any content block. `richtext.ts` imports the block
 * renderers, so anything importing it transitively pulls in the whole Lexical
 * rendering path, which is why `scripts/verify-ad-split.ts` could not run under
 * `node --experimental-strip-types`: the extensionless `./content-blocks`
 * import is fine for Vite but unresolvable for Node's ESM loader.
 *
 * Keeping these here makes them importable — and unit-testable — with no
 * dependencies at all. `richtext.ts` re-exports them, so no caller changed.
 */

/** How many top-level paragraphs the rendered body contains. */
export function countParagraphs(html: string): number {
  return (html.match(/<\/p>/g) ?? []).length
}

/**
 * Split rendered body HTML into two parts, cutting immediately after the
 * `after`-th paragraph.
 *
 * Used to place a mid-article ad *inside* the prose rather than after it. The
 * cut is only ever made directly after a `</p>`, so no tag is ever sliced in
 * half and the two halves concatenate back to the original string.
 *
 * @returns `[before, after]`. When the body has fewer paragraphs than requested
 *          the whole body is returned first and the second part is empty, which
 *          lets the caller skip the ad instead of rendering it in the wrong place.
 */
export function splitHtmlAtParagraph(html: string, after: number): [string, string] {
  if (after < 1) return ['', html]

  const pattern = /<\/p>/g
  let seen = 0
  let cut = -1

  let match: RegExpExecArray | null = pattern.exec(html)
  while (match !== null) {
    seen += 1
    if (seen === after) {
      cut = match.index + match[0].length
      break
    }
    match = pattern.exec(html)
  }

  if (cut === -1) return [html, '']
  return [html.slice(0, cut), html.slice(cut)]
}
