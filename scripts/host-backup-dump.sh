#!/bin/sh
# Shikkha24 — produce one verified-consistent backup archive ON the host.
#
# ## Where this runs, and why it has to
#
# On DianaHost, via cPanel → Cron Jobs. Not over SSH: this host refuses SSH, and
# `backup-db.yml` failed 6 runs out of 6 trying to use it.
#
# It writes a dated `.tar.gz` into ~/shikkha24-backup/, which a dedicated FTP account
# jailed to that directory then hands to GitHub Actions. The division is deliberate:
#
#   this script  makes a *consistent snapshot* — it can run `sqlite3`, which FTP cannot
#   fetch         makes an *off-host copy* — it cannot run anything on the host
#
# ## ⚠️ `.backup`, never `cp payload.db`
#
# The CMS is live while this runs. Copying a SQLite file out from under a writer can
# capture a torn state — two pages that never coexisted. `.backup` uses SQLite's own
# online backup API, which takes a read lock and produces a consistent copy regardless
# of journal mode (WAL included). A plain `cp` is the single most common way a SQLite
# backup turns out to be unrestorable.
#
# ## Install (cPanel, once — no Terminal required)
#
#   File Manager -> /home/shikkhac -> make folder `bin` -> upload this file into it,
#   renamed to `shikkha24-backup-dump.sh`.
#
# Then cPanel → Cron Jobs → once daily:
#
#   /bin/sh /home/shikkhac/bin/shikkha24-backup-dump.sh
#
# `/bin/sh script` **reads** the file, so unlike `./script` it does not need the execute
# bit — which is why this still works when the upload lands as 0644 and there is no
# Terminal available to `chmod` it.
#
# ## ⚠️ Read the result in `~/shikkha24-backup/dump.log`, not on a screen
#
# Every line this script prints also goes to that file, which is visible in **cPanel File
# Manager**. That is the only place a failure can be seen on this host: cron output goes to
# email, and the cPanel Terminal is not reliably available. Checking this one file is how
# the owner knows whether the backup ran, without a terminal — check it after adding the
# cron job and once a month after that.
#
# ## ⚠️ The hour you type into cPanel is SERVER-LOCAL time, not UTC
#
# Measured 2026-10-04: the host's clock reads 18:19 when UTC is 12:20, so this account
# runs on **Asia/Dhaka (UTC+6)**. cPanel's cron page schedules in that local time.
#
#   type 23:00 into cPanel  →  17:00 UTC  →  two hours before the 19:00 UTC GitHub fetch
#
# GitHub Actions runs the fetch at 19:00 UTC (01:00 next day, Dhaka). The gap matters:
# if the dump runs *after* the fetch, CI picks up yesterday's archive — which still
# passes the 30-hour staleness check, so nothing goes red and you quietly lose a day of
# freshness every cycle.
#
# The script prints both clocks on its first line so a wrong schedule is visible in the
# output rather than something to be deduced later.
#
# ⚠️ Run it by hand first. If it fails, cron will fail 30 times a month and you will
# not notice, and the staleness check in `backup-db.yml` is what turns that into a loud
# failure instead.

set -eu

# How many daily archives to keep. The account has 2 GB; each archive is a few MB, so
# this is ~50 MB. Pruning is not optional — without it the account fills and takes the
# site down with it, which is the failure mode a backup must never cause.
KEEP_DAYS=14

# ⚠️ A hard cap on archive COUNT, not only on age.
#
# Age alone is the wrong safety net, because it silently assumes one run per day and
# nothing enforces that. Schedule this job every minute "just to test it" and the age
# rule permits 1,440 x 14 = 20,160 archives — roughly 80 GB, on a 5 GB disk with 2 GB
# already used. The account fills in under half a day and the site dies with it.
#
# This actually happened on 2026-10-04: the job was left at `* * * * *` while diagnosing
# a host fault, and the host fault's fix would have turned it into a live disk-filler.
# The age rule is kept as well — a count cap alone would pin the newest 30 forever and
# never release space if the script stopped running.
MAX_ARCHIVES=30

log_stamp() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }

# ⚠️ The home directory is derived from the account name, NOT taken from `$HOME`.
#
# This script runs under `set -eu`, and `set -u` makes an unset `$HOME` a **fatal** error:
# the script dies on its third line, before creating anything. The error goes to stderr,
# which under cron is an email nobody reads — so the folder stays empty and the backup is
# silent. That is what happened on this host: the 19:49 test run produced no `dump.log`,
# no archive, and no visible error anywhere.
#
# cPanel does not reliably export HOME to cron, so the path is built from `id -un`, which
# is always correct on cPanel (`/home/<account>`). `$HOME` is still preferred when it is
# set *and* actually points at the CMS, so a local test run still works.
HOME_DIR="${HOME:-}"
if [ -z "$HOME_DIR" ] || [ ! -d "$HOME_DIR/shikkha24-cms" ]; then
  HOME_DIR="/home/$(id -un)"
fi
APP_DIR="$HOME_DIR/shikkha24-cms"
DATA_DIR="$APP_DIR/data"
OUT_DIR="$HOME_DIR/shikkha24-backup"
DB="$DATA_DIR/payload.db"

# ⚠️ Every line goes to a FILE as well as to stdout, and that is not tidiness.
#
# "Run it by hand and read the output" was advice that could not be followed: this host's
# cPanel Terminal is not reliably available, and cron output goes to email. So when the
# dump failed, the only way to see why was a terminal that might not exist — which is how
# a backup that stopped working stays invisible.
#
# `~/shikkha24-backup/dump.log` is readable in **cPanel File Manager**, which always is.
# It holds the success and the FATAL lines alike.
if ! mkdir -p "$OUT_DIR" 2>/dev/null; then
  printf '%s FATAL: cannot create %s — there is nowhere to write a backup\n' \
    "$(log_stamp)" "$OUT_DIR" >&2
  exit 1
fi
LOG_FILE="$OUT_DIR/dump.log"

log() {
  line="$(log_stamp) $*"
  printf '%s\n' "$line"
  # Bounded: one rotated copy, so a long-lived account cannot fill its own disk with logs.
  if [ -f "$LOG_FILE" ] && [ "$(wc -c < "$LOG_FILE")" -gt 262144 ]; then
    mv -f "$LOG_FILE" "$LOG_FILE.1" 2>/dev/null || :
  fi
  printf '%s\n' "$line" >> "$LOG_FILE" 2>/dev/null || :
}
die() { log "FATAL: $*"; exit 1; }

# Both clocks on the first line. This account runs on Asia/Dhaka (UTC+6) while every
# timestamp this script writes is UTC, so a wrong cron hour is otherwise invisible —
# it just looks like the archive is old.
log "starting — local $(date '+%Y-%m-%d %H:%M:%S %Z'), UTC $(date -u '+%Y-%m-%d %H:%M:%S')"

[ -d "$DATA_DIR" ] || die "no data directory at $DATA_DIR — is the CMS deployed?"
[ -f "$DB" ] || die "no database at $DB — check DATABASE_URI (docs/deployment-runbook.md warns it is data/payload.db, not data/db/payload.db)"
[ -s "$DB" ] || die "$DB is 0 bytes — the schema was never initialised. A 0-byte database is not a backup."
[ -d "$DATA_DIR/media" ] || die "no media directory at $DATA_DIR/media — a backup without media silently loses every uploaded image (docs/backup-and-recovery.md section 7)"

command -v sqlite3 >/dev/null 2>&1 || die "the sqlite3 command is not installed on this host. Without it the only alternative is 'cp' against a live database, which can capture a torn state. Install sqlite3 (CloudLinux: yum install sqlite) rather than falling back."

STAMP=$(date -u '+%Y%m%dT%H%M%SZ')
WORK=$(mktemp -d "$OUT_DIR/.build.XXXXXX")
# `trap` on EXIT so a failed run cannot leave a half-written directory that the next
# run's prune would later treat as an archive.
trap 'rm -rf "$WORK"' EXIT INT TERM

log "dumping $DB"
# `.backup` with a path argument is SQLite's online backup API. Safe while the CMS is
# serving traffic, which is the entire reason this is not a `cp`.
sqlite3 "$DB" ".backup '$WORK/payload.db'" || die "sqlite3 .backup failed"

[ -s "$WORK/payload.db" ] || die ".backup produced an empty file"

# Copy media in rather than referencing it, so the archive is one self-contained file.
# `cp -R` of a directory being appended to by the CMS can catch a file mid-write; the
# archive is still readable, which is the failure mode we accept here and cannot avoid
# without a consistent snapshot of every upload. It is far less costly than losing them.
cp -R "$DATA_DIR/media" "$WORK/media" || die "could not copy the media directory"

ARCHIVE="$OUT_DIR/shikkha24-$STAMP.tar.gz"
# `-C "$WORK"` with bare names puts payload.db and media/ at the *root* of the archive.
# `backup-verify.mjs` looks for exactly that layout and deliberately does not guess at a
# nested one — a restore that points at a path that does not exist is the failure mode.
tar -czf "$ARCHIVE" -C "$WORK" payload.db media || die "tar failed"

[ -s "$ARCHIVE" ] || die "tar produced an empty archive"

# The marker the fetch side reads. Writing the name rather than making it parse a
# directory listing means the transfer is one deterministic file, and a host with no
# new archive is a clear "no such file" rather than a subtle mis-parse.
printf '%s\n' "$(basename "$ARCHIVE")" > "$OUT_DIR/latest.txt"

log "wrote $(basename "$ARCHIVE") ($(du -h "$ARCHIVE" | cut -f1))"

# Prune by age, newest first is irrelevant — anything older than KEEP_DAYS is dropped.
# `find -mtime` compares against mtime, which is exactly the archive's creation time.
find "$OUT_DIR" -maxdepth 1 -name 'shikkha24-*.tar.gz' -mtime "+$KEEP_DAYS" -print -delete 2>/dev/null | while read -r old; do
  log "pruned $old (older than $KEEP_DAYS days)"
done

# ⚠️ Then cap the COUNT. `tail -n "+N"` emits from line N onward, so on a newest-first
# listing this drops everything past the cap and keeps the 30 most recent. `ls -1t` is
# sorted by mtime, and these names are timestamp-derived with no spaces, so a plain
# `read -r` splits them safely.
ls -1t "$OUT_DIR"/shikkha24-*.tar.gz 2>/dev/null | tail -n "+$((MAX_ARCHIVES + 1))" | while read -r old; do
  rm -f "$old"
  log "pruned $(basename "$old") (past the $MAX_ARCHIVES-archive cap)"
done

REMAINING=$(find "$OUT_DIR" -maxdepth 1 -name 'shikkha24-*.tar.gz' | wc -l)
log "done — $REMAINING archive(s) retained in $OUT_DIR (cap $MAX_ARCHIVES, age $KEEP_DAYS days)"