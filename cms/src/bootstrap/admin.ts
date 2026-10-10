/**
 * Idempotent first-superAdmin bootstrap.
 *
 * ## ⚠️ Why this exists rather than a data step inside the migration
 *
 * `users.roles` is guarded by `hasRole(req.user, 'superAdmin')` (`Users.ts`), and
 * that guard reads the same column it protects. So the moment the column lands,
 * **there is no API path by which anyone can become a superAdmin** — the person
 * who would need the role is the person the check denies. The CMS is stuck at
 * `reporter` forever.
 *
 * The two obvious ways out are both bad. Hand-editing the live database is a
 * one-off nobody can repeat on a new host, a staging box, or after a disaster
 * recovery. Baking `UPDATE users SET roles='superAdmin'` into the migration is
 * repeatable but wrong: it hard-codes "this row is an administrator" into
 * permanent history, and it would silently re-apply to every future environment
 * and every restored backup.
 *
 * This is the third option, and it is the one that scales: an **operation**,
 * driven by an environment variable, run at boot. Same shape as
 * `PAYLOAD_BOOTSTRAP_SCHEMA` — set it, restart once, remove it. A new
 * environment needs no code change and no SQL, only the variable.
 *
 * ## Properties that matter
 *
 * - **Idempotent.** Safe to run on every boot; it converges after the first run
 *   and then does nothing. Leaving the variable set is not dangerous.
 * - **Env-gated.** With `PAYLOAD_BOOTSTRAP_ADMIN_EMAIL` unset this returns
 *   immediately and does no work — the normal production path is untouched.
 * - **Never throws.** A failure here must not stop the CMS booting. It logs and
 *   returns; an admin can still sign in and fix it.
 * - **Grants only what it names.** It promotes exactly the configured address,
 *   and only if that account lacks the role already.
 */

/** The roles that count as full administrative control. */
const ADMIN_ROLE = 'superAdmin'

/**
 * Ensure the configured account holds `superAdmin`.
 *
 * @param payload the initialised Payload instance.
 * @returns {Promise<void>} never rejects; failures are logged, not thrown.
 */
export async function ensureBootstrapAdmin(payload: {
  logger?: { info: (m: string) => void; error: (m: string) => void }
  find: (args: any) => Promise<any>
  update: (args: any) => Promise<any>
}): Promise<void> {
  const email = process.env.PAYLOAD_BOOTSTRAP_ADMIN_EMAIL?.trim()
  if (!email) return

  try {
    const result = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    })
    const user = result?.docs?.[0]

    if (!user) {
      payload.logger?.error(
        `[bootstrap] PAYLOAD_BOOTSTRAP_ADMIN_EMAIL is set to ${email} but no such user exists. ` +
          'Create the account first, then restart. The variable is now inert.',
      )
      return
    }

    const roles: string[] = Array.isArray(user.roles) ? user.roles : []
    if (roles.includes(ADMIN_ROLE)) return

    await payload.update({
      collection: 'users',
      id: user.id,
      // `overrideAccess` is the whole point: the field guard reads the role this
      // call is trying to grant, so without it the write is denied by the very
      // rule it is implementing.
      overrideAccess: true,
      data: { roles: [...new Set([...roles, ADMIN_ROLE])] },
    })

    payload.logger?.info(`[bootstrap] granted ${ADMIN_ROLE} to ${email} (id ${user.id})`)
  } catch (error) {
    payload.logger?.error(
      `[bootstrap] could not grant ${ADMIN_ROLE} to ${email}: ${(error as Error).message}. ` +
        'The CMS is still running; grant the role by hand and remove the variable.',
    )
  }
}