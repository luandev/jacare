# Docker Compose template

This folder contains a starter `docker-compose.yml` for running Jacare with bind-mounted data and library directories. Windows paths are enabled by default; macOS and Linux examples are included as comments so you can switch quickly.

## Usage
1. Adjust the bind mounts in [`docker-compose.yml`](docker-compose.yml) to match your host paths.
   - Set `CROCDESK_DATA_DIR` to point to where you want SQLite databases and cache stored.
   - Set `libraryDir` in settings to point to your ROM collection directory.
2. (Optional) Uncomment any emulator services you want to run alongside Jacare (RetroArch, Dolphin, PCSX2).
3. Start the stack:
   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```
4. Visit the Jacare web UI at `http://localhost:5173` and API at `http://localhost:3333`.

The template sets `CROCDESK_DATA_DIR` to `/data` and assumes your ROM library is mounted at `/library`. You can also build the server image from the repository by uncommenting the `build` section on the `crocdesk` service.

## Environment variables
- `CROCDESK_PORT` – Server port (default: 3333)
- `CROCDESK_DATA_DIR` – Data directory for SQLite and cache (default: ./data)
- `CROCDESK_ENABLE_DOWNLOADS` – Enable downloads (default: false)
- `CROCDB_BASE_URL` – Crocdb API URL (default: https://api.crocdb.net)
- `CROCDB_CACHE_TTL_MS` – Cache TTL in milliseconds (default: 86400000)

For broader project context, configuration options, and runtime expectations, see the [root README](../README.md).
