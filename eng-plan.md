
# CrocDesk Engineering Plan (Crocdb ROM Library Manager)

## 0) Vision
A cross-platform, open-source ROM library manager that:
- Browses Crocdb metadata
- Detects what you already own locally and on handhelds
- Downloads + processes ROMs into clean layouts
- Deduplicates by content hash
- Applies user-configurable Profiles (format + paths + naming)
- Transfers to targets via Local / SMB / FTP
- Manages remote libraries safely (trash/restore/purge) even with flaky Wi-Fi
- Keeps UI responsive at all times with live job progress

> Legal note: user supplies their own legally obtained ROMs; CrocDesk manages files and metadata.

---

## 1) Distribution & Platforms
### 1.1 Primary distribution
- **Electron desktop app** (Windows / macOS / Linux)

### 1.2 Headless mode (same backend)
- Backend can run without Electron window:
  - serves UI at `http://localhost:<port>`
  - Android/iOS can access via browser on the LAN
- Optional Docker distribution for NAS/RPi users

### 1.3 Design principle
- Treat Electron as a wrapper around a “real server” that can run standalone.

---

## 2) Tech Stack (JS/TS-first for vibecoding)
### 2.1 UI
- React + TypeScript (Vite)
- State: TanStack Query for API, lightweight store (Zustand) for UI state
- Realtime: Server-Sent Events (SSE)

### 2.2 Backend (Orchestrator API)
- Node.js + TypeScript (Fastify or Express)
- Serves REST API + SSE stream
- Owns settings, profiles, caching, and job orchestration

### 2.3 Jobs / Workers
- v1 (simpler): in-process queue (p-queue) + worker threads
- v1.5+: BullMQ + Redis for robustness (retries, persistence, concurrency)
- All “slow” work happens off the request thread

### 2.4 Storage
- SQLite (better-sqlite3) + migrations (drizzle/kysely)
- Filesystem for ROM assets
- Optional content store folder for dedup

### 2.5 Tooling / libs
- Hash: blake3 (fast)
- Download: aria2c (spawn) or got + range support (later)
- Unpack: 7zip (spawn) + unzip fallback
- Convert: chdman (PS1/PS2), etc. (spawned tools)
- SMB: smbclient (spawn)
- FTP: basic-ftp (library)

---

## 3) Core Domain Model
### 3.1 Entities
- **Game**: Crocdb metadata record (cached)
- **LibraryItem**: local/remote discovered files mapped to a Game (or unknown)
- **Profile**: rules for layout/format/naming + target transfer behavior
- **Target**: destination type (local/smb/ftp) with connection details
- **Job**: a pipeline execution (download/process/transfer/remote delete)
- **OpRecord**: idempotent record for remote mutations (delete/move/etc.)

### 3.2 Concepts
- **Owned**: a game is owned if a matching artifact exists locally or remotely
- **FileSet**: grouped artifacts that belong together (cue+bin, iso, chd)
- **Manifest**: `.crocdesk.json` placed per game folder for robust identification

---

## 4) Settings & Configuration (UI-managed)
### 4.1 Settings Views
Tabs:
- Profiles
- Platforms (mapping + format rules)
- Library roots (local scan paths)
- Targets (Local / SMB / FTP) with “Test connection”
- Queue limits (concurrency, retries, bandwidth)
- Dedup policy (skip / hardlink / keep both)
- Tools paths (aria2c, 7z, chdman) + auto-detect

### 4.2 Storage formats
- `settings.json` (non-secret)
- `secrets.json` (encrypted via OS keychain when available)
- `profiles.json` export/import
- JSON schema definitions for all configs (agent-friendly)

---

## 5) Crocdb Integration
### 5.1 Crocdb client
- Search: `GET /api/search` with filters (platform/regions as JSON-array strings)
- Cache search results and game details in SQLite
- Rate limit and backoff to avoid hammering public API

### 5.2 Local cache strategy
- Cache by `(queryHash, updatedAt)`
- Stale-while-revalidate: UI gets instant cached results, backend refreshes in background

---

## 6) Profiles
A Profile defines:
- Platform → root folder
- Preferred output format per platform
- Naming template
- Transfer target
- Post-actions

Example:
```json
{
  "id": "retroarch",
  "name": "RetroArch",
  "platforms": {
    "PS1": {
      "root": "/roms/PS1",
      "format": "chd",
      "naming": "{Title} ({Region})"
    }
  },
  "transferTargetId": "rg40xx_smb",
  "postActions": {
    "writeManifest": true,
    "writePlaylists": false
  }
}
````

---

## 7) Library Scanning (Local + Remote)

### 7.1 Local scanner

* Roots configured in Settings
* Two-phase scan:

  1. fast index: path + size + mtime
  2. deep hash: compute blake3 in background (on-demand or “hash on idle”)
* Detect platform by folder mapping + file extensions
* Group into FileSets
* Map to games using:

  1. hash match (best)
  2. manifest match (if present)
  3. normalized filename fuzzy match (fallback)

### 7.2 Remote scanner (SMB/FTP)

* Lists directories for configured platform roots
* Reads `.crocdesk.json` when present for reliable mapping
* Builds remote LibraryItems with “present/unknown/in trash” states
* Uses cheap `stat` checks to validate existence and size
* Resilient to disconnect: scanning is restartable and incremental

---

## 8) Dedup Engine

### 8.1 Hashing

* Compute blake3 for final artifacts (post-convert/post-unpack)
* Store `hash -> canonicalArtifactId`

### 8.2 Policies

* **skip**: if same hash exists, do not add another copy
* **hardlink**: if same filesystem and supported
* **keep both**: allow duplicates (still recorded)

### 8.3 Optional content store

* `content_store/<hash>` holds canonical blob
* Profiles “materialize” copies/links into their platform roots

---

## 9) Pipelines & Jobs (Non-blocking by design)

### 9.1 Job types

* `download_and_install`
* `scan_local`
* `scan_remote`
* `transfer_only`
* `remote_trash`
* `remote_restore`
* `remote_purge`
* `empty_trash`
* `rehash_items`

### 9.2 Event model (SSE)

All jobs emit:

* `JOB_CREATED`
* `STEP_STARTED`
* `STEP_PROGRESS`
* `STEP_LOG`
* `STEP_DONE`
* `JOB_DONE`
* `JOB_FAILED`
* `JOB_CANCELLED`

Payload:

```json
{
  "jobId": "job_123",
  "type": "download_and_install",
  "step": "transfer",
  "progress": 0.61,
  "message": "Uploading via SMB",
  "ts": 1734690000
}
```

### 9.3 Pipeline: download_and_install (with Manifest)

Steps:

1. **resolve_sources**
2. **download** (aria2c, resumable)
3. **verify** (size/hash if available)
4. **unpack** (if archive)
5. **convert** (platform rules)
6. **dedup_check**
7. **finalize_layout** (naming, folder structure)
8. **write_manifest** ✅ *(new robustness step)*
9. **transfer** (local/smb/ftp)
10. **post_verify_remote** (exists + size + manifest present)
11. **rescan** (local + optionally remote) to refresh Owned status

---

## 10) Manifest: `.crocdesk.json` (Robust Identification)

### 10.1 Purpose

* Make remote scans accurate even if filenames are messy or renamed by the OS/emulator
* Enable safe deletes/restore by storing canonical identifiers

### 10.2 Placement

* Stored inside each game folder:

  * `/roms/PS1/{Game Folder}/.crocdesk.json`

### 10.3 Minimal schema

```json
{
  "schema": 1,
  "crocdb": {
    "gameId": 12345,
    "title": "Example",
    "platform": "PS1",
    "region": "EU"
  },
  "artifacts": [
    {
      "path": "Example (EU).chd",
      "hash": "b3:....",
      "size": 123456789
    }
  ],
  "profileId": "retroarch",
  "createdAt": "2025-12-20T00:00:00Z"
}
```

### 10.4 When written

* After `finalize_layout`, before transfer (so local has it)
* After transfer, verify it exists remotely (or write again remotely if needed)

---

## 11) Transfer Manager (Local / SMB / FTP)

### 11.1 Interface

* `list(remotePath)`
* `stat(remotePath)`
* `mkdirp(remotePath)`
* `put(localPath, remotePath)`
* `rename(remoteFrom, remoteTo)`
* `delete(remotePath)` *(used only by purge)*
* `get(remotePath)` *(optional, for manifest reads; SMB may read via list/cat)*

### 11.2 SMB target (RG40xx)

* Configurable host/share/auth
* Uses spawned `smbclient` for reliability

### 11.3 FTP target

* Uses library client with reconnect
* Renames preferred over delete

### 11.4 Serialization

* Per target: allow parallel reads, but **serialize writes** (upload/move/delete) to avoid corruption.

---

## 12) Remote Library Management (Safe Delete for Flaky Connections)

### 12.1 Goals

* Let user delete ROMs already present on device
* Be resilient to disconnections, lag, partial operations
* Provide restore capability

### 12.2 Safe delete = two-phase

**Default action: Move to Trash**

1. Stage to trash:

   * Move (rename) into:

     * `/.crocdesk-trash/<timestamp>/<platform>/<game>/...`
2. Purge:

   * Permanently delete trash items (manual or scheduled)

### 12.3 Idempotency via OpRecord

Every remote mutation has:

* `operationId`
* `targetId`
* `fromPath`
* `toTrashPath`
* `state`: planned | moving | moved | purging | done | failed
* `lastCheck`: exists/size/mtime

On retry/reconnect:

* If original exists → continue move
* If original missing but trash exists → mark moved
* If neither exists → mark unknown + rescan

### 12.4 Restore

* Reverse rename from trash back to original computed folder
* Re-verify + rescan

### 12.5 UI behavior

* “Delete” becomes **Move to Trash**
* “Trash” view:

  * restore / purge item
  * empty trash
* If connection drops:

  * job shows “will retry”
  * item state resolves on next scan

---

## 13) UI Screens

### 13.1 Browse

* Search + filters (platform, region, owned)
* Game cards show: Owned / Partial / Missing
* Quick actions: Download with Profile

### 13.2 Game detail

* Metadata, sources, profile selector, target selector override
* Shows where it will land (preview path)

### 13.3 Queue

* Active jobs, per-step progress, pause/cancel
* Per target concurrency display

### 13.4 Device Library (per target)

* Remote scan view
* Present / In Trash / Unknown
* Move to Trash / Restore / Purge

### 13.5 Settings

* All configuration with test buttons and export/import

---

## 14) Backend API (UI-facing)

### 14.1 Library

* `GET /library/games?query&platform&owned&targetId`
* `GET /library/game/:gameId`
* `POST /library/scan/local`
* `POST /library/scan/remote` body `{ targetId }`

### 14.2 Jobs

* `POST /jobs/download` body `{ gameId, profileId, options }`
* `GET /jobs`
* `GET /jobs/:id`
* `POST /jobs/:id/cancel`

### 14.3 Remote management

* `POST /remote/trash` body `{ targetId, paths[] }`
* `POST /remote/restore` body `{ targetId, trashPaths[] }`
* `POST /remote/purge` body `{ targetId, trashPaths[] }`
* `POST /remote/trash/empty` body `{ targetId, olderThanDays }`

### 14.4 Realtime

* `GET /events` (SSE)

---

## 15) Data Model (SQLite overview)

Tables (suggested):

* `settings` (singleton JSON)
* `profiles` (JSON)
* `targets` (JSON + secretRef)
* `crocdb_cache_games`
* `crocdb_cache_search`
* `library_items` (local & remote)
* `artifacts` (hash, size, canonical path)
* `jobs`
* `job_steps`
* `job_logs`
* `op_records` (idempotent remote ops)

---

## 16) Reliability & Safety

* All slow work in jobs
* Retries with exponential backoff on network operations
* Timeouts on all spawned commands
* Per-target write lock
* Post-check after transfer/delete/move
* Default to trash, not delete
* Manifest ensures accurate mapping and safe operations

---

## 17) Implementation Roadmap

### MVP (usable quickly)

* Electron wrapper + embedded Node API
* Crocdb browse + cache
* Profiles + Settings UI
* Local scan (owned)
* Download + unpack + finalize + manifest + local transfer
* SSE job progress

### v1 (handheld-ready)

* SMB + FTP targets with “Test”
* Remote scan + device library view
* Safe delete (trash/restore/purge) + op_records
* Dedup hashing + policy

### v1.5+

* BullMQ + Redis
* Docker distribution
* Content store mode
* Better fuzzy matching & metadata enrichment

---

## 18) Non-goals (keep scope sane)

* Emulator launching / BIOS management
* Automatic ROM acquisition beyond user-provided sources
* Cloud sync

---

## 19) Developer Experience (AI-agent friendly)

* Strong TypeScript types for:

  * Profiles, Targets, Jobs, Events, Manifest
* JSON schemas + examples
* Pipelines defined as declarative `Step[]`
* Every step small, testable, and pure where possible
* Fixtures for SMB/FTP mocked targets

---

```
::contentReference[oaicite:0]{index=0}
```
