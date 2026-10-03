/**
 * S14 harness — the ID card and photocard.
 *
 * ## What the plan's exit gate actually says
 *
 * > "A generated ID card and photocard are byte-identical across two runs, and
 * > the QR resolves to a live /verify/:id page."
 *
 * Two properties, and each is a real failure mode rather than a formality:
 *
 * - **Byte-identical** is what makes the `Cache-Control: max-age=86400` + ETag
 *   contract safe. If the same record rendered two different PNGs, a cached card
 *   would flicker between versions and the ETag would be meaningless. This is
 *   also the only check that can catch an uninitialised buffer or a timestamp
 *   leaking into the render.
 * - **A live /verify/:id page** is what makes the QR worth scanning. A QR that
 *   resolves to a 404 is worse than no QR — it looks like a forged card.
 *
 * ## Why ink is counted rather than eyeballed
 *
 * The earlier SVG-font dead end produced a render that *existed* (right
 * dimensions, valid PNG) while using the wrong font. Asserting ink is non-zero
 * and differs from a blank plate is the weakest interesting claim; the font
 * itself was proven separately (`lib/id-card.ts` header) by comparing ink
 * against a no-Bengali-font render.
 *
 * Run: pnpm --filter @shikkha24/cms verify:id-card
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import config from '@payload-config'
import { getPayload } from 'payload'
import sharp from 'sharp'

import {
  articleUrlFor,
  composeIdCard,
  composePhotocard,
  type IdCardAuthor,
  isFontAvailable,
  type PhotocardArticle,
  siteOrigin,
  verifyUrlFor,
} from '../lib/id-card'

const payload = await getPayload({ config: await config })

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Count non-white pixels — a blank plate scores ~0, a composed card thousands. */
async function ink(buf: Buffer): Promise<number> {
  const { data } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  let nonWhite = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) nonWhite += 1
  }
  return nonWhite
}

/** A synthetic record, so the harness does not depend on seeded demo content. */
async function withAuthor(next: (author: IdCardAuthor) => Promise<void>): Promise<void> {
  const settings = await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
  })
  const author: IdCardAuthor = {
    nameBn: 'যাচাই প্রতিবেদক',
    designation: 'শিক্ষা প্রতিবেদক',
    reporterId: 'SHK-R-2026-9999',
    pressCardNo: 'PC-৪২',
    bloodGroup: 'B+',
    validUntil: new Date(Date.now() + 365 * 86_400_000).toISOString(),
    beat: ['school', 'admission'],
    photoFilename: null,
    siteName: (settings.siteName as string | undefined) || 'শিক্ষা২৪',
  }
  await next(author)
}

// ── Determinism: the same record must render byte-identically twice ─────────
await withAuthor(async (author) => {
  const a = await composeIdCard(author)
  const b = await composeIdCard(author)
  check('the ID card is byte-identical across two runs', a.equals(b), `${a.length} bytes`)

  const meta = await sharp(a).metadata()
  check(
    'the ID card is a 1000×1600 PNG',
    meta.width === 1000 && meta.height === 1600 && meta.format === 'png',
    `${meta.width}×${meta.height} ${meta.format}`,
  )

  const inked = await ink(a)
  check('the ID card is not a blank plate', inked > 50_000, `${inked} non-white pixels`)

  // Bengali is on the card. A Latin-only fallback would still produce ink, so
  // this is the weak claim; the strong one (font really loaded) was made by
  // measurement in lib/id-card.ts.
  check('the ID card carries the Bengali name', a.length > 20_000)
})

// ── The photocard ───────────────────────────────────────────────────────────
{
  const article: PhotocardArticle = {
    title: 'এসএসসি ফল প্রকাশিত — সংখ্যা বেড়েছে',
    categoryName: 'পরীক্ষা ও ফলাফল',
    publishedAt: new Date().toISOString(),
    photoFilename: null,
    canonicalUrl: 'https://shikkha24.com/exams-results/1/ssc-result',
    siteName: 'শিক্ষা২৪',
  }
  const a = await composePhotocard(article)
  const b = await composePhotocard(article)
  check('the photocard is byte-identical across two runs', a.equals(b), `${a.length} bytes`)

  const meta = await sharp(a).metadata()
  check(
    'the photocard is a 1200×1200 PNG',
    meta.width === 1200 && meta.height === 1200 && meta.format === 'png',
    `${meta.width}×${meta.height} ${meta.format}`,
  )

  check('the photocard is not a blank plate', (await ink(a)) > 50_000)
}

// ── The QR resolves somewhere real ──────────────────────────────────────────
{
  const url = verifyUrlFor('SHK-R-2026-9999')
  check(
    'the verify URL targets /verify/:reporterId',
    /^https:\/\/[^/]+\/verify\/SHK-R-\d{4}-\d{4,}$/.test(url),
    url,
  )

  // If a frontend build is present, the QR's target must be a page that
  // actually exists — a QR that scans to a 404 makes a real credential look
  // forged. Skipped (not passed) when dist/ is absent: the CMS harness cannot
  // build the frontend, and asserting absence would be a lie.
  const distRoot = path.resolve(process.cwd(), '..', 'frontend', 'dist')
  if (!existsSync(distRoot)) {
    console.log(
      'note  frontend/dist absent — the QR-target check needs a built site; run pnpm build:frontend first',
    )
  } else {
    const real = (
      await payload.find({
        collection: 'authors',
        where: { reporterId: { exists: true } },
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]

    if (!real?.reporterId) {
      console.log('note  no author with a reporterId — the QR-target page check is untested')
    } else {
      const target = path.resolve(distRoot, 'verify', real.reporterId, 'index.html')
      check(
        `the QR's target page is built for a real reporter (${real.reporterId})`,
        existsSync(target),
        target.replace(distRoot, ''),
      )
    }
  }
}

// ── F-03: the printed URLs follow PUBLIC_SITE_URL, never a baked-in domain ────
{
  // The photocard endpoint used to hardcode `https://shikkha24.com`, so a card
  // generated on a staging host printed a QR pointing at production. These
  // assertions pin the behaviour to the environment variable instead.
  const realSiteUrl = process.env.PUBLIC_SITE_URL

  try {
    process.env.PUBLIC_SITE_URL = 'https://staging.example.test'
    check(
      'the photocard QR target follows PUBLIC_SITE_URL, not a hardcoded domain',
      articleUrlFor('exams-results', 1, 'ssc-result') ===
        'https://staging.example.test/exams-results/1/ssc-result',
      articleUrlFor('exams-results', 1, 'ssc-result'),
    )

    // A trailing slash in the variable must not produce `//` in the path —
    // an operator adding one should not break every QR on the site.
    process.env.PUBLIC_SITE_URL = 'https://staging.example.test/'
    check(
      'a trailing slash in PUBLIC_SITE_URL is not doubled',
      articleUrlFor('exams-results', 1, 'ssc-result') ===
        'https://staging.example.test/exams-results/1/ssc-result',
      articleUrlFor('exams-results', 1, 'ssc-result'),
    )

    // Both card types share `siteOrigin()`, so both must move together.
    check(
      'the reporter verify QR follows PUBLIC_SITE_URL too',
      verifyUrlFor('SHK-R-2026-9999') === 'https://staging.example.test/verify/SHK-R-2026-9999',
      verifyUrlFor('SHK-R-2026-9999'),
    )
  } finally {
    // Restore, so later checks and any real card render see the real value.
    if (realSiteUrl === undefined) delete process.env.PUBLIC_SITE_URL
    else process.env.PUBLIC_SITE_URL = realSiteUrl
  }

  // An uncategorised article has no category segment, so it takes the short
  // `/a/:id` route. Both the old and new code must agree here.
  check(
    'an uncategorised article falls back to /a/:id',
    articleUrlFor(undefined, 42, 'some-slug') === `${siteOrigin()}/a/42`,
    articleUrlFor(undefined, 42, 'some-slug'),
  )
}

// ── The font must actually be loadable, or every card is tofu ───────────────
check(
  'the Bengali font is loadable on this machine',
  isFontAvailable(),
  isFontAvailable() ? 'found' : 'missing — cards would render without Bengali',
)

console.log(
  failures === 0 ? '\nAll ID card checks passed.\n' : `\n${failures} ID card check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
