# Helmet 8.3.0 — 2026-11-15

Official npm Helmet 8.3.0 replaces 7.2.0 with no added dependencies. The existing
CSP and middleware configuration are retained. The upstream HSTS default changes
from 15552000 seconds (180 days) to 31536000 (365 days), including subdomains.
Node 18+ is required; CI/production already use Node 24.22.3.

CI checks actual HTML, static JS/CSS, health, unauthorized and validation-error
responses against the observed header contract. Expected CSP and security header
values are captured from the previous public release, with only HSTS max-age
updated. It checks nosniff-compatible script/style MIME types and absence of
X-Powered-By, report-only CSP and an unintended embedder policy. The rehearsal is
restricted to the disposable localhost CI database and sends no real account data.
The existing API/RLS, pool, IPv6/quota, WebSocket and UI tests remain enabled.

Before publishing, back up apps/configuration/all four databases on the Russian
server and verify restores. Publish projects sequentially with the usual schema,
.env, active-game and rollback guards. Compare public headers including duplicate
values through TLS nginx, retain the existing CSP, compare mobile/desktop layout
and loaded fonts, exercise registry login/registration buttons, and check one own
tesstech.ru contact submission plus actual mailbox delivery. No schema migration.

References:
https://helmet.js.org/
https://github.com/helmetjs/helmet/blob/main/CHANGELOG.md
