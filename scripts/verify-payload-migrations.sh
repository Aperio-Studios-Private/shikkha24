#!/usr/bin/env bash
#
# Drift gate — the committed migrations must describe the config as it is now.
#
# ## Why this exists
#
# This is the F-14 bug class, one layer down. `scripts/verify-payload-types.sh`
# exists because `payload-types.ts` is generated, committed, and imported by the
# app, so it can be stale while every other check stays green. The migrations in
# `cms/src/migrations/` have the same shape with far worse consequences: a
# collection gains a field, the config is updated, no migration is generated —
# and **nothing fails**. The code typechecks, the lint passes, the build passes.
# The schema simply stops matching the code, and it surfaces at boot, on the
# host, as `SQLITE_ERROR: no such table`.
#
# That is not hypothetical. It is exactly what happened on DianaHost on
# 2026-10-03: the production database was 0 bytes and `payload migrate` was a
# no-op, because the repository had no migrations at all. Four separate
# workarounds were attempted before the real cause was found — see
# `.sps/handoff.md` → Current Phase.
#
# `push: false` in `payload.config.ts` is what makes this gate sufficient. With
# the adapter's automatic push disabled, the committed migrations are the only
# description of the schema, so if they drift, every environment that applies
# them gets a stale database.
#
# ## How it detects drift
#
# `payload migrate:create` diffs the config against the newest committed
# `.json` snapshot and writes a file **only if the schema actually changed**.
# Verified locally: with the schema current it prints "Migration UP complete"
# and leaves the directory byte-identical. So the check is simply — generate,
# and see whether anything appeared:
#
#   * directory unchanged  -> PASS, the migrations match the config
#   * a new file appeared  -> FAIL, the config moved and no migration was made
#
# ## Why the snapshot is taken BEFORE generating
#
# The same ordering rule as `verify-payload-types.sh`. Comparing against a copy
# taken after the generator has run would compare the generator against itself,
# which can never fail. Here the "generated" artefact is a new file in the same
# directory, so the before-copy is what makes the comparison meaningful.
#
# ## Why it runs as its own step
#
# `migrate:create` writes into `cms/src/migrations/`. The directory is restored
# from the before-copy on every exit path, so a failing run leaves the working
# tree exactly as it found it — including on a developer's machine.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MIGRATIONS_DIR="cms/src/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "::error::$MIGRATIONS_DIR is missing — this project has no schema migrations"
  echo "  Without them the production database can never be created; see .sps/handoff.md"
  exit 1
fi

if [ ! -f "$MIGRATIONS_DIR/index.ts" ]; then
  echo "::error::$MIGRATIONS_DIR/index.ts is missing — no migration is registered"
  exit 1
fi

# Resolve the Payload CLI from cms/node_modules rather than through a package
# runner, so it works whether or not `pnpm` is on PATH. Same reasoning as
# verify-payload-types.sh.
PAYLOAD_BIN="$ROOT/cms/node_modules/.bin/payload"
if [ ! -x "$PAYLOAD_BIN" ]; then
  echo "::error::$PAYLOAD_BIN not found - run 'pnpm install' first"
  exit 1
fi

BEFORE="$(mktemp -d)"

# Restore the directory from the before-copy on every exit path. `migrate:create`
# can add files to it, and a failed gate must never leave that behind.
cleanup() {
  rm -rf "$MIGRATIONS_DIR"
  cp -R "$BEFORE/migrations" "$MIGRATIONS_DIR"
  rm -rf "$BEFORE"
}
trap cleanup EXIT

cp -R "$MIGRATIONS_DIR" "$BEFORE/migrations"

echo "-> generating a probe migration to see whether the schema has moved"

# `migrate:create` sets `disableDBConnect`, so this reads the config and never
# opens the database — no DATABASE_URI pointing at real data is required, and
# nothing here can touch the archive. The secret is still required because the
# config calls requireEnv() at module load.
(
  cd "$ROOT/cms"
  PAYLOAD_SECRET="${PAYLOAD_SECRET:-ci-placeholder-not-a-real-secret}" \
  DATABASE_URI="${DATABASE_URI:-file:./data/ci.db}" \
  NODE_OPTIONS=--no-deprecation \
    "$PAYLOAD_BIN" migrate:create schema-drift-probe
) >/dev/null 2>&1 || {
  echo "::error::migrate:create failed - fix that before reading the result"
  echo "  cd cms && ./node_modules/.bin/payload migrate:create schema-drift-probe"
  exit 1
}

if diff -r "$BEFORE/migrations" "$MIGRATIONS_DIR" >/dev/null 2>&1; then
  echo "PASS  cms/src/migrations/ matches what payload.config.ts generates"
  exit 0
fi

echo "::error::the schema in payload.config.ts has changed with no migration committed"
echo
echo "Production applies cms/src/migrations/ and nothing else (push is false),"
echo "so this mismatch is a database that will be wrong at boot."
echo
echo "Generate and commit it:"
echo "  pnpm --filter @shikkha24/cms db:migrate:create <short-description>"
echo
echo "--- migrations present in the working tree but not committed ---"
for f in "$MIGRATIONS_DIR"/*; do
  name="$(basename "$f")"
  [ -e "$BEFORE/migrations/$name" ] || echo "  + $name"
done
echo
echo "::error::a schema change without a migration passes typecheck, lint and build, then fails on the host as 'no such table'. Commit the migration."
exit 1