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

### Option 1: Native Desktop Application (Recommended)

Jacare is now distributed as a **single, unified Electron application** with the server embedded directly in the main process. This provides:

- **Single executable** per platform (Windows, macOS, Linux)
- **No separate server process** to manage
- **Simplified distribution** - just download and run
- **Native binaries** for all desktop platforms

**Download pre-built binaries:**
- Check the [Releases](https://github.com/luandev/jacare/releases) page for the latest builds
- Available formats: Windows (NSIS installer, portable), macOS (DMG, ZIP), Linux (AppImage, DEB, RPM)

**Build from source:**
```bash
npm ci
npm run package:desktop
```
The built application will be in `release/desktop/` for your platform.

### Option 2: Run with Docker 

If you prefer Docker, check **[`docker/README.md`](docker/README.md)** for a Docker Compose template, including platform-specific volume/mount examples.

### Option 3: Development Mode (Node.js)

For development, make sure you have **[Node.js](https://nodejs.org/en)** (includes npm) installed, then:
 
1. **Install dependencies** 📦
   ```bash
   npm ci
   ```
2. **Run everything in development** (shared build watcher + server + web + desktop) 🔥
   ```bash
   npm run dev
   ```
   This runs all components separately with hot reload enabled.

3. **Test embedded server mode** (production-like) 🧪
   ```bash
   npm run dev:desktop:embedded
   ```
   This builds everything, rebuilds native modules for Electron, and runs the desktop app with the embedded server (no hot reload).
   
   **Note:** The first time you run this, or after updating Electron or `better-sqlite3`, you may need to rebuild native modules:
   ```bash
   npm run rebuild -w @crocdesk/desktop
   ```

4. **Start an individual workspace** if you want to isolate debugging 🛠️
   ```bash
   npm run dev:shared  # Shared package watch mode
   npm run dev:server  # Express API + jobs
   npm run dev:web     # React UI with Vite
   npm run dev:desktop # Electron shell (connects to dev server)
   ```

5. **Build, type-check, lint, or test** when you are ready to ship 📦✅
   ```bash
   npm run build      # Build all workspaces
   npm run typecheck  # Type-check the monorepo
   npm run lint       # Lint all code
   npm run test:unit  # Run unit tests
   ```

> **Development Tips:**
> - Standard dev mode (`npm run dev`) runs server and web separately for hot reload
> - Embedded mode (`npm run dev:desktop:embedded`) tests the production architecture
> - The desktop app expects the web dev server at `http://localhost:5173` by default. Override with `CROCDESK_DEV_URL` if you change the Vite port.

## Project layout 🗂️
- `apps/server` – Express API, job orchestration, local scanning, and Crocdb client. Can run standalone or be embedded in Electron.
- `apps/web` – React UI (Vite) served as static files in production or via dev server in development.
- `apps/desktop` – Electron main process that embeds the server and serves the web UI for a native desktop experience.
- `packages/shared` – Shared types, defaults, and the manifest schema used across workspaces.

## Architecture 🏗️

Jacare uses a **unified Electron architecture** where:

- **Development mode**: Server and web run as separate processes with hot reload
- **Production mode**: Server is embedded directly in the Electron main process, web UI is served as static files
- **Single executable**: Everything is bundled into one application per platform
- **Native modules**: SQLite (`better-sqlite3`) is properly bundled for cross-platform support

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

## Distribution & Deployment 📦

### Native Desktop Applications (Primary Distribution)

**Pre-built binaries:**
- Download from [GitHub Releases](https://github.com/luandev/jacare/releases)
- Available for Windows (NSIS installer, portable), macOS (DMG, ZIP), Linux (AppImage, DEB, RPM)
- Single executable per platform - no installation of Node.js or dependencies required
- Server is embedded in the Electron main process
- Web UI is bundled as static files

**Build from source:**
```bash
npm ci
npm run package:desktop
```
Outputs will be in `release/desktop/` for your platform.

**Platform-specific builds:**
```bash
npm run package:desktop  # Builds for current platform
# Or use workspace commands:
npm run package:win -w @crocdesk/desktop    # Windows only
npm run package:mac -w @crocdesk/desktop   # macOS only
npm run package:linux -w @crocdesk/desktop  # Linux only
```

### Docker (Alternative Distribution)

Jacare is also available as a Docker image for users who prefer containerized deployments:

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

The web UI will be available at `http://localhost:3333`. See [`docker/README.md`](docker/README.md) for more details.

## Running in production 🏭

**Desktop application:**
- Download the pre-built binary for your platform from [Releases](https://github.com/luandev/jacare/releases)
- Or build from source using `npm run package:desktop`
- Run the executable - no additional setup required

**Docker:**
- Use pre-built images from GitHub Container Registry
- Or build from source: `docker build -f apps/server/Dockerfile -t jacare:local .`

**CI/CD:**
- Automated builds on the `main` branch publish release archives to GitHub
- Includes latest changelog and README
- Desktop binaries are built for Windows, macOS, and Linux

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
