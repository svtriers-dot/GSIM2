# Goldratt Simulator

## Overview

This is a **Goldratt Theory of Constraints production simulator** — an educational game where players manage a factory floor with multiple machine types, production lines, and raw materials. Players must optimize production across three product lines (A, D, F) by purchasing raw materials, assigning machines to stations, and managing setup times to maximize cash over a 5-day simulated week.

The game simulates a factory with four machine types (color-coded: cyan, green, magenta, brown), each with limited quantities. Players place machines on stations, buy raw materials, and watch production flow through the factory. Some stations are assembly stations (B3, D7) that combine two inputs. Machine setup times add strategic complexity.

## User Preferences

Preferred communication style: Simple, everyday language.
Language: Russian (game UI in Russian)

## System Architecture

### Frontend
- **Framework**: React with TypeScript, bundled with Vite
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state; React hooks (useRef, useState, useEffect) for game state
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Game Engine
- Custom game engine in `client/src/lib/gameEngine.ts` — manages simulation state including machines, stations, buffers, production timing, and cash tracking
- Game configuration in `client/src/lib/gameConfig.ts` — defines station layout (18 stations in columns A-F), connections between stations, product definitions, raw material costs, and machine types (3 cyan, 2 green, 2 magenta, 1 brown = 8 machines total)
- Main game UI in `client/src/pages/game.tsx` — renders the factory floor with interactive SVG elements for stations, machines, and controls

### Backend
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript, executed via tsx
- **API**: RESTful endpoints under `/api/`
  - `POST /api/game-results` — save game results
  - `GET /api/game-results` — retrieve top game results (leaderboard)
- **Development**: Vite dev server middleware with HMR served through the Express server
- **Production**: Static file serving from `dist/public`

### Data Storage
- **Schema**: Drizzle ORM with PostgreSQL dialect, defined in `shared/schema.ts`
- **Tables**:
  - `users` — id (UUID), username (unique), password
  - `game_results` — id (UUID), playerName, finalCash, totalRevenue, totalRmCost, productsSold (JSONB), createdAt
- **Storage**: PostgreSQL-backed `DatabaseStorage` class in `server/storage.ts` (implements `IStorage` interface)
- **Database connection**: `server/db.ts` using `drizzle-orm/node-postgres` with `pg` pool
- **Database migrations**: Drizzle Kit with `db:push` command, migrations output to `./migrations`

### Build System
- **Dev**: `tsx server/index.ts` runs the server with Vite middleware for HMR
- **Build**: Custom build script (`script/build.ts`) that runs Vite for client and esbuild for server, outputting to `dist/`
- **Production**: `node dist/index.cjs`

### Key Design Decisions
1. **Shared schema** between client and server via `shared/schema.ts` — Drizzle schemas generate Zod validators used for API input validation
2. **PostgreSQL storage** — `DatabaseStorage` class uses Drizzle ORM for persistent game results and leaderboard
3. **Single-process architecture** — Express serves both the API and the Vite dev server (or static files in production)
4. **Client-side game simulation** — All game logic runs in the browser; the server only handles result persistence
5. **Russian UI** — All game text is in Russian to match the original GSim.exe program

## Game Mechanics
- **Starting cash**: $10,000
- **Fixed weekly expenses**: $11,000 (deducted at end of week)
- **Day duration**: 480 seconds (8 hours simulated)
- **Total days**: 5 (one work week)
- **Products**: A ($180, demand 40), D ($240, demand 50), F ($180, demand 40)
- **Assembly stations**: B3 (combines A1+C1 outputs), D7 (combines C5+E5 outputs)
- **Machine setup times**: Cyan 30s, Green 120s, Magenta 60s, Brown 0s

## External Dependencies

- **PostgreSQL** — Persistent storage (configured via `DATABASE_URL` environment variable)
- **Drizzle ORM + Drizzle Kit** — Database ORM and migration tooling
- **Radix UI** — Headless UI component primitives (dialog, popover, tabs, tooltips, etc.)
- **TanStack React Query** — Server state management and data fetching
- **Vite** — Frontend build tool and dev server
