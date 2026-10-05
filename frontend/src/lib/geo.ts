/**
 * Reader location — for weather and prayer times.
 *
 * ## Why this runs in the browser
 *
 * Weather and prayer times depend on where the reader is. A static site baked
 * at build time can only know one place, so Dhaka is the build-time default and
 * the browser refines it once the page has loaded.
 *
 * The build-time value is never blank: the reader sees a real, correct-for-Dhaka
 * number immediately and it is then replaced. That ordering matters — a widget
 * that waits on a network call is a widget that flashes empty.
 *
 * ## How location is resolved
 *
 * 1. A previously chosen location in `localStorage`.
 * 2. Otherwise, IP-based city lookup (no API key, no cookies).
 * 3. Otherwise, fall back to the build-time default (Dhaka).
 *
 * We do NOT use the browser Geolocation API. It prompts for permission, and a
 * permission dialog on a news homepage is hostile; IP city-level accuracy is
 * easily good enough for weather and prayer times and asks the reader nothing.
 *
 * ## Why an auto-detected location expires
 *
 * A stored location used to be permanent, and the IP lookup only runs when
 * there is none — so a reader who resolved to Sylhet once kept that label
 * forever, including from a different connection in a different city. The
 * widget would confidently report the wrong city indefinitely.
 *
 * `storedAt` now bounds it: an **auto-detected** location is re-resolved after
 * `LOCATION_TTL_MS`. A location the reader **chose** from the selector is
 * deliberate and never expires — silently discarding a deliberate choice would
 * be worse than keeping it.
 *
 * ## Privacy
 *
 * The resolved city name and coordinates stay in `localStorage` on the reader's
 * own device. Nothing is transmitted to us — there is no server in the request
 * path to send it to. The IP-based lookup does send the reader's IP to
 * `ipwho.is`, which is disclosed in `privacy-policy.astro`.
 */

export interface Location {
  /** Bengali city name shown in the selector. */
  labelBn: string
  lat: number
  lon: number
  /** How we learned it — used to decide whether to keep asking. */
  source: 'user' | 'ip' | 'default'
  /** Epoch ms when this was written to `localStorage`. Absent on older entries. */
  storedAt?: number
}

/**
 * The eight division cities. District-level would be nicer, but the Districts
 * taxonomy carries no coordinates, and city-level is within the accuracy of both
 * providers anyway.
 */
export const CITIES: ReadonlyArray<Omit<Location, 'source'>> = [
  { labelBn: 'ঢাকা', lat: 23.8103, lon: 90.4125 },
  { labelBn: 'চট্টগ্রাম', lat: 22.3569, lon: 91.7832 },
  { labelBn: 'রাজশাহী', lat: 24.3636, lon: 88.6241 },
  { labelBn: 'খুলনা', lat: 22.8456, lon: 89.5403 },
  { labelBn: 'বরিশাল', lat: 22.701, lon: 90.3535 },
  { labelBn: 'সিলেট', lat: 24.8949, lon: 91.8687 },
  { labelBn: 'রংপুর', lat: 25.7439, lon: 89.2752 },
  { labelBn: 'ময়মনসিংহ', lat: 24.7471, lon: 90.4203 },
]

const STORAGE_KEY = 'shikkha24-location'
const DEFAULT_INDEX = 0 // Dhaka

/**
 * How long an **auto-detected** location stays valid before it is looked up
 * again. One day is short enough to follow a reader who travels and long
 * enough that an unchanged IP costs one lookup, not one per page.
 */
const LOCATION_TTL_MS = 24 * 60 * 60 * 1000

export function getDefaultLocation(): Location {
  return { ...CITIES[DEFAULT_INDEX]!, source: 'default' }
}

/**
 * Restore a previously chosen or detected location.
 *
 * @returns `null` when nothing is stored, or when an **auto-detected** entry is
 *          older than {@link LOCATION_TTL_MS} — which makes the caller run a
 *          fresh lookup rather than trust a stale city.
 */
export function readStoredLocation(): Location | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Location>
    if (typeof parsed.lat !== 'number' || typeof parsed.lon !== 'number') return null

    const source = parsed.source === 'user' || parsed.source === 'ip' ? parsed.source : 'default'

    // A deliberate choice never expires; only a guess does.
    if (source === 'ip') {
      const age = typeof parsed.storedAt === 'number' ? Date.now() - parsed.storedAt : Infinity
      if (age > LOCATION_TTL_MS) return null
    }

    return {
      labelBn: parsed.labelBn ?? 'আপনার এলাকা',
      lat: parsed.lat,
      lon: parsed.lon,
      source,
      ...(typeof parsed.storedAt === 'number' ? { storedAt: parsed.storedAt } : {}),
    }
  } catch {
    return null
  }
}

export function storeLocation(location: Location): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...location, storedAt: Date.now() }))
  } catch {
    // Private browsing or a full quota — the widget still works, just unpersisted.
  }
}

/**
 * City-level location from the reader's IP.
 *
 * Uses a keyless provider. Any failure — offline, rate-limited, blocked —
 * resolves to `null` and the caller keeps the default. A location lookup must
 * never be able to break the header.
 */
export async function detectLocationByIp(): Promise<Location | null> {
  try {
    /*
     * Provider: ipwho.is — keyless, no cookies, no permission prompt.
     *
     * ipapi.co was the first choice but is now behind a Cloudflare
     * interstitial, so browser fetches get an HTML challenge page instead of
     * JSON and every lookup silently failed. A lookup that always fails is
     * worse than no lookup at all, because it looks like the feature is missing
     * rather than broken.
     *
     * Verified: returns city, region, country, latitude, longitude, and
     * correctly resolves Chattogram for a Bangladeshi connection.
     */
    const response = await fetch('https://ipwho.is/', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) return null
    const data = (await response.json()) as {
      latitude?: number
      longitude?: number
      city?: string
      success?: boolean
    }
    if (data.success === false) return null
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null

    // Prefer our own Bengali label for a known division city, so the ribbon
    // reads in Bengali rather than an English city name from the provider.
    const match = nearestCity(data.latitude, data.longitude)
    return {
      labelBn: match?.labelBn ?? data.city ?? 'আপনার এলাকা',
      lat: data.latitude,
      lon: data.longitude,
      source: 'ip',
    }
  } catch {
    return null
  }
}

/**
 * The nearest known division city, when the detected point is close to one.
 *
 * @returns `null` if nothing is within ~1.5°, so a reader abroad keeps their own
 *          coordinates instead of being snapped to a Bangladeshi city.
 */
export function nearestCity(lat: number, lon: number): Omit<Location, 'source'> | null {
  let best: Omit<Location, 'source'> | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const city of CITIES) {
    const distance = Math.hypot(city.lat - lat, city.lon - lon)
    if (distance < bestDistance) {
      bestDistance = distance
      best = city
    }
  }

  return bestDistance <= 1.5 ? best : null
}
