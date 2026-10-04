#!/usr/bin/env bash
# Shikkha24 — one-time owner setup for deploy + backup.
#
# ## Why this exists
#
# Auto-deploy and automated backup are both built, tested and switched off. Both are off for the
# same reason: **the credentials are not in GitHub yet.** Nothing about this is a code problem —
# it is four clicks in cPanel and this script.
#
# Before this existed the owner had to add five secrets by hand in the GitHub web UI, remember
# which was which, and get every name exactly right. A wrong name is not a warning — the run
# just fails later, on a schedule, with an error that does not name the cause.
#
# ## ⚠️ It never displays or records a secret
#
# Each value is read with `read -s` (no echo, not even dots) and piped to `gh secret set` on
# **stdin**. Never passed as `--body`, which would put the value in the process argument list
# where any other process on the machine could read it with `ps`. So the value appears nowhere:
# not on screen, not in your shell history, not in `ps`, not in a log.
#
# The prompt is drawn by this script rather than by `gh`, because `gh`'s own prompt races the
# terminal — see the long note at the reading loop below. That race was found by watching the
# owner hit it, not by reading the code.
#
# ## Safe to re-run
#
# Already-set secrets are skipped, not re-prompted. So run it again whenever you are unsure
# whether something took, and it will only ask for what is genuinely missing.
#
# Run:  bash scripts/owner-setup.sh
set -euo pipefail

cd "$(dirname "$0")/.."

BOLD=$'\033[1m'; DIM=$'\033[2m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; OFF=$'\033[0m'
say()  { printf '%s\n' "$*"; }
head_() { printf '\n%s%s%s\n' "$BOLD" "$*" "$OFF"; }
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$OFF" "$*"; }
skip() { printf '  %s·%s %s %s(already set)%s\n' "$DIM" "$OFF" "$*" "$DIM" "$OFF"; }
todo() { printf '  %s→%s %s\n' "$YELLOW" "$OFF" "$*"; }

# ── 0. Prerequisites ───────────────────────────────────────────────────────────
head_ "Checking prerequisites"

if ! command -v gh >/dev/null 2>&1; then
  printf '%s✗%s `gh` is not installed. See https://cli.github.com — it is free and needs no card.\n' "$RED" "$OFF" >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  printf '%s✗%s Not signed in to GitHub. Run:  gh auth login%s\n' "$RED" "$OFF" >&2
  exit 1
fi
ok "signed in to GitHub as $(gh api user --jq .login)"

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
ok "repository: $REPO"

# ── 1. Secrets ─────────────────────────────────────────────────────────────────
# name | what it is | where to get it
#
# ⚠️ Each one is prompted for with hidden input. Press Enter on an empty prompt to skip a secret
# you have not created yet — it will be reported as still-missing at the end rather than failing
# here, because the FTP secrets depend on an account you have not created at this point.
secrets=(
  "CPANEL_HOST|cPanel server hostname — b201.serverdiana.com (no https://, no :2083)"
  "CPANEL_USER|your cPanel username"
  "CPANEL_TOKEN|cPanel API token — control panel, Security, API Tokens"
  "CMS_URL|the CMS address, e.g. https://cms.shikkha24.com — the build fetches articles from it"
  "PUBLIC_CMS_ORIGIN|same address; must match connect-src in the site's .htaccess"
  "FTP_HOST|FTP server hostname — same host as CPANEL_HOST"
  "FTP_USER|the dedicated backup FTP account (NOT your main cPanel login)"
  "FTP_PASSWORD|the password for that backup account only"
)

head_ "Secrets"
say "  ${DIM}Each prompt is hidden. Press Enter to skip one you have not created yet.${OFF}"
say ""

existing=$(gh secret list --json name --jq '.[].name' 2>/dev/null || echo "")

for entry in "${secrets[@]}"; do
  name="${entry%%|*}"
  desc="${entry#*|}"
  if printf '%s\n' "$existing" | grep -qx "$name"; then
    skip "$name"
    continue
  fi
  say "  ${BOLD}$name${OFF}"
  say "  ${DIM}$desc${OFF}"
  # Hidden prompt. `--body` is deliberately absent — see the header.
  # ⚠️ Do NOT use `gh secret set NAME` with no argument and let gh do the prompting.
  #
  # It races the terminal. gh has to start up, then disable echo, and anything typed in that
  # window is echoed by the tty instead of being read by gh — which looks exactly like the
  # program working. The owner hit this on the first run and could not tell what had been
  # saved. Worse, the value can land as an empty string and fail silently weeks later.
  #
  # So this script owns the prompt: `read -s` hides the echo, and the value is piped to gh on
  # **stdin**, never passed as `--body` — so it is not in the process argument list either, and
  # `ps` cannot see it.
  printf '  %s> %s' "$YELLOW" "$OFF"
  IFS= read -r -s value || value=''
  printf '\n'
  if [ -z "$value" ]; then
    skip "$name"
    continue
  fi
  if printf '%s' "$value" | gh secret set "$name" --repo "$REPO" >/dev/null 2>&1; then
    unset value
    ok "$name saved"
  else
    unset value
    printf '  %s·%s %s was not saved%s\n' "$DIM" "$OFF" "$name" "$DIM" "$OFF"
  fi
done

# ── 2. Repository variables ────────────────────────────────────────────────────
head_ "Repository settings"
say "  ${DIM}These are not secret — they are plain settings.${OFF}"
printf '  Website address [https://shikkha24.com]: '
read -r site || true
site="${site:-https://shikkha24.com}"
gh variable set PUBLIC_SITE_URL --repo "$REPO" --body "$site" >/dev/null
ok "PUBLIC_SITE_URL = $site"

printf '  CMS address [https://cms.shikkha24.com]: '
read -r cms || true
cms="${cms:-https://cms.shikkha24.com}"
gh variable set PUBLIC_MEDIA_BASE_URL --repo "$REPO" --body "$cms" >/dev/null
ok "PUBLIC_MEDIA_BASE_URL = $cms"

# ── 3. What is still missing, stated plainly ───────────────────────────────────
head_ "What this script cannot do for you"
cat <<'EOF'
  These are clicks in your web host's control panel. They come first, because the
  secrets above are meaningless without them.

  1. FTP Accounts -> create an account whose folder is  shikkha24-backup
     Use its OWN password, not your main cPanel password.
  2. Terminal -> run  bash ~/bin/shikkha24-backup-dump.sh  once, and read the output.
     It prints a line starting "wrote shikkha24-...tar.gz" when it worked.
  3. Cron Jobs -> once daily at 23:00:
       0  23  *  *  *   /bin/sh /home/USER/bin/shikkha24-backup-dump.sh
     (The host clock is UTC+6, so 23:00 local is 17:00 UTC.)
EOF

# ── 4. Report ──────────────────────────────────────────────────────────────────
head_ "Result"
now=$(gh secret list --json name --jq '.[].name' 2>/dev/null | sort || true)
need_deploy="CPANEL_HOST CPANEL_USER CPANEL_TOKEN CMS_URL PUBLIC_CMS_ORIGIN"
need_backup="FTP_HOST FTP_USER FTP_PASSWORD"
missing_deploy=""; missing_backup=""
for n in $need_deploy; do printf '%s\n' "$now" | grep -qx "$n" || missing_deploy="$missing_deploy $n"; done
for n in $need_backup; do printf '%s\n' "$now" | grep -qx "$n" || missing_backup="$missing_backup $n"; done

if [ -z "$missing_deploy" ]; then
  ok "deploy secrets: complete"
  todo "Next:  gh workflow run deploy.yml -f mode=dry-run -f target=static"
  say "        ${DIM}Run that FIRST. It builds and plans without changing the site.${OFF}"
  todo "After it looks right:  gh variable set AUTO_DEPLOY live --repo $REPO"
  say "        ${DIM}Only then does a push to main publish by itself.${OFF}"
else
  printf '  %s✗%s deploy secrets still missing:%s%s%s\n' "$RED" "$OFF" "$YELLOW" "$missing_deploy" "$OFF"
  todo "Create a cPanel API token, then run this script again."
fi

if [ -z "$missing_backup" ]; then
  ok "backup secrets: complete"
  todo "Next: run the host dump script once by hand (step 2 above)."
else
  printf '  %s✗%s backup secrets still missing:%s%s%s\n' "$RED" "$OFF" "$YELLOW" "$missing_backup" "$OFF"
  todo "Create the FTP account (step 1 above), then run this script again."
fi

printf '\n%sNothing was printed, logged or stored in plaintext. That is the point of this script.%s\n' "$DIM" "$OFF"