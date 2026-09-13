#!/usr/bin/env bash
#
# Start both the CMS (Payload/Next.js) and frontend (Astro) dev servers
# simultaneously.  Kills any existing processes on the two ports first, so a
# stale server from a previous session cannot block the new one.
#
# ## Usage
#
#   scripts/dev.sh
#
# ## Port map
#
#   CMS      — http://localhost:3000   (Payload/Next.js dev)
#   Frontend — http://localhost:4321   (Astro dev, default port)
#
# ## Environment
#
# `NO_PROXY` is set for both workspaces because an HTTP proxy is configured on
# this machine.  Without it, the frontend's build-time fetch to the CMS is
# routed through the proxy and returns 502 (`.sps/handoff.md`, S4 finding).
#
# ## Port-conflict handling
#
# The script detects listeners on 3000 and 4321, prints what it found, and
# terminates the processes before starting its own.  If a process refuses to die
# the script warns and continues — the new server will fail to bind, and the
# error will be obvious.
#
# ## Cleanup
#
# Ctrl+C (SIGINT) or SIGTERM shuts down both servers and their descendants.
# `next dev` spawns children, so the trap walks the process tree to avoid
# leaving a zombie on port 3000.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CMS_PORT=3000
FE_PORT=4321
CMS_URL="http://localhost:${CMS_PORT}"
FE_URL="http://localhost:${FE_PORT}"
READY_TIMEOUT_SECONDS=180

# ── Helpers ─────────────────────────────────────────────────────────

bail() {
  echo "✗ $1" >&2
  exit 1
}

info() {
  echo "→ $1"
}

ok() {
  echo "✓ $1"
}

# Return the PID(s) listening on a TCP port, one per line.
# Works on macOS (lsof) and Linux (ss or lsof).
pids_on_port() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti:"$port" 2>/dev/null || true
  elif command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | awk -v p=":$port " '$0 ~ p {gsub(/.*pid=/,""); gsub(/,.*/,""); print}' || true
  else
    # Fallback: nothing we can do here, but the bind will fail clearly.
    true
  fi
}

# Kill every PID returned by pids_on_port, with a short grace period.
kill_port_listeners() {
  local port=$1
  local label=$2
  local pids
  pids=$(pids_on_port "$port")

  if [ -z "$pids" ]; then
    ok "nothing on port $port ($label)"
    return 0
  fi

  local count
  count=$(echo "$pids" | grep -c '^' || true)
  info "found $count process(es) on port $port ($label) — stopping"

  # TERM first, then KILL if stubborn.
  echo "$pids" | while read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
  done

  sleep 1

  echo "$pids" | while read -r pid; do
    if kill -0 "$pid" 2>/dev/null; then
      info "process $pid did not stop gracefully — sending SIGKILL"
      kill -KILL "$pid" 2>/dev/null || true
    fi
  done

  # Verify nothing is left.
  local remaining
  remaining=$(pids_on_port "$port" || true)
  if [ -n "$remaining" ]; then
    bail "could not free port $port ($label).  Run: lsof -ti:$port | xargs kill -9"
  fi

  ok "port $port ($label) is free"
}

# Wait until a URL returns HTTP 200.  Prints a dot every second.
wait_for_ready() {
  local url=$1
  local label=$2
  local timeout=$3
  local elapsed=0

  while [ "$elapsed" -lt "$timeout" ]; do
    if curl -s --noproxy '*' -o /dev/null -w '%{http_code}' "$url" 2>/dev/null | grep -q '^200$'; then
      return 0
    fi
    printf '.'
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo ''
  bail "$label did not become ready within ${timeout}s"
}

# ── Pre-flight: free the ports ──────────────────────────────────────

info "checking for existing dev servers …"
kill_port_listeners "$CMS_PORT" "CMS"
kill_port_listeners "$FE_PORT"  "Frontend"

# ── Start both servers ──────────────────────────────────────────────

info "starting CMS dev server  ($CMS_URL)"
cd "$ROOT/cms"
env NO_PROXY=localhost,127.0.0.1,::1 pnpm dev >"${TMPDIR:-/tmp}/shikkha24-cms-dev.log" 2>&1 &
cms_pid=$!

info "starting frontend dev server ($FE_URL)"
cd "$ROOT/frontend"
env NO_PROXY=localhost,127.0.0.1,::1 pnpm dev >"${TMPDIR:-/tmp}/shikkha24-frontend-dev.log" 2>&1 &
fe_pid=$!

# ── Trap: clean up both servers on exit / Ctrl+C ────────────────────

cleanup() {
  echo ''
  info "shutting down dev servers …"

  # CMS: next dev spawns children — kill descendants first.
  if [ -n "${cms_pid:-}" ] && kill -0 "$cms_pid" 2>/dev/null; then
    pkill -TERM -P "$cms_pid" 2>/dev/null || true
    kill -TERM "$cms_pid" 2>/dev/null || true
    wait "$cms_pid" 2>/dev/null || true
    pkill -f 'next-server' 2>/dev/null || true
  fi

  # Frontend: Astro dev is a single Node process, but be thorough.
  if [ -n "${fe_pid:-}" ] && kill -0 "$fe_pid" 2>/dev/null; then
    pkill -TERM -P "$fe_pid" 2>/dev/null || true
    kill -TERM "$fe_pid" 2>/dev/null || true
    wait "$fe_pid" 2>/dev/null || true
  fi

  ok "both servers stopped"
}
trap cleanup EXIT INT TERM

# ── Wait for readiness ──────────────────────────────────────────────

info "waiting for CMS to be ready (max ${READY_TIMEOUT_SECONDS}s) …"
wait_for_ready "$CMS_URL/api/articles?limit=1" "CMS" "$READY_TIMEOUT_SECONDS"
ok "CMS is ready    → $CMS_URL"

info "waiting for frontend to be ready (max ${READY_TIMEOUT_SECONDS}s) …"
wait_for_ready "$FE_URL" "Frontend" "$READY_TIMEOUT_SECONDS"
ok "Frontend is ready → $FE_URL"

# ── Summary ─────────────────────────────────────────────────────────

echo ''
echo "═══════════════════════════════════════════════════════════════"
echo "  Both dev servers are running"
echo "═══════════════════════════════════════════════════════════════"
echo "  CMS      → $CMS_URL"
echo "  Frontend → $FE_URL"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo "═══════════════════════════════════════════════════════════════"

# Keep the script alive so the background jobs stay attached.
wait
