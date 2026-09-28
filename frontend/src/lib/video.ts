/**
 * Article video → player props (S17).
 *
 * ## Why this is a module rather than two inline conversions
 *
 * The same conversion is needed in two places — the article page, which renders a
 * player above the body, and `/video`, which features the newest one — and the
 * validation is the part that must not be duplicated. The CMS stores whatever an
 * editor pasted into `videoUrl`; this is the layer that decides whether it becomes
 * a frame source.
 *
 * ## ⚠️ The output is never the input
 *
 * For YouTube the stored URL is parsed down to the **11-character id** and the
 * frame URL is then assembled from a fixed template by `MediaEmbed`. For Facebook
 * the URL travels as an encoded query parameter of the plugin URL. So no stored
 * value ever becomes a frame URL directly, and an unexpected host, a
 * `javascript:` scheme or a 10 KB string all fail here and render nothing.
 *
 * This mirrors `cms/src/lib/live-stream.ts`, which validates the same two shapes
 * on the way in. Two validators is deliberate: this one is the control, because it
 * is the one that decides what reaches the markup.
 */
import type { CmsArticle } from './cms'
import { parseYouTubeId } from './content-blocks'

/** Hosts a Facebook video can legitimately live on. Grepping `fb.watch` finds the copies. */
const FACEBOOK_HOSTS = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.watch',
  'www.fb.watch',
])

/** The props `MediaEmbed` needs, or `null` when the stored value is unusable. */
export interface VideoEmbedProps {
  provider: 'youtube' | 'facebook'
  videoId?: string | null
  pageUrl?: string | null
}

/**
 * Convert an article's `videoUrl` / `videoProvider` into player props.
 *
 * Returns `null` — rather than throwing — for anything that cannot be validated,
 * so a bad field costs the reader a player and nothing else.
 */
export function videoEmbedProps(
  article: Pick<CmsArticle, 'videoUrl' | 'videoProvider'>,
): VideoEmbedProps | null {
  const raw = (article.videoUrl ?? '').trim()
  if (!raw) return null

  if (article.videoProvider === 'facebook') {
    let url: URL
    try {
      url = new URL(raw)
    } catch {
      return null
    }
    if (url.protocol !== 'https:') return null
    if (!FACEBOOK_HOSTS.has(url.hostname.toLowerCase())) return null
    return { provider: 'facebook', pageUrl: url.href }
  }

  // Default provider is YouTube (the CMS field's default), so an article saved
  // before `videoProvider` existed still renders.
  const id = parseYouTubeId(raw)
  return id ? { provider: 'youtube', videoId: id } : null
}
