# 🐊 Jacare

[![CI](https://github.com/luandev/jacare/actions/workflows/ci.yml/badge.svg)](https://github.com/luandev/jacare/actions/workflows/ci.yml)
[![Release](https://github.com/luandev/jacare/actions/workflows/release.yml/badge.svg)](https://github.com/luandev/jacare/actions/workflows/release.yml)

**Jacare** (Portuguese for "caiman") is an open-source, web-based desktop ROM library manager that brings your retro game collection to life with an ultra-responsive UI, customizable themes, and intelligent download management—all in a portable, lightweight package that never loses your progress, even after closing and reopening the app.

![Demo](docs/demo.gif)

**What makes Jacare special:**
- 🎮 **All-in-one solution** – Browse, search, download ROMs without switching between tools
- ⏸️ **Persistent download management** – Pause and resume downloads seamlessly, even after closing and reopening the application
- 🎨 **Customizable themes** – Personalize your experience with a variety of themes to suit your preferences
- ⚡ **Ultra-responsive web-based UI** – Enjoy a fast, smooth interface accessible through your browser or desktop app
- 📦 **Portable and lightweight** – Minimalistic design that doesn't compromise on functionality
- 🏠 **Your data, your control** – Everything stays on your machine; metadata is fetched from [Crocdb](https://crocdb.net) but cached locally for offline access
- 🔄 **Smart synchronization** – Automatic scanning, metadata enrichment, and library management keep your collection organized

> Want details?
> - 📚 **Developer guide:** Head to [`docs/README.md`](docs/README.md) for the full technical rundown.
> - 😀 **Friendly guide:** Open [`docs/user/README.md`](docs/user/README.md) for a non-technical walkthrough.

## Why Jacare? 🐊
- **One app for everything:** Browse, enrich, and launch ROMs without juggling separate tools.
- **Local-first with cloud search:** Metadata is pulled from [Crocdb](https://api.crocdb.net) while your collection, cache, and settings remain on disk.
- **Built for speed:** Background jobs, SSE updates, and caching cut down on repetitive scraping.
- **Works online or offline:** Cached search and entry data keep your library usable even when you lose connectivity.
- **Amazonian attitude:** The Jacare name nods to caimans—lean, mean, and ready to snap up your metadata.


## Getting started 🚀

### Option: Run with Docker 


If you’re familiar with [Docker](https://docs.docker.com/get-started/docker-overview/), here's a one-liner to run and test Jacare:
```
docker run --rm -p 3333:3333 -v jacare-data:/data -v jacare-library:/library -e CROCDESK_ENABLE_DOWNLOADS=false ghcr.io/luandev/jacare:latest
```
- What it does:
  -  `--rm` - Automatically removes the container when it stops
  - `-p 3333:3333` - Exposes port 3333 for the web UI
  - `-v jacare-data:/data` - Creates a named volume for data (persists between runs)
  - `-v jacare-library:/library` - Creates a named volume for library (persists between runs)
  - `-e CROCDESK_ENABLE_DOWNLOADS=false` - Disables downloads (default)
 Uses the pre-built image from GitHub Container Registry

- Access the app:
Open http://localhost:3333 in your browser.
- To stop:
Press Ctrl+C or run docker stop <container-id>.
- Check **[`docker/README.md`](docker/README.md)** for a Docker Compose template, including platform-specific volume/mount examples.

### Option: Run locally (Node.js)

If you’d rather run it locally, make sure you have **[Node.js](https://nodejs.org/en)** (includes npm) installed, then:
 
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
   npm run dev:desktop:packed # Electron with server running in-process (production mode)
   ```
4. **Build, type-check, lint, or test** when you are ready to ship 📦✅
   ```bash
   npm run build      # Build all workspaces
   npm run typecheck  # Type-check the monorepo
   npm run lint       # Lint all code
   npm run test:unit  # Run unit tests
   npm run test:e2e   # Run end-to-end tests (requires Playwright browsers)
   ```

> **Tip:** 
> - The desktop app expects the web dev server at `http://localhost:5173` by default. Override with `CROCDESK_DEV_URL` if you change the Vite port.
> - Use `npm run dev:desktop:packed` to test the Electron app with the server running in-process (production mode) instead of connecting to a separate server.

## Project layout 🗂️
- `apps/server` – Express API, job orchestration, local scanning, and Crocdb client.
- `apps/web` – React UI (Vite) served by the server or opened directly in dev.
- `apps/desktop` – Electron main process wrapping the server and web UI for a native experience.
- `packages/shared` – Shared types, defaults, and the manifest schema used across workspaces.

## Configuration & data ⚙️
- **Default port:** `CROCDESK_PORT=3333`.
- **Data directory:** `CROCDESK_DATA_DIR=./data` holds SQLite databases, cache tables, and manifest files. Customize it to point Jacare at a shared drive or fast SSD.
- **Downloads:** Disabled by default; enable with `CROCDESK_ENABLE_DOWNLOADS=true` to fetch assets or binaries.
- **Crocdb base URL:** `CROCDB_BASE_URL=https://api.crocdb.net`.
- **Cache TTL:** `CROCDB_CACHE_TTL_MS=86400000` (24 hours) for search and entry cache tables.
- **Electron dev URL:** `CROCDESK_DEV_URL` (defaults to `http://localhost:5173`).

Settings are stored in SQLite and include:
- `downloadDir` – Temporary directory for zip file downloads (deleted after extraction).
- `libraryDir` – Root directory where extracted game files are stored. All scanning and library operations work from this root.

Data is stored in SQLite tables for settings, Crocdb caches, library items, jobs, and job steps. Each scanned folder receives a `.crocdesk.json` manifest describing the game entry.

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

### Standalone Bundle (Recommended)

A single standalone binary is available that includes both the server and web UI. This is the easiest way to run Jacare—no Node.js installation required!

**Download from releases:**
- Windows: `jacare-win.exe`
- macOS: `jacare-macos`
- Linux: `jacare-linux`

Simply download the binary for your platform, make it executable (Linux/macOS), and run it. The server will start automatically and the web UI will be available at `http://localhost:3333`.

**Building from source:**
```bash
npm run package:bundle
```

The binaries will be created in `release/bundle/`.

### Server Binaries

Standalone server binaries are available for Windows, macOS, and Linux. These can be run headless and accessed via the web UI in a browser.

## Running in production 🏭

### Standalone Bundle (Easiest)

Download the standalone binary from the [releases page](https://github.com/luandev/jacare/releases) and run it directly. No Node.js or installation required!

```bash
# Windows
jacare-win.exe

# macOS/Linux
chmod +x jacare-macos  # or jacare-linux
./jacare-macos
```

The server starts automatically and the web UI is available at `http://localhost:3333`.

### Docker

For Docker deployments, use the pre-built images from GitHub Container Registry or build from source. See the [Docker section](#docker) above.

### Desktop App

Desktop bundles are produced from `apps/desktop` and ship with the server and web assets included. Download from the [releases page](https://github.com/luandev/jacare/releases).

### From Source

Use `npm run build` to compile all workspaces, then start the server with the compiled artifacts.

### CI/CD

CI builds on the `main` branch automatically publish release archives to GitHub with:
- Standalone bundle binaries (Windows, macOS, Linux)
- Desktop app packages
- Server-only binaries
- Latest changelog and README

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
