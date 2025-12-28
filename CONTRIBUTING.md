# Contributing to Jacare (CrocDesk)

Thank you for helping improve Jacare 🎉🐊
This guide outlines how to set up the project, follow coding standards, and submit changes.

## Project Overview

- Electron desktop app with embedded Express API and React UI
- Monorepo: apps/desktop, apps/server, apps/web, packages/shared
- Local-first ROM manager with Crocdb metadata, jobs via SSE

## Prerequisites

- Node.js 20+
- Git
- VS Code recommended

## Setup

````bash
npm ci
````

## Development

- Start everything:
````bash
npm run dev
````
- Individual workspaces:
````bash
npm run dev:shared
npm run dev:server
npm run dev:web
npm run dev:desktop
````

## Testing

- Unit:
````bash
npm run test:unit
````
- E2E (Playwright):
````bash
npm run test:e2e
````
Note: Use npm scripts so the pretest hook installs browsers (`pretest:e2e` runs `npx playwright install --with-deps`).

## Build & Packaging

````bash
npm run build
npm run package:bundle    # Standalone binaries (Windows/macOS/Linux)
npm run package:desktop   # Electron app
npm run package:server    # Server-only
````

## Code Standards

- TypeScript strict types; import shared types from `@crocdesk/shared`
- React: functional components, hooks, TanStack Query; small components
- Server: thin routes, services, validation, async/await; REST + SSE
- API responses:
````ts
{ info: { message?: string, ... }, data: T }
````
- Jobs for long operations; events via `GET /events`
- File ops: use `path.resolve/join`, check existence, clean temp files

Run before committing:
````bash
npm run lint && npm run typecheck
````

## Tests & Locations

- Place tests near code: `__tests__` or `*.test.ts(x)` / `*.spec.ts(x)`
- Web components use JSDOM
- Mock external services (Crocdb, fs)
- Test happy and error paths

## Branching, Commits, and PRs

- Branch naming: `feature/...`, `fix/...`, `docs/...`
- Conventional Commits (examples):
  - `feat(server): add scan_local job pause/resume`
  - `fix(web): handle SSE disconnect`
  - `docs: update setup instructions`
- Open PRs against `main`. Ensure CI passes:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:unit`
  - `npm run test:e2e`
- Update docs when changing APIs or behavior.

## Configuration

- Env vars:
  - `CROCDESK_PORT` (3333)
  - `CROCDESK_DATA_DIR` (`./data`)
  - `CROCDESK_ENABLE_DOWNLOADS` (`false`)
  - `CROCDB_BASE_URL` (`https://api.crocdb.net`)
  - `CROCDB_CACHE_TTL_MS` (`86400000`)
  - `CROCDESK_DEV_URL` (`http://localhost:5173`)
- Settings (SQLite): `downloadDir`, `libraryDir`, `queue.concurrency`

Profiles were removed: use a single `libraryDir`; manifests `.crocdesk.json` no longer include `profileId`.

## CI/CD

- CI runs typecheck, lint, build, unit, and e2e on PRs and `main`
- Use `npm run test:e2e` (not `npx`) so browsers install via pretest
- Releases are built from tags; see release.yml

## Issues & Feature Requests

- Bugs: steps to reproduce, expected/actual behavior, logs
- Features: problem statement, proposed UX/API, acceptance criteria
- Labels: `bug`, `enhancement`, docs, `ci`, etc.

## Documentation

- Developer docs: README.md
- User guide: README.md
- Keep docs updated with new endpoints, jobs, and settings.

## Licensing & Conduct

- See LICENSE for project license
- Follow a respectful, professional code of conduct

Questions? Open an issue on https://github.com/luandev/jacare/issues.
