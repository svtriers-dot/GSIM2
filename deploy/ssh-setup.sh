#!/usr/bin/env bash
set -euo pipefail
: "${DEPLOY_KEY:?Missing deployment key}"
: "${DEPLOY_HOST:?Missing deployment host}"
: "${DEPLOY_USER:?Missing deployment user}"
: "${RUNNER_TEMP:?Missing runner temp directory}"
: "${GITHUB_ENV:?Missing Actions environment file}"
umask 077
ssh_dir="$RUNNER_TEMP/tesstech-ssh"
mkdir -p "$ssh_dir"
printf '%s\n' "$DEPLOY_KEY" > "$ssh_dir/key"
cp "$(dirname "$0")/production-known-hosts" "$ssh_dir/known_hosts"
chmod 600 "$ssh_dir/key" "$ssh_dir/known_hosts"
printf 'SSH_KEY_FILE=%s\nSSH_KNOWN_HOSTS=%s\n' "$ssh_dir/key" "$ssh_dir/known_hosts" >> "$GITHUB_ENV"
