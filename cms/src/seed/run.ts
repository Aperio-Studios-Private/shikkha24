/**
 * Seed runner — `pnpm --filter @shikkha24/cms seed`
 *
 * Seeds the three taxonomies (5 levels, 8 categories, 64 districts) and nothing
 * else. Editorial content is the team's job, not a script's.
 *
 * Idempotent: re-running updates changed rows and leaves everything else alone,
 * so it is safe after a rename or a schema change.
 */
import { getPayload } from 'payload'

import config from '../payload.config'
import { seed } from './index'

const payload = await getPayload({ config })

try {
  const report = await seed(payload)
  console.log('')
  console.log('Seed complete:')
  console.log(`  created   ${report.created}`)
  console.log(`  updated   ${report.updated}`)
  console.log(`  unchanged ${report.unchanged}`)
  console.log('')
} catch (error) {
  console.error('Seed failed:', error)
  process.exit(1)
}

process.exit(0)
