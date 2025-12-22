# Docker Compose template

This folder contains a starter `docker-compose.yml` for running Jacare with bind-mounted data and library directories. Windows paths are enabled by default; macOS and Linux examples are included as comments so you can switch quickly.

## Usage
1. Adjust the bind mounts in [`docker-compose.yml`](docker-compose.yml) to match your host paths.
2. (Optional) Uncomment any emulator services you want to run alongside Jacare (RetroArch, Dolphin, PCSX2).
3. Start the stack:
   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```
4. Visit the Jacare web UI at `http://localhost:5173` and API at `http://localhost:3333`.

The template sets `CROCDESK_DATA_DIR` to `/data` and assumes your ROM library is mounted at `/library`. You can also build the server image from the repository by uncommenting the `build` section on the `crocdesk` service.

For broader project context, configuration options, and runtime expectations, see the [root README](../README.md).
