# CrocDesk

CrocDesk is a desktop ROM library manager built as an Electron shell that serves a React UI over an Express API. The project ships server and desktop runtimes together with a web frontend so you can manage and launch ROMs through a single experience.

## Project structure
- `apps/server`: Express API, job orchestration, Crocdb client
- `apps/web`: React UI (Vite)
- `apps/desktop`: Electron main process
- `packages/shared`: Shared types, defaults, and manifest schema

## Development
- Install dependencies with `npm ci`
- Run `npm run dev` to start the shared build watcher, server, web, and desktop processes together
- Individual dev servers: `npm run dev:server`, `npm run dev:web`, `npm run dev:desktop`
- Build all workspaces with `npm run build`
- Type-check all workspaces with `npm run typecheck`

## Release automation
Merges to the `main` branch automatically build the server, web, and desktop bundles, archive the distributable outputs, and publish them as GitHub release assets alongside the current changelog and README.
