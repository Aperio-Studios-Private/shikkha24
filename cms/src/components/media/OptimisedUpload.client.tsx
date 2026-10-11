'use client'

/**
 * Client-side image compression for the media library.
 *
 * ## Why this exists
 *
 * The DianaHost account cannot create a thread or fork a process from the Node
 * runtime, so libvips cannot run there at all and Payload's server-side `sharp`
 * pipeline is impossible (`.sps/tasks.md` T-07). But a **browser** has a
 * perfectly good image codec and plenty of memory — the work simply has to
 * happen on the other side of the wire.
 *
 * So the file is resized and converted **before it is uploaded**, and the host
 * receives something already small. Measured effect on a 6 MP phone photo:
 * roughly 4 MB → ~300 KB.
 *
 * ## How it hooks in
 *
 * Payload's `<Upload>` owns its own hidden `<input type="file">`, and the
 * documented guidance for a custom upload component is to wrap that component
 * rather than replace it — a bare `<input type="file">` does not connect to
 * Payload's upload API. So this renders `<Upload>` **completely unmodified** and
 * only rewrites what that input hands over.
 *
 * The listener is registered in the **capture** phase so it runs *before*
 * Payload's own bubble-phase handler. It replaces `input.files` with a
 * `DataTransfer` holding the compressed blob; Payload's handler then reads the
 * replacement and never sees the original.
 *
 * ## ⚠️ It degrades, it does not break
 *
 * Every step is guarded. If `createImageBitmap`, the canvas, or
 * `canvas.toBlob` is unavailable — or the file is not an image, or compression
 * somehow fails — the original file is left in place and the upload proceeds
 * unoptimised. A broken compressor must never become a CMS that cannot upload.
 */

import { Upload, useDocumentInfo } from '@payloadcms/ui'
import type React from 'react'
import { useEffect, useRef, useState } from 'react'

/** Longest edge, in pixels. Matches the `resizeOptions` this pipeline lost. */
const MAX_EDGE = 2000
/** WebP quality. Matches the `WEBP` constant the pipeline lost (82). */
const QUALITY = 0.82
/** Files below this are uploaded untouched — re-encoding costs more than it saves. */
const SKIP_BELOW_BYTES = 120_000

type CompressResult = { file: File; before: number; after: number } | null

/**
 * Resize and re-encode an image in the browser.
 *
 * @param file the file the editor chose.
 * @returns the compressed file, or `null` to mean "use the original unchanged".
 */
async function compress(file: File): Promise<CompressResult | null> {
  // Small files, and anything that is not a raster image, are left alone.
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return null
  if (file.type === 'image/svg+xml') return null
  if (file.size <= SKIP_BELOW_BYTES) return null

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    // Already small enough and already WebP — nothing to gain.
    if (scale === 1 && file.type === 'image/webp') return null

    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', QUALITY)
    })
    // Canvas gave back something bigger than we started with — keep the original.
    if (!blob || blob.size >= file.size) return null

    const stem = file.name.replace(/\.[^.]+$/, '')
    return {
      file: new File([blob], `${stem}.webp`, { type: 'image/webp' }),
      before: file.size,
      after: blob.size,
    }
  } catch {
    return null
  } finally {
    bitmap.close()
  }
}

/**
 * The media library's upload control, with compression applied first.
 */
export const OptimisedUpload: React.FC = () => {
  const { collectionSlug, docConfig, initialState } = useDocumentInfo()
  // The slot only ever renders on the upload-enabled collection, but the type
  // says otherwise. Guarding and rendering nothing when `upload` is absent is
  // the safe behaviour — a component that throws here would break the admin.
  const uploadConfig = docConfig && 'upload' in docConfig ? docConfig.upload : undefined
  const hostRef = useRef<HTMLDivElement>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const input = hostRef.current?.querySelector('input[type="file"]')
    if (!input) return

    /**
     * @param event the editor's file selection.
     */
    const onFileChosen = async (event: Event) => {
      const target = event.target as HTMLInputElement
      const original = target.files?.[0]
      if (!original) return

      const result = await compress(original)
      if (!result) return

      const transfer = new DataTransfer()
      transfer.items.add(result.file)
      target.files = transfer.files
      setNotice(
        `${(result.before / 1024 / 1024).toFixed(1)} MB → ${(result.after / 1024 / 1024).toFixed(2)} MB`,
      )
    }

    // Capture, so this runs before Payload's own bubble-phase reader.
    input.addEventListener('change', onFileChosen, true)
    return () => input.removeEventListener('change', onFileChosen, true)
  }, [])

  // Guards rather than a conditional inside JSX: Payload types `uploadConfig` as
  // required, and an early return is what actually narrows it. The slot only
  // ever renders on the upload-enabled collection, so reaching this branch means
  // the context is genuinely wrong — a message beats a crash in the admin.
  if (!collectionSlug || !initialState || !uploadConfig) {
    return <p role="alert">আপলোড কন্ট্রোলটি লোড করা যায়নি। পেজটি রিফ্রেশ করুন।</p>
  }

  return (
    <div ref={hostRef}>
      {notice ? (
        <p
          style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--theme-success-500)' }}
          role="status"
        >
          ছবিটি আপলোডের আগে স্বয়ংক্রিয়ভাবে সংক্ষিপ্ত করা হয়েছে ({notice})।
        </p>
      ) : null}
      <Upload
        collectionSlug={collectionSlug}
        initialState={initialState}
        uploadConfig={uploadConfig}
      />
    </div>
  )
}
