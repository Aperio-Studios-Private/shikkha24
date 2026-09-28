import type { CmsFullArticle } from './cms'
import { type ResolvedImage, resolveCmsImage } from './media'

/**
 * Photo-story frame resolution (S17).
 *
 * ## Why this is a function rather than component-internal
 *
 * The article page needs the resolved frames **twice**: once to render them and
 * once to build the `ImageGallery` JSON-LD. Resolving independently in each place
 * would let the structured data describe images the page does not show — the kind
 * of drift that is invisible until a crawler reports it.
 *
 * ## Why unknown dimensions mean "skip"
 *
 * This is the most image-dense page on the site and CLS is a hard gate, so every
 * frame reserves its box from the media record's **true** pixel dimensions. A
 * frame whose image cannot be measured is dropped rather than rendered with a
 * guessed ratio — a guess is a layout shift with extra steps.
 */

/** A frame whose image has been resolved and measured. */
export interface PhotoFrame {
  image: ResolvedImage
  caption: string
  credit: string
  fullBleed: boolean
}

/** Resolve the CMS frame list into renderable frames, dropping unmeasurable ones. */
export function resolvePhotoFrames(frames: CmsFullArticle['photoStory']): PhotoFrame[] {
  return (frames ?? [])
    .map((frame) => ({
      image: resolveCmsImage(frame.image ?? null, frame.caption ?? ''),
      caption: frame.caption?.trim() ?? '',
      credit: frame.credit?.trim() ?? '',
      fullBleed: Boolean(frame.fullBleed),
    }))
    .filter((frame): frame is PhotoFrame => frame.image !== null)
}
