# PostgreSQL in production

Migrated on 2026-11-13 to PostgreSQL 18.7, cluster `18/main`, local port `5433`.
The application reads `DATABASE_URL` from its existing private `.env`; deployments must preserve that file.

Daily backups use `/usr/lib/postgresql/18/bin/pg_dump -p 5433`.
The existing schedules and 14-day retention are preserved. Backups remain on the Russian server.
The migration included a full restore comparison of records, schema, sequences, ownership and access rules, plus application API checks.

Migration backups and rollback instructions are retained privately on the server in
`/var/backups/tesstech/projects-pg18-migration-20261113`. Old PostgreSQL 14 databases are retained with connections disabled.
