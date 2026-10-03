#!/usr/bin/env bash
#
# F-14 gate — `payload-types.ts` must match the config that generates it.
#
# ## Why this exists
#
# `cms/src/payload-types.ts` is generated, committed, and imported by the app
# (`endpoints/push.ts` types `PushSubscription` from it). It is therefore the one
# file in the CMS where the **typecheck can pass while the code is wrong**: a
# collection gains a field, the config is updated, the types file is not
# regenerated, and nothing fails — because the stale file is still valid
# TypeScript describing the *old* schema. The error then surfaces later, as a
# wrong type or a missing property, far from the change that caused it.
#
# This regenerates the file and fails if it differs from what is committed.
#
# ## Why it runs as its own step
#
# Regenerating rewrites the file on disk. The check compares against `HEAD`, so
# a mismatch fails the run **and** leaves the regenerated file in the working
# tree — visible as a `git diff` in the failing job rather than only as an exit
# code. `git checkout` at the end puts it back, so a developer's local tree is
# never left dirtied by running this.
#
# ## Why the seed is NOT required
#
# Type generation reads the config, not the database, so this needs no
# `PAYLOAD_SECRET` and no seeded content. It runs before the seed step in CI.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FILE="cms/src/payload-types.ts"

if [ ! -f "$FILE" ]; then
  echo "::error::$FILE is missing — Payload type generation has not run"
  exit 1
fi

echo "-> capturing the committed file, then regenerating"

# NOTE: ORDER IS THE WHOLE TRICK - see the header. The first version regenerated
# first and then ran `git diff --quiet`, which can NEVER fail: regeneration
# overwrites the staleness before the diff runs, so it compared the regenerated
# file against itself. Counter-proving proved exactly that - an injected stale
# field still passed. The committed content is therefore snapshotted BEFORE
# anything rewrites it, and the two are compared directly with `cmp`.
COMMITTED="$(mktemp)"
WORKTREE="$(mktemp)"

# Restore the working tree no matter how this exits, so a failing run never
# leaves a developer's checkout holding generated output.
cleanup() {
  git checkout -- "$FILE" 2>/dev/null || true
  rm -f "$COMMITTED" "$WORKTREE"
}
trap cleanup EXIT

if git cat-file -e "HEAD:$FILE" 2>/dev/null; then
  git cat-file blob "HEAD:$FILE" > "$COMMITTED"
else
  cp "$FILE" "$COMMITTED"
  echo "note: $FILE is not in HEAD yet - comparing against the working tree"
fi

# Resolve the Payload CLI from cms/node_modules rather than going through a
# package runner. Two reasons: it works whether or not `pnpm` is on PATH (a
# workspace-local binary is always present after `pnpm install`), and it avoids a
# second process layer just to run one command.
PAYLOAD_BIN="$ROOT/cms/node_modules/.bin/payload"
if [ ! -x "$PAYLOAD_BIN" ]; then
  echo "::error::$PAYLOAD_BIN not found - run 'pnpm install' first"
  exit 1
fi

# A placeholder secret is enough: type generation reads the config, never the
# database. NODE_OPTIONS silences the `module.register()` deprecation notice so
# it does not bury the real output.
(
  cd "$ROOT/cms"
  PAYLOAD_SECRET="${PAYLOAD_SECRET:-ci-placeholder-not-a-real-secret}" \
  DATABASE_URI="${DATABASE_URI:-file:./data/ci.db}" \
  NODE_OPTIONS=--no-deprecation \
    "$PAYLOAD_BIN" generate:types
) >/dev/null 2>&1 || {
  echo "::error::type generation failed - fix that before reading the diff below"
  echo "  cd cms && ./node_modules/.bin/payload generate:types"
  exit 1
}

cp "$FILE" "$WORKTREE"

if cmp -s "$COMMITTED" "$WORKTREE"; then
  echo "PASS  payload-types.ts matches what the config generates"
  exit 0
fi

echo "::error::$FILE is stale - it does not match what the config generates"
echo "Regenerate and commit it:"
echo "  pnpm --filter @shikkha24/cms generate:types"
echo
echo "--- what would change ---"
diff -u "$COMMITTED" "$WORKTREE" | head -40 || true
echo
echo "::error::a stale payload-types.ts typechecks cleanly while describing the OLD schema, so the build stays green and the error appears elsewhere. Commit the regenerated file."

# Leave the working tree as it was found, so a failing run does not silently
# modify a developer's checkout. (Also handled by the EXIT trap above; repeated
# here so the intent is obvious at the point of failure.)
git checkout -- "$FILE" 2>/dev/null || true
exit 1