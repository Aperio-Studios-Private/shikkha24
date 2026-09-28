/**
 * S16 harness — reader reactions.
 *
 * ## What the exit gate actually says
 *
 * > "Two direct writes of the same reaction are rejected by the database — not
 * > merely prevented in the UI."
 *
 * That wording is the whole design of this file. A guard that lives in the island
 * or in the endpoint would pass any HTTP-level test while the *database* still
 * accepted duplicates — and the database is the only layer that holds under
 * concurrent writes. So the counter-proof below writes **through the local API**,
 * bypassing the endpoint entirely, and asserts the second insert is refused.
 *
 * Both compound indexes are exercised separately, because they cover different
 * readers: `(article, type, fingerprint)` for an anonymous one, and
 * `(article, type, reader)` for a signed-in one — who is the same reader on every
 * device, and whose cookies may have been cleared.
 *
 * ## Why the read check matters too
 *
 * A row holds a `fingerprint`, a salted hash of IP + user agent. If the collection
 * were publicly readable, anyone could page through every fingerprint on an
 * article. The harness asserts an anonymous read returns **nothing**, so that
 * cannot regress unnoticed.
 *
 * Run: pnpm --filter @shikkha24/cms verify:reactions
 */

import config from '@payload-config'
import { getPayload } from 'payload'

import { REACTION_TYPES, reactionFingerprint } from '../lib/reactions'

const payload = await getPayload({ config: await config })

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** Unique per run, so a re-run never collides with its own leftovers. */
const RUN = `reactions-verify-${Date.now()}`
const fingerprint = reactionFingerprint(RUN, 'verify-harness')

const created: Array<number | string> = []
/** Readers this run had to create. Deleted in the `finally` like everything else. */
const createdReaders: Array<number | string> = []

/** Create directly through the local API — the endpoint is deliberately bypassed. */
async function directCreate(
  data: Record<string, unknown>,
): Promise<{ id: number | string } | null> {
  try {
    const doc = await payload.create({
      collection: 'reactions',
      data: data as never,
      overrideAccess: true,
    })
    created.push(doc.id)
    return doc
  } catch {
    return null
  }
}

try {
  const article = (
    await payload.find({
      collection: 'articles',
      where: { _status: { equals: 'published' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]

  if (!article) {
    check('a published article exists to react to', false, 'seed demo content first')
  } else {
    // ── The counter-proof: the DATABASE refuses a duplicate ──────────────────
    const first = await directCreate({ article: article.id, type: 'like', fingerprint })
    check(
      'a direct write of a reaction succeeds',
      Boolean(first),
      first ? '' : 'insert was refused',
    )

    const duplicate = await directCreate({ article: article.id, type: 'like', fingerprint })
    check(
      'the database refuses the SAME reaction twice (article, type, fingerprint)',
      duplicate === null,
      duplicate ? 'a second row was created — the unique index is missing' : '',
    )

    const differentType = await directCreate({ article: article.id, type: 'love', fingerprint })
    check(
      'a DIFFERENT reaction type is still allowed for the same fingerprint',
      Boolean(differentType),
      differentType ? '' : 'the index is over-broad — it is blocking legitimate rows',
    )

    // ── The second index: a signed-in reader, keyed by account ───────────────
    /*
     * A reader row is created when the database has none. Without it this half of
     * the gate is untested — and "untested" is exactly how a missing index
     * survives, so provisioning the fixture is the point rather than a nicety.
     * `displayName` is the only required field on `Readers`.
     */
    let reader: { id: number | string } | undefined = (
      await payload.find({ collection: 'readers', limit: 1, depth: 0, overrideAccess: true })
    ).docs[0]

    if (!reader) {
      reader = await payload
        .create({
          collection: 'readers',
          data: { displayName: RUN, provider: 'google', providerId: RUN },
          overrideAccess: true,
        })
        .catch(() => undefined)
      if (reader) createdReaders.push(reader.id)
    }

    if (!reader) {
      check(
        'a reader account exists to test the account-level index',
        false,
        'could not create one',
      )
    } else {
      const byReader = await directCreate({
        article: article.id,
        type: 'wow',
        fingerprint: `${fingerprint}-reader`,
        reader: reader.id,
      })
      check('a signed-in reader can react', Boolean(byReader))

      const readerDuplicate = await directCreate({
        article: article.id,
        type: 'wow',
        // A DIFFERENT fingerprint — a second device. The account is the key.
        fingerprint: `${fingerprint}-reader-2`,
        reader: reader.id,
      })
      check(
        'the database refuses the same reaction from one ACCOUNT on another device',
        readerDuplicate === null,
        readerDuplicate ? 'the (article, type, reader) index is missing' : '',
      )
    }

    // ── `read` must not be public ───────────────────────────────────────────
    /*
     * Payload **throws** `Forbidden` when access is denied on `find`, rather than
     * returning an empty page. Both outcomes mean the same thing here, so both are
     * accepted — asserting only one of them would make this pass or fail on a
     * Payload implementation detail rather than on the access rule.
     */
    let exposed = -1
    let denied = false
    try {
      const anon = await payload.find({
        collection: 'reactions',
        limit: 10,
        depth: 0,
        overrideAccess: false,
      })
      exposed = anon.docs.length
    } catch {
      denied = true
    }
    check(
      'an anonymous read is refused (fingerprints are not enumerable)',
      denied || exposed === 0,
      denied ? 'Forbidden' : `${exposed} row(s) exposed`,
    )
  }

  // ── The vocabulary is the allow-list, and it is complete ───────────────────
  check('five reaction types are defined', REACTION_TYPES.length === 5, REACTION_TYPES.join(', '))
  check(
    'the fingerprint is a hex digest, not an address',
    /^[a-f0-9]{64}$/.test(fingerprint),
    `${fingerprint.length} chars`,
  )
  check(
    'the fingerprint is stable for the same input and differs across inputs',
    reactionFingerprint(RUN, 'verify-harness') === fingerprint &&
      reactionFingerprint(RUN, 'other-agent') !== fingerprint,
  )
} finally {
  // Always clean up, even when an assertion threw — a crashed run must not leave
  // rows that inflate a real article's counts, nor a stray reader account.
  for (const id of created) {
    await payload
      .delete({ collection: 'reactions', id, overrideAccess: true })
      .catch(() => undefined)
  }
  for (const id of createdReaders) {
    await payload.delete({ collection: 'readers', id, overrideAccess: true }).catch(() => undefined)
  }
}

console.log(
  failures === 0 ? '\nAll reaction checks passed.\n' : `\n${failures} reaction check(s) FAILED.\n`,
)
process.exit(failures === 0 ? 0 : 1)
