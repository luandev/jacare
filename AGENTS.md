# CrocDesk Agent Guide

## Purpose
CrocDesk is a desktop ROM library manager built as an Electron shell over an Express API and a React UI. The server owns Crocdb caching and job orchestration, and the UI uses REST + SSE.

## Repository layout
- apps/server: Express API, jobs, local scanning, Crocdb client
- apps/web: React UI (Vite)
- apps/desktop: Electron main process
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
- npm run dev (shared build watch + server + web + desktop)
- npm run dev:server
- npm run dev:web
- npm run dev:desktop
- npm run build
- npm run typecheck

## Environment variables
- CROCDESK_PORT (default 3333)
- CROCDESK_DATA_DIR (default ./data)
- CROCDESK_ENABLE_DOWNLOADS (default false)
- CROCDB_BASE_URL (default https://api.crocdb.net)
- CROCDB_CACHE_TTL_MS (default 86400000)
- CROCDESK_DEV_URL (Electron dev URL, default http://localhost:5173)
