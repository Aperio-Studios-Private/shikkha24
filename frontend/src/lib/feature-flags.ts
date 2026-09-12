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
  /** Reader comments. Default OFF — not built until S4/S9. */
  comments: flag(import.meta.env.PUBLIC_FLAG_COMMENTS),
  /** Live blog engine (result days, admission days). Default OFF until S8. */
  liveBlog: flag(import.meta.env.PUBLIC_FLAG_LIVE_BLOG),
  /** Quizzes and polls. Default OFF until S8. */
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
  /** Newsletter signup. Default OFF until S9. */
  newsletter: flag(import.meta.env.PUBLIC_FLAG_NEWSLETTER),
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
