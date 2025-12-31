# Docker Compose template

This folder contains a starter `docker-compose.yml` for running Jacare with bind-mounted data and library directories. Windows paths are enabled by default; macOS and Linux examples are included as comments so you can switch quickly.

## Usage
1. Adjust the bind mounts in [`docker-compose.yml`](docker-compose.yml) to match your host paths.
   - Set `CROCDESK_DATA_DIR` to point to where you want SQLite databases and cache stored.
   - Set `libraryDir` in settings to point to your ROM collection directory.
2. **Important for Linux/macOS users:** Ensure the host directories have proper permissions.
   The container runs as UID 1001 (user `jacare`) and needs write access to the data directory.
   ```bash
   # Create directories if they don't exist
   mkdir -p /path/to/data /path/to/library
   
   # Set proper ownership (Linux/macOS only)
   sudo chown -R 1001:1001 /path/to/data
   sudo chmod -R 755 /path/to/data
   ```
   **Note:** On Windows, Docker Desktop handles permissions automatically.
3. (Optional) Uncomment any emulator services you want to run alongside Jacare (RetroArch, Dolphin, PCSX2).
4. Start the stack:
   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```
5. Visit the Jacare web UI and API at `http://localhost:3333`.

The Docker image includes both the server API and web UI, so everything is accessible on port 3333. The template sets `CROCDESK_DATA_DIR` to `/data` and assumes your ROM library is mounted at `/library`. 

**Using pre-built images:**
The `docker-compose.yml` is configured to use the pre-built image from GitHub Container Registry (`ghcr.io/luandev/jacare:latest`). Images are automatically built and pushed on every push to the `main` branch.

**Building from source:**
You can also build the server image from the repository by uncommenting the `build` section and commenting out the `image` line in the `jacare` service.

## Environment variables
- `CROCDESK_PORT` – Server port (default: 3333)
- `CROCDESK_DATA_DIR` – Data directory for SQLite and cache (default: ./data)
- `CROCDB_BASE_URL` – Crocdb API URL (default: https://api.crocdb.net)
- `CROCDB_CACHE_TTL_MS` – Cache TTL in milliseconds (default: 86400000)

## API URL Configuration

The frontend automatically detects the API base URL at runtime. In Docker deployments, this works seamlessly when the frontend and backend are served from the same origin (default setup).

**How it works:**
- The frontend fetches `/api-config` endpoint on first API call
- If the API URL matches the current origin, relative URLs are used (default behavior)
- If frontend and backend are on different origins, you can inject `window.API_URL` via entrypoint script

**For custom port configurations:**
- The `/api-config` endpoint automatically detects the correct API URL based on the request
- No additional configuration needed when using the default setup (same origin)
- If you need to serve frontend and backend separately, inject `window.API_URL` in `index.html`:
  ```bash
  # Example entrypoint script
  sed -i "s|window.API_URL = window.API_URL || \"\";|window.API_URL = \"http://your-backend-host:6024\";|g" /app/apps/web/dist/index.html
  ```

**Troubleshooting:**
- If you see CORS errors, check that the frontend can access `/api-config` endpoint
- The frontend never hardcodes `localhost:3333` - it uses runtime detection
- Ensure `CROCDESK_PORT` matches the port you expose in Docker
- **"readonly database" error:** This occurs when the `/data` directory doesn't have write permissions for UID 1001. Fix with: `sudo chown -R 1001:1001 /path/to/data && sudo chmod -R 755 /path/to/data`

For broader project context, configuration options, and runtime expectations, see the [root README](../README.md).
