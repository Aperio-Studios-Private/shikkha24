/**
 * Build-time ad layer — Payload `ad-units` → reserved slots in the static HTML.
 *
 * ## Why this is build-time, like everything else
 *
 * The site is pre-built static HTML. Ad units are read once per build and baked
 * into the reserved containers, so no reader request ever waits on the CMS
 * (`docs/data-sources.md` §1). Only the AdSense script itself loads in the
 * browser, and only after LCP.
 *
 * ## The contract with the CMS
 *
 * `AD_POSITIONS` mirrors `cms/src/collections/AdUnits.ts`. Each value has exactly
 * one `AdSlot` in the frontend, and each of those reserves its box before an ad
 * loads — that is what holds CLS at zero (`docs/performance-budget.md` §1).
 *
 * ⚠️ Adding a position here without adding a slot means an ad unit that silently
 * never renders.
 *
 * ## Never fail the build
 *
 * Same rule as `lib/cms.ts`: a CMS outage must not stop the site from building.
 * An unreachable CMS yields no ad units, every slot falls back to its labelled
 * placeholder, and the page still ships.
 */
import { cmsFetch, getSiteSettings } from './cms'

/** Mirrors `AD_POSITIONS` in `cms/src/collections/AdUnits.ts`. */
export const AD_POSITIONS = [
  'homepageLeaderboard',
  'homepageFooter',
  'sidebarTop',
  'sidebarSticky',
  'categoryLeaderboard',
  'liveBlogTop',
  'articleTop',
  'articleMiddle',
  'articleBottom',
] as const

export type AdPosition = (typeof AD_POSITIONS)[number]

export type AdType = 'adsense' | 'sponsorBanner' | 'direct'

export interface CmsAdUnit {
  id: number | string
  name: string
  position: AdPosition
  adType: AdType
  adsenseSlotId?: string | null
  image?: { url?: string | null; alt?: string | null } | number | null
  targetUrl?: string | null
  sponsorName?: string | null
  campaignStart?: string | null
  campaignEnd?: string | null
  isActive?: boolean | null
  updatedAt?: string | null
}

/**
 * Is the unit inside its campaign window right now?
 *
 * `campaignEnd` is a `dayOnly` date, which parses to 00:00 — so an ad scheduled
 * to end on the 30th must still run *during* the 30th. Comparing against the raw
 * timestamp would switch it off at midnight at the start of its final day. The
 * whole final day is therefore included.
 */
function isWithinCampaign(unit: CmsAdUnit, now: number): boolean {
  if (unit.campaignStart) {
    const start = new Date(unit.campaignStart).getTime()
    if (!Number.isNaN(start) && now < start) return false
  }

  if (unit.campaignEnd) {
    const end = new Date(unit.campaignEnd).getTime()
    if (!Number.isNaN(end) && now > end + 24 * 60 * 60 * 1000 - 1) return false
  }

  return true
}

/** Every ad unit, newest edit first. Empty when the CMS is unreachable. */
async function getAdUnits(): Promise<CmsAdUnit[]> {
  const data = await cmsFetch<{ docs?: CmsAdUnit[] } | null>(
    '/api/ad-units?limit=100&depth=1&sort=-updatedAt',
    null,
  )
  return data?.docs ?? []
}

/**
 * The unit that should render in `position`, or `null` to show the placeholder.
 *
 * **One unit per position.** If several are active for the same position the most
 * recently edited one wins, so an editor can see their change take effect without
 * having to deactivate the previous unit. Rotation between creatives is not
 * possible on a static site — the choice is fixed at build time.
 */
export async function getAdForPosition(position: AdPosition): Promise<CmsAdUnit | null> {
  const now = Date.now()

  const candidates = (await getAdUnits()).filter(
    (unit) => unit.position === position && unit.isActive !== false && isWithinCampaign(unit, now),
  )

  return candidates[0] ?? null
}

/**
 * The AdSense publisher id, managed in Site Settings.
 *
 * Returns `null` when unset, which is the signal for every slot to render its
 * placeholder rather than an empty `<ins>` — an AdSense unit with no client id
 * renders as a blank box and looks like a bug to the reader.
 */
export async function getAdsenseClientId(): Promise<string | null> {
  const settings = await getSiteSettings()
  const id = settings.tracking?.adsenseClientId
  return id && id.trim() !== '' ? id.trim() : null
}
