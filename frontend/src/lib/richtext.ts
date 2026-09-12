/**
 * Payload Lexical richText → semantic HTML.
 *
 * ## Why this exists
 *
 * The article body is a Payload `richText` (Lexical) field. The REST API serves
 * it as **Lexical JSON**, not HTML — so the frontend has to convert it before it
 * can render anything.
 *
 * A converter in the CMS workspace would mean a cross-workspace import
 * (`@payloadcms/richtext-lexical` pulls in React and the whole Payload server
 * runtime), which would drag the entire admin bundle into a static site build.
 * This is ~150 lines with no dependencies instead.
 *
 * ## Security — non-negotiable
 *
 * Every piece of text is **escaped**. Rich text entered by a reporter is still
 * user input: a crafted node could otherwise inject markup into a page that
 * carries our domain's authority. `docs/security.md` treats the CMS as a
 * trusted-authoring, untrusted-content boundary.
 *
 * There is deliberately **no** mechanism to pass raw HTML through. If a future
 * need requires embedded media, extend the node handlers here — do not add an
 * "allow raw HTML" escape hatch.
 *
 * ## Coverage and degradation
 *
 * Handles the node types our editors actually use: paragraph, heading, text
 * (with formats), link, bullet/number lists, quote, horizontal rule, linebreak.
 *
 * An **unrecognised node is not dropped** — it falls back to serialising its
 * children, and ultimately its text. A reporter who pastes something we did not
 * anticipate should see their words with slightly wrong markup, not find their
 * paragraph silently missing from the published article.
 */

/** A Lexical node. Deliberately loose — the shape varies by node type. */
interface LexicalNode {
  type: string
  children?: LexicalNode[]
  text?: string
  format?: number
  tag?: string
  url?: string
  listType?: string
  value?: number
  direction?: string | null
  indent?: number
  fields?: { url?: string; newTab?: boolean; linkType?: string; doc?: unknown }
  [key: string]: unknown
}

/** Lexical text format bitmasks. */
const FORMAT = {
  bold: 1,
  italic: 2,
  strikethrough: 4,
  underline: 8,
  code: 16,
} as const

/** Escape for safe inclusion in HTML text and attributes. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Only allow http(s) and mailto in links.
 *
 * A `javascript:` or `data:` URL in an article body would be stored XSS on our
 * own domain. Anything unrecognised renders as plain text — the reader still
 * sees the words, the link just is not clickable.
 */
function safeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null
  const value = raw.trim()
  if (/^https?:\/\//i.test(value)) return value
  if (/^mailto:/i.test(value)) return value
  if (/^\/(?!\/)/.test(value)) return value // site-relative, not protocol-relative
  return null
}

/** Wrap text in the inline tags its format bits request. */
function applyFormats(text: string, format: number): string {
  let out = text
  // Applied outside-in so the nesting order is correct.
  if (format & FORMAT.code) out = `<code>${out}</code>`
  if (format & FORMAT.underline) out = `<u>${out}</u>`
  if (format & FORMAT.strikethrough) out = `<s>${out}</s>`
  if (format & FORMAT.italic) out = `<em>${out}</em>`
  if (format & FORMAT.bold) out = `<strong>${out}</strong>`
  return out
}

/** Serialise inline content (text, links, linebreaks). */
function renderInline(node: LexicalNode): string {
  switch (node.type) {
    case 'text':
      return applyFormats(escapeHtml(node.text ?? ''), node.format ?? 0)

    case 'linebreak':
      return '<br />'

    case 'link':
    case 'autolink': {
      const raw = node.url ?? (node.fields?.url as string | undefined)
      const href = safeUrl(raw)
      const inner = renderChildren(node)
      if (!href) return inner
      const external = /^https?:\/\//i.test(href)
      const rel = external ? ' rel="noopener noreferrer"' : ''
      const target = external ? ' target="_blank"' : ''
      return `<a href="${escapeHtml(href)}"${target}${rel}>${inner}</a>`
    }

    default:
      // Unknown inline node — keep its content rather than losing it.
      return renderChildren(node)
  }
}

function renderChildren(node: LexicalNode): string {
  if (!node.children?.length) return ''
  return node.children.map(renderInline).join('')
}

/** Serialise a block-level node. */
function renderBlock(node: LexicalNode): string {
  switch (node.type) {
    case 'paragraph': {
      const inner = renderChildren(node)
      // An empty paragraph is legitimate spacing; keep it.
      return inner ? `<p>${inner}</p>` : ''
    }

    case 'heading': {
      const tag = /^h[1-6]$/.test(node.tag ?? '') ? node.tag : 'h2'
      return `<${tag}>${renderChildren(node)}</${tag}>`
    }

    case 'quote':
      return `<blockquote>${renderChildren(node)}</blockquote>`

    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul'
      return `<${tag}>${(node.children ?? []).map(renderBlock).join('')}</${tag}>`
    }

    case 'listitem':
      return `<li>${renderChildren(node)}</li>`

    case 'horizontalrule':
      return '<hr />'

    default:
      // Unknown block: if it has children, render them; otherwise its text.
      if (node.children?.length) return renderChildren(node)
      return node.text ? escapeHtml(node.text) : ''
  }
}

/**
 * Flatten a Lexical richText field to plain text.
 *
 * Used by the audio reader, which needs the article's words without markup, and
 * by any future excerpt generation. Recurses through every node so no paragraph
 * is missed.
 *
 * @returns Plain text, or `''` when there is nothing — never throws.
 */
export function lexicalToPlainText(body: unknown): string {
  try {
    if (!body || typeof body !== 'object') return ''

    const parts: string[] = []

    const walk = (node: LexicalNode): void => {
      if (node.type === 'text' && node.text) {
        parts.push(node.text)
        return
      }
      // A linebreak or block boundary should read as a pause, not a run-on.
      if (node.type === 'linebreak') {
        parts.push(' ')
        return
      }
      node.children?.forEach(walk)
    }

    const root = (body as { root?: LexicalNode }).root
    root?.children?.forEach(walk)

    return parts.join(' ').replace(/\s+/g, ' ').trim()
  } catch {
    return ''
  }
}

/**
 * Convert a Lexical richText field to HTML.
 *
 * @returns HTML string, or `''` when there is nothing to render — never throws,
 *          so a malformed body can never fail a build.
 */
export function lexicalToHtml(body: unknown): string {
  try {
    if (!body || typeof body !== 'object') return ''

    const root = (body as { root?: LexicalNode }).root
    if (!root?.children?.length) return ''

    return root.children.map(renderBlock).filter(Boolean).join('\n')
  } catch {
    // A body we cannot parse must not take the page down.
    return ''
  }
}

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
