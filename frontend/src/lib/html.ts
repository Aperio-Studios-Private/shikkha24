/**
 * The frontend's single HTML-escaping primitive.
 *
 * ## Why it is its own module
 *
 * Article prose, comment text, gallery captions and content-block fields are all
 * reporter or reader input, and several modules now build markup from them. One
 * implementation means one place to audit — and no chance that one surface
 * escapes `&` while another forgets to.
 *
 * ## Escaping all five
 *
 * `<` and `>` prevent tags, `&` prevents entity smuggling, and the two quote
 * characters matter because this helper is used for **attribute** values as well
 * as text. Escaping only the angle brackets would leave an attribute injectable.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
