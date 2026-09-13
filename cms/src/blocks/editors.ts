import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { BeforeAfterBlock } from './BeforeAfterBlock'
import { InfographicBlock } from './InfographicBlock'
import { ScrollytellingBlock } from './ScrollytellingBlock'
import { VideoEmbedBlock } from './VideoEmbedBlock'

/**
 * The rich-text editor instances, defined once so the two of them cannot drift.
 *
 * ## Why there are two
 *
 * Payload lets a field override the editor it inherits. That is the only clean
 * way to keep the **video block** off fields whose route cannot render it:
 *
 *   - `/article/*` allows `frame-src` for `youtube-nocookie.com` → video is fine
 *   - `/live/*` and `/page/*` do not → a video block there would be a control
 *     that silently does nothing, which is the failure mode this project keeps
 *     designing out (see the S8 self-hiding islands)
 *
 * The block list is the *contract* between the editor and the frontend renderer
 * in `frontend/src/lib/content-blocks.ts`. A block added here without a matching
 * renderer renders as nothing at all, so the two files must be changed together.
 *
 * ## `defaultFeatures` is spread, never replaced
 *
 * Both instances keep the standard formatting toolbar and gain the blocks on
 * top. Replacing the array would strip bold, links and lists from every editor
 * in the admin — a mistake that looks fine until a reporter tries to write.
 */

/** The S8 blocks — no third-party frame, so they are safe on every richText field. */
const CONTENT_BLOCKS = [InfographicBlock, BeforeAfterBlock, ScrollytellingBlock]

/**
 * Default editor for every richText field.
 *
 * Used by static pages, live-blog updates, job descriptions and the rest. It
 * carries the three frame-free blocks only.
 */
export const defaultEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    BlocksFeature({ blocks: CONTENT_BLOCKS }),
  ],
})

/**
 * Editor for the article body — the same three blocks plus the click-to-load
 * video embed, which only `/article/*` is permitted to frame.
 *
 * Assign it to a field with `editor: articleBodyEditor`.
 */
export const articleBodyEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures,
    BlocksFeature({ blocks: [...CONTENT_BLOCKS, VideoEmbedBlock] }),
  ],
})
