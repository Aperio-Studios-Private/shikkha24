/**
 * Runtime feature flags for the CMS.
 *
 * Why this exists (`docs/reliability.md` §5): a heavy or fragile module must be
 * disableable during an incident **without a redeploy**. The CMS is a running
 * Node process, so these are read from the environment at boot — changing one
 * needs only a process restart, not a rebuild.
 *
 * Flags gate *rendering and module registration*, never authorisation. Access
 * control stays in the collection `access` functions.
 *
 * Contract: every flag is `true` unless its env var is exactly the string
 * `"false"`, so an unset variable can never silently disable a feature.
 */

/** Read a flag, defaulting to ON when unset. */
function flag(value: string | undefined): boolean {
  return value !== 'false'
}

export const FEATURE_FLAGS = {
  /** Reader comments collection + API. Not built until S4/S9. */
  comments: flag(process.env.FLAG_COMMENTS),
  /** Live blog engine (result days, admission days). Not built until S8. */
  liveBlog: flag(process.env.FLAG_LIVE_BLOG),
  /** Quizzes and polls. Not built until S8. */
  quiz: flag(process.env.FLAG_QUIZ),
  /** Newsletter subscriber list + campaign module. Not built until S9. */
  newsletter: flag(process.env.FLAG_NEWSLETTER),
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

/**
 * Check a flag by name.
 *
 * @example
 * if (isEnabled('liveBlog')) collections.push(LiveBlogs)
 */
export function isEnabled(name: FeatureFlag): boolean {
  return FEATURE_FLAGS[name]
}
