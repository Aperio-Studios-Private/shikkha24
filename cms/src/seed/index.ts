import type { Payload } from 'payload'

import { DISTRICTS } from './districts'
import { CATEGORIES, LEVELS } from './taxonomies'

/**
 * Idempotent taxonomy seed.
 *
 * Safe to re-run: each row is matched on its `slug`, created when missing and
 * updated only when a value actually differs. That matters because the owner may
 * rename a category later — re-seeding must not duplicate rows or silently
 * revert their edits.
 *
 * What is NOT seeded: articles, scholarships, institutions and the other
 * editorial collections. Those are real content and belong to the editorial
 * team, not to a seed script.
 */
export interface SeedReport {
  created: number
  updated: number
  unchanged: number
}

/**
 * A slug-agnostic view of the three Payload methods this script uses.
 *
 * Payload's `find`/`create`/`update` are **overloaded per collection slug**, so a
 * helper working across a *union* of slugs cannot type-check against them — the
 * overloads resolve to `never`. The cast is confined to this one place, and is
 * safe here because the seed only ever writes fields that every seeded collection
 * declares: `slug` plus that collection's own columns.
 */
interface SlugAgnosticPayload {
  find(args: Record<string, unknown>): Promise<{ docs: Array<Record<string, unknown>> }>
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>
  update(args: Record<string, unknown>): Promise<Record<string, unknown>>
}

/** The only collections this script is allowed to write. */
const SEEDABLE = ['levels', 'categories', 'districts'] as const
type SeedableSlug = (typeof SEEDABLE)[number]

async function upsert(
  db: SlugAgnosticPayload,
  collection: SeedableSlug,
  rows: Array<Record<string, unknown>>,
  report: SeedReport,
): Promise<void> {
  for (const row of rows) {
    const existing = await db.find({
      collection,
      where: { slug: { equals: row.slug } },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.docs.length === 0) {
      await db.create({ collection, data: row, overrideAccess: true })
      report.created++
      continue
    }

    const current = existing.docs[0]
    const changed = Object.entries(row).some(([key, value]) => current[key] !== value)

    if (changed) {
      await db.update({ collection, id: current.id, data: row, overrideAccess: true })
      report.updated++
    } else {
      report.unchanged++
    }
  }
}

export async function seed(payload: Payload): Promise<SeedReport> {
  const db = payload as unknown as SlugAgnosticPayload
  const report: SeedReport = { created: 0, updated: 0, unchanged: 0 }

  await upsert(db, 'levels', LEVELS as unknown as Array<Record<string, unknown>>, report)

  await upsert(db, 'categories', CATEGORIES as unknown as Array<Record<string, unknown>>, report)

  // Districts sort by their position in the canonical list, which is grouped by
  // division — so the admin list reads in the conventional order.
  const districts = DISTRICTS.map((district, index) => ({ ...district, sortOrder: index }))
  await upsert(db, 'districts', districts as unknown as Array<Record<string, unknown>>, report)

  return report
}
