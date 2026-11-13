# Express maintenance, 2026-11-13

Production versions: Express 5.3.0, body-parser 2.4.0, proxy-addr 2.0.8.
The existing Express major version is retained. Package versions and required transitive updates are locked in package-lock.json.

Before activation, current runtime archives were checked against all installed files, retained alongside encrypted copies, and fresh database/configuration backups were created. Backups and the previous runtime remain privately on the Russian server under `/var/backups/tesstech/projects-express-20261113`.

Candidate releases were installed separately with npm ci and tested on synthetic database fixtures. Checks cover business APIs, tenant isolation or the game session lifecycle, gzip/JSON size limits, invalid limits and the mapped IPv6 proxy trust regression.

The registry release directory was switched while its service was stopped. For TessTOC only dist/index.cjs and node_modules were switched; dist/public remained byte-for-byte identical. The server bundle uses the same esbuild configuration and dependency allowlist as script/build.ts. Frontend files were preserved for all three projects.

Post-activation checks cover authenticated APIs, PostgreSQL read/write transactions with rollback and tesstech.ru. The old runtime is retained for filesystem rollback without replacing the production database.
