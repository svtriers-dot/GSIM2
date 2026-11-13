# Node.js in production

Updated on 2026-11-13 from Node.js 20.20.2 to official Node.js 24.22.3 LTS.
Runtime: `/opt/tesstech-node/24/bin/node`. It is shared with tesstech.ru; future changes to the `24` symlink must be verified against all three applications. Distribution: https://nodejs.org/en/blog/release/v24.22.3.

The service uses a systemd `node24.conf` override and the checked-in service template uses the same runtime.
CI selects Node.js 24; remote npm commands explicitly prepend the runtime directory to PATH.

Existing compiled frontend files and dependencies were preserved. Compatibility was checked with synthetic database fixtures, live authenticated APIs, database read/write transactions with rollback, and desktop/mobile visual checks.

Private backups (databases, configuration, old Node.js, runtime bundles and installed dependencies) are retained on the Russian server at `/var/backups/tesstech/projects-node24-20261113`.
The original `/usr/bin/node` binary remains available for a runtime-only rollback.
