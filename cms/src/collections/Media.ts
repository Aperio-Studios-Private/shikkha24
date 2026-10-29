import type { CollectionConfig } from 'payload'
import { isEditorial, isSuperAdminOrEditorInChief } from '../access/roles'
import { checkUploadQuota } from '../lib/media-quota'

/**
 * Media library.
 *
 * ## Storage — the DianaHost disk

 *
 * Media is on the DianaHost disk (moved there 2026-09-12; Cloudflare R2 removed
 * entirely 2026-09-14). Uploads land on the **2 GB host disk**, shared with
 * the app, the database and the backups.
 *
 * The frontend's `PUBLIC_MEDIA_BASE_URL` points at this host. There is no CDN —
 * browser caching via `Cache-Control` in `.htaccess` is the only mitigation for
 * repeat-visit bandwidth. The 200 GB/month cap applies to all media traffic.
 *
 * ## What is actually stored — the original, byte for byte
 *
 * **No conversion, no resize, no metadata stripping happens here.** The file
 * lands on disk exactly as it was uploaded: a JPEG stays a JPEG at its original
 * dimensions and filesize, EXIF and all. `upload` below configures no
 * `formatOptions`, no `resizeOptions` and no `imageSizes`, and those three keys
 * are the *only* thing that makes Payload construct sharp
 * (`payload/dist/uploads/generateFileData.js:138,145` — `fileHasAdjustments`
 * gates `sharp(...)`, and it is `false` with all three unset). Dimensions are
 * still recorded: `getImageSize` falls through to `probeImageSize`, a pure-JS
 * header reader (`payload/dist/uploads/getImageSize.js:20,22`).
 *
 * **Why:** sharp cannot load on this host (T-07 — the fork/thread limit the
 * 2026-10-11 uploads hit; full reasoning in `payload.config.ts:509-568`), so it
 * is deliberately left unset. See the `upload` block below.
 *
 * **Where the compensation is:** the storefront re-encodes remote CMS images at
 * **build time** through Astro's pipeline (`frontend/src/components/CmsImage.astro`;
 * `docs/image-optimization.md` §4). Reader-facing pages do get AVIF/WebP — the
 * CMS just does not make them.
 *
 * **What would change this:** `.sps/tasks.md` **T-58** (parked, option A) —
 * add the three keys back, gated on owner approval, a green T-31 clean-cycle,
 * and a backfill decision for the existing photos.
 *
 * ### ⚠️ Correction — this section used to claim the opposite
 *
 * It described "three storage controls" that transformed every upload at the
 * storage layer: `formatOptions` converting to WebP before the write, a
 * `resizeOptions` dimension cap, and `withMetadata: false` stripping EXIF. It
 * was wrong because those keys were **removed from this collection on
 * 2026-10-11** (commit `70e1266`) — the text outlived the code it described, and
 * an operator reading it would expect WebP files and capped dimensions that are
 * never produced. The per-day cap it listed third (`lib/media-quota.ts`) is
 * real and stayed; it is documented in the `beforeValidate` hook below.
 *
 * The AVIF-vs-WebP trade-off previously argued here is likewise moot while the
 * pipeline is off — there is no format decision to make. Whether AVIF joins
 * WebP is T-58's call, not this file's.
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

/*
 * ⚠️ **Correction (T-70).** WebP quality, and `82` sits in the 75–90 band
 * `docs/image-optimization.md` sets — but **nothing in this file consumes it**,
 * because there is no `formatOptions` and no `imageSizes` to apply it to (see
 * the `upload` block). It is a leftover from the sharp pipeline removed on
 * 2026-10-11 (`70e1266`). The band still governs the build-time optimiser in the
 * storefront, which keeps its own settings. Left in place rather than deleted
 * because this change is comments only; T-58 would be its consumer.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { en: 'Media', bn: 'ছবি' },
    plural: { en: 'Media library', bn: 'ছবির লাইব্রেরি' },
  },
  admin: {
    components: {
      edit: {
        /**
         * Compress in the browser before the upload leaves it. The host cannot
         * run libvips at all (T-07), so this replaces the server-side pipeline
         * rather than supplementing it. Restore the default (delete this block)
         * together with the sharp pipeline when the CloudLinux limit is raised.
         *
         * ⚠️ **Correction (T-70).** The restore condition "when the CloudLinux
         * limit is raised" is **already met** — NPROC went 100 → 200 (see
         * `payload.config.ts:528`). What keeps this component in place is that
         * nothing configures sharp in the collection, not a host limit. The
         * restore condition is now **T-58**: owner approval plus a green T-31
         * clean-cycle.
         */
        Upload: '@/components/media/OptimisedUpload#OptimisedUploadServer',
      },
      /**
       * Card grid with large thumbnails instead of the table (owner request,
       * 2026-10-27). The server view keeps the standard admin chrome; the
       * client grid reads the live query state via useListQuery, so search,
       * filters, sort and pagination keep Payload's behaviour.
       */
      views: {
        list: { Component: '/components/admin/MediaListServerView#MediaListServerView' },
      },
    },
    group: { en: 'Media (মিডিয়া)' },
    /*
     * ⚠️ **Corrected 2026-10-19 (T-70).** This description used to promise, in
     * Bengali, that "every upload is automatically converted to WebP". That was
     * false: `upload` below configures no `formatOptions`, so the CMS converts
     * nothing and stores the original bytes. A wrong promise in operator-facing
     * text is worse than no text — an editor would upload a 5 MB JPEG believing
     * it had been shrunk. It now states what actually happens, in the same
     * Bengali register as the rest of the admin chrome (rule 10).
     */
    description:
      'ছবির লাইব্রেরি। আপলোড করা ফাইলটি অবিকৃত অবস্থায় সংরক্ষিত হয় (CMS কোনো রূপান্তর বা রিসাইজ করে না); প্রতিদিনের আপলোড সীমা প্রযোজ্য।',
  },
  access: {
    // Media is publicly readable — it is the site's image origin.
    read: () => true,
    /*
     * ⚠️ **These three rules are not optional.** Until 2026-09-30 this collection
     * defined only `read`, and Payload's default for an undefined rule is
     * `Boolean(user)` — "any authenticated account", not "anyone" and certainly
     * not "any editor". So **any reader account** (obtainable through the
     * unauthenticated signup that existed at the time) could upload, rewrite and
     * **delete the entire image library**, on a host plan where the media
     * directory shares 2 GB with the app and the database.
     *
     * Proven before the fix, with a reader session:
     *   DELETE /api/media/999999 → 404   (not 403 — access was granted, row absent)
     *   PATCH  /api/media/999999 → 404
     *   POST   /api/media        → 400   (validation ran, so access had passed)
     *
     * It was invisible because no harness asserted access *denial* — see
     * `src/verify/access.ts`, added with this fix.
     */
    create: isEditorial,
    update: isEditorial,
    // Deleting an image a published article still points at is destructive, so it
    // takes an editor — the same gate every other content collection uses.
    delete: isSuperAdminOrEditorInChief,
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

        /*
         * ⚠️ SVG content sniff (pentest 2026-10-29, M4). The client-supplied
         * mimetype proves nothing — the file header comment above says so, but
         * only the allowlist enforced anything. An SVG can carry `<script>`,
         * and when a reader navigates directly to it on media.shikkha24.com
         * the script runs in the brand's own origin (the storefront CSP does
         * not follow the file). Reject any SVG whose first bytes contain a
         * script element or a foreign-object event pattern; brand logos
         * (the only SVGs this library holds) have no need of either.
         */
        if (file.mimetype === 'image/svg+xml') {
          // Payload's typed File lacks a buffer property, but the busboy File
          // behind it carries one; read defensively rather than widen the type.
          const bytes = (file as unknown as { buffer?: Uint8Array }).buffer
          if (bytes) {
            const head = Buffer.from(bytes.subarray(0, 4096)).toString('utf8').toLowerCase()
            if (
              head.includes('<script') ||
              /\bon\w+\s*=/.test(head) ||
              head.includes('javascript:')
            ) {
              throw new Error('এই SVG-এ নিরাপত্তা ঝুঁকি আছে (স্ক্রিপ্ট ধরা পড়েছে)। স্ক্রিপ্ট ছাড়া SVG আপলোড করুন।')
            }
          }
        }

        /*
         * The per-day cap. Measured on the **incoming** size, which is also the
         * **stored** size — nothing shrinks the file on the way in (no
         * `formatOptions`; see the `upload` block). This comment used to say
         * "conversion shrinks the stored file", which described the sharp
         * pipeline removed on 2026-10-11 (`70e1266`). Measuring input and output
         * as equal is the conservative reading and keeps the cap honest.
         */
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
    // SVG is allowed above with a `<script>` content sniff in beforeValidate.
    // Pentest 2026-10-29 (M4): the storefront CSP does NOT follow the file to
    // media.shikkha24.com, so a scripted SVG navigated directly would run in
    // the media origin. The sniff is the server-side control; embedding via
    // `<img>` (the only way the storefront renders media) never executes it.
    // ⚠️ **Correction (T-70).** The rest of this comment used to explain that
    // "sharp does not rasterise SVG (`canResizeImage` excludes it), so a vector
    // stays vector and no size variants are generated for it". Both halves are
    // now vacuous here: no `imageSizes` exist for *any* type, and sharp is never
    // constructed (see below), so SVG is not a special case in this collection.
    // The CSP sentence above is the part that still governs SVG delivery.
    focalPoint: true,
    /** Where the library lives on the host disk. Outside the web root. */
    staticDir: process.env.MEDIA_UPLOAD_DIR || './data/media',

    /**
     * ⚠️ **No `formatOptions`, `resizeOptions` or `imageSizes`.** Not an
     * oversight — see the sharp note in `payload.config.ts`.
     *
     * Those three are the *only* things that make Payload construct sharp
     * (`payload/dist/uploads/generateFileData.js:138` builds `fileHasAdjustments`
     * from exactly `resizeOptions || formatOptions || trimOptions ||
     * constructorOptions`, and `:145` gates `sharp(...)` on it). With them absent
     * Payload still records width/height, via `getImageSize`'s pure-JS
     * `probeImageSize` fallback (`payload/dist/uploads/getImageSize.js:20,22`).
     *
     * **Why sharp stays unset:** T-07. The reason is a deliberate choice, not a
     * permanent host limit — the NPROC limit that caused the 2026-10-11 upload
     * failures has since been raised, which is exactly why re-enabling this is
     * **T-58** (owner approval + green T-31 cycle). Do not read this block as
     * "sharp cannot work here".
     *
     * **What compensates today:** the browser-side optimiser in
     * `@/components/media/OptimisedUpload` (above) shrinks the file before it is
     * sent, and `frontend/src/components/CmsImage.astro` re-encodes the remote
     * result at **build time** (`docs/image-optimization.md` §4). Neither is a
     * substitute for stored variants — admin previews and hotlinks still get the
     * full-size original.
     *
     * The 15 MB input cap in the `beforeValidate` hook above is what makes this
     * tolerable: no resizing means a large photo is stored whole, so the input is
     * bounded instead and the editor is told in Bengali rather than a visitor
     * paying for it on every page load. That guard already existed and is
     * unchanged — Payload 3.89 has no built-in file-size option, and a
     * `maxFileSize` key invented here would have been silently ignored.
     */
  },
}
