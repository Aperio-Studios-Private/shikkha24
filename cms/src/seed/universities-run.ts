/**
 * University-directory import runner — `pnpm --filter @shikkha24/cms seed:universities`
 *
 * Fetches the institution directory from Wikidata (CC0, one query) and upserts
 * it. Safe to re-run: rows are matched on `wikidataId`, so a second run reports
 * `unchanged` rather than duplicating. See `./universities.ts` for the rules and
 * why some candidates are rejected rather than guessed at.
 *
 * ⚠️ **Not part of `pnpm seed` or CI.** It is the one seed that needs the public
 * internet, and a CI job that fails when Wikidata is slow would be a gate that
 * lies about the code.
 */
import { getPayload } from 'payload'

import config from '../payload.config'
import { installSeedDiagnostics } from './diagnostics'
import { importUniversities } from './universities'

const payload = await getPayload({ config })
installSeedDiagnostics(payload)

try {
  const report = await importUniversities(payload)

  console.log('')
  console.log('University directory import — Wikidata (CC0)')
  console.log(`  candidates fetched  ${report.fetched}`)
  console.log(`  created             ${report.created}`)
  console.log(`  adopted             ${report.adopted}`)
  console.log(`  updated             ${report.updated}`)
  console.log(`  unchanged           ${report.unchanged}`)
  console.log(`  with faculties      ${report.withFaculties}`)
  console.log(`  district resolved   ${report.districtResolved}`)
  console.log(`  district unresolved ${report.districtUnresolved}`)
  console.log('')

  const rejected = [...report.rejected.entries()].sort((a, b) => b[1] - a[1])
  const rejectedTotal = rejected.reduce((sum, [, n]) => sum + n, 0)
  console.log(`  rejected            ${rejectedTotal}`)
  for (const [reason, count] of rejected) {
    console.log(`    ${String(count).padStart(4)}  ${reason}`)
  }

  // Spot-check: the report is a count, and a count cannot be wrong in a way you
  // can see. Three real rows, as stored.
  const sample = await payload.find({
    collection: 'institutions',
    where: { wikidataId: { exists: true } },
    limit: 5,
    sort: 'nameBn',
    depth: 1,
    overrideAccess: true,
  })
  console.log('')
  console.log('  spot-check (as stored):')
  for (const doc of sample.docs) {
    const district =
      typeof doc.district === 'object' && doc.district ? doc.district.nameBn : '(none)'
    console.log(
      `    ${doc.type.padEnd(10)} ${String(doc.discipline ?? '-').padEnd(12)} ${district.padEnd(12)} ${doc.nameBn}`,
    )
  }
  console.log('')
} catch (error) {
  console.error('University import failed:', error)
  process.exit(1)
}

process.exit(0)
