/**
 * Article content blocks — Payload `BlocksFeature` nodes rendered to HTML.
 *
 * An editor can drop an infographic, a before/after comparison, a scrollytelling
 * sequence or a click-to-load video embed inside an article body. This module
 * turns each one into markup.
 *
 * ## Why it is separate from `richtext.ts`
 *
 * The Lexical walker and the block renderers are different concerns, and the
 * walker was already past this project's file-size budget. Splitting them when
 * the video block arrived kept both files readable. `richtext.ts` calls
 * `renderContentBlock` for every `block` node and owns nothing else here.
 *
 * ## Security
 *
 * A block's fields are reporter input exactly like the surrounding prose — the
 * fact that they arrive inside a richer node type does not make them any more
 * trustworthy. Every value is escaped with the same helper the rest of the
 * renderer uses, and there is still no raw-HTML escape hatch.
 *
 * ## The block list is a contract
 *
 * `cms/src/blocks/editors.ts` decides which blocks an editor can insert. A
 * `blockType` handled here but not offered there is dead code; one offered there
 * but missing here renders as **nothing**, so the editor sees it vanish. Change
 * the two files together.
 */

import { escapeHtml } from './html'

const MEDIA_BASE = (import.meta.env.PUBLIC_MEDIA_BASE_URL || '').replace(/\/$/, '')

/** Read a field that may or may not be a string. */
function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

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

/* ── Infographic ─────────────────────────────────────────────────────────── */

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

/* ── Before / after ──────────────────────────────────────────────────────── */

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

/* ── Scrollytelling ──────────────────────────────────────────────────────── */

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

/* ── Video embed (S9) ────────────────────────────────────────────────────── */

/*
 * There is deliberately no embed-origin constant here. The only place
 * `youtube-nocookie.com` appears in this project is the click handler in
 * `ContentBlockScripts.astro` — so a built article page contains no third-party
 * URL at all until the reader taps play. Grepping the build for `youtube` is
 * therefore a meaningful check, and it should keep returning only that script.
 */

/** YouTube ids are 11 characters of the base64url alphabet. Nothing else is valid. */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

/**
 * Extract a YouTube video id from whatever an editor pasted.
 *
 * Accepts a bare id, a `youtu.be` short link, and the `watch?v=`, `/shorts/`,
 * `/embed/` and `/live/` forms on any `youtube.com` or `youtube-nocookie.com`
 * subdomain. Returns `null` for everything else.
 *
 * ## Why the input is parsed rather than used
 *
 * The returned id is the **only** part of the editor's text that reaches the
 * markup, and it must match an 11-character base64url pattern. A field holding
 * `javascript:alert(1)`, an unexpected host, or a 10 KB string all fail here and
 * render nothing. The embed URL is then assembled from a fixed template, so
 * there is no path by which editor input becomes a URL.
 *
 * @returns The 11-character id, or `null` when the input is not a YouTube video.
 */
export function parseYouTubeId(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null

  // A bare id is common when the editor copied just the code.
  if (VIDEO_ID_PATTERN.test(value)) return value

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./i, '').toLowerCase()

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0] ?? ''
    return VIDEO_ID_PATTERN.test(id) ? id : null
  }

  const isYouTube =
    host === 'youtube.com' ||
    host.endsWith('.youtube.com') ||
    host === 'youtube-nocookie.com' ||
    host.endsWith('.youtube-nocookie.com')
  if (!isYouTube) return null

  const query = url.searchParams.get('v')
  if (query && VIDEO_ID_PATTERN.test(query)) return query

  const segments = url.pathname.split('/').filter(Boolean)
  if (segments.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(segments[0] ?? '')) {
    const id = segments[1] ?? ''
    return VIDEO_ID_PATTERN.test(id) ? id : null
  }

  return null
}

/**
 * Click-to-load video embed.
 *
 * ## Nothing is requested until the reader asks for it
 *
 * The markup contains **no iframe and no third-party URL**. The trigger is a
 * real `<a>` pointing at the watch page, so with JavaScript unavailable the
 * reader still reaches the video — they simply leave the site for it. When the
 * script is present it takes over the click and swaps in the player, which is
 * the same progressive-enhancement shape the before/after block uses.
 *
 * `ContentBlockScripts.astro` builds the frame. It reads the id back out of
 * `data-video-id` and re-validates it, so a hand-edited page still cannot turn
 * this element into an arbitrary frame source.
 *
 * ## The poster is deliberately self-hosted
 *
 * YouTube's own thumbnail URL (`i.ytimg.com/…`) would be a third-party request
 * on every article view — the exact thing this block exists to avoid. A video
 * with no uploaded poster renders a text-only trigger instead of reaching for
 * one. See `cms/src/blocks/VideoEmbedBlock.ts`.
 *
 * ## No `VideoObject` schema
 *
 * `docs/seo-plan.md` §3 decided against it: a third-party embed fails Rich
 * Results more often than it passes. This renderer emits no structured data.
 */
function renderVideoEmbed(fields: Record<string, unknown>): string {
  const id = parseYouTubeId(str(fields.url))
  if (!id) return ''

  const safeId = escapeHtml(id)
  const poster = mediaOf(fields.poster)
  const caption = str(fields.caption)
  // The title is the trigger's accessible name, so it is never optional in the
  // UI; the fallback only matters for a body seeded before the field existed.
  const label = str(fields.title) || 'ভিডিও'

  const posterHtml = poster ? figureImage(poster, '', 'video-poster') : ''
  const captionHtml = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''

  return `<figure class="content-video" data-video data-video-id="${safeId}">
  <a class="video-trigger${poster ? ' has-poster' : ''}" href="https://www.youtube.com/watch?v=${safeId}" data-video-trigger target="_blank" rel="noopener noreferrer">
    ${posterHtml}
    <span class="video-play" aria-hidden="true"></span>
    <span class="video-label">${escapeHtml(label)}</span>
  </a>
  ${captionHtml}
</figure>`
}

/* ── Dispatch ────────────────────────────────────────────────────────────── */

/**
 * Render a `BlocksFeature` node.
 *
 * An unrecognised `blockType` renders as nothing rather than as broken markup —
 * and the editor sees it missing, which is the signal that a renderer is due.
 */
export function renderContentBlock(fields: Record<string, unknown> | undefined): string {
  if (!fields) return ''

  switch (fields.blockType) {
    case 'infographic':
      return renderInfographic(fields)
    case 'beforeAfter':
      return renderBeforeAfter(fields)
    case 'scrollytelling':
      return renderScrollytelling(fields)
    case 'videoEmbed':
      return renderVideoEmbed(fields)
    default:
      return ''
  }
}
