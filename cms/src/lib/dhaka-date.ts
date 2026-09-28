/**
 * Dhaka-anchored Bengali date formatting — the CMS mirror of the frontend's
 * `formatBnBd` (`frontend/src/lib/bangla-date.ts`).
 *
 * ## Why the CMS needs its own copy
 *
 * The two workspaces are deliberately not cross-importable (see the S4 decision
 * not to pull `@payloadcms/richtext-lexical` into the static build). The
 * generated-image surfaces — the S14 ID card and photocard — format dates inside
 * the CMS process, so they need the same contract here.
 *
 * ## The timezone contract
 *
 * `publishedAt` is stored in UTC. `toLocaleDateString('bn-BD')` without a
 * `timeZone` uses the *runtime's* zone, which is UTC in CI — a story published
 * 02:00 Dhaka on 1 September then displays as 31 August. Every rendered date on
 * this project pins `Asia/Dhaka` (a fixed +06:00, no daylight saving) so the
 * card and the page can never disagree. This applies to generated images too:
 * a photocard stamped 31 August next to an article dated 1 September is a
 * visible defect, not a rounding issue.
 */

/** Bangladesh Standard Time — fixed offset, no DST transitions. */
const DHAKA_TZ = 'Asia/Dhaka'

/**
 * Format an ISO date in Bengali, anchored to Dhaka.
 *
 * @param iso     The date string or Date object.
 * @param options `Intl.DateTimeFormatOptions` merged in before `timeZone`, so a
 *                caller cannot accidentally drop the pin.
 */
export function formatBnBd(iso: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString('bn-BD', { ...options, timeZone: DHAKA_TZ })
}
