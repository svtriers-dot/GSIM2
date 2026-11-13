# DOMPurify — 2026-11-13

DOMPurify is pinned to official npm release **3.4.17**, replacing installed 3.4.13.
Only the root entry and `node_modules/dompurify` change in the lockfile. The
`USE_PROFILES: { html: true }` sanitizer configuration remains unchanged.

Official release: https://github.com/cure53/DOMPurify/releases/tag/3.4.17

Registry tarball: https://registry.npmjs.org/dompurify/-/dompurify-3.4.17.tgz

Integrity: `sha512-B/pSlYVHQ58kqISD/yDjuJ1yfzI34m1gF4lAod2bwSRhiN4K5Cl3H8Af7hqB2PmTL911tdEudnnXn5FnhRoz0w==`

The mobile legal-document layout also contains long text within the article and
makes wide tables scroll inside their own bounds. Table cells retain readable
widths. This addresses pre-existing page overflow in privacy and oferta at 390px.
Document HTML/text, colors, fonts, desktop layout and global CSS are preserved.

## Validation

- 123 existing engine, certificate, legal-content and SEO tests passed; the 12
  legal-content tests were repeated after the final mobile CSS adjustment.
- 11 registration/authentication/session lifecycle API checks passed against a
  schema-only temporary database containing task-owned synthetic fixtures.
- 14 browser sanitizer cases passed, covering malicious HTML and valid content.
- Six TessTOC routes were compared at 390px and 1280px; the main site and registry
  landing pages were included in the production comparison. No browser JS errors.
- Shared-server application health, unauthenticated API denial and PostgreSQL 18
  read/write transactions with rollback were checked without exporting user rows.
- The main-site form test recorded consent and one outbox row; the test message
  was received in the company's own mailbox. No customer email was sent.

Full npm audit falls from 19 to **18** affected packages (0 critical, 9 high,
5 moderate, 4 low). Production-only audit falls from 13 to **12**. Remaining
findings require separate changes; this update does not resolve all audit items.

## Publication and rollback

An isolated Linux frontend build used Node.js 24.22.3 and the pinned lockfile,
with explicit resource limits. The backend bundle was not rebuilt or changed.
No database migration, schema push or other dependency update was performed.
Previously served static assets were retained for cached clients. Only TessTOC
was restarted to refresh its cached HTML template; the other apps and PostgreSQL
were not restarted.

Private database, runtime and configuration backups and the previous frontend
and DOMPurify module remain on the Russian production server. The runtime archive
was verified against the original files. The synthetic database was removed.
No database, private configuration or user document is stored in this repository.

The source commit uses `[skip ci]`: the tested frontend was published manually.
This deliberately avoids the existing automatic deployment's schema-push step.
Deploy-workflow modernization is a separate planned change.
