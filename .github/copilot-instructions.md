# Jacare (CrocDesk) - Copilot Instructions

## Project Overview

Jacare (Portuguese for "caiman") is an open-source, web-based desktop ROM library manager built as an Electron shell over an Express API and a React UI. The application helps users browse, search, and manage their retro game collection with persistent download management, customizable themes, and intelligent metadata enrichment.

**Key Features:**
- All-in-one solution for browsing and managing ROM collections
- Persistent download management with pause/resume capabilities
- Customizable themes and ultra-responsive web-based UI
- Local-first design with cloud metadata from Crocdb API
- Smart synchronization and automatic library management

## Architecture

The project follows a monorepo structure with three main applications and a shared package:

```
┌─────────────────────────────────────────────────┐
│           Electron Desktop App                  │
│         (apps/desktop)                          │
│  ┌───────────────────────────────────────────┐  │
│  │  Express API Server (apps/server)         │  │
│  │  - REST endpoints                         │  │
│  │  - SSE for real-time job updates          │  │
│  │  - Crocdb client & caching                │  │
│  │  - Job orchestration                      │  │
│  │  - SQLite data storage                    │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  React UI (apps/web)                      │  │
│  │  - Vite + React                           │  │
│  │  - TanStack Query for API state           │  │
│  │  - SSE client for job progress            │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
         ┌────────────────────┐
         │  Shared Types      │
         │  (packages/shared) │
         └────────────────────┘
```

**Design Principles:**
- Server can run standalone (headless mode) or embedded in Electron
- All long-running operations execute as background jobs
- Real-time updates via Server-Sent Events (SSE)
- Local-first with external metadata fetching and caching

## Repository Layout

- **`apps/server/`** - Express API, job orchestration, local scanning, Crocdb client
  - `src/` - TypeScript source code
  - `scripts/` - Utility scripts
  - Dockerfile for containerized deployment
- **`apps/web/`** - React UI built with Vite
  - `src/` - React components and application logic
  - Uses TanStack Query for API state management
- **`apps/desktop/`** - Electron main process
  - `src/` - Electron entry point and window management
  - `build/` - Build resources for packaging
- **`packages/shared/`** - Shared TypeScript types, defaults, and manifest schema
  - `src/` - Shared type definitions and utilities
- **`tests/`** - Root-level test setup and fixtures
- **`docs/`** - Developer and user documentation
- **`docker/`** - Docker Compose templates and configuration

## Development Workflow

### Prerequisites
- Node.js 20+ (includes npm)
- Git

### Installation
```bash
npm ci
```

### Development Commands

**Start everything in development mode:**
```bash
npm run dev  # Runs shared build watch + server + web + desktop concurrently
```

**Start individual workspaces:**
```bash
npm run dev:shared   # Shared package watch mode
npm run dev:server   # Express API + jobs
npm run dev:web      # React UI with Vite (default port: 5173)
npm run dev:desktop  # Electron shell
```

**Build, type-check, lint, and test:**
```bash
npm run build       # Build all workspaces
npm run typecheck   # Type-check the monorepo
npm run lint        # Lint all code with ESLint
npm run test:unit   # Run unit tests with Vitest
npm run test        # Alias for test:unit
```

**Packaging commands:**
```bash
npm run package:bundle   # Create standalone binaries (Windows, macOS, Linux)
npm run package:desktop  # Package Electron desktop app
npm run package:server   # Package server-only binary
```

### Testing Strategy

- **Unit tests:** Vitest with JSDOM for React components
- **Test location:** `apps/**/src/**/__tests__/**/*.{test,spec}.{ts,tsx}` or `apps/**/src/**/*.{test,spec}.{ts,tsx}`
- **Test environment:** Node.js by default, JSDOM for `apps/web/**`
- **Test setup:** `tests/vitest.setup.ts`
- **Coverage:** v8 provider with text and HTML reports

**When adding tests:**
- Place tests near the code they test (prefer `__tests__` directory or `.test.ts` suffix)
- Use Vitest's `describe`, `it`, `expect` API
- Mock external dependencies (Crocdb API, file system operations)
- Test both success and error cases

### Linting Rules

- ESLint with TypeScript parser
- React-specific rules for `apps/web/**`
- Unused variables allowed if prefixed with `_`
- `@typescript-eslint/no-explicit-any` disabled (use sparingly)
- React components don't require JSX scope import (React 17+ transform)
- Accessibility rules from `jsx-a11y` (some relaxed for UI convenience)

**When writing code:**
- Follow existing code style in the file you're editing
- Run `npm run lint` before committing
- ESLint autofix is available: `npm run lint -- --fix`

## External Services

### Crocdb API
- **Base URL:** `https://api.crocdb.net`
- **Endpoints:**
  - `POST /search` - Search for games with filters
  - `POST /entry` - Get detailed game metadata
  - `GET /platforms` - List available platforms
  - `GET /regions` - List available regions
  - `GET /info` - Service information
- **Response format:** `{ info: {...}, data: {...} }` wrapper
- **Caching:** Search and entry results cached in SQLite with configurable TTL

## Configuration & Environment Variables

### Environment Variables
- `CROCDESK_PORT` (default: `3333`) - Server port
- `CROCDESK_DATA_DIR` (default: `./data`) - SQLite database and cache directory
- `CROCDESK_ENABLE_DOWNLOADS` (default: `false`) - Enable download functionality
- `CROCDB_BASE_URL` (default: `https://api.crocdb.net`) - Crocdb API base URL
- `CROCDB_CACHE_TTL_MS` (default: `86400000` / 24 hours) - Cache TTL in milliseconds
- `CROCDESK_DEV_URL` (default: `http://localhost:5173`) - Dev server URL for Electron

### Application Settings (stored in SQLite)
- `downloadDir` - Temporary directory for zip downloads (deleted after extraction)
- `libraryDir` - Root directory where extracted game files are stored (all scanning works from here)
- `queue.concurrency` - Maximum concurrent jobs (optional)

**Important:** Profiles and per-platform roots have been removed. Use `downloadDir` for temporary downloads and `libraryDir` as the single root for all game files.

## Data Storage

### SQLite Tables
- `settings` - Application settings (downloadDir, libraryDir, queue config)
- `crocdb_cache_search` - Cached search results from Crocdb
- `crocdb_cache_entry` - Cached entry data from Crocdb
- `library_items` - Indexed ROM files with metadata
- `jobs` - Job records (scan_local, download_and_install, etc.)
- `job_steps` - Individual step progress for each job

### File System Conventions
- **Manifests:** Each scanned game folder gets a `.crocdesk.json` manifest file
  - Manifest schema is defined in `packages/shared`
  - Contains game metadata, artifact hashes, and creation timestamp
  - **No longer includes `profileId`** (profiles removed in favor of single libraryDir)
- **Data directory:** Defaults to `./data`, customizable via `CROCDESK_DATA_DIR`

## Runtime Conventions

### Job System
- All slow/long-running operations run as background jobs
- Job types: `scan_local`, `download_and_install`, etc.
- Jobs emit Server-Sent Events (SSE) at `GET /events`
- Event types: `JOB_CREATED`, `STEP_STARTED`, `STEP_PROGRESS`, `STEP_LOG`, `STEP_DONE`, `JOB_DONE`, `JOB_FAILED`, `JOB_CANCELLED`
- Jobs can be paused, resumed, and cancelled

### API Response Format
All API responses follow the pattern:
```typescript
{
  info: { message?: string, ... },
  data: T  // Actual response data
}
```

### Download Behavior
- Downloads are **disabled by default** for safety
- Enable with `CROCDESK_ENABLE_DOWNLOADS=true`
- Downloaded files go to `downloadDir` temporarily
- After extraction, files move to `libraryDir`
- Zip files are deleted after successful extraction

## Code Style & Best Practices

### TypeScript
- Use strict TypeScript types
- Avoid `any` unless absolutely necessary
- Prefer interfaces for object shapes
- Use type inference where possible
- Import shared types from `@crocdesk/shared`

### React (apps/web)
- Functional components with hooks
- Use TanStack Query for API state
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use proper TypeScript types for props

### Express API (apps/server)
- Keep route handlers thin, delegate to services
- Use middleware for common concerns (auth, logging, error handling)
- Validate request bodies and query parameters
- Handle errors gracefully with proper status codes
- Use async/await, avoid callback hell

### Error Handling
- Always handle promise rejections
- Log errors with context
- Return appropriate HTTP status codes
- Provide meaningful error messages to users
- Don't expose internal implementation details in errors

### File Operations
- Use `path.resolve()` and `path.join()` for cross-platform paths
- Check file existence before operations
- Clean up temporary files
- Handle file system errors gracefully

## Common Patterns

### Adding a New API Endpoint (apps/server)
1. Define route in appropriate router file (`src/routes/*.ts`)
2. Create service function in `src/services/`
3. Add TypeScript types in `packages/shared/src/types/`
4. Update API documentation in `docs/README.md`
5. Add tests for the endpoint

### Adding a New Job Type (apps/server)
1. Define job type in `packages/shared/src/types/jobs.ts`
2. Implement job handler in `apps/server/src/jobs/`
3. Emit SSE events at key steps
4. Store job and step records in SQLite
5. Handle pause/resume/cancel logic
6. Add tests for job execution

### Adding a New UI Feature (apps/web)
1. Create component in `src/components/`
2. Add TanStack Query hooks for API calls
3. Handle loading/error states
4. Subscribe to SSE for real-time updates if needed
5. Add proper TypeScript types
6. Test component functionality

## Distribution & Deployment

### Docker
- Pre-built images available at `ghcr.io/luandev/jacare:latest`
- Dockerfile located at `apps/server/Dockerfile`
- Docker Compose template in `docker/docker-compose.yml`
- Volumes: `/data` (database), `/library` (game files)
- Default port: 3333

### Standalone Bundle
- Single binary with embedded server and web UI
- Created with `npm run package:bundle`
- Outputs: `jacare-win.exe`, `jacare-macos`, `jacare-linux`
- No Node.js installation required

### Desktop App
- Electron-packaged application
- Created with `npm run package:desktop`
- Includes server and web assets
- Native desktop experience

### CI/CD
- CI workflow in `.github/workflows/ci.yml`
- Release workflow in `.github/workflows/release.yml`
- Docker build workflow in `.github/workflows/docker.yml`
- Builds triggered on `main` branch and releases

## Project-Specific Notes

### Historical Context
- Originally called "CrocDesk" (visible in code, configs, AGENTS.md)
- Rebranded to "Jacare" but some internal references remain
- Profile system was removed - now uses single `libraryDir` instead of per-platform roots

### Dependencies to Note
- **better-sqlite3** - Synchronous SQLite binding (avoid async wrappers)
- **TanStack Query** - React data fetching and caching
- **Vite** - Fast build tool and dev server for React
- **Electron** - Desktop app framework
- **Express** - Web server framework

### Crocdb Integration
- Metadata fetched from external service (not owned by this project)
- Caching is critical for offline functionality
- Respect rate limits and implement backoff
- All responses wrapped in `{ info, data }` format

## Getting Help

- **Issues & Roadmap:** [GitHub Issues](https://github.com/luandev/jacare/issues)
- **Developer Docs:** `docs/README.md`
- **User Guide:** `docs/user/README.md`
- **Crocdb Service:** [crocdb.net](https://crocdb.net) and [api.crocdb.net](https://api.crocdb.net)

## Quick Reference

**Start development:**
```bash
npm ci && npm run dev
```

**Run tests:**
```bash
npm run test:unit
```

**Lint and type-check:**
```bash
npm run lint && npm run typecheck
```

**Build for production:**
```bash
npm run build
npm run package:bundle  # or package:desktop
```

---

When working on this project, always:
- ✅ Run linting and type-checking before committing
- ✅ Add tests for new features and bug fixes
- ✅ Update documentation if changing APIs or behavior
- ✅ Follow existing code patterns and conventions
- ✅ Handle errors gracefully with proper logging
- ✅ Test both happy path and error scenarios
- ✅ Consider offline/cached behavior for Crocdb integration
- ✅ Use the job system for long-running operations
