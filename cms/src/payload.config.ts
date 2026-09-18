import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { defaultEditor } from './blocks/editors'
import { AdUnits } from './collections/AdUnits'
import { Articles } from './collections/Articles'
import { Assignments } from './collections/Assignments'
import { Authors } from './collections/Authors'
import { Bookmarks } from './collections/Bookmarks'
import { Categories } from './collections/Categories'
import { Circulars } from './collections/Circulars'
import { CitizenSubmissions } from './collections/CitizenSubmissions'
import { Comments } from './collections/Comments'
import { Deadlines } from './collections/Deadlines'
import { Districts } from './collections/Districts'
import { FactChecks } from './collections/FactChecks'
import { Institutions } from './collections/Institutions'
import { Jobs } from './collections/Jobs'
import { Levels } from './collections/Levels'
import { LiveBlogs } from './collections/LiveBlogs'
import { Media } from './collections/Media'
import { NewsletterCampaigns } from './collections/NewsletterCampaigns'
import { NewsletterSubscribers } from './collections/NewsletterSubscribers'
import { Pages } from './collections/Pages'
import { PhotoGalleries } from './collections/PhotoGalleries'
import { Polls } from './collections/Polls'
import { PollVotes } from './collections/PollVotes'
import { PushSubscriptions } from './collections/PushSubscriptions'
import { Quizzes } from './collections/Quizzes'
import { Readers } from './collections/Readers'
import { ResultLinks } from './collections/ResultLinks'
import { SavedDeadlines } from './collections/SavedDeadlines'
import { Scholarships } from './collections/Scholarships'
import { StudyAbroadGuides } from './collections/StudyAbroadGuides'
import { Tags } from './collections/Tags'
import { Users } from './collections/Users'
import { citizenSubmitEndpoint } from './endpoints/citizen'
// NOTE: the comment endpoint is intentionally NOT imported here — it mounts on
// the Comments collection, not at the API root. See the `endpoints` block below.
import { newsletterEndpoints } from './endpoints/newsletter'
import { oauthEndpoints } from './endpoints/oauth'
import { pushEndpoints } from './endpoints/push'
import { SiteSettings } from './globals/SiteSettings'
import { bn } from './i18n/bn'
import { isMailConfigured } from './lib/mailer'
import { withRebuildTrigger, withRebuildTriggerGlobal } from './lib/rebuild-trigger'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * Origins allowed to call this API from a browser.
 *
 * Payload's default is to allow every origin. That was fine while nothing but
 * the admin used the API, but S8 introduced **reader-facing** calls — the
 * live-blog refresh, the poll vote — and S9 adds the comment form, the newsletter
 * signup, the bookmark sync and the push subscription. So the allow-list is
 * explicit.
 *
 * The public site is on DianaHost `public_html`, a different origin from the
 * CMS, so without this the browser blocks the call before it is sent.
 */
const ALLOWED_ORIGINS = [
  process.env.PUBLIC_SITE_URL || 'https://shikkha24.com',
  // Local development: the Astro dev server, plus the CMS's own origin.
  'http://localhost:4321',
  'http://localhost:3000',
]

/**
 * Email transport — registered **only when SMTP is configured**.
 *
 * The owner accepted the cPanel SMTP fallback rather than an ESP account
 * (`.sps/plan.md` §"Scope amendment (2026-09-12)"). `lib/mailer.ts` is the thin,
 * swappable layer on top of it.
 *
 * ⚠️ **`nodemailerAdapter()` must not be called without configuration.** With no
 * arguments it provisions an **Ethereal test account** — a network round-trip at
 * boot that would silently swallow real mail in a "successful" send. Omitting
 * `email` entirely instead makes Payload log messages to the console, which is
 * the honest behaviour for an unconfigured install.
 */
const emailConfig = isMailConfigured()
  ? nodemailerAdapter({
      defaultFromAddress: process.env.SMTP_FROM_EMAIL ?? '',
      defaultFromName: process.env.SMTP_FROM_NAME || 'শিক্ষা২৪',
      transportOptions: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        // Implicit TLS on 465 (the default here); STARTTLS on 587.
        secure: process.env.SMTP_SECURE !== 'false',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' }
          : undefined,
      },
    })
  : undefined

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

  // Undefined when SMTP is unconfigured — Payload then logs mail to the console.
  email: emailConfig,

  /**
   * Custom endpoints. Mounted at the API root, so the newsletter routes are
   * `/api/newsletter/subscribe|confirm|unsubscribe`.
   *
   * They are custom rather than generated REST because each one is a **narrow
   * operation on a public surface**: signup must not be able to read the list,
   * confirm must not be able to activate an arbitrary address, unsubscribe must
   * be reachable from a link in an email with no session, and comment submission
   * must be rate-limited and unable to set its own approval.
   *
   * ⚠️ **A root endpoint whose FIRST path segment equals a collection slug is
   * shadowed** by that collection's generated REST route and will 404. The
   * comment endpoint hit exactly this: `/comments/submit` was parsed as
   * "collection `comments`, document id `submit`". It now lives on the Comments
   * collection (`collections/Comments.ts`) with a collection-relative path, and
   * is deliberately absent from this array. When adding an endpoint here, check
   * the first segment against every collection slug in `collections/`.
   */
  endpoints: [...newsletterEndpoints, ...oauthEndpoints, citizenSubmitEndpoint, ...pushEndpoints],

  collections: [
    /**
     * Everything below the "Readers" heading is published content: editing it
     * must eventually rebuild the static site, or the change simply never
     * appears. `withRebuildTrigger` is what schedules that.
     *
     * It is a no-op until `DEPLOY_WEBHOOK_URL` is set, so local development and
     * seeding are unaffected. See `lib/rebuild-trigger.ts` for why the trigger
     * is debounced rather than fired per save.
     */
    // ── Editorial ────────────────────────────────────────────────────────────
    withRebuildTrigger(Articles),
    withRebuildTrigger(Categories),
    withRebuildTrigger(Levels),
    withRebuildTrigger(Districts),
    withRebuildTrigger(Tags),
    withRebuildTrigger(Authors),
    /*
     * ⚠️ Deliberately NOT wrapped in `withRebuildTrigger`. An assignment is
     * internal work-in-progress — it never appears on the public site, so
     * scheduling a rebuild for it would spend CI minutes for no reader-visible
     * change. The rebuild happens when the reporter files the Article.
     */
    Assignments,
    withRebuildTrigger(Pages),
    withRebuildTrigger(FactChecks),

    // ── Education ────────────────────────────────────────────────────────────
    withRebuildTrigger(Scholarships),
    withRebuildTrigger(Deadlines),
    withRebuildTrigger(Institutions),
    withRebuildTrigger(Circulars),
    withRebuildTrigger(ResultLinks),
    withRebuildTrigger(StudyAbroadGuides),
    withRebuildTrigger(Jobs),

    // ── Interactive ──────────────────────────────────────────────────────────
    withRebuildTrigger(LiveBlogs),
    withRebuildTrigger(Polls),
    withRebuildTrigger(Quizzes),

    // ── Media & advertising ──────────────────────────────────────────────────
    withRebuildTrigger(Media),
    withRebuildTrigger(PhotoGalleries),
    withRebuildTrigger(AdUnits),

    // ── Readers ──────────────────────────────────────────────────────────────
    // Deliberately NOT wrapped: these are written by the public, not published
    // by editors. A reader comment or a poll vote must never cost a rebuild.
    Comments,
    NewsletterSubscribers,
    NewsletterCampaigns,
    SavedDeadlines,
    Bookmarks,
    CitizenSubmissions,
    PushSubscriptions,
    Readers,
    PollVotes,

    // ── Administration ───────────────────────────────────────────────────────
    Users,
  ],

  /**
   * Site Settings is the one that caused the confusion: editing the site name,
   * contact details or logo changed nothing on the live site until a rebuild
   * ran. It now schedules one like any other published content.
   */
  globals: [withRebuildTriggerGlobal(SiteSettings)],

  /**
   * Rich text editor for every field that does not override it.
   *
   * The block list and the per-field override both live in `blocks/editors.ts`,
   * next to the block definitions they reference. See that file for why the
   * article body gets a different instance from everything else.
   */
  editor: defaultEditor,
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
