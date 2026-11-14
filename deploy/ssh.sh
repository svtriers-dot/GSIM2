#!/usr/bin/env bash
set -euo pipefail
exec ssh -F /dev/null -i "${SSH_KEY_FILE:?}" -o IdentitiesOnly=yes \
  -o BatchMode=yes -o StrictHostKeyChecking=yes -o HostKeyAlias=tesstech-production \
  -o UserKnownHostsFile="${SSH_KNOWN_HOSTS:?}" -o ConnectTimeout=15 \
  -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
  "${DEPLOY_USER:?}@${DEPLOY_HOST:?}" "$@"
