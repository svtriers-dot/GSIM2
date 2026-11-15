# PostgreSQL driver and WebSocket update, 2026-11-15

Exact official npm releases: pg 8.23.1 (from 8.16.3) and ws 8.23.0
(from 8.21.3), including their required pg protocol/pool dependencies.
PostgreSQL remains 18.7, with the existing connection URL and pool settings.

Upstream ws 8.23.0 fixes remote memory exhaustion through buffered automatic
Pong replies: https://github.com/websockets/ws/releases/tag/8.23.0.
The upstream default `maxPendingAutoPongs=60` applies to the existing
WebSocketServer; no custom override disables it.

`script/check-db-compat.ts` checks all 16 tables, relations and transactional
insert/update/read/rollback against a disposable or restored compatibility DB.
`deploy/check-runtime.mjs` runs the production dependency set against gsim_ci.
It also invokes `check-websockets.mjs` for trainer/team state, JSON and control
Ping/Pong, reconnection, team socket replacement, single-use tickets, wrong
ticket kind, missing authentication and forbidden Origin. All data are synthetic.
The tests never connect to a production database or use production credentials.

Before production activation, retain private Russian-server backups and verify
restoration. The ordinary deployment must preserve .env, schema, idle-session
gate, prior immutable assets and automatic rollback. Check all three sites,
fonts/mobile layout and the tesstech.ru contact form plus actual mailbox delivery.
