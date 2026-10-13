#!/bin/sh
# Shikkha24 — extract the newest uploaded frontend archive into public_html.
#
# ## Why this exists
#
# The storefront is static HTML built in CI. CI uploads the build as a
# `.tar.gz` and then asks the cPanel API to expand it — and on this host that API
# call **reports success while writing nothing** (measured 2026-10-12, T-14/T-15:
# `Fileman::extract_files` is absent, `Fileman::fileop op=extract` silently
# no-ops). So the archive lands in public_html but never expands, and the only
# thing that ever published an edit was a human clicking Extract in File
# Manager. This script is that click, automated.
#
# The API cannot extract; a **host-side shell `tar` run by cron can** — and `tar`
# is not an assumption, it is *proven* on this exact account twice over: the daily
# backup runs `tar -czf` (`host-backup-dump.sh`), and the live almarsus.com
# deployment extracts with `tar -xzf` every minute through this same cPanel-cron
# mechanism. Both halves of gzip-tar are already demonstrated working here —
# unlike `unzip`, whose presence was never verified.
#
# ## Where this runs
#
# On DianaHost, via cPanel → Cron Jobs — NOT over SSH, which this host refuses.
# Same install and invocation pattern as `host-backup-dump.sh`:
#
#   File Manager -> /home/shikkhac/bin -> upload this file as shikkha24-extract.sh
#   cPanel -> Cron Jobs -> every 2 minutes:
#       /bin/sh /home/shikkhac/bin/shikkha24-extract.sh
#
# `/bin/sh script` READS the file, so it needs no execute bit — which matters
# because the upload lands 0644 and there is no Terminal to `chmod` it.
#
# ## What it does, in order
#
#   1. Refuse to run if `tar` is missing (log loudly, exit non-zero, touch
#      nothing) — a silent skip is the exact T-15 failure this replaces.
#   2. Find the NEWEST `frontend-*.tar.gz` in public_html. Any such archive is
#      pending: CI deletes it only after a successful extract, so its presence
#      means the API extract no-op'd and the cron owes an extraction.
#   3. Wait until the archive's size is stable across a 20s gap — an upload can
#      still be in progress when the cron fires, and extracting a half-written
#      archive leaves a corrupt site.
#   4. `tar -xzf` it into public_html. `tar` overwrites existing files by
#      default — which is what makes the always-current `.htaccess` land; the
#      API's `fileop` did not overwrite, and that shipped a stale CSP for four
#      days.
#   5. Prove a file actually landed (index.html exists and is non-empty).
#   6. Delete every `frontend-*.tar.gz` — the newest is now extracted, older ones
#      are superseded builds that must not be picked up by a later run.
#   7. Best-effort liveness probe (`curl`) of the live site, logged.
#
# ## Read the result in ~/shikkha24-deploy/extract.log
#
# Every line goes there, visible in cPanel File Manager. That is the only place
# a failure shows on this host: cron output goes to email and the cPanel
# Terminal is not reliably available. If `tar` is missing or a run fails, this
# file is where you see it — check it after install and any time the site looks
# stale.
#
# ## Security note
#
# Until this script extracts it, the uploaded archive sits at a guessable public
# URL (`https://shikkha24.com/frontend-<run>.tar.gz`). A 2-minute cron keeps that
# window short. The archive is deleted the moment it is extracted.

set -eu

# Paths are overridable so the counter-proof (scripts/verify-host-extract.sh)
# can point them at a temp directory; the defaults are the real host paths.
DOCROOT="${SHIKKHA24_DOCROOT:-$HOME/public_html}"
LOGDIR="${SHIKKHA24_LOGDIR:-$HOME/shikkha24-deploy}"
LOG="$LOGDIR/extract.log"
SITE_URL="${SHIKKHA24_SITE_URL:-https://shikkha24.com}"
# An upload is "settled" once its size is unchanged for this many seconds — the
# guard against extracting a half-written archive. The almarsus.com watcher uses
# 20s for the same reason.
SETTLE_SECONDS="${SHIKKHA24_SETTLE_SECONDS:-20}"

mkdir -p "$LOGDIR"

log() {
	printf '%s\n' "$*" >>"$LOG"
}

die() {
	log "ERROR $*"
	exit 1
}

log "---- $(date -u '+%Y-%m-%dT%H:%M:%SZ') (local $(date '+%Y-%m-%d %H:%M:%S')) ----"

# 1. tar is the whole mechanism. If it is absent, say so once, loudly, and do
#    nothing else — a skip that looks like success is the bug being fixed.
#
#    ⚠️ The heartbeat below is written only AFTER this guard, and that ordering
#    is load-bearing. CI reads the heartbeat to decide whether it may hand a
#    freshly-uploaded archive to the cron and go green. A cron that cannot
#    extract (no tar) must NOT heartbeat, or CI would treat a dead extractor
#    as live and ship the exact T-15 silent-staleness bug. Heartbeat freshness
#    therefore means "the cron is alive AND able to extract", never merely "the
#    cron ran".
command -v tar >/dev/null 2>&1 ||
	die "the 'tar' command is not installed on this host. Install it (CloudLinux: yum install tar) or this automation cannot publish. Until then, extract by hand in cPanel File Manager."

[ -d "$DOCROOT" ] || die "no docroot at $DOCROOT — is the site deployed?"

# Heartbeat: one line, a UTC timestamp, rewritten every capable run — including
# the "nothing to do" case, which is what proves the cron is alive between
# publishes. CI (scripts/deploy-static.mjs) reads this and treats a fresh value
# as permission to stage an archive for the cron instead of failing the deploy.
printf '%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >"$LOGDIR/extract-heartbeat.txt"

# 2. Newest pending archive. `ls -t` sorts by mtime; these names are
#    run-id-derived with no spaces, so a plain read splits safely. No match is
#    the normal case between publishes and must exit 0 silently.
NEWEST=$(ls -1t "$DOCROOT"/frontend-*.tar.gz 2>/dev/null | head -n 1 || true)
[ -n "$NEWEST" ] || { log "no pending archive — nothing to do."; exit 0; }

# 3. Wait for the upload to settle before extracting. A cron that fires while an
#    upload is still in progress would extract a half-written archive and leave a
#    corrupt site — the one failure this script exists to prevent. The size must
#    be unchanged across a $SETTLE_SECONDS gap. Same guard the live almarsus.com
#    watcher uses for the same reason.
size1=$(wc -c <"$NEWEST" 2>/dev/null || echo "")
sleep "$SETTLE_SECONDS"
size2=$(wc -c <"$NEWEST" 2>/dev/null || echo "")
if [ "$size1" != "$size2" ]; then
	log "upload in progress ($size1 -> $size2 bytes), will retry next minute."
	exit 0
fi

log "extracting $(basename "$NEWEST") into $DOCROOT"

# 4. Extract, overwriting. `tar` overwrites existing files by default — this is
#    what makes the always-current `.htaccess` land; the API's `fileop` did not,
#    and that shipped a stale CSP for four days. `-xzf` = eXtract, gZip, File.
tar -xzf "$NEWEST" -C "$DOCROOT" || die "tar failed on $(basename "$NEWEST") — archive left in place for a by-hand extract."

# 5. Prove it landed. `index.html` is in every build; if it is missing or empty
#    the extract did not do what it claimed, and that must not read as success.
[ -s "$DOCROOT/index.html" ] || die "extract reported success but $DOCROOT/index.html is missing or empty — the site may be broken. Archive left in place."

log "extracted OK — index.html present ($(wc -c <"$DOCROOT/index.html") bytes)"

# 6. Remove every pending archive: the newest is now live, the rest are
#    superseded builds a later run must not mistake for current.
for z in "$DOCROOT"/frontend-*.tar.gz; do
	[ -e "$z" ] || continue
	rm -f "$z" && log "removed $(basename "$z")"
done

# 6. Best-effort liveness probe. Informational only — a curl failure here is not
#    a deploy failure (the extract already proved itself in step 4).
if command -v curl >/dev/null 2>&1; then
	CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$SITE_URL/" 2>/dev/null || echo "000")
	log "liveness: GET $SITE_URL/ -> $CODE"
else
	log "liveness: curl not installed — skipped."
fi

log "done."
exit 0
