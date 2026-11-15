# express-rate-limit 8.7.4 — 2026-11-15

The official npm release replaces 7.5.1. Existing thresholds, time windows,
response bodies and header formats are retained. The max option is spelled limit.
The upstream default IPv6 /56 grouping is retained and tested, including aliases
and IPv4-mapped IPv6. Package integrity is verified against official npm metadata.

Production nginx connects over loopback and appends the peer with
X-Forwarded-For $proxy_add_x_forwarded_for. Both apps trust only loopback proxies.
TessTOC previously had no trusted-proxy setting, causing limits to aggregate on
nginx. The registry previously trusted one hop; explicit trusted addresses also
protect a direct non-loopback connection from forged forwarding headers.
Do not change this to trust proxy=true or a custom unmasked IP key generator.

CI exercises actual HTTP endpoints against the disposable localhost database:
all limit+1 boundaries, Retry-After and quota headers, unchanged error contracts,
separate peers, changing fake XFF prefixes, IPv4/mapped aliases, IPv6 /56 grouping,
and untrusted non-loopback requests with forged XFF. Payloads are empty and all
checks stop at validation or missing authorization, before database/email writes.
The production dependency runtime and existing functional tests remain enabled.

Before activation, back up apps/configuration/all four databases on the Russian
server and verify restores. Publish projects sequentially with rollback, schema
and .env guards, retaining prior immutable assets. Check production 429 limits
using reserved test peers from loopback through TLS nginx, never real visitors'
quotas. Check public spoof resistance with two harmless requests, layouts/fonts,
all projects, and a single own tesstech.ru form submission plus mailbox delivery.
No database initialization, schema migration or unrelated library upgrade.

References:
https://express-rate-limit.mintlify.app/reference/changelog
https://express-rate-limit.mintlify.app/reference/configuration
https://expressjs.com/en/guide/behind-proxies/
