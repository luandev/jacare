# Jacare Friendly Guide 😀🐊

> **⚠️ IMPORTANT NOTICE**: The main crocdb source is currently offline, causing data access failures. A root cause has been identified and a fix is in progress. An update will be published shortly with restored availability.

This guide is for anyone who wants to use Jacare without digging into code. Follow the steps below to organize your ROM collection with minimal setup.

## What is Jacare?
Jacare is a desktop app that helps you keep your game ROMs tidy. It finds details like cover art and descriptions using the Crocdb online database while storing your library on your computer.

## Quick start
1. **Install the app**
   
   **Option A: Standalone Bundle (Recommended - No Node.js required)**
   - Download the standalone binary for your system from the [releases page](https://github.com/luandev/jacare/releases):
     - Windows: `jacare-win.exe`
     - macOS: `jacare-macos` (make executable with `chmod +x jacare-macos`)
     - Linux: `jacare-linux` (make executable with `chmod +x jacare-linux`)
   - Run the binary directly—no installation needed!
   
   **Option B: Desktop App**
   - Download the Jacare desktop package for your system (Windows/macOS/Linux) from the [releases page](https://github.com/luandev/jacare/releases).
   - Install it like any other app.
   
2. **Open Jacare**
   - **Standalone bundle:** Run the binary. The server and web UI start automatically.
   - **Desktop app:** Launch the app. The server and the visual interface start automatically.
   - Open your browser and go to `http://localhost:3333` (for standalone bundle) or use the desktop app window.
3. **Configure your library**
   - Go to **Settings** and set your **Library Directory** to the folder containing your ROM files.
   - Optionally set a **Download Directory** for temporary downloads (files are deleted after extraction).
4. **Let Jacare scan**
   - Go to the **Library** page and click **Scan** to let Jacare discover the ROMs in your library directory. Progress appears in the app.
5. **Search for game details**
   - Use **Browse** to search for matches from Crocdb. When you like a result, pick **Download** to pull the ROM and enrich your library with cover art and metadata.
6. **Launch and enjoy**
   - Launch games directly from Jacare, or open the manifest to plug it into another launcher.

## Staying organized
- Keep your ROMs in clearly named folders organized by platform (e.g., `library/snes/`, `library/n64/`).
- Re-run **Scan** after adding new games so Jacare can index them.
- If you're offline, you can still browse what was already scanned, and Jacare will use cached results until you reconnect.

## Settings explained
- **Library Directory:** This is where your ROM files are stored. Jacare scans this directory recursively to find games. All library operations work from this root.
- **Download Directory:** Temporary directory for zip file downloads. Files are automatically deleted after extraction to your library directory.
- **Theme:** Choose between light and dark themes for the interface.

## Common questions
- **Do I need an account?** No—Jacare uses Crocdb without sign-in.
- **Where does it store data?** In a `data` folder next to the app (or in the location specified by `CROCDESK_DATA_DIR`), including SQLite databases and small `.crocdesk.json` manifest files in each ROM folder.
- **Can I turn off downloads?** Downloads are enabled by default. There is no option to disable downloads.
- **Is my collection safe?** Jacare reads your ROMs and metadata but keeps everything on your device unless you choose to share it.
- **What file formats are supported?** Jacare supports common ROM formats including `.zip`, `.7z`, `.rar`, `.iso`, `.chd`, `.bin`, `.cue`, `.sfc`, `.smc`, `.nes`, `.gba`, `.gb`, `.gbc`, `.n64`, `.z64`, `.v64`, `.nds`, `.md`, `.gen`, `.sms`, `.gg`, `.pce`, `.img`, `.ccd`, `.sub`, `.m3u`, and more.

## Need help?
- Check for updates on the [GitHub releases page](https://github.com/luandev/jacare/releases).
- Open an issue on [GitHub](https://github.com/luandev/jacare/issues) with details about what went wrong and what you expected.
- Planning to load ROMs onto a retro handheld like the R36S or RG40XXH? See the handheld-specific walkthrough in [`retro-handhelds.md`](./retro-handhelds.md).
