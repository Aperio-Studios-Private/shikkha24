#!/usr/bin/env bash
#
# Run a command with the Payload CMS up, then shut the CMS down again.
#
# ## Why this exists
#
# Background processes do **not** survive between tool calls in this environment.
# The frontend build fetches content from the CMS at build time, so the CMS has
# to be started and the build run inside the *same* invocation — otherwise the
# build silently falls back to empty data and stays green while producing thin
# pages (`.sps/handoff.md`, S4 finding 1).
#
# It also waits for real readiness rather than sleeping a fixed number of
# seconds: a cold Payload boot runs a Drizzle schema push, which can take far
# longer than any hard-coded delay, and a build that starts too early degrades
# silently instead of failing.
#
# ## Usage
#
#   scripts/with-cms.sh pnpm --filter @shikkha24/frontend build
#   scripts/with-cms.sh node scripts/verify-s9.mjs
#
# ## Environment notes
#
# `NO_PROXY` matters here: an HTTP proxy is configured on this machine, and
# without it the build's `fetch('http://localhost:3000')` is routed through the
# proxy and returns 502.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CMS_LOG="${TMPDIR:-/tmp}/shikkha24-cms.log"
CMS_URL="http://localhost:3000"
READY_TIMEOUT_SECONDS=180

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <command> [args...]" >&2
  exit 2
fi

cms_pid=""
cleanup() {
  if [ -n "$cms_pid" ] && kill -0 "$cms_pid" 2>/dev/null; then
    # `next dev` spawns children, and a survivor holds port 3000 so the next run
    # cannot bind. Kill the descendants first, then the parent. (`setsid` is a
    # Linux util and is not present on macOS, so this walks the tree instead.)
    pkill -TERM -P "$cms_pid" 2>/dev/null || true
    kill -TERM "$cms_pid" 2>/dev/null || true
    wait "$cms_pid" 2>/dev/null || true
    # Anything still listening on 3000 came from this run.
    pkill -f 'next-server' 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "→ starting CMS (log: $CMS_LOG)"
: > "$CMS_LOG"
cd "$ROOT/cms"
env NO_PROXY=localhost,127.0.0.1,::1 pnpm dev >> "$CMS_LOG" 2>&1 &
cms_pid=$!

echo "→ waiting for $CMS_URL (max ${READY_TIMEOUT_SECONDS}s)"
ready=0
for _ in $(seq 1 "$READY_TIMEOUT_SECONDS"); do
  if curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "$CMS_URL/api/articles?limit=1" 2>/dev/null | grep -q '^200$'; then
    ready=1
    break
  fi
  if ! kill -0 "$cms_pid" 2>/dev/null; then
    echo "✗ the CMS process exited before becoming ready — last 40 log lines:" >&2
    tail -40 "$CMS_LOG" >&2
    exit 1
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "✗ the CMS did not become ready in ${READY_TIMEOUT_SECONDS}s — last 40 log lines:" >&2
  tail -40 "$CMS_LOG" >&2
  exit 1
fi

echo "→ CMS ready; running: $*"
cd "$ROOT"
set +e
"$@"
status=$?
set -e

echo "→ command exited $status"
exit "$status"
