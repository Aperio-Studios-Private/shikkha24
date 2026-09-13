/**
 * Build-time feature flags for the public site.
 *
 * Why this exists (`docs/reliability.md` §5): heavy or fragile features — live
 * blog, comments, widgets, quizzes — must be switchable OFF without a redeploy.
 * Because the site is static, the flag is resolved at BUILD time, so flipping one
 * costs a rebuild (which is already the publish mechanism) and nothing else.
 *
 * Flags are PUBLIC by design: they gate *rendering*, never authorisation. Never
 * put a secret behind a flag.
 *
 * Contract: every flag is `true` unless its env var is exactly the string
 * `"false"`, so an unset variable can never silently disable a feature.
 */

/** Read a flag, defaulting to ON when unset. */
function flag(value: string | undefined): boolean {
  return value !== 'false'
}

export const FEATURE_FLAGS = {
  /** Weather ribbon in the header (Open-Meteo, build-time fetch). */
  weatherWidget: flag(import.meta.env.PUBLIC_FLAG_WEATHER_WIDGET),
  /** Prayer times + Hijri date in the header (Aladhan, build-time fetch). */
  prayerWidget: flag(import.meta.env.PUBLIC_FLAG_PRAYER_WIDGET),
  /** Reader comments. Built in S9; self-hiding without a CMS origin. */
  comments: flag(import.meta.env.PUBLIC_FLAG_COMMENTS),
  /** Live blog engine (result days, admission days). Built in S8. */
  liveBlog: flag(import.meta.env.PUBLIC_FLAG_LIVE_BLOG),
  /** Quizzes. Built in S8; graded in the browser, so no backend is involved. */
  quiz: flag(import.meta.env.PUBLIC_FLAG_QUIZ),
  /**
   * Reader polls.
   *
   * Separate from `quiz` even though both are "interactive": a poll depends on a
   * **write** path to the CMS, and a quiz does not. If the vote endpoint starts
   * misbehaving or attracting abuse, the poll can be switched off on its own
   * without taking the quiz with it (`docs/reliability.md` §5).
   */
  poll: flag(import.meta.env.PUBLIC_FLAG_POLL),
  /** Newsletter signup. */
  newsletter: flag(import.meta.env.PUBLIC_FLAG_NEWSLETTER),
  /**
   * Photo galleries (`/gallery`).
   *
   * Gated because a gallery page is image-heavy, and `docs/performance-budget.md`
   * sets page-level budgets — if a gallery layout ever threatens the homepage or
   * article budget through shared CSS, this drops it from the next build without
   * touching the pages that matter.
   */
  gallery: flag(import.meta.env.PUBLIC_FLAG_GALLERY),
  /**
   * Reader bookmarks.
   *
   * The browser-local half works with no backend at all, so this flag is about
   * removing the control from the UI — useful if the CMS is down for a long
   * period and the sync half would fail confusingly.
   */
  bookmarks: flag(import.meta.env.PUBLIC_FLAG_BOOKMARKS),
  /**
   * Deadline reminders over Web Push.
   *
   * Needs a VAPID key pair; without one the control is not rendered regardless
   * of this flag (see `lib/push.ts`).
   */
  push: flag(import.meta.env.PUBLIC_FLAG_PUSH),
  /** Citizen-journalism submission form. */
  citizen: flag(import.meta.env.PUBLIC_FLAG_CITIZEN),
  /**
   * Ad slots. Default ON — the owner has AdSense activated, so ads ship.
   *
   * Gated because `docs/reliability.md` §5 requires third-party features to be
   * switchable off without a redeploy: if AdSense degrades, setting this to
   * "false" drops every slot from the next build while the markup stays intact.
   * Reserving the flag now means S7 will not have to retrofit it.
   */
  ads: flag(import.meta.env.PUBLIC_FLAG_ADS),
  /** Article audio reader (Web Speech API). Native, zero bytes — flagged so it
   *  can be switched off if a device class misbehaves. */
  audioReader: flag(import.meta.env.PUBLIC_FLAG_AUDIO_READER),
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

/**
 * Guard a feature at render time.
 *
 * @example
 * {isEnabled('weatherWidget') && <WeatherRibbon />}
 */
export function isEnabled(name: FeatureFlag): boolean {
  return FEATURE_FLAGS[name]
}
