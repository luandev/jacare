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

## API URL Configuration

The frontend automatically detects the API base URL at runtime using a multi-layered approach:

1. **window.API_URL** (highest priority): If injected via script tag in `index.html`, this takes precedence. Useful for Docker deployments where frontend and backend are on different origins.

2. **/api-config endpoint**: The frontend fetches this endpoint on first API call. If the returned URL matches the current origin, relative URLs are used. If different, the configured URL is used.

3. **Relative URLs** (default): For Electron and same-origin serving, empty string "" is used, which makes all API calls relative to the current origin.

### Why this matters

- **Electron**: Frontend and backend are served from the same origin, so relative URLs work perfectly.
- **Development**: Vite proxy forwards API requests to the backend (configurable via `CROCDESK_PORT`).
- **Docker/Production**: When frontend and backend are on different origins, inject `window.API_URL` or rely on `/api-config` endpoint.

### Common pitfalls to avoid

- **Never hardcode `localhost:3333`** in frontend code. Always use `getApiUrl()` from `apps/web/src/lib/api.ts`.
- **Don't use `VITE_API_URL`** for runtime configuration. Vite environment variables are only available at build time, not runtime.
- **Always await `getApiUrl()`** when constructing API URLs. It's an async function that may need to fetch configuration.

### Best practices

- Use `getApiUrl()` function for all API URL construction
- The `/api-config` endpoint automatically detects the correct API URL based on request origin
- For Docker deployments, you can inject `window.API_URL` via entrypoint script or template substitution