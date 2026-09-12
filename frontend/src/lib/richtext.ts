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
  fields?: Record<string, unknown>
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

    case 'block':
      // Payload's `BlocksFeature` nodes. Each `blockType` has a renderer below;
      // an unrecognised one falls through to its children so an article can
      // never lose text to a block the frontend has not caught up with.
      return renderContentBlock(node.fields)

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

/* ────────────────────────────────────────────────────────────────────────────
 * Article content blocks (S8)
 *
 * These render Payload `BlocksFeature` nodes — an infographic, a before/after
 * comparison and a scrollytelling sequence — that an editor can drop inside an
 * article body.
 *
 * Everything is escaped exactly like the rest of this file. A block's fields are
 * still reporter input, and the fact that they arrive inside a richer node type
 * does not make them any more trustworthy.
 * ──────────────────────────────────────────────────────────────────────────── */

const MEDIA_BASE = (import.meta.env.PUBLIC_MEDIA_BASE_URL || '').replace(/\/$/, '')

/** Resolve a Payload upload field to a usable image, or `null` when unusable. */
function mediaOf(
  value: unknown,
): { url: string; alt: string; width?: number; height?: number } | null {
  if (!value || typeof value !== 'object') return null

  const media = value as { url?: unknown; alt?: unknown; width?: unknown; height?: unknown }
  if (typeof media.url !== 'string' || media.url === '') return null

  return {
    url: media.url.startsWith('http') ? media.url : `${MEDIA_BASE}${media.url}`,
    alt: typeof media.alt === 'string' ? media.alt : '',
    width: typeof media.width === 'number' ? media.width : undefined,
    height: typeof media.height === 'number' ? media.height : undefined,
  }
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * `<img>` with its box reserved.
 *
 * Real dimensions are emitted when Payload recorded them, which is the normal
 * case. When they are missing the image is given a 16:9 box with
 * `object-fit: contain` — a reserved box of the wrong ratio letterboxes the
 * image, which is a cosmetic cost, whereas an unreserved box is a layout shift,
 * which is a budget failure.
 */
function figureImage(
  image: { url: string; alt: string; width?: number; height?: number },
  alt: string,
  className = '',
): string {
  const dimensions =
    image.width && image.height
      ? ` width="${image.width}" height="${image.height}"`
      : ' data-unknown-ratio="true"'

  return `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(alt)}"${dimensions} loading="lazy" decoding="async"${className ? ` class="${className}"` : ''} />`
}

function renderInfographic(fields: Record<string, unknown>): string {
  const image = mediaOf(fields.image)
  if (!image) return ''

  // The editor's own alt wins; the media library's is the fallback.
  const alt = str(fields.alt) || image.alt
  const caption = str(fields.caption)
  const source = str(fields.source)

  const captionHtml = caption
    ? `<figcaption>${escapeHtml(caption)}${
        source ? ` <span class="content-source">সূত্র: ${escapeHtml(source)}</span>` : ''
      }</figcaption>`
    : ''

  return `<figure class="content-infographic">${figureImage(image, alt)}${captionHtml}</figure>`
}

function renderBeforeAfter(fields: Record<string, unknown>): string {
  const before = mediaOf(fields.beforeImage)
  const after = mediaOf(fields.afterImage)
  if (!before || !after) return ''

  const beforeAlt = str(fields.beforeAlt) || before.alt
  const afterAlt = str(fields.afterAlt) || after.alt
  const beforeLabel = str(fields.beforeLabel) || 'আগে'
  const afterLabel = str(fields.afterLabel) || 'পরে'
  const caption = str(fields.caption)

  const captionHtml = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''

  /*
   * Without JavaScript this renders as the two images stacked with their labels
   * — a complete, honest comparison. The slider is switched on by adding
   * `is-enhanced` from `ContentBlockScripts.astro`, so a reader who never gets
   * the script still sees both pictures.
   *
   * The "before" layer comes FIRST in the DOM so the stacked order matches the
   * legend (আগে, পরে). When enhanced it becomes an absolutely-positioned overlay,
   * which paints above the static "after" image regardless of DOM order.
   */
  return `<figure class="content-compare" data-compare>
  <div class="compare-frame">
    <div class="compare-overlay" data-compare-overlay>${figureImage(before, beforeAlt, 'compare-image')}</div>
    ${figureImage(after, afterAlt, 'compare-image')}
  </div>
  <label class="compare-control">
    <span class="compare-control-label">আগে ও পরের ছবি তুলনা করুন</span>
    <input type="range" min="0" max="100" value="50" step="1" data-compare-range />
  </label>
  <p class="compare-legend">
    <span>${escapeHtml(beforeLabel)}</span>
    <span>${escapeHtml(afterLabel)}</span>
  </p>
  ${captionHtml}
</figure>`
}

function renderScrollytelling(fields: Record<string, unknown>): string {
  const steps = Array.isArray(fields.steps) ? fields.steps : []
  if (steps.length < 2) return ''

  const heading = str(fields.heading)
  const headingHtml = heading ? `<h2 class="scrolly-heading">${escapeHtml(heading)}</h2>` : ''

  const stepsHtml = steps
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return ''
      const step = raw as Record<string, unknown>

      const title = str(step.title)
      const body = str(step.body)
      const image = mediaOf(step.image)

      return `<li class="scrolly-step">
  ${image ? `<div class="scrolly-media">${figureImage(image, str(step.imageAlt) || image.alt)}</div>` : ''}
  <div class="scrolly-text">
    <h3>${escapeHtml(title)}</h3>
    ${body ? `<p>${escapeHtml(body)}</p>` : ''}
  </div>
</li>`
    })
    .filter(Boolean)
    .join('\n')

  /*
   * An `<ol>` because the steps are a sequence — the order carries meaning, and
   * a screen reader announcing "৩ of ৫" is exactly the right information. The
   * animation is applied by CSS and removed entirely under reduced motion.
   */
  return `<section class="content-scrolly" data-scrolly>${headingHtml}
<ol class="scrolly-steps">
${stepsHtml}
</ol>
</section>`
}

/** Dispatch a `BlocksFeature` node to its renderer. */
function renderContentBlock(fields: Record<string, unknown> | undefined): string {
  if (!fields) return ''

  switch (fields.blockType) {
    case 'infographic':
      return renderInfographic(fields)
    case 'beforeAfter':
      return renderBeforeAfter(fields)
    case 'scrollytelling':
      return renderScrollytelling(fields)
    default:
      // A block the frontend does not know about renders as nothing rather than
      // as broken markup — and the editor sees it missing, which is the signal
      // to add a renderer.
      return ''
  }
}
