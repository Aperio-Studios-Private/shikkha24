/**
 * Lexical → HTML for newsletter campaigns.
 *
 * ## Why this exists at all
 *
 * The campaign body is a Payload `richText` field, which is Lexical JSON — not
 * HTML. Email needs HTML, so something has to convert it.
 *
 * ## Why not import the frontend's renderer
 *
 * The frontend has `lib/richtext.ts`, which does the same job for article bodies.
 * It is deliberately **not** imported here: the frontend and CMS are separate
 * workspaces, and a cross-workspace import would couple a static build to the
 * Payload server runtime (the reasoning recorded at S4). A ~100-line converter
 * that each side owns is cheaper than that coupling.
 *
 * ## The two rules it must not break
 *
 * 1. **Escape every text node.** A campaign body is editor input. Even though
 *    only editors reach it, a stored-XSS payload in an email template is a
 *    phishing primitive — and the same body is rendered in the admin preview.
 * 2. **Never drop an unrecognised node.** An unknown node falls through to its
 *    children, so a block type added to the editor later degrades to plain
 *    paragraphs instead of silently vanishing from a sent mail.
 */

/** Lexical text-format bitmask values. */
const FORMAT_BOLD = 1
const FORMAT_ITALIC = 1 << 1
const FORMAT_STRIKETHROUGH = 1 << 2
const FORMAT_UNDERLINE = 1 << 3
const FORMAT_CODE = 1 << 4

interface LexicalNode {
  type?: string
  text?: string
  format?: number | string
  tag?: string
  listType?: string
  url?: string
  children?: LexicalNode[]
}

/** Escape text destined for HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Only http(s) links survive.
 *
 * `javascript:` and `data:` in an href are an execution vector, and there is no
 * legitimate reason for a newsletter link to use either.
 */
function safeHref(url: string): string | null {
  const trimmed = url.trim()
  return /^https?:\/\//i.test(trimmed) ? esc(trimmed) : null
}

function renderText(node: LexicalNode): string {
  let html = esc(node.text ?? '')
  const format = typeof node.format === 'number' ? node.format : 0

  if (format & FORMAT_CODE) html = `<code>${html}</code>`
  if (format & FORMAT_BOLD) html = `<strong>${html}</strong>`
  if (format & FORMAT_ITALIC) html = `<em>${html}</em>`
  if (format & FORMAT_UNDERLINE) html = `<u>${html}</u>`
  if (format & FORMAT_STRIKETHROUGH) html = `<s>${html}</s>`

  return html
}

function renderChildren(nodes: LexicalNode[] | undefined, listType?: string): string {
  if (!Array.isArray(nodes)) return ''
  return nodes.map((child) => renderNode(child, listType)).join('')
}

function renderNode(node: LexicalNode, listType?: string): string {
  switch (node.type) {
    case 'text':
      return renderText(node)

    case 'linebreak':
      return '<br>'

    case 'paragraph': {
      const inner = renderChildren(node.children)
      // An empty paragraph is a deliberate blank line, not noise.
      return inner.trim() === '' ? '<p>&nbsp;</p>' : `<p>${inner}</p>`
    }

    case 'heading': {
      const tag = /^h[1-6]$/.test(node.tag ?? '') ? (node.tag as string) : 'h2'
      return `<${tag}>${renderChildren(node.children)}</${tag}>`
    }

    case 'quote':
      return `<blockquote>${renderChildren(node.children)}</blockquote>`

    case 'list': {
      const ordered = node.listType === 'number'
      const tag = ordered ? 'ol' : 'ul'
      return `<${tag}>${renderChildren(node.children, tag)}</${tag}>`
    }

    case 'listitem':
      // `listType` is passed down from the parent list so the item does not have
      // to re-derive whether it is inside a <ul> or an <ol>.
      return `<li>${renderChildren(node.children, listType)}</li>`

    case 'link': {
      const href = safeHref(node.url ?? '')
      const inner = renderChildren(node.children)
      return href ? `<a href="${href}" style="color:#DA1C25">${inner}</a>` : inner // an unsafe or missing href degrades to plain text
    }

    case 'horizontalrule':
      return '<hr>'

    default:
      // Unknown node — render its children rather than losing the content.
      return renderChildren(node.children, listType)
  }
}

/** Convert a Payload Lexical value to an HTML fragment. */
export function lexicalToHtml(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const root = (value as { root?: LexicalNode }).root
  if (!root) return ''
  return renderChildren(root.children).trim()
}

/**
 * Plain-text version of the same body.
 *
 * Always sent alongside the HTML: an HTML-only mail is a spam signal, and some
 * readers genuinely prefer text.
 */
export function lexicalToText(value: unknown): string {
  const html = lexicalToHtml(value)
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
