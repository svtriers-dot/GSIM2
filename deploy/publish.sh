#!/usr/bin/env bash
set -euo pipefail
project=${1:?Missing project}
release_id=${2:?Missing release id}
case "$project" in gsim|registry) ;; *) exit 2;; esac
[[ "$release_id" =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]] || exit 2
helper_dir=$(cd "$(dirname "$0")" && pwd)
archive=${RELEASE_ARCHIVE:?Missing tested code artifact}
test -f "$archive"
test "$(basename "$archive")" = release.tgz
digest=$(sha256sum "$archive" | cut -d' ' -f1)
remote_dir="/tmp/tesstech-$project-$release_id"
cleanup_transfer() {
  result=$?
  trap - EXIT
  bash "$helper_dir/ssh.sh" "rm -f '$remote_dir/release.tgz' '$remote_dir/activate-release.py'; rmdir '$remote_dir'" >/dev/null 2>&1 || true
  exit "$result"
}
trap cleanup_transfer EXIT
bash "$helper_dir/ssh.sh" "umask 077; mkdir -p '$remote_dir'"
scp -F /dev/null -i "${SSH_KEY_FILE:?}" -o IdentitiesOnly=yes -o BatchMode=yes \
  -o StrictHostKeyChecking=yes -o HostKeyAlias=tesstech-production \
  -o UserKnownHostsFile="${SSH_KNOWN_HOSTS:?}" \
  "$archive" "$helper_dir/activate-release.py" \
  "${DEPLOY_USER:?}@${DEPLOY_HOST:?}:$remote_dir/"
bash "$helper_dir/ssh.sh" "sudo python3 '$remote_dir/activate-release.py' '$project' '$release_id' '$remote_dir/$(basename "$archive")' '$digest'"
