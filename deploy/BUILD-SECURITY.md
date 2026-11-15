# Build dependency maintenance, 2026-11-15

Pinned Vite 7.3.8 and updated compatible Rollup 4, Babel 7, Browserslist 4,
Picomatch 4, source-map-js 1.2.2 and Sucrase 3.35.1 through the npm lockfile.
Sucrase's upstream patch replaces glob with tinyglobby; the unused glob,
minimatch and brace-expansion chain is removed instead of forcing new majors.

Tailwind CSS remains 3.4.17 and typography remains 0.5.15 to preserve the current
design. The typography plugin pins vulnerable postcss-selector-parser 6.0.10;
even upstream 0.5.20 still pins that version. A scoped override selects official
postcss-selector-parser 6.1.5 within the same major. Review/remove this override
when updating typography to an upstream release that fixes its parser dependency.
All parser 6 copies now use 6.1.5. The unused Tailwind 4 Vite plugin was removed;
the configured Tailwind 3 PostCSS pipeline remains in use.

The full npm audit now contains three low-level reports in the existing
react-joyride/react-floater/deepmerge chain. Updating that UI feature is a separate
step. CI rejects moderate, high and critical reports across all dependencies,
including development tools: npm audit --audit-level=moderate.

Before publication, run npm ci, npm run check, npm test and npm run build.
The existing CI also checks PostgreSQL 18, API/roles/consent/PDF, browser E2E,
archive digests and rollback behavior. Compare the home and legal pages at
390/1280px: the candidate screenshots and computed styles match production.

This change does not modify application database definitions. Publication uses
the existing tested-bundle and verified-SSH workflow without database migrations.

Primary sources:
- https://github.com/vitejs/vite/releases/tag/v7.3.8
- https://github.com/rollup/rollup/security/advisories/GHSA-mw96-cpmx-2vgc
- https://registry.npmjs.org/@tailwindcss%2ftypography/0.5.20
- https://registry.npmjs.org/postcss-selector-parser/6.1.5
- https://registry.npmjs.org/sucrase/3.35.1
