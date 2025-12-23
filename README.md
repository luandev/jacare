# 🐊 Jacare

[![CI](https://github.com/luandev/jacare/actions/workflows/ci.yml/badge.svg)](https://github.com/luandev/jacare/actions/workflows/ci.yml)
[![Release](https://github.com/luandev/jacare/actions/workflows/release.yml/badge.svg)](https://github.com/luandev/jacare/actions/workflows/release.yml)

**Jacare** (Portuguese for "caiman") is an open-source, web-based desktop ROM library manager that brings your retro game collection to life with an ultra-responsive UI, customizable themes, and intelligent download management—all in a portable, lightweight package that never loses your progress, even after closing and reopening the app.

**What makes Jacare special:**
- 🎮 **All-in-one solution** – Browse, search, download ROMs without switching between tools
- ⏸️ **Persistent download management** – Pause and resume downloads seamlessly, even after closing and reopening the application
- 🎨 **Customizable themes** – Personalize your experience with a variety of themes to suit your preferences
- ⚡ **Ultra-responsive web-based UI** – Enjoy a fast, smooth interface accessible through your browser or desktop app
- 📦 **Portable and lightweight** – Minimalistic design that doesn't compromise on functionality
- 🏠 **Your data, your control** – Everything stays on your machine; metadata is fetched from [Crocdb](https://crocdb.net) but cached locally for offline access
- 🔄 **Smart synchronization** – Automatic scanning, metadata enrichment, and library management keep your collection organized

![Demo](docs/demo.gif)

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
   npm run dev:shared  # Shared package watch mode
   npm run dev:server  # Express API + jobs
   npm run dev:web     # React UI with Vite
   npm run dev:desktop # Electron shell
   ```
4. **Build, type-check, lint, or test** when you are ready to ship 📦✅
   ```bash
   npm run build      # Build all workspaces
   npm run typecheck  # Type-check the monorepo
   npm run lint       # Lint all code
   npm run test:unit  # Run unit tests
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

Settings are stored in SQLite and include:
- `downloadDir` – Temporary directory for zip file downloads (deleted after extraction).
- `libraryDir` – Root directory where extracted game files are stored. All scanning and library operations work from this root.

Data is stored in SQLite tables for settings, Crocdb caches, library items, jobs, and job steps. Each scanned folder receives a `.crocdesk.json` manifest describing the game entry.

## Using Jacare 🎮
1. Launch the server (or the desktop app, which starts it for you).
2. Configure your `libraryDir` in Settings to point to your ROM collection.
3. Trigger a **Scan** job to discover new files. Progress streams through **Server-Sent Events (SSE)** from `GET /events`.
4. Use **Search** (POST `/crocdb/search`) to find metadata via Crocdb, then **Entry** (POST `/crocdb/entry`) to enrich your local manifest.
5. Launch games directly from the UI or open the manifest to integrate with other launchers.

## API quick reference 📡
- **Base URL:** `http://localhost:<CROCDESK_PORT>` (3333 by default) when running locally, or the packaged server inside Electron.
- **Endpoints:**
  - `POST /crocdb/search` – Query Crocdb for matches.
  - `POST /crocdb/entry` – Pull metadata and assets for a specific result.
  - `GET /crocdb/platforms` / `GET /crocdb/regions` / `GET /crocdb/info` – Reference data for the UI.
  - `GET /events` – SSE stream for job progress (scans, downloads, cache refreshes).
  - `GET /library/items` – List library items (optionally filtered by platform).
  - `GET /library/games` – List library games (optionally filtered by platform).
  - `POST /library/scan/local` – Trigger a local scan job.
  - `DELETE /library/item?dir=<path>` – Delete a library item and its directory.
  - `GET /jobs` – List all jobs.
  - `GET /jobs/:id` – Get job details and steps.
  - `POST /jobs/download` – Enqueue a download and install job.
  - `POST /jobs/:id/cancel` – Cancel a job.
  - `POST /jobs/:id/pause` – Pause a job.
  - `POST /jobs/:id/resume` – Resume a paused job.
  - `POST /jobs/pause-all` – Pause all jobs.
  - `POST /jobs/resume-all` – Resume all paused jobs.
  - `GET /settings` – Get current settings.
  - `PUT /settings` – Update settings.
  - `GET /file?path=<path>` – Serve files from the library directory.
  - `GET /health` – Health check endpoint.
- **Responses:** Wrapped as `{ info, data }` objects for consistency across the UI and API.

## Distribution & Deployment 📦

### Docker

Jacare is available as a Docker image and can be run with Docker Compose:

**Quick start with Docker Compose:**
```bash
# Clone the repository
git clone https://github.com/luandev/jacare.git
cd jacare

# Edit docker/docker-compose.yml to set your data and library paths
# Then start the service
docker compose -f docker/docker-compose.yml up -d
```

**Using the pre-built image:**
```bash
docker run -d \
  --name jacare \
  -p 3333:3333 \
  -v /path/to/your/data:/data \
  -v /path/to/your/library:/library \
  ghcr.io/luandev/jacare:latest
```

The web UI will be available at `http://localhost:3333`. The Docker image includes both the server API and the web UI, so no separate web server is needed.

**Building from source:**
```bash
# Build the Docker image locally
docker build -f apps/server/Dockerfile -t jacare:local .

# Run the built image
docker run -d --name jacare -p 3333:3333 \
  -v /path/to/data:/data \
  -v /path/to/library:/library \
  jacare:local
```

See [`docker/README.md`](docker/README.md) for more details and configuration options.

### Desktop Applications

Desktop bundles are produced from `apps/desktop` and ship with the server and web assets included. CI builds on the `main` branch automatically publish release archives to GitHub with the latest changelog and README so you can download ready-to-run packages.

### Server Binaries

Standalone server binaries are available for Windows, macOS, and Linux. These can be run headless and accessed via the web UI in a browser.

## Running in production 🏭
- Use `npm run build` to compile all workspaces, then start the server with the compiled artifacts.
- For Docker deployments, use the pre-built images from GitHub Container Registry or build from source.

## License 📜

Jacare is open-source software licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software in accordance with the license terms.

### Third-Party Attribution

This project utilizes metadata from [Crocdb](https://crocdb.net) (https://api.crocdb.net), a game metadata service. Crocdb-related code and packages are licensed under the ISC License. We acknowledge and thank the Crocdb project for providing this valuable service to the retro gaming community.

## Helpful links 🔗
- Jacare issues & roadmap: [GitHub Issues](https://github.com/luandev/jacare/issues)
- Crocdb service: [https://crocdb.net](https://crocdb.net) and API docs at [https://api.crocdb.net](https://api.crocdb.net)
- Electron: [https://www.electronjs.org/](https://www.electronjs.org/)
- Express: [https://expressjs.com/](https://expressjs.com/)
- React + Vite: [https://vitejs.dev/](https://vitejs.dev/) & [https://react.dev/](https://react.dev/)

If you build on Jacare or run into issues, please open a GitHub issue—we're excited to see what you ship! 🌟
