import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

/**
 * Add `users.roles` — the column every editorial access rule depends on.
 *
 * ## ⚠️ Why this migration is hand-written when `migrate:create` exists
 *
 * `payload migrate:create` reports **"No schema changes detected"** for this
 * exact change, against a full database and against an empty one alike. Measured
 * 2026-10-10. The runtime config genuinely declares the field — introspecting the
 * built config lists 14 user fields including `roles` — so this is not a config
 * error; the generator simply does not diff this field. Written by hand against
 * the verified runtime config, and proved against a copy of the production
 * database before being committed. See `.sps/tasks.md` T-01.
 *
 * ## ⚠️ What was broken while this column was missing
 *
 * `rolesOf()` reads `user.roles`. With no such column it returned `[]`,
 * `hasRole()` returned `false` for every role, and `isEditorialUser` was
 * therefore `false` — so **every** editorial write was denied, and logout could
 * not persist. The field's own access guard
 * (`hasRole(req.user, 'superAdmin')`) reads the same missing column, so nobody
 * could ever have acquired a role and nobody could ever have granted one. The
 * CMS had no reachable way to become usable; it was not a permissions regression.
 *
 * ## Why `reporter`, not `superAdmin`
 *
 * The backfill gives existing users the least privilege that still lets them
 * write. `reporter` is described in `access/roles.ts` as editorial and able to
 * write, which is what the owner needs to resume editing immediately.
 *
 * Promotion to `superAdmin` is deliberately **not** in here. Baking "user N is
 * always an administrator" into permanent migration history is a policy decision
 * that would outlive the reason for it, and it would silently re-apply to every
 * future environment. It is an operation, not a schema change, so it lives in
 * `src/bootstrap/admin.ts` and runs from an env-gated boot hook.
 *
 * ## ⚠️ Why ALTER TABLE ADD COLUMN and not the table rebuild
 *
 * `ALTER TABLE ... ADD COLUMN` is a metadata-only change in SQLite: it cannot
 * rewrite rows, so it cannot lose the existing user data. The rebuild pattern
 * used by the other migrations in this directory is only needed when *changing* a
 * column, and it drops and recreates the table. Adding a column does not.
 *
 * A default is supplied inline because SQLite will not add a `NOT NULL` column
 * without one. The subsequent `UPDATE` is what makes the value correct for rows
 * that predate the default, so it is kept rather than trusting the default alone.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` ADD COLUMN \`roles\` text DEFAULT '["reporter"]';`)
  await db.run(sql`UPDATE \`users\` SET \`roles\` = '["reporter"]' WHERE \`roles\` IS NULL;`)
  await db.run(sql`CREATE INDEX \`users_roles_idx\` ON \`users\` (\`roles\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // SQLite supports DROP COLUMN from 3.35 and libsql is well past it. Removing the
  // index first is explicit rather than relying on the column drop to cascade.
  await db.run(sql`DROP INDEX IF EXISTS \`users_roles_idx\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`roles\`;`)
}