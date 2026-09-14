/**
 * Per-day media upload quota.
 *
 * ## Why this exists
 *
 * Media is on the DianaHost disk (moved there 2026-09-12). That disk is
 * **2 GB, shared with the app, the database and the backups**, and at the
 * approved velocity of 15–20 articles/day the library grows 150–270 MB/month —
 * 7–13 months to full.
 *
 * Conversion alone is not enough to protect that: a burst day (results,
 * admission, a circular release) can put a week of images through in an
 * afternoon, and nobody notices until the disk is full. A **cap** is what turns
 * "we should watch it" into "it cannot happen silently".
 *
 * ## What it does
 *
 * Rejects an upload that would take today's total past the configured ceiling.
 * The editor gets a Bengali error naming the remaining headroom, so the fix is
 * obvious: publish what matters now, and let tomorrow's allowance open up.
 *
 * ## Design notes
 *
 * - **Measured against the incoming file, not the stored one.** Conversion
 *   shrinks an image a lot, but the cap must be conservative — the input size is
 *   the number that can never be understated.
 * - **The day boundary is Asia/Dhaka midnight**, matching the quiz streak and
 *   the rest of the site's date handling. Bangladesh has a fixed +06:00 offset
 *   with no DST, so this needs no timezone library.
 * - **Fails open on a query error.** A cap that blocks publishing because the
 *   database hiccuped would be worse than the disk filling up.
 */
import type { Payload, PayloadRequest } from 'payload'

/** Asia/Dhaka is a fixed +06:00 with no daylight saving. */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000

const DAY_MS = 24 * 60 * 60 * 1000

/** Default ceiling: ~one day of the approved velocity, in bytes. */
const DEFAULT_CAP_BYTES = 250 * 1024 * 1024

/** Read the configured cap. `0` disables the check entirely. */
export function dailyCapBytes(): number {
  const raw = process.env.MEDIA_DAILY_UPLOAD_CAP_BYTES
  if (raw === undefined || raw.trim() === '') return DEFAULT_CAP_BYTES
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CAP_BYTES
}

/**
 * The UTC instant of the most recent Asia/Dhaka midnight.
 *
 * Shifting into Dhaka local time, flooring to the day, then shifting back is the
 * whole trick — no library needed for a fixed-offset zone.
 */
export function startOfDhakaDay(now: number = Date.now()): Date {
  const dhakaNow = now + DHAKA_OFFSET_MS
  const dhakaMidnight = Math.floor(dhakaNow / DAY_MS) * DAY_MS
  return new Date(dhakaMidnight - DHAKA_OFFSET_MS)
}

/** Bytes of media already accepted since the most recent Dhaka midnight. */
export async function bytesUsedToday(payload: Payload, req?: PayloadRequest): Promise<number> {
  const { docs } = await payload.find({
    collection: 'media',
    where: { createdAt: { greater_than: startOfDhakaDay().toISOString() } },
    // Only the two fields the sum needs — the library holds the originals, and
    // pulling whole documents here would be needlessly heavy on a 2 GB host.
    select: { filesize: true },
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })

  return docs.reduce((total, doc) => {
    const size = (doc as { filesize?: number | null }).filesize
    return total + (typeof size === 'number' ? size : 0)
  }, 0)
}

/** A human-readable MB figure for the error message. */
function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1)
}

export interface QuotaDecision {
  allowed: boolean
  /** Bengali, editor-facing message — shown verbatim in the admin. */
  message?: string
  usedBytes: number
  capBytes: number
}

/**
 * Decide whether one more upload of `incomingBytes` may be accepted today.
 *
 * @param incomingBytes Worst-case size — the raw upload, before conversion.
 */
export async function checkUploadQuota(
  payload: Payload,
  incomingBytes: number,
  req?: PayloadRequest,
): Promise<QuotaDecision> {
  const capBytes = dailyCapBytes()
  if (capBytes === 0) {
    return { allowed: true, usedBytes: 0, capBytes }
  }

  let usedBytes: number
  try {
    usedBytes = await bytesUsedToday(payload, req)
  } catch {
    // Fail open — see the note at the top of this file.
    return { allowed: true, usedBytes: 0, capBytes }
  }

  if (usedBytes + incomingBytes > capBytes) {
    const remaining = Math.max(0, capBytes - usedBytes)
    return {
      allowed: false,
      usedBytes,
      capBytes,
      message:
        `আজকের ছবি আপলোডের সীমা প্রায় শেষ (আজ ${mb(usedBytes)} MB ব্যবহৃত, সীমা ${mb(capBytes)} MB)। ` +
        `এই ফাইলটি যোগ করলে সীমা ছাড়িয়ে যাবে। বাকি আছে মাত্র ${mb(remaining)} MB — ` +
        `আজ দরকারি ছবিগুলো আগে দিন, বাকিগুলো আগামীকাল আপলোড করুন।`,
    }
  }

  return { allowed: true, usedBytes, capBytes }
}
