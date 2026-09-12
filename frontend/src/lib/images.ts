/**
 * Local category archetype images.
 *
 * ## Why these live in `src/assets`, not `public/`
 *
 * Anything in `public/` is copied verbatim — no resizing, no format conversion,
 * no hashing. Anything imported from `src/assets` goes through Astro's image
 * pipeline, which is what generates AVIF + WebP variants, responsive `srcset`,
 * and intrinsic dimensions automatically. For the images that appear on the most
 * pages, that difference is the whole ballgame.
 *
 * ## The archetype model
 *
 * One image per category, reused for every article in that category that has no
 * photo of its own. See `docs/assets-prompt.md` — the prompts that produced
 * these are deliberately generic so a single image stays valid across
 * indefinitely many articles.
 *
 * Sources are committed at 1376×768 (16:9). Astro downscales to the widths
 * actually requested at build time, so the committed file is a source, never a
 * delivery artefact.
 */
import type { ImageMetadata } from 'astro'

/**
 * Eager glob — required because Astro needs a static import to process an
 * image. A dynamic path cannot be optimised, which is exactly the trap that
 * leads people to put images in `public/` and lose the whole pipeline.
 */
const modules = import.meta.glob<{ default: ImageMetadata }>('../assets/categories/*.jpg', {
  eager: true,
})

/** slug -> image metadata, keyed by filename. */
const CATEGORY_IMAGES: Record<string, ImageMetadata> = {}

for (const [path, module] of Object.entries(modules)) {
  const file = path.split('/').pop()
  if (!file) continue
  const slug = file.replace(/\.jpe?g$/i, '')
  CATEGORY_IMAGES[slug] = module.default
}

/**
 * The archetype for a category slug, if we have one.
 *
 * Returns `undefined` for an unknown slug so callers can render nothing rather
 * than a broken image — an article in an unmapped category degrades to a
 * text-only card, which is honest.
 */
export function getCategoryImage(slug: string | undefined | null): ImageMetadata | undefined {
  if (!slug) return undefined
  return CATEGORY_IMAGES[slug]
}

/** How many archetypes are wired up — used by the build-time sanity check. */
export const categoryImageCount = Object.keys(CATEGORY_IMAGES).length
