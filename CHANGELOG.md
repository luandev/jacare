# Changelog

## [0.2.0] - 2024-12-23

### 🎉 First Post-MVP Release: Unified Electron Architecture

This release consolidates the three-application architecture into a single, unified Electron application with an embedded server.

#### Added
- **Unified Electron application**: Server now runs embedded in the Electron main process instead of as a separate child process
- **Single executable distribution**: Native binaries for Windows, macOS, and Linux - no separate server process required
- **Embedded server mode**: Express server runs directly in Electron main process for simplified distribution
- **Development mode testing**: New `npm run dev:desktop:embedded` script to test production-like behavior during development
- **TypeScript declarations**: Server package now exports proper TypeScript definitions for desktop integration
- **Improved path resolution**: Web UI static files are properly resolved in both development and packaged Electron apps

#### Changed
- **Architecture**: Desktop app now imports and runs server directly instead of spawning a child process
- **Server entry point**: Exports `createServer()` function for controlled initialization instead of auto-starting
- **Build configuration**: Electron builder configured for native module bundling (better-sqlite3)
- **Development workflow**: Standard dev mode still uses separate processes for hot reload; embedded mode available for testing

#### Removed
- **Standalone server packaging**: Removed `pkg` packaging script (server now bundled with desktop app)
- **Server extraResources**: Server code now bundled directly instead of as separate resources

#### Technical Details
- Server exports `ServerHandle` interface with `stop()` method for graceful shutdown
- Native modules (better-sqlite3) unpacked from ASAR for proper loading
- Web dist files served from `process.resourcesPath` in packaged apps
- Development mode detection via `CROCDESK_DEV_URL` or `NODE_ENV=development`

#### Migration Notes
- Existing Docker setup remains available for users who prefer containerized deployment
- Data directories and settings remain compatible
- No breaking changes to API or data structures

---

## [0.1.0] - MVP Release
- Automated releases on merges to `main` publish built artifacts and documentation assets.
- Documented repository structure and development commands.
