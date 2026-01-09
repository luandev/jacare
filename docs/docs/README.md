# Jacare Developer Guide 🧑‍💻🐊

> **⚠️ IMPORTANT NOTICE**: The main crocdb source is currently offline, causing data access failures. A root cause has been identified and a fix is in progress. An update will be published shortly with restored availability.

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
- [API reference](#api-reference)
- [Production build](#production-build)
- [Support](#support)

## Project overview
Jacare helps you browse, enrich, and launch ROMs from one place. It keeps your library on disk while pulling metadata from [Crocdb](https://crocdb.net) and reporting long-running work through jobs and SSE streams.

## Architecture
- **Electron shell** boots the server and ships the React UI for a native desktop experience.
- **Express API** powers Crocdb searches, manifest writing, and job orchestration.
- **React + Vite UI** calls the API over REST + SSE for real-time job updates.
- **SQLite backing store** keeps settings, cached Crocdb responses, library items, and job tracking tables.

## Repository layout
- `apps/server` – Express API, jobs, local scanning, and Crocdb client.
- `apps/web` – React UI (Vite) served by the server or opened directly in dev.
- `apps/desktop` – Electron main process that wraps the server and UI.
- `packages/shared` – Shared types, defaults, and the manifest schema used across workspaces.

## Prerequisites
- Node.js 20+
- npm
- Optional: Git LFS if you store binaries or media in the repo.

## Installation
```bash
npm ci
```

## Development scripts
- `npm run dev` – Run shared build watch + server + web + desktop together.
- `npm run dev:shared` – Start the shared package in watch mode.
- `npm run dev:server` – Start the Express API and job runners.
- `npm run dev:web` – Start the React UI via Vite.
- `npm run dev:desktop` – Start the Electron shell pointing at the dev server.
- `npm run build` – Build all workspaces.
- `npm run typecheck` – Type-check the monorepo.
- `npm run lint` – Lint all TypeScript and React code.
- `npm run test:unit` – Run unit tests with Vitest.

## Configuration
- `CROCDESK_PORT` (default `3333`) – Server port
- `CROCDESK_DATA_DIR` (default `./data`) – Directory for SQLite databases and cache
- `CROCDB_BASE_URL` (default `https://api.crocdb.net`) – Crocdb API base URL
- `CROCDB_CACHE_TTL_MS` (default `86400000`) – Cache TTL in milliseconds (24 hours)
- `CROCDESK_DEV_URL` (default `http://localhost:5173`) – Dev server URL for Electron

Settings stored in the database:
- `downloadDir` – Temporary directory for zip file downloads (deleted after extraction)
- `libraryDir` – Root directory where extracted game files are stored. All scanning and library operations work from this root.
- `queue.concurrency` (optional) – Maximum concurrent jobs

## Data & storage
- **SQLite tables:**
  - `settings` – Application settings (downloadDir, libraryDir, queue config)
  - `crocdb_cache_search` – Cached search results from Crocdb
  - `crocdb_cache_entry` – Cached entry data from Crocdb
  - `library_items` – Indexed ROM files with metadata
  - `jobs` – Job records (scan_local, download_and_install)
  - `job_steps` – Individual step progress for jobs
- **Manifests:** Each scanned ROM folder receives a `.crocdesk.json` manifest describing the game entry.
- **Data directory:** Defaults to `./data`; point it to a faster disk or network share as needed.

## API reference
- **Base URL:** `http://localhost:<CROCDESK_PORT>` (3333 by default) or the packaged server inside Electron.

### Crocdb endpoints
- `POST /crocdb/search` – Query Crocdb for matches. Request body: `{ search_key?, platforms?, regions?, rom_id?, max_results?, page? }`
- `POST /crocdb/entry` – Pull metadata and assets for a specific result. Request body: `{ slug }`
- `GET /crocdb/platforms` – Get available platforms
- `GET /crocdb/regions` – Get available regions
- `GET /crocdb/info` – Get Crocdb service info

### Library endpoints
- `GET /library/items?platform=<platform>` – List library items (optionally filtered by platform)
- `GET /library/games?platform=<platform>` – List library games (optionally filtered by platform)
- `POST /library/scan/local` – Trigger a local scan job
- `DELETE /library/item?dir=<path>` – Delete a library item and its directory

### Jobs endpoints
- `GET /jobs` – List all jobs with preview data
- `GET /jobs/:id` – Get job details and steps
- `POST /jobs/download` – Enqueue a download and install job. Request body: `{ slug, linkIndex? }`
- `POST /jobs/:id/cancel` – Cancel a job
- `POST /jobs/:id/pause` – Pause a job
- `POST /jobs/:id/resume` – Resume a paused job
- `POST /jobs/pause-all` – Pause all jobs
- `POST /jobs/resume-all` – Resume all paused jobs

### Settings endpoints
- `GET /settings` – Get current settings
- `PUT /settings` – Update settings. Request body: Settings object

### Other endpoints
- `GET /events` – SSE stream for job progress (scans, downloads, cache refreshes)
- `GET /file?path=<path>` – Serve files from the library directory (JSON files are parsed, others are streamed)
- `GET /health` – Health check endpoint
- `GET /api-config` – API configuration endpoint. Returns `{ apiUrl: string, port: number }` for frontend runtime configuration. The frontend uses this to auto-detect the correct API base URL.

**Responses:** Wrapped as `{ info, data }` objects for consistency.

## Production build

### Standalone Bundle (Recommended)

Create a single standalone binary that includes both the server and web UI:

```bash
npm run package:bundle
```

This will create binaries in `release/bundle/`:
- `jacare-win.exe` (Windows)
- `jacare-macos` (macOS)
- `jacare-linux` (Linux)

The bundle includes:
- Express server
- Web UI static assets
- All dependencies (including native modules)

No Node.js installation required—users can run the binary directly.

### Desktop App

Package the Electron app from `apps/desktop`:

```bash
npm run package:desktop
```

This bundles the server and web assets for a native desktop experience.

### Server Binary Only

Package just the server binary:

```bash
npm run package:server
```

### CI/CD

CI on `main` automatically publishes release archives with:
- Desktop app packages (Windows, macOS, Linux)
- Standalone bundle binaries
- Server-only binaries
- Latest changelog and README

## Troubleshooting

### Port and API URL Configuration Issues

**Problem**: Frontend shows CORS errors or can't connect to API, especially in Docker deployments.

**Solution**: The frontend uses runtime API URL detection. It will:
1. Check for `window.API_URL` (injected via script tag)
2. Fetch `/api-config` endpoint to auto-detect the API URL
3. Fall back to relative URLs for same-origin serving

**For Docker with custom port:**
- The `/api-config` endpoint automatically returns the correct API URL based on the request origin
- If frontend and backend are on different origins, inject `window.API_URL` in `index.html` via entrypoint script
- Never hardcode `localhost:3333` in frontend code

**Common issues:**
- **CORS errors**: Usually means frontend is trying to connect to wrong origin. Check that `/api-config` returns the correct URL.
- **Connection refused**: Frontend is using hardcoded `localhost:3333` instead of `getApiUrl()`. Always use `getApiUrl()` function.
- **Vite proxy not working**: Ensure `CROCDESK_PORT` environment variable is set when running `npm run dev:web`.

## Support
- Issues & roadmap: [GitHub Issues](https://github.com/luandev/jacare/issues)
- Crocdb service: [https://crocdb.net](https://crocdb.net) and [https://api.crocdb.net](https://api.crocdb.net)
- Tech stack docs: [Electron](https://www.electronjs.org/), [Express](https://expressjs.com/), [Vite](https://vitejs.dev/), [React](https://react.dev/)
