import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { buildConfig } from 'payload'

import { defaultEditor } from './blocks/editors'
import { ensureBootstrapAdmin } from './bootstrap/admin'
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
import { Faqs } from './collections/Faqs'
import { Institutions } from './collections/Institutions'
import { Levels } from './collections/Levels'
import { LiveBlogs } from './collections/LiveBlogs'
import { LiveStreams } from './collections/LiveStreams'
import { Media } from './collections/Media'
import { NewsletterCampaigns } from './collections/NewsletterCampaigns'
import { NewsletterSubscribers } from './collections/NewsletterSubscribers'
import { Pages } from './collections/Pages'
import { PhotoGalleries } from './collections/PhotoGalleries'
import { Polls } from './collections/Polls'
import { PollVotes } from './collections/PollVotes'
import { PushSubscriptions } from './collections/PushSubscriptions'
import { Quizzes } from './collections/Quizzes'
import { Reactions } from './collections/Reactions'
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
import { cardEndpoints } from './endpoints/id-card'
import { newsletterEndpoints } from './endpoints/newsletter'
import { oauthEndpoints } from './endpoints/oauth'
import { pushEndpoints } from './endpoints/push'
import { reporterQuickDraftEndpoint } from './endpoints/reporter'
import { SiteSettings } from './globals/SiteSettings'
import { bn } from './i18n/bn'
import { isMailConfigured } from './lib/mailer'
import { ALLOWED_ORIGINS } from './lib/origins'
import { withRebuildTrigger, withRebuildTriggerGlobal } from './lib/rebuild-trigger'
// Extensionless on purpose. Every other import in this file is extensionless,
// and that is load-bearing rather than stylistic: `payload run` resolves
// `./migrations/index.js` to the `.ts` file, but Next's bundler does not, and
// the failure surfaces as a 500 from every API route — which reads as "the CMS
// is broken", not as "one import path is wrong". CI caught it on the first push.
import { migrations } from './migrations/index'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * A required environment variable — or a loud failure at boot.
 *
 * ⚠️ **Why this exists.** The config used to read
 * `process.env.PAYLOAD_SECRET || ''` and `process.env.DATABASE_URI || ''`, so a
 * deployment that forgot either started anyway with an **empty string**. Payload
 * signs its auth tokens with `secret`; an empty signing key is a *known* signing
 * key, and anyone who reads the source knows it. That is not a degraded mode, it
 * is an open door — and it fails silently, which is the worst way.
 *
 * `lib/signed-token.ts` already throws when the secret is missing, so the reader
 * session and OAuth features failed loudly. Payload's own auth did not, and that
 * asymmetry is exactly the kind of thing nobody notices until it is exploited.
 *
 * Failing at boot is the honest behaviour: the process does not start, the
 * message names the variable and says where to look, and no request is ever
 * served by a misconfigured instance.
 */
function requireEnv(name: string, why: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `[payload.config] ${name} is not set — the CMS will not start. ${why} ` +
        'Copy cms/.env.example to cms/.env and fill it in (agent rule 11: the real .env is never committed).',
    )
  }
  return value
}

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
/**
 * SMTP transport options, built as a **value** rather than an inline literal.
 *
 * ⚠️ Not a style preference — it is what keeps this typechecking against
 * nodemailer 10, which the security override pins. Payload types
 * `transportOptions` as `SMTPConnection.Options`, and nodemailer 10 moved `auth`
 * off that type: it now lives on `SMTPTransport.Options`, which is what
 * `createTransport` actually takes. An inline object literal is
 * excess-property-checked, so `auth` is rejected with TS2353 even though the
 * value is correct.
 *
 * `@payloadcms/email-nodemailer` passes `transportOptions` **straight to**
 * `nodemailer.createTransport(...)` (verified in its `dist/index.js`), and that
 * function has always accepted `auth`. So this is an upstream type narrower than
 * the function it describes, not a real incompatibility. Assigning a value
 * instead of a literal skips the excess-property check while `host`, `port` and
 * `secure` are still type-checked.
 *
 * Building it here also means `auth` is absent rather than `undefined` when
 * SMTP_USER is unset, which is the same thing to nodemailer and clearer to read.
 */
const smtpTransportOptions = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  // Implicit TLS on 465 (the default here); STARTTLS on 587.
  secure: process.env.SMTP_SECURE !== 'false',
  ...(process.env.SMTP_USER
    ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' } }
    : {}),
}

const emailConfig = isMailConfigured()
  ? nodemailerAdapter({
      defaultFromAddress: process.env.SMTP_FROM_EMAIL ?? '',
      defaultFromName: process.env.SMTP_FROM_NAME || 'শিক্ষা২৪.কম',
      transportOptions: smtpTransportOptions,
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
    /**
     * Payload defaults this to `'gravatar'`, which builds a
     * `https://www.gravatar.com/avatar/<md5(email)>` URL from every logged-in
     * admin's email address and hands it to the browser.
     *
     * That request was refused by this app's own admin CSP
     * (`img-src 'self' data: blob:`), so every avatar rendered as a broken image
     * and every admin page load logged a CSP violation for it.
     *
     * `'default'` renders Payload's own local avatar component instead. The
     * alternative — adding `https://www.gravatar.com` to `img-src` — would make
     * the image work but would also send every admin's IP address and an MD5 of
     * their email to a third party on every page load. Widening a CSP to satisfy
     * a feature that has no value here is the wrong direction: rule 7 prefers
     * self-hosted, and this is exactly the third-party dependency to shed first.
     * A broken third-party avatar is not worth a permanent egress.
     */
    avatar: 'default',
    meta: {
      titleSuffix: ' — শিক্ষা২৪.কম',
    },
    components: {
      /*
       * The reporter workspace (S13) — `/admin/reporter`.
       *
       * Registered as a root view rather than a collection view because it spans
       * two collections (`assignments` + `articles`) and belongs to neither.
       * `Component` is resolved against `importMap.baseDir` (`src/`), and the
       * `#` separates the module path from the named export.
       */
      views: {
        reporter: {
          Component: '/components/admin/ReporterWorkspace#ReporterWorkspace',
          path: '/reporter',
        },
      },
      /*
       * ⚠️ A view nothing links to is a view nobody finds. The dashboard lists
       * 33 collections and neither `assignments` nor this workspace would be
       * discoverable from it, so it gets two entry points: the conventional nav
       * slot, and a card in the dashboard body.
       *
       * The card exists because the nav slot's output did not appear in the
       * server-rendered HTML — the dashboard body does, so at least one entry
       * point is verifiable rather than assumed.
       */
      afterNavLinks: ['/components/admin/ReporterNavLink#ReporterNavLink'],
      beforeDashboard: ['/components/admin/ReporterDashboardLink#ReporterDashboardLink'],
    },
  },

  /**
   * The CMS's own public origin.
   *
   * ⚠️ **Why this must be set rather than inferred.** Without it Payload derives
   * absolute URLs from the incoming socket, which behind DianaHost's proxy is the
   * app's internal bind address. Probing the live site showed it echoing exactly
   * that back to anonymous callers:
   *
   *   GET /api/payload-migrations
   *   → {"message":"Cannot GET https://0.0.0.0:3000/api/payload-migrations"}
   *
   * That is a real, if minor, information disclosure — it tells an attacker the
   * internal port and that the app trusts a forwarded host. It also makes every
   * absolute URL Payload builds depend on whatever `Host` header arrives, which is
   * the precondition for host-header poisoning.
   *
   * Setting it pins both. Verified it changes nothing else: media `url` fields are
   * relative paths (`/api/media/file/…`) and our own absolute URLs already come
   * from `PUBLIC_SITE_URL` (`lib/id-card.ts`), so the storefront read path is
   * unaffected.
   *
   * `CMS_URL` is the name already used elsewhere in this project for the CMS's own
   * origin; the literal is the same production value the frontend falls back to.
   */
  serverURL: (process.env.CMS_URL || 'https://cms.shikkha24.com').replace(/\/$/, ''),

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
  endpoints: [
    ...newsletterEndpoints,
    ...oauthEndpoints,
    citizenSubmitEndpoint,
    ...pushEndpoints,
    reporterQuickDraftEndpoint,
    // S14: on-demand card images. Public read — a card is meant to be scanned by
    // anyone, and draws only what /reporters/:slug already publishes.
    ...cardEndpoints,
  ],

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
    // Site-level Q&A rendered on /faq with automatic FAQPage schema. Editing it
    // is a reader-visible change, so it belongs in the rebuild set like the rest.
    withRebuildTrigger(Faqs),
    withRebuildTrigger(FactChecks),

    // ── Education ────────────────────────────────────────────────────────────
    withRebuildTrigger(Scholarships),
    withRebuildTrigger(Deadlines),
    withRebuildTrigger(Institutions),
    withRebuildTrigger(Circulars),
    withRebuildTrigger(ResultLinks),
    withRebuildTrigger(StudyAbroadGuides),

    // ── Interactive ──────────────────────────────────────────────────────────
    withRebuildTrigger(LiveBlogs),
    withRebuildTrigger(Polls),
    withRebuildTrigger(Quizzes),

    // ── Media & advertising ──────────────────────────────────────────────────
    withRebuildTrigger(Media),
    withRebuildTrigger(PhotoGalleries),
    withRebuildTrigger(LiveStreams),
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
    Reactions,

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
  // Signs every auth token and reader session. An empty value is a known key —
  // see `requireEnv`. `lib/signed-token.ts` throws on the same condition.
  secret: requireEnv(
    'PAYLOAD_SECRET',
    'It signs auth tokens, reader sessions and OAuth state; an empty value would let anyone mint a session.',
  ),

  // Bengali admin UI. Payload ships no Bengali locale; `src/i18n/bn.ts` writes one.
  // The key is the BCP-47 tag `bn-BD` (Bangladesh), not a bare `bn`.
  i18n: {
    supportedLanguages: { 'bn-BD': bn },
    fallbackLanguage: 'bn-BD',
  },

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  /**
   * GraphQL — the Playground, stated explicitly rather than inherited.
   *
   * ⚠️ **This was verified, not assumed.** Payload's own defaults
   * (`config/defaults.js`) already set `disablePlaygroundInProduction: true`, so
   * the Playground is *not* exposed in production today. This line therefore
   * closes no hole — it stops the property depending on an upstream default.
   *
   * It is stated here for two reasons:
   *
   * 1. **A dependency bump must not silently change the security posture.** An
   *    introspection UI appearing in production is exactly the kind of
   *    regression nobody would connect to a version bump in a review.
   * 2. **`docs/security.md` claims this is off. This makes the claim checkable**
   *    at the point a reviewer is already looking.
   *
   * `disableIntrospectionInProduction` is deliberately left at its default
   * (false). The REST API already serves this same published content to
   * anonymous readers, so hiding the GraphQL schema would protect nothing that
   * is not already public — while breaking the schema explorer editors rely on.
   */
  graphQL: {
    disablePlaygroundInProduction: true,
  },

  db: sqliteAdapter({
    client: {
      // An empty URL would leave the adapter pointed at nothing. This file holds
      // the entire editorial archive, so a silent default is not an option.
      url: requireEnv(
        'DATABASE_URI',
        'It is the path to the SQLite file that holds the whole editorial archive.',
      ),
    },

    /**
     * Schema changes go through `cms/src/migrations/` and nothing else.
     *
     * ## Why this is `false` and not simply absent
     *
     * `@payloadcms/db-sqlite` creates the schema in exactly one place —
     * `pushDevSchema` — and it is gated on `process.env.NODE_ENV !==
     * 'production'` (`dist/connect.js:49`). With no `push` key and no
     * migrations directory, development and CI got a schema implicitly and
     * production could never get one at all. That is not theoretical: it
     * surfaced on DianaHost as `SQLITE_ERROR: no such table: levels`, and it
     * defeated four separate attempts to work around it (`DB_PUSH` in cPanel,
     * `npm run seed`, `.bin/payload`, an absolute-`node` binary). Every one of
     * them was fighting this one line.
     *
     * ## Why not leave it unset for development convenience
     *
     * An unset `push` lets development auto-create the schema from the config
     * while production applies the committed migration. Those are two
     * independent descriptions of the same schema, and they drift: a
     * developer changes a field, their database updates itself, no migration
     * is written, every local check passes — and production then applies a
     * migration that describes the *old* schema. Nothing in that sequence
     * fails anywhere.
     *
     * `push: false` removes the second description. One source of truth, three
     * environments. The cost is that a developer must run
     * `pnpm --filter @shikkha24/cms db:migrate` after pulling schema changes,
     * which is the ordinary Payload contract.
     *
     * `scripts/verify-payload-migrations.sh` fails CI if the committed
     * migrations no longer match the config, so a forgotten `migrate:create`
     * is caught at review rather than at boot.
     */
    push: false,

    /**
     * One-shot schema bootstrap, off by default.
     *
     * `pushDevSchema` is unavailable in production, so an empty production
     * database normally needs a `payload migrate` run — a terminal command on
     * the host. That is the wrong dependency for a first deployment: it makes
     * the schema depend on shell access, which is exactly what DianaHost
     * restricts (SSH refused; cPanel Terminal is the only shell).
     *
     * The adapter has a supported alternative (`dist/connect.js:56`):
     *
     *     if (process.env.NODE_ENV === 'production' && this.prodMigrations) {
     *       await this.migrate({ migrations: this.prodMigrations })
     *     }
     *
     * With `prodMigrations` set, the application builds its own schema while
     * booting — no terminal, no CLI, no ordering to get wrong. Measured on
     * 2026-10-03 against an empty database at `NODE_ENV=production`: 74 tables
     * created on boot; counter-proved with the flag absent, 0 tables.
     *
     * ## Why it is gated on an environment variable
     *
     * Because it works, it is a footgun. Unset, every future boot would apply
     * pending migrations with no human present and no backup taken first — the
     * failure mode `push: false` exists to prevent. So it is opt-in per
     * deployment: set `PAYLOAD_BOOTSTRAP_SCHEMA=true` in cPanel, restart once,
     * confirm the tables, then remove it.
     *
     * Boot-time migration does not relax anything above. The same committed
     * migrations run either way; this only chooses *who invokes them*.
     */
    prodMigrations: process.env.PAYLOAD_BOOTSTRAP_SCHEMA === 'true' ? migrations : undefined,
  }),

  /**
   * Grants `superAdmin` to `PAYLOAD_BOOTSTRAP_ADMIN_EMAIL` on boot.
   *
   * Needed because the `users.roles` field is guarded by the very role it grants
   * (`hasRole(req.user, 'superAdmin')` reads the column it protects), so once the
   * column exists there is no API path to the first administrator. This is the
   * escape hatch, and it is deliberately an environment-gated operation rather
   * than a data statement inside the migration: a migration would hard-code "this
   * row is an administrator" into permanent history and re-apply it to every
   * future environment and every restored backup.
   *
   * Unset — the normal case — it does nothing at all. Set, it is idempotent, so
   * leaving it in place converges after one boot and is not dangerous.
   */
  onInit: async (payload) => {
    await ensureBootstrapAdmin(payload as never)
  },

  /**
   * ⚠️ `sharp` is deliberately NOT configured. Do not add it back without
   * reading this.
   *
   * ## CORRECTED 2026-10-16 — the reason below was wrong
   *
   * This comment used to claim the account "cannot create a thread or fork a
   * process" and that "sharp cannot be loaded **at all** on this host". **That is
   * false, and the evidence is live:** `GET /api/idcard/:id.png` and
   * `GET /api/photocard/:id.png` are pure libvips routes and both return **200**
   * on this host today. The 2026-10-11 `fork: retry: Resource temporarily
   * unavailable` was real, but its cause was **CloudLinux NPROC exhaustion, not a
   * hard floor on threads**:
   *
   *   - NPROC limit was **100**, and DNS/ticket #0590191 shows it was fully used.
   *   - Two `next-server` instances were running, each at **~40–60 threads**,
   *     because Next.js spawns one worker thread **per CPU core** (4 here).
   *   - Web requests still worked because already-running processes need no fork.
   *
   * DianaHost raised NPROC to **200**; the owner set `TOKIO_WORKER_THREADS=2` and
   * `UV_THREADPOOL_SIZE=4`. **The comment's own restore condition — "when
   * DianaHost raises the CloudLinux limit" — has therefore been met.**
   *
   * The decision to leave `sharp` unset is still in force for now: re-enabling it
   * regenerates every derivative and is a deploy-time change, deliberately left to
   * a separate task rather than smuggled into a card-layout fix. But nobody should
   * reason from "the host cannot run sharp" any more, because it can.
   *
   * ## Original note (kept for history — its premise is withdrawn)
   *
   * Measured 2026-10-11: media uploads ended with
   *
   *   node: fork: retry: Resource temporarily unavailable
   *   Error: Server is not running. { code: 'ERR_SERVER_NOT_RUNNING' }
   *
   * and the browser saw `POST /api/media → 503`. `sharp.concurrency(1)` was tried
   * and did not help — consistent with the NPROC explanation above, since the
   * limit is on process/thread *count*, not on any single library's concurrency.
   *
   * Read from Payload's own source rather than guessed:
   *   - `uploads/generateFileData.js:127` — sharp runs only when
   *     `resizeOptions || formatOptions || trimOptions || constructorOptions`,
   *     so with those unset it is never constructed.
   *   - `uploads/getImageSize.js` — tries `sharp().metadata()` and **falls back**
   *     to `probeImageSize`, a pure-JS header reader (`image-dimensions`), so
   *     width/height are still recorded.
   *   - `index.js:402` — a missing sharp with resizing configured only logs a
   *     warning. Nothing else in the framework calls it.
   *
   * **Cost of this choice:** uploads store the original file. No WebP, no 2000px
   * cap, no `thumbnail`/`card`/`hero`. `frontend/src/lib/media.ts:buildSrcset`
   * tolerates that — it falls back to a plain `src` when there is one candidate
   * — so pages render correctly, but serve full-size images. `Media.ts` carries
   * a `maxFileSize` to bound that.
   *
   * **Restore it** by adding `sharp` back here and returning `Media.ts`'s
   * `formatOptions`, `resizeOptions` and `imageSizes` — now that the NPROC limit
   * is 200 this is a question of when, not whether. See `.sps/tasks.md` T-07 and
   * T-30.
   */
  plugins: [],
})
