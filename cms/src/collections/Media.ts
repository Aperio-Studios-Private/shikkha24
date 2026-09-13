import type { CollectionConfig } from 'payload'

import { checkUploadQuota } from '../lib/media-quota'

/**
 * Media library.
 *
 * ## Storage — the DianaHost disk, not R2
 *
 * The owner moved media off Cloudflare R2 on 2026-09-12 (`.sps/plan.md`
 * §"Scope amendment (2026-09-12)" — the documented R2 fallback became the active
 * architecture). Uploads therefore land on the **2 GB host disk**, shared with
 * the app, the database and the backups.
 *
 * The frontend's `PUBLIC_MEDIA_BASE_URL` points at this host, and the host must
 * be served through the Cloudflare proxy with a long-lived `Cache-Control`: the
 * free tier has unlimited bandwidth for proxied traffic, so a cached image view
 * costs the origin nothing and only a cache miss touches the 200 GB allowance.
 *
 * ## Three storage controls, all enforced here rather than left to discipline
 *
 * 1. **The original is never kept as uploaded.** `upload.formatOptions` runs the
 *    incoming file through sharp `toFormat('webp')` *before it is written*, so
 *    the stored "original" is already a WebP — a 900 KB JPEG becomes a ~90 KB
 *    WebP. This is the plan's mitigation, implemented at the storage layer
 *    instead of hoped for. (`formatOptions` on `upload` applies to the file
 *    itself; each `imageSize` needs its own — Payload documents this.)
 * 2. **The stored dimensions are capped.** `resizeOptions` stops a 6000px phone
 *    photo from being retained at full size. `withoutEnlargement` means a small
 *    image is never upscaled into a bigger file.
 * 3. **A per-day upload cap** (`lib/media-quota.ts`) rejects a burst day that
 *    would consume the month's headroom — the failure that would otherwise be
 *    discovered when the disk filled.
 *
 * **Metadata is stripped** (`withMetadata: false`) — EXIF, colour profiles and
 * embedded thumbnails add tens of KB per image and can carry location data
 * (`docs/security.md` §8, PII).
 *
 * ## Why WebP only, and not AVIF as well
 *
 * `docs/image-optimization.md` prefers AVIF first. For **CMS media** it was
 * considered and deliberately not adopted: emitting AVIF *and* WebP for every
 * size doubles the bytes on the one resource that is actually constrained
 * (host disk), while WebP already captures most of the saving. AVIF remains in
 * use for the locally-built assets that go through Astro's pipeline, where the
 * extra variant costs build output rather than host storage. Revisit if the host
 * moves to the 5 GB plan.
 *
 * ## Security (docs/security.md §6)
 *
 * Uploads are validated **server-side**. Never trust the client-supplied content
 * type — a `.jpg` that is really a script must be rejected on MIME and on
 * extension, not just on its name.
 */

/** Bytes. 15 MB — matches the cap documented in `docs/security.md` §6. */
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

/** Images only. Video is embedded from a platform, never uploaded (S9). */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
]

/** WebP quality. 82 sits in the 75–90 band `docs/image-optimization.md` sets. */
const WEBP = { format: 'webp', options: { quality: 82 } } as const

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { en: 'Media', bn: 'ছবি' },
    plural: { en: 'Media library', bn: 'ছবির লাইব্রেরি' },
  },
  admin: {
    group: 'মিডিয়া',
    description:
      'ছবির লাইব্রেরি। প্রতিটি আপলোড স্বয়ংক্রিয়ভাবে WebP-তে রূপান্তরিত হয় এবং প্রতিদিনের আপলোড সীমা প্রযোজ্য।',
  },
  access: {
    // Media is publicly readable — it is the site's image origin.
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: { en: 'Alt text', bn: 'বিকল্প টেক্সট' },
      admin: {
        description: 'বাংলায় ছবির বিবরণ লিখুন। অলংকরণমূলক ছবির ক্ষেত্রে খালি রাখুন (alt="")।',
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: { en: 'Caption', bn: 'ক্যাপশন' },
      admin: {
        description: 'ছবির নিচে দেখানো ক্যাপশন (ঐচ্ছিক)।',
      },
    },
    {
      name: 'credit',
      type: 'text',
      label: { en: 'Credit', bn: 'সূত্র' },
      admin: {
        description: 'ছবির সূত্র / কৃতজ্ঞতা (ঐচ্ছিক)।',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ req, data }) => {
        const file = req?.file
        if (!file) return data

        if (!ALLOWED_MIME_TYPES.includes(file.mimetype ?? '')) {
          throw new Error(`অনুমোদিত নয় এমন ফাইল ধরন: ${file.mimetype}. শুধু ছবি আপলোড করা যাবে।`)
        }

        if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
          const mb = (file.size / 1024 / 1024).toFixed(1)
          throw new Error(`ফাইলটি অনেক বড় (${mb} MB)। সর্বোচ্চ ১৫ MB অনুমোদিত।`)
        }

        // The per-day cap. Measured on the **incoming** size — conversion
        // shrinks the stored file, but a cap must not understate the input.
        const quota = await checkUploadQuota(req.payload, file.size ?? 0, req)
        if (!quota.allowed) {
          throw new Error(quota.message ?? 'আজকের ছবি আপলোডের সীমা শেষ।')
        }

        return data
      },
    ],
  },
  upload: {
    mimeTypes: ALLOWED_MIME_TYPES,
    // SVG is allowed above but is sanitised on delivery by the strict CSP
    // (`img-src 'self'`) and never served as a top-level document. sharp does
    // not rasterise SVG (`canResizeImage` excludes it), so a vector stays
    // vector and no size variants are generated for it.
    focalPoint: true,
    adminThumbnail: 'thumbnail',
    /** Where the library lives on the host disk. Outside the web root. */
    staticDir: process.env.MEDIA_UPLOAD_DIR || './data/media',
    /** Convert the stored file itself to WebP — the original format is discarded. */
    formatOptions: WEBP,
    /** Cap the retained dimensions so a 6000px upload cannot sit on the disk. */
    resizeOptions: { width: 2000, withoutEnlargement: true },
    /** Strip EXIF, colour profiles and embedded thumbnails. */
    withMetadata: false,
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre', formatOptions: WEBP },
      { name: 'card', width: 768, height: 432, position: 'centre', formatOptions: WEBP },
      { name: 'hero', width: 1600, height: 900, position: 'centre', formatOptions: WEBP },
    ],
  },
}
