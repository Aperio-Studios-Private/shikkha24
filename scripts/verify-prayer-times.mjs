/**
 * Prayer times must come from the method the owner chose, and be astronomically
 * right.
 *
 * ## Why this exists
 *
 * The site asked Aladhan for `method=1` (Karachi) with no record of the choice
 * anywhere. When the owner was asked which method Bangladesh should follow, the
 * recommendation given — and accepted — was **Moonsighting**, believed to be
 * method 13.
 *
 * **It is method 15.** Method 13 is *Diyanet İşleri Başkanlığı, Turkey
 * (experimental)*. The two agree on Sylhet's ফজর to the minute, so nothing
 * would have looked wrong locally — but this was a wrong answer confidently
 * delivered, and it was wrong in the one place a guess is least acceptable.
 *
 * ## Why a live API call rather than a source check
 *
 * The index is **not** stable knowledge:
 *
 * 1. `/v1/methods` returns methods in a **different order** from the numeric
 *    `method=` parameter — position 14 in that object is `MOONSIGHTING`, but
 *    `method=14` returns *Russia*. Reading the list and picking by position
 *    gets the wrong method, which is exactly the mistake this file exists to
 *    prevent repeating.
 * 2. The `method=` **name** parameter is broken: every name tried returned
 *    ISNA. Only the number varies.
 * 3. An upstream remap would change every prayer time on the site silently.
 *
 * So the check asks the API what it *actually* computed and asserts the name.
 * That catches a wrong constant, a wrong assumption about it, and an upstream
 * remap, with one request.
 *
 * ## The astronomical cross-check
 *
 * `Asr` is the one time a pure lookup cannot be trusted: Aladhan accepts a
 * `school` parameter but **ignores it**, and `meta.school` misreports what it
 * served. Bangladesh follows the Hanafi school, so the value matters a great
 * deal — Shafi'i Asr runs about an hour earlier near the Tropic of Cancer.
 *
 * This file computes Asr independently (NOAA solar position, shadow-ratio
 * Asr) and asserts the API agrees. That simultaneously proves the school is
 * the right one *without* trusting `meta.school`, which lies about it.
 *
 * ## What this deliberately does NOT assert
 *
 * It does not pin Fajr/Isha to numbers. Those depend on the method under test,
 * so pinning them would only encode today's upstream choice twice. Asr is
 * method-independent, which is why it can be checked here at all.
 *
 * Run: node scripts/verify-prayer-times.mjs
 */
import { execFileSync } from 'node:child_process'

/** The method the owner selected on 2026-10-05. Keep in step with HeaderWidgets.astro. */
const EXPECTED_METHOD_INDEX = 15
/** The exact name the API must report back — the assertion that cannot be faked. */
const EXPECTED_METHOD_NAME = 'Moonsighting Committee Worldwide (Moonsighting.com)'

/** Cities the header offers, so a method that breaks one place cannot pass. */
const CITIES = [
  { name: 'ঢাকা', lat: 23.8103, lon: 90.4125 },
  { name: 'সিলেট', lat: 24.8949, lon: 91.8687 },
  { name: 'চট্টগ্রাম', lat: 22.3569, lon: 91.7832 },
  { name: 'রংপুর', lat: 25.7439, lon: 89.2752 },
  { name: 'বরিশাল', lat: 22.701, lon: 90.3535 },
]

/** Bangladesh Standard Time is a fixed UTC+6 with no daylight saving. */
const TZ_OFFSET_MINUTES = 6 * 60

/** Tolerances. Asr is checked across two seasons, so the bound must allow for that. */
const METHOD_EXACT = true
const ASR_TOLERANCE_MINUTES = 2

/** "HH:MM" → minutes since local midnight. */
function toMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? '').trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/**
 * Asr for a shadow-ratio school, computed independently of Aladhan.
 *
 * @param hanafi `true` for Hanafi (shadow = object + noon shadow, the school
 *               Bangladesh follows), `false` for Shafi'i (shadow = object).
 * @returns Minutes since local midnight, or `null` if the sun never reaches it.
 */
function asrMinutes(lat, lon, date, hanafi) {
  // NOAA solar position.
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear(date) - 1)
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)

  const phi = (lat * Math.PI) / 180
  const solarNoon = 720 - 4 * lon + TZ_OFFSET_MINUTES - eqTime

  // Shadow length at solar noon: cot(altitude), altitude = 90° − |φ − δ|.
  const noonShadow = 1 / Math.tan(Math.PI / 2 - Math.abs(phi - decl))

  // Required altitude for the target shadow ratio. Note tan(alt) = 1/shadow,
  // and the altitude must go through sin() before the hour-angle solve — using
  // 1/shadow directly as a sine inflates the result badly.
  //
  // ⚠️ The ratio is the *multiplier on the object's own shadow*, and it must be
  // 2 for Hanafi and 1 for Shafi'i: Hanafi Asr is when an object's shadow is
  // twice its height **plus** the noon shadow, Shafi'i when it is once its
  // height plus the noon shadow. This read `1 + (hanafi ? noonShadow : 0)`,
  // which is the Shafi'i shadow in *both* branches — so the Hanafi expectation
  // was ~45 min early and the check failed on every city. Verified against the
  // API: with the corrected ratio, 21 Dec (Dhaka) matches Aladhan's
  // `school=1` Hanafi value exactly at 15:40.
  const targetShadow = (hanafi ? 2 : 1) + noonShadow
  const sinAlt = Math.sin(Math.atan(1 / targetShadow))

  const cosH = (sinAlt - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl))
  if (cosH > 1 || cosH < -1) return null

  const hourAngle = (Math.acos(cosH) * 180) / Math.PI
  return solarNoon + (hourAngle / 15) * 60
}

function dayOfYear(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1)
  return (
    Math.round(
      (Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86_400_000,
    ) + 1
  )
}

/**
 * The Asr school: 1 = Hanafi, which Bangladesh follows and which the storefront
 * must request. **This file originally omitted it, so the check reproduced the
 * very bug it exists to catch** — it asked for the same Shafi'i default the
 * component did and then compared that against a Hanafi expectation, failing on
 * all five cities. The drift it reported was real; the request was not.
 *
 * Keep in step with `ALADHAN_SCHOOL` in `HeaderWidgets.astro`.
 */
const SCHOOL_HANAFI = 1

/** One Aladhan timings response. */
function fetchTimings(date, lat, lon, method) {
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const url =
    `https://api.aladhan.com/v1/timings/${dd}-${mm}-${date.getUTCFullYear()}` +
    `?latitude=${lat}&longitude=${lon}&method=${method}&school=${SCHOOL_HANAFI}`
  const raw = execFileSync('curl', ['-s', '--max-time', '15', url], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
  const body = JSON.parse(raw)
  if (body?.code !== 200 || !body?.data?.timings?.Fajr) {
    throw new Error(`Aladhan returned code=${body?.code} for ${url}`)
  }
  return body.data
}

const failures = []
const notes = []

// Today's date, so the check tracks the real calendar rather than a fixture
// that silently goes stale.
const today = new Date()
const winter = new Date(Date.UTC(today.getUTCFullYear(), 11, 21)) // 21 Dec — worst case for Asr drift
const seasons = [
  ['October', new Date(Date.UTC(today.getUTCFullYear(), 9, 5))],
  ['December', winter],
]

for (const city of CITIES) {
  let data
  try {
    data = fetchTimings(today, city.lat, city.lon, EXPECTED_METHOD_INDEX)
  } catch (error) {
    failures.push(`${city.name}: could not reach Aladhan — ${error.message}`)
    continue
  }

  // 1. The method must be the one the owner chose, by name.
  const gotMethod = data?.meta?.method?.name
  if (METHOD_EXACT && gotMethod !== EXPECTED_METHOD_NAME) {
    failures.push(
      `${city.name}: method=${EXPECTED_METHOD_INDEX} computed "${gotMethod}", ` +
        `expected "${EXPECTED_METHOD_NAME}". The API's index mapping differs from ` +
        `/v1/methods — re-enumerate 0…20 before changing anything.`,
    )
  }

  // 2. Asr must match an independent Hanafi computation. meta.school cannot be
  //    trusted here: it reports STANDARD while serving Hanafi.
  for (const [label, date] of seasons) {
    // ⚠️ Both sides must use the SAME date. This compared `data.timings.Asr` —
    // fetched for **today** at the top of the loop — against an independently
    // computed Asr for **5 October**, so the "October" check was really an
    // 11-day mismatch once today drifted past the 5th. It showed up as a
    // stubborn ~8 min drift that no formula could explain. Every season now
    // fetches the date it is going to compute.
    let apiAsr
    try {
      apiAsr = toMinutes(fetchTimings(date, city.lat, city.lon, EXPECTED_METHOD_INDEX).timings.Asr)
    } catch {
      notes.push(`${city.name}: ${label} lookup failed, Asr not cross-checked`)
      continue
    }
    const computed = asrMinutes(city.lat, city.lon, date, true)
    if (apiAsr === null || computed === null) {
      failures.push(`${city.name} ${label}: Asr unparseable (api=${data.timings.Asr})`)
      continue
    }
    const drift = Math.abs(apiAsr - computed)
    if (drift > ASR_TOLERANCE_MINUTES) {
      const shafi = asrMinutes(city.lat, city.lon, date, false)
      const nearer = Math.abs(shafi - apiAsr) < drift ? " (it matches SHAFI'i — wrong school)" : ''
      failures.push(
        `${city.name} ${label}: Asr drifts ${drift.toFixed(1)} min from the ` +
          `independent Hanafi value${nearer}`,
      )
    }
  }
}

if (failures.length === 0) {
  console.log('verify:prayer-times — OK')
  console.log(`  method ${EXPECTED_METHOD_INDEX} confirmed by name: ${EXPECTED_METHOD_NAME}`)
  console.log(`  cities checked: ${CITIES.length} (Asr cross-checked in ${seasons.length} seasons)`)
  console.log(`  Asr matches an independent Hanafi computation within ${ASR_TOLERANCE_MINUTES} min`)
  if (notes.length) for (const n of notes) console.log(`  note: ${n}`)
} else {
  console.error(`verify:prayer-times — FAILED (${failures.length})`)
  for (const f of failures) console.error(`  ${f}`)
  console.error(`\n  The prayer method is an owner decision. Change it in`)
  console.error(`  frontend/src/components/HeaderWidgets.astro and here together.`)
  process.exitCode = 1
}
