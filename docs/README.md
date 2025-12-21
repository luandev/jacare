# Jacare Developer Guide 🧑‍💻🐊

Welcome to the full technical README for **Jacare**, the Brazilian-inspired desktop ROM library manager that wraps the Crocdb API with an Electron + Express + React stack.

## Table of contents
- [Project overview](#project-overview)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development scripts](#development-scripts)
- [Configuration](#configuration)
- [Data & storage](#data--storage)
- [API quick reference](#api-quick-reference)
- [Production build](#production-build)
- [Support](#support)

## Project overview
Jacare helps you browse, enrich, and launch ROMs from one place. It keeps your library on disk while pulling metadata from [Crocdb](https://crocdb.net) and reporting long-running work through jobs and SSE streams.

## Architecture
- **Electron shell** boots the server and ships the React UI for a native desktop experience.
- **Express API** powers Crocdb searches, manifest writing, and job orchestration.
- **React + Vite UI** calls the API over REST + SSE for real-time job updates.
- **SQLite backing store** keeps settings, profiles, cached Crocdb responses, library items, and job tracking tables.

## Repository layout
- `apps/server` – Express API, jobs, local scanning, and Crocdb client.
- `apps/web` – React UI (Vite) served by the server or opened directly in dev.
- `apps/desktop` – Electron main process that wraps the server and UI.
- `packages/shared` – Shared types, defaults, and the manifest schema used across workspaces.

## Prerequisites
- Node.js 18+
- npm
- Optional: Git LFS if you store binaries or media in the repo.

## Installation
```bash
npm ci
```

## Development scripts
- `npm run dev` – Run shared build watch + server + web + desktop together.
- `npm run dev:server` – Start the Express API and job runners.
- `npm run dev:web` – Start the React UI via Vite.
- `npm run dev:desktop` – Start the Electron shell pointing at the dev server.
- `npm run build` – Build all workspaces.
- `npm run typecheck` – Type-check the monorepo.

## Configuration
- `CROCDESK_PORT` (default `3333`)
- `CROCDESK_DATA_DIR` (default `./data`)
- `CROCDESK_ENABLE_DOWNLOADS` (default `false`)
- `CROCDB_BASE_URL` (default `https://api.crocdb.net`)
- `CROCDB_CACHE_TTL_MS` (default `86400000`)
- `VITE_API_URL` (default `http://localhost:3333`)
- `CROCDESK_DEV_URL` (default `http://localhost:5173`)

## Data & storage
- SQLite tables: `settings`, `profiles`, `crocdb_cache_search`, `crocdb_cache_entry`, `library_items`, `jobs`, `job_steps`.
- Each scanned ROM folder receives a `.crocdesk.json` manifest describing the game entry.
- Data directory defaults to `./data`; point it to a faster disk or network share as needed.

## API quick reference
- Base URL: `http://localhost:<CROCDESK_PORT>` (3333 by default) or the packaged server inside Electron.
- Endpoints:
  - `POST /search` – Query Crocdb for matches.
  - `POST /entry` – Pull metadata and assets for a specific result.
  - `GET /platforms` / `GET /regions` / `GET /info` – Reference data for the UI.
  - `GET /events` – SSE stream for job progress (scans, downloads, cache refreshes).
- Responses are wrapped as `{ info, data }` objects for consistency.

## Production build
- Run `npm run build` to compile all workspaces.
- Package the Electron app from `apps/desktop`; it bundles the server and web assets.
- CI on `main` can publish release archives with the latest changelog and README.

## Support
- Issues & roadmap: [GitHub Issues](https://github.com/your-org/crocdesk/issues)
- Crocdb service: [https://crocdb.net](https://crocdb.net) and [https://api.crocdb.net](https://api.crocdb.net)
- Tech stack docs: [Electron](https://www.electronjs.org/), [Express](https://expressjs.com/), [Vite](https://vitejs.dev/), [React](https://react.dev/)
