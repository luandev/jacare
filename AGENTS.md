# CrocDesk Agent Guide

## Purpose
CrocDesk is a desktop ROM library manager built as a unified Electron application with an embedded Express API and a React UI. The server runs embedded in the Electron main process, owns Crocdb caching and job orchestration, and the UI uses REST + SSE.

## Architecture
- **Unified Electron app**: Server embedded directly in Electron main process (no separate child process)
- **Development mode**: Server and web run separately with hot reload
- **Production mode**: Server embedded, web UI served as static files
- **Single executable**: One binary per platform (Windows, macOS, Linux)

## Repository layout
- apps/server: Express API, jobs, local scanning, Crocdb client (can run standalone or embedded)
- apps/web: React UI (Vite) - served as static files in production
- apps/desktop: Electron main process that embeds the server
- packages/shared: shared types, defaults, and manifest schema

## External services
- Crocdb API base: https://api.crocdb.net
- Endpoints: POST /search, POST /entry, GET /platforms, GET /regions, GET /info
- Responses use { info, data } wrapper

## Runtime conventions
- Slow work runs as jobs and emits SSE events at GET /events
- Default download behavior is disabled unless CROCDESK_ENABLE_DOWNLOADS=true
- Manifest file: .crocdesk.json written in the target game folder

## Data storage (MVP)
- SQLite tables: settings, crocdb_cache_search, crocdb_cache_entry, library_items, jobs, job_steps
- Default data dir: ./data (override with CROCDESK_DATA_DIR)

Profiles and per-platform roots have been removed in favor of separate `downloadDir` and `libraryDir` configured in settings. `downloadDir` is used for temporary zip file downloads (deleted after extraction), while `libraryDir` is the root where extracted game files are stored. All scanning and library operations work from `libraryDir`, and manifests no longer record a `profileId`.

## Dev commands
- npm run dev (shared build watch + server + web + desktop - separate processes)
- npm run dev:desktop:embedded (build all + run with embedded server - production-like)
- npm run dev:server
- npm run dev:web
- npm run dev:desktop
- npm run build
- npm run package:desktop (build and package Electron app)
- npm run typecheck

## Environment variables
- CROCDESK_PORT (default 3333)
- CROCDESK_DATA_DIR (default ./data)
- CROCDESK_ENABLE_DOWNLOADS (default false)
- CROCDB_BASE_URL (default https://api.crocdb.net)
- CROCDB_CACHE_TTL_MS (default 86400000)
- VITE_API_URL (default http://localhost:3333)
- CROCDESK_DEV_URL (Electron dev URL, default http://localhost:5173)
