#!/bin/sh
# Shikkha24 — extract the newest uploaded frontend archive into public_html.
#
# ## Why this exists
#
# The storefront is static HTML built in CI. CI uploads the build as a zip and
# then asks the cPanel API to expand it — and on this host that API call
# **reports success while writing nothing** (measured 2026-10-12, T-14/T-15:
# `Fileman::extract_files` is absent, `Fileman::fileop op=extract` silently
# no-ops). So the archive lands in public_html but never expands, and the only
# thing that ever published an edit was a human clicking Extract in File
# Manager. This script is that click, automated.
#
# The API cannot extract; a **host-side shell `unzip` run by cron can** — the
# same mechanism the daily backup already relies on (`host-backup-dump.sh` runs
# `sqlite3`, `tar`, `cp` via cPanel → Cron Jobs on this account).
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
#   1. Refuse to run if `unzip` is missing (log loudly, exit non-zero, touch
#      nothing) — a silent skip is the exact T-15 failure this replaces.
#   2. Find the NEWEST `frontend-*.zip` in public_html. Any such zip is pending:
#      CI deletes it only after a successful extract, so its presence means the
#      API extract no-op'd and the cron owes an extraction.
#   3. `unzip -o` it into public_html (overwrite — `unzip -o` overwrites, which
#      is what makes the always-current `.htaccess` land; the API's `fileop`
#      did not, and that shipped a stale CSP for four days).
#   4. Prove a file actually landed (index.html exists and is non-empty).
#   5. Delete every `frontend-*.zip` — the newest is now extracted, older ones
#      are superseded builds that must not be picked up by a later run.
#   6. Best-effort liveness probe (`curl`) of the live site, logged.
#
# ## Read the result in ~/shikkha24-deploy/extract.log
#
# Every line goes there, visible in cPanel File Manager. That is the only place
# a failure shows on this host: cron output goes to email and the cPanel
# Terminal is not reliably available. If `unzip` is missing or a run fails, this
# file is where you see it — check it after install and any time the site looks
# stale.
#
# ## Security note
#
# Until this script extracts it, the uploaded zip sits at a guessable public URL
# (`https://shikkha24.com/frontend-<run>.zip`). A 2-minute cron keeps that window
# short. The zip is deleted the moment it is extracted.

set -eu

# Paths are overridable so the counter-proof (scripts/verify-host-extract.sh)
# can point them at a temp directory; the defaults are the real host paths.
DOCROOT="${SHIKKHA24_DOCROOT:-$HOME/public_html}"
LOGDIR="${SHIKKHA24_LOGDIR:-$HOME/shikkha24-deploy}"
LOG="$LOGDIR/extract.log"
SITE_URL="${SHIKKHA24_SITE_URL:-https://shikkha24.com}"

mkdir -p "$LOGDIR"

log() {
	printf '%s\n' "$*" >>"$LOG"
}

die() {
	log "ERROR $*"
	exit 1
}

log "---- $(date -u '+%Y-%m-%dT%H:%M:%SZ') (local $(date '+%Y-%m-%d %H:%M:%S')) ----"

# 1. unzip is the whole mechanism. If it is absent, say so once, loudly, and do
#    nothing else — a skip that looks like success is the bug being fixed.
#
#    ⚠️ The heartbeat below is written only AFTER this guard, and that ordering
#    is load-bearing. CI reads the heartbeat to decide whether it may hand a
#    freshly-uploaded archive to the cron and go green. A cron that cannot
#    extract (no unzip) must NOT heartbeat, or CI would treat a dead extractor
#    as live and ship the exact T-15 silent-staleness bug. Heartbeat freshness
#    therefore means "the cron is alive AND able to extract", never merely "the
#    cron ran".
command -v unzip >/dev/null 2>&1 ||
	die "the 'unzip' command is not installed on this host. Install it (CloudLinux: yum install unzip) or this automation cannot publish. Until then, extract by hand in cPanel File Manager."

[ -d "$DOCROOT" ] || die "no docroot at $DOCROOT — is the site deployed?"

# Heartbeat: one line, a UTC timestamp, rewritten every capable run — including
# the "nothing to do" case, which is what proves the cron is alive between
# publishes. CI (scripts/deploy-static.mjs) reads this and treats a fresh value
# as permission to stage an archive for the cron instead of failing the deploy.
printf '%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >"$LOGDIR/extract-heartbeat.txt"

# 2. Newest pending archive. `ls -t` sorts by mtime; these names are
#    run-id-derived with no spaces, so a plain read splits safely. No match is
#    the normal case between publishes and must exit 0 silently.
NEWEST=$(ls -1t "$DOCROOT"/frontend-*.zip 2>/dev/null | head -n 1 || true)
[ -n "$NEWEST" ] || { log "no pending archive — nothing to do."; exit 0; }

log "extracting $(basename "$NEWEST") into $DOCROOT"

# 3. Extract, overwriting. `-o` is load-bearing (see header). `-q` keeps the log
#    readable; the per-file list is noise on a host with no terminal.
unzip -o -q "$NEWEST" -d "$DOCROOT" || die "unzip failed on $(basename "$NEWEST") — archive left in place for a by-hand extract."

# 4. Prove it landed. `index.html` is in every build; if it is missing or empty
#    the extract did not do what it claimed, and that must not read as success.
[ -s "$DOCROOT/index.html" ] || die "extract reported success but $DOCROOT/index.html is missing or empty — the site may be broken. Archive left in place."

log "extracted OK — index.html present ($(wc -c <"$DOCROOT/index.html") bytes)"

# 5. Remove every pending archive: the newest is now live, the rest are
#    superseded builds a later run must not mistake for current.
for z in "$DOCROOT"/frontend-*.zip; do
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
