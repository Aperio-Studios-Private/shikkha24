import type { CollectionConfig } from 'payload'

/**
 * Media library.
 *
 * Security (docs/security.md §6): uploads are validated **server-side**. Never
 * trust the client-supplied content type — a `.jpg` that is really a script must
 * be rejected on MIME and on extension, not just on its name.
 *
 * Storage: at launch this is local disk. S9 moves the library to Cloudflare R2
 * (10 GB free, zero egress) to keep media off the 2 GB DianaHost host — see
 * `docs/hosting-and-deployment.md`. Nothing here should assume local disk.
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

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    // Media is publicly readable — it is the site's image origin.
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      admin: {
        description:
          'বাংলায় ছবির বিবরণ লিখুন। অলংকরণমূলক ছবির ক্ষেত্রে খালি রাখুন (alt="")।',
      },
    },
    {
      name: 'caption',
      type: 'text',
      admin: {
        description: 'ছবির নিচে দেখানো ক্যাপশন (ঐচ্ছিক)।',
      },
    },
    {
      name: 'credit',
      type: 'text',
      admin: {
        description: 'ছবির সূত্র / কৃতজ্ঞতা (ঐচ্ছিক)।',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ req, data }) => {
        const file = req?.file
        if (!file) return data

        if (!ALLOWED_MIME_TYPES.includes(file.mimetype ?? '')) {
          throw new Error(
            `অনুমোদিত নয় এমন ফাইল ধরন: ${file.mimetype}. শুধু ছবি আপলোড করা যাবে।`,
          )
        }

        if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
          const mb = (file.size / 1024 / 1024).toFixed(1)
          throw new Error(`ফাইলটি অনেক বড় (${mb} MB)। সর্বোচ্চ ১৫ MB অনুমোদিত।`)
        }

        return data
      },
    ],
  },
  upload: {
    mimeTypes: ALLOWED_MIME_TYPES,
    // SVG is allowed above but is sanitised on delivery by the strict CSP
    // (`img-src 'self'`) and never served as a top-level document.
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 432, position: 'centre' },
      { name: 'hero', width: 1600, height: 900, position: 'centre' },
    ],
  },
}
