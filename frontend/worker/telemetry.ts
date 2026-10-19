/**
 * First-party real-user-performance ingestion for Analytics Engine.
 *
 * The reader sends only paint timings and its page path. The Worker derives the
 * page template so the Analytics Engine sampling index stays low-cardinality;
 * individual paths remain a filterable blob, never the sampling key.
 */

/** The Analytics Engine binding contract used by this Worker. */
export interface TelemetryBinding {
  writeDataPoint(event: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void
}

/** Payload accepted from the sampled browser beacon. */
interface TelemetryPayload {
  path: string
  lcp: number
  fcp?: number
}

/**
 * Convert a page path into a stable template label for sampling and grouping.
 *
 * @param path - Same-origin path from the page that recorded paint timings.
 * @returns One of the site's main RUM templates, or `other`.
 */
export function templateForPath(path: string): string {
  if (path === '/' || path === '') return 'home'
  if (path === '/latest' || path.startsWith('/latest/page/')) return 'latest'
  if (path.startsWith('/education-news/')) return 'article'
  if (path.startsWith('/category/')) return 'category'
  return 'other'
}

/**
 * Validate and store one sampled paint-timing event.
 *
 * @param request - The `POST /telemetry` request.
 * @param telemetry - The Analytics Engine binding from the Worker environment.
 * @returns `true` when a point was written; `false` for expected invalid input.
 */
export async function recordTelemetry(
  request: Request,
  telemetry: TelemetryBinding,
): Promise<boolean> {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim()
  if (
    request.method !== 'POST' ||
    (contentType !== 'text/plain' && contentType !== 'application/json')
  ) {
    return false
  }

  try {
    const payload = parsePayload(await request.json())
    if (!payload) return false
    telemetry.writeDataPoint({
      blobs: [payload.path.slice(0, 512)],
      doubles: [payload.lcp, payload.fcp ?? -1],
      indexes: [templateForPath(payload.path)],
    })
    return true
  } catch {
    return false
  }
}

/**
 * Enforce the beacon contract without trusting browser-supplied dimensions.
 *
 * @param input - Parsed JSON from the beacon.
 * @returns A bounded payload, or `null` when the input does not match.
 */
function parsePayload(input: unknown): TelemetryPayload | null {
  if (typeof input !== 'object' || input === null) return null
  const { path, lcp, fcp } = input as Record<string, unknown>
  if (typeof path !== 'string' || !path.startsWith('/') || path.length > 512) return null
  if (!isFiniteNumber(lcp) || lcp < 0 || lcp > 60_000) return null
  if (fcp !== undefined && (!isFiniteNumber(fcp) || fcp < 0 || fcp > 60_000)) return null
  return { path, lcp, fcp }
}

/**
 * Check that a JSON value is a finite, non-huge timing number.
 *
 * @param value - The value to validate.
 * @returns Whether the value is safely usable as a metric.
 */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
