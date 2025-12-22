# 🐊 Jacare

[![CI](https://github.com/your-org/crocdesk/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/crocdesk/actions/workflows/ci.yml)
[![Release](https://github.com/your-org/crocdesk/actions/workflows/release.yml/badge.svg)](https://github.com/your-org/crocdesk/actions/workflows/release.yml)

Jacare (Portuguese for "caiman") is a Brazilian-flavored, croc-tough desktop ROM library manager. It combines an Electron shell, an Express API, and a Vite-powered React UI so you can organize, scrape, and launch games from a single experience—wrapping the hosted [Crocdb](https://crocdb.net) service for search and metadata while running local jobs to keep your library synchronized. 🇧🇷

<video controls src="https://github.com/luandev/jacare/raw/main/docs/demo.mp4"></video>


> Want details? Pick your path:
> - 📚 **Developer guide:** Head to [`docs/README.md`](docs/README.md) for the full technical rundown.
> - 😀 **Friendly guide:** Open [`docs/user/README.md`](docs/user/README.md) for a non-technical walkthrough.

## Why Jacare? 🪗🌴
- **One app for everything:** Browse, enrich, and launch ROMs without juggling separate tools.
- **Local-first with cloud search:** Metadata is pulled from [Crocdb](https://api.crocdb.net) while your collection, cache, and settings remain on disk.
- **Built for speed:** Background jobs, SSE updates, and caching cut down on repetitive scraping.
- **Works online or offline:** Cached search and entry data keep your library usable even when you lose connectivity.
- **Amazonian attitude:** The Jacare name nods to caimans—lean, mean, and ready to snap up your metadata.

## Project layout 🗂️
- `apps/server` – Express API, job orchestration, local scanning, and Crocdb client.
- `apps/web` – React UI (Vite) served by the server or opened directly in dev.
- `apps/desktop` – Electron main process wrapping the server and web UI for a native experience.
- `packages/shared` – Shared types, defaults, and the manifest schema used across workspaces.

See [`docker/README.md`](docker/README.md) for a Docker Compose template with platform-specific mount examples.

## Getting started 🚀
1. **Install dependencies** 📦
   ```bash
   npm ci
   ```
2. **Run everything in development** (shared build watcher + server + web + desktop) 🔥
   ```bash
   npm run dev
   ```
3. **Start an individual workspace** if you want to isolate debugging 🛠️
   ```bash
   npm run dev:server   # Express API + jobs
   npm run dev:web      # React UI with Vite
   npm run dev:desktop  # Electron shell
   ```
4. **Build or type-check all workspaces** when you are ready to ship 📦✅
   ```bash
   npm run build
   npm run typecheck
   ```

> Tip: The desktop app expects the web dev server at `http://localhost:5173` by default. Override with `CROCDESK_DEV_URL` if you change the Vite port.


## Configuration & data ⚙️
- **Default port:** `CROCDESK_PORT=3333`.
- **Data directory:** `CROCDESK_DATA_DIR=./data` holds SQLite databases, cache tables, and manifest files. Customize it to point Jacare at a shared drive or fast SSD.
- **Downloads:** Disabled by default; enable with `CROCDESK_ENABLE_DOWNLOADS=true` to fetch assets or binaries.
- **Crocdb base URL:** `CROCDB_BASE_URL=https://api.crocdb.net`.
- **Cache TTL:** `CROCDB_CACHE_TTL_MS=86400000` (24 hours) for search and entry cache tables.
- **Web client base URL:** `VITE_API_URL` (defaults to `http://localhost:3333`).
- **Electron dev URL:** `CROCDESK_DEV_URL` (defaults to `http://localhost:5173`).

Data is stored in SQLite tables for settings, Crocdb caches, library items, jobs, and job steps. Each scanned folder receives a `.crocdesk.json` manifest describing the game entry.

## Using Jacare 🎮
1. Launch the server (or the desktop app, which starts it for you).
2. Add a folder containing ROMs; Jacare writes `.crocdesk.json` manifests to each folder.
3. Trigger a **Scan** job to discover new files. Progress streams through **Server-Sent Events (SSE)** from `GET /events`.
4. Use **Search** (POST `/search`) to find metadata via Crocdb, then **Entry** (POST `/entry`) to enrich your local manifest.
5. Launch games directly from the UI or open the manifest to integrate with other launchers.

## API quick reference 📡
- **Base URL:** `http://localhost:<CROCDESK_PORT>` (3333 by default) when running locally, or the packaged server inside Electron.
- **Endpoints:**
  - `POST /search` – Query Crocdb for matches.
  - `POST /entry` – Pull metadata and assets for a specific result.
  - `GET /platforms` / `GET /regions` / `GET /info` – Reference data for the UI.
  - `GET /events` – SSE stream for job progress (scans, downloads, cache refreshes).
- **Responses:** Wrapped as `{ info, data }` objects for consistency across the UI and API.

## Running in production 🏭
- Use `npm run build` to compile all workspaces, then start the server with the compiled artifacts.
- Desktop bundles are produced from `apps/desktop` and ship with the server and web assets included.
- CI builds on the `main` branch automatically publish release archives to GitHub with the latest changelog and README so you can download ready-to-run packages.

## Helpful links 🔗
- Jacare issues & roadmap: [GitHub Issues](https://github.com/your-org/crocdesk/issues)
- Crocdb service: [https://crocdb.net](https://crocdb.net) and API docs at [https://api.crocdb.net](https://api.crocdb.net)
- Electron: [https://www.electronjs.org/](https://www.electronjs.org/)
- Express: [https://expressjs.com/](https://expressjs.com/)
- React + Vite: [https://vitejs.dev/](https://vitejs.dev/) & [https://react.dev/](https://react.dev/)

If you build on Jacare or run into issues, please open a GitHub issue—we're excited to see what you ship! 🌟
