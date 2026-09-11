import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Payload CMS 3 configuration for Shikkha24.
 *
 * Database: SQLite via `@payloadcms/db-sqlite` (libSQL). The database file lives
 * outside the web root (see `docs/security.md` §2 — "SQLite file must not be
 * web-accessible") and is never committed (`docs/backup-and-recovery.md`).
 *
 * WAL mode is enabled so that 5+ concurrent editors can write without lock
 * contention — validated as an S0 gate (`.sps/task.md`).
 */
export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [],
})
