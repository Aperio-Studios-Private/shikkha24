/**
 * Demo-content runner — `pnpm --filter @shikkha24/cms seed:demo`
 *
 * Separate from `pnpm seed` on purpose. The production seed touches taxonomies
 * only; this one adds the throwaway articles and deadlines that make the
 * homepage reviewable. See `./demo.ts` for why the split exists and how to
 * remove the content.
 *
 * Requires the taxonomies to exist first — run `pnpm seed` before this, or
 * categories will not resolve and articles will be skipped.
 */
import { getPayload } from 'payload'

import config from '../payload.config'
import { seedDemo } from './demo'

const payload = await getPayload({ config })

try {
  const report = await seedDemo(payload)
  console.log('')
  console.log('Demo content ready:')
  console.log(`  author    ${report.author}`)
  console.log(`  articles  ${report.articles}`)
  console.log(`  deadlines ${report.deadlines}`)
  console.log(`  skipped   ${report.skipped} (already present, or category unresolved)`)
  console.log('')
  console.log('These are throwaway rows — delete before launch.')
  console.log('')
} catch (error) {
  console.error('Demo seed failed:', error)
  process.exit(1)
}

process.exit(0)
