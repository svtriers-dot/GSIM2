# Verified CI and code publication

GitHub Actions are pinned to reviewed commits: checkout 7.0.1, setup-node 7.1.0,
Actions Cache save/restore 6.1.0 and optional upload-artifact 7.0.2. Jobs use contents:read and
checkout does not persist its token. Node.js is fixed at 24.22.3; CI uses the
Docker Official Image postgres:18.7 and task-owned synthetic records only.

A branch or pull request runs CI without production deployment. Only a main
revision that passes CI and is still the current main can enter the deploy job.
The deploy job restores the code bundle built and tested in that same workflow run, using an immutable unique cache key and a SHA-256 job output. An independent verification job checks the cross-job restore before publication.
Artifacts contain whitelisted source/build files only, never .env, databases,
production logs, user exports or SSH keys. The official Actions Cache uses its existing separate capacity; unused caches are evicted by GitHub. Exact cache-hit and digest matching are mandatory; there are no fallback keys. A missing bundle blocks publication and requires rerunning CI. Optional HTML report upload is disabled unless the repository variable UPLOAD_PLAYWRIGHT_REPORTS is true; when enabled, reports expire after seven days. Existing database artifacts are
not accessed or removed.

Production publication never runs db:push, db:init, seed scripts, SQL migrations,
or secret/default configuration synchronization. SQL is reviewed and applied as
an explicit operator action before a release that needs it. The registry's
manual security-migrate action is restricted to main, explicit phase choices and
PostgreSQL 18 on port 5433. Its manual provisioning action refuses to initialize
an existing installation. The former backup-setup action only checks the existing
Russian backup timers; it does not install a second cron or export data.

SSH verifies a committed public host key under HostKeyAlias tesstech-production.
After a legitimate VM host-key rotation, verify the replacement through the cloud
console/trusted access and review production-known-hosts. Never replace this with
an unchecked ssh-keyscan result. Temporary runner keys stay outside the checkout
and are removed in an always step.

activate-release.py verifies the compressed artifact digest, whitelisted archive
members and size limits. It prepares pinned production dependencies in a separate
directory, checks health and refuses an active TessTOC game before stopping the
service. It preserves the original .env and records the database schema digest
locally on the Russian server. Only code/runtime files move during activation.
Health failure or a changed private config/schema triggers restoration of the
previous runtime and restart. A schema difference requires operator investigation;
code rollback is not a substitute for restoring a database.

Seven standard-library tests exercise successful activation, failed-health
rollback for both apps, archive traversal denial, active-game refusal and failure
before service shutdown. Run: python3 deploy/test_activate_release.py.

Rollback runtimes and private diagnostics are stored under
/var/backups/tesstech/actions-releases/{gsim,registry}/<release-id>. The original
pre-Actions runtime is retained. Two previous managed runtimes are kept; unrelated
backup directories and database/configuration archives are outside this rotation.
Restore only the selected code/runtime while the app is stopped; never overwrite
.env or restore an older database merely to undo a code release.

The live artifact manifests and .actions-release.json identify the actual
published revision. A checkout/cache left under src is not the deployed runtime.
