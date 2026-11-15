# Drizzle / Zod maintenance, 2026-11-15

Pinned official npm releases: drizzle-orm 0.45.4, drizzle-kit 0.31.11,
drizzle-zod 0.8.3, zod 4.6.7. These releases address GHSA-gpj5-g38j-94v9
and GHSA-mrhx-c7xc-m3w5. The three record validators now specify string
keys explicitly, as required by Zod 4. Existing API error formatting is retained.

Unused @hookform/resolvers and zod-validation-error were removed after checking
all imports and the server build allowlist. React Hook Form remains in use.
Drizzle Kit's new tsx dependency also updates the development-only tsx/esbuild
toolchain through the lockfile. Frontend styles, fonts and database table
definitions are unchanged. Old/new `drizzle-kit export` SQL is identical.

`npm test` includes validation contracts, consent/role input boundaries, bounded
collection rejection and PostgreSQL identifier escaping. After CI prepares its
disposable PostgreSQL 18 database, `npx --no-install tsx script/check-db-compat.ts`
checks all 16 tables, relations and insert/update/select/rollback. The probe
refuses the production database name; restored-copy probes stay on the Russian
server. No working records or secrets enter CI.

`deploy/check-runtime.mjs` exercises the production dependency set against
gsim_ci only, including invalid consent, pending-role denial, the session
lifecycle, an authenticated PDF certificate and anonymous PDF denial.

Publication uses the existing tested-bundle, verified SSH and rollback gates.
It never runs db:push or applies SQL to the working database. Any future schema
change remains a separate reviewed migration tested on a restored copy.

Primary sources:
- https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
- https://zod.dev/v4/changelog
- https://github.com/drizzle-team/drizzle-orm/tree/drizzle-zod%400.8.3
