import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { BeforeAfterBlock } from './blocks/BeforeAfterBlock'
import { InfographicBlock } from './blocks/InfographicBlock'
import { ScrollytellingBlock } from './blocks/ScrollytellingBlock'
import { AdUnits } from './collections/AdUnits'
import { Articles } from './collections/Articles'
import { Authors } from './collections/Authors'
import { Categories } from './collections/Categories'
import { Circulars } from './collections/Circulars'
import { Comments } from './collections/Comments'
import { Deadlines } from './collections/Deadlines'
import { Districts } from './collections/Districts'
import { FactChecks } from './collections/FactChecks'
import { Institutions } from './collections/Institutions'
import { Jobs } from './collections/Jobs'
import { Levels } from './collections/Levels'
import { LiveBlogs } from './collections/LiveBlogs'
import { Media } from './collections/Media'
import { NewsletterSubscribers } from './collections/NewsletterSubscribers'
import { Pages } from './collections/Pages'
import { PhotoGalleries } from './collections/PhotoGalleries'
import { Polls } from './collections/Polls'
import { PollVotes } from './collections/PollVotes'
import { Quizzes } from './collections/Quizzes'
import { Readers } from './collections/Readers'
import { ResultLinks } from './collections/ResultLinks'
import { SavedDeadlines } from './collections/SavedDeadlines'
import { Scholarships } from './collections/Scholarships'
import { StudyAbroadGuides } from './collections/StudyAbroadGuides'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { SiteSettings } from './globals/SiteSettings'
import { bn } from './i18n/bn'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Origins allowed to call this API from a browser.
 *
 * Payload's default is to allow every origin. That was fine while nothing but
 * the admin used the API, but S8 introduces two **reader-facing** calls — the
 * live-blog refresh and the poll vote — so the allow-list is now explicit.
 *
 * The public site is on Cloudflare Pages, a different origin from the CMS, so
 * without this the browser blocks both calls before they are sent.
 */
const ALLOWED_ORIGINS = [
  process.env.PUBLIC_SITE_URL || 'https://shikkha24.com',
  // Local development: the Astro dev server, plus the CMS's own origin.
  'http://localhost:4321',
  'http://localhost:3000',
]

/**
 * Payload CMS 3 configuration for Shikkha24.
 *
 * Database: SQLite via `@payloadcms/db-sqlite` (libSQL). The database file lives
 * outside the web root (see `docs/security.md` §2 — "SQLite file must not be
 * web-accessible") and is never committed (`docs/backup-and-recovery.md`).
 *
 * ⚠️ **WAL mode is set once, on the database, and never per connection.**
 * Switching journal mode requires a lock and does **not** honour `busy_timeout`,
 * so N connections doing it simultaneously collide and fail with "database is
 * locked" *intermittently*. Found the hard way at S0
 * (`scripts/verify-sqlite-wal.mjs`, `.sps/handoff.md` finding 5).
 *
 * Collections are listed editorial-first rather than alphabetically; the admin
 * sidebar groups them by each collection's `admin.group`.
 */
export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — শিক্ষা২৪',
    },
  },

  // Reader-facing calls come from the static site on a different origin.
  cors: ALLOWED_ORIGINS,
  csrf: ALLOWED_ORIGINS,

  collections: [
    // ── Editorial ────────────────────────────────────────────────────────────
    Articles,
    Categories,
    Levels,
    Districts,
    Tags,
    Authors,
    Pages,
    FactChecks,

    // ── Education ────────────────────────────────────────────────────────────
    Scholarships,
    Deadlines,
    Institutions,
    Circulars,
    ResultLinks,
    StudyAbroadGuides,
    Jobs,

    // ── Interactive ──────────────────────────────────────────────────────────
    LiveBlogs,
    Polls,
    Quizzes,

    // ── Media & advertising ──────────────────────────────────────────────────
    Media,
    PhotoGalleries,
    AdUnits,

    // ── Readers ──────────────────────────────────────────────────────────────
    Comments,
    NewsletterSubscribers,
    SavedDeadlines,
    Readers,
    PollVotes,

    // ── Administration ───────────────────────────────────────────────────────
    Users,
  ],

  globals: [SiteSettings],

  /**
   * Rich text editor, plus the three article-embedded content blocks added in S8.
   *
   * `defaultFeatures` is spread rather than replaced — the editor keeps its
   * standard formatting toolbar and gains the blocks on top. The frontend
   * renderer in `lib/richtext.ts` handles each `blockType` explicitly; a block it
   * does not recognise falls through to its children, so an unknown block can
   * never silently swallow an article's text.
   */
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures,
      BlocksFeature({
        blocks: [InfographicBlock, BeforeAfterBlock, ScrollytellingBlock],
      }),
    ],
  }),
  secret: process.env.PAYLOAD_SECRET || '',

  // Bengali admin UI. Payload ships no Bengali locale; `src/i18n/bn.ts` writes one.
  // The key is the BCP-47 tag `bn-BD` (Bangladesh), not a bare `bn`.
  i18n: {
    supportedLanguages: { 'bn-BD': bn },
    fallbackLanguage: 'bn-BD',
  },

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
