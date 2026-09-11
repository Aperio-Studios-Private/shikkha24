#!/usr/bin/env node
/**
 * Create local `.env` files from the committed `.env.example` templates.
 *
 * Why this exists: a fresh clone has no `.env`, and Payload refuses to boot
 * without `PAYLOAD_SECRET` — the dev server returns 500 with
 * "missing secret key. A secret key is needed to secure Payload." That is a
 * confusing first-run failure, so this script removes it.
 *
 * Safety rules:
 *   - **Never overwrites an existing `.env`.** Secrets are not regenerated
 *     behind the owner's back; if one exists, it is left exactly as it is.
 *   - Real `.env` files are git-ignored (`.gitignore` covers `.env` / `.env.*`
 *     with a `!.env.example` exception), so nothing here can be committed.
 *
 * Run:  pnpm setup
 */
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Workspaces that ship an `.env.example`. */
const WORKSPACES = ['cms', 'frontend']

/** Placeholders that must be replaced with a generated value. */
const SECRET_PLACEHOLDERS = new Map([
  ['PAYLOAD_SECRET=YOUR_SECRET_HERE', () => `PAYLOAD_SECRET=${randomBytes(32).toString('hex')}`],
])

let created = 0
let skipped = 0

for (const workspace of WORKSPACES) {
  const examplePath = join(ROOT, workspace, '.env.example')
  const envPath = join(ROOT, workspace, '.env')

  if (!existsSync(examplePath)) {
    console.log(`  – ${workspace}/.env.example not found, skipping`)
    continue
  }

  if (existsSync(envPath)) {
    console.log(`  = ${workspace}/.env already exists — left untouched`)
    skipped++
    continue
  }

  let contents = readFileSync(examplePath, 'utf8')
  for (const [placeholder, generate] of SECRET_PLACEHOLDERS) {
    if (contents.includes(placeholder)) {
      contents = contents.replace(placeholder, generate())
    }
  }

  writeFileSync(envPath, contents, { mode: 0o600 })
  console.log(`  + ${workspace}/.env created (mode 600)`)
  created++
}

console.log('')
console.log(`created ${created}, left untouched ${skipped}`)
if (created > 0) {
  console.log('')
  console.log('Restart the dev server so it picks up the new values:')
  console.log('  pnpm run dev:cms')
}
