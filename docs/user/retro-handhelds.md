# Jacare + retro handhelds (R36S, RG40XXH, and friends)

This guide walks through prepping ROMs and metadata for Linux-based retro handhelds such as the Powkiddy R36S or Anbernic RG40XXH using Jacare. The steps apply to most similar devices that boot RetroArch-based firmware.

## What you need
- A PC with Jacare installed.
- The microSD card used by your handheld (card reader recommended for faster transfers).
- A basic folder layout that matches your firmware's expected directories (e.g., `GBA/`, `PS1/`, `SNES/`). Check your handheld's documentation for the exact names.

## Recommended workflow
1. **Back up your card first**
   - Copy the existing contents of the microSD card to your PC. This protects your preloaded ROMs and saves before making changes.

2. **Plan your library structure**
   - Inside the ROMs partition on the card, keep one top-level folder per platform (e.g., `ROMs/GBA`).
   - Keep compressed archives only when your firmware supports them; otherwise, extract to plain files for smoother scans and launches.

3. **Point Jacare at the handheld's card**
   - Insert the microSD card into your PC (USB card reader is fastest). If your handheld exposes the card as USB mass storage, that works too.
   - In Jacare settings, set **Library directory** to the ROMs root on the card (for example, `/Volumes/SDCARD/ROMs` on macOS or `E:\ROMs` on Windows).
   - Leave the **Download directory** on your PC's internal drive to avoid wearing out the card during temporary downloads.

4. **Scan the library**
   - In Jacare, use **Add folder** on your platform folders (e.g., `ROMs/GBA`, `ROMs/SNES`). Jacare writes a tiny `.crocdesk.json` manifest in each folder so it remembers what you added.
   - Run **Scan** to index all ROMs directly on the card.

5. **Enrich with metadata**
   - Use **Search** to find matches from Crocdb and apply **Entry** to pull cover art and descriptions. Assets land next to your ROMs under the card's library directory.
   - If bandwidth is a concern, enrich a few favorites first; you can return later for the rest.

6. **Verify on the handheld**
   - Safely eject the card and boot the handheld. Ensure your firmware indexes the same folders you scanned.
   - On RetroArch-based firmware, refresh playlists or rescan content so cover art files appear in the UI.
   - For standalone frontends (e.g., custom launchers), confirm that they look for artwork in the same folder as the ROM or in a sibling `images` directory—Jacare places assets alongside each game manifest.

7. **Keep things in sync**
   - When you add new ROMs, reinsert the card into your PC and re-run **Scan** in Jacare. Metadata lookups remain cached, so repeat scans are faster.
   - To avoid corruption, never unplug the handheld mid-transfer; eject the card from your OS each time.

## Device-specific tips
- **Powkiddy R36S**: Many stock firmware builds expect platform folders inside a `ROMS` directory. If you change folder names, update the device's frontend paths accordingly.
- **Anbernic RG40XXH**: Some community firmware stacks keep RetroArch playlists under `saves/playlists`. After enriching with Jacare, trigger a playlist refresh in the frontend so new box art shows up.
- **Shared SD cards**: If multiple handhelds share one card, stick to generic platform folder names (e.g., `NES`, `SNES`, `GBA`) so each device can index the same structure.

## Troubleshooting
- **Artwork not showing**: Confirm the firmware looks for artwork next to the ROM or in a sibling images folder. If it requires a different path, copy the artwork from the Jacare-managed folder to the expected location.
- **Slow transfers over USB**: Use a card reader instead of plugging the handheld directly into your PC. You can still point Jacare to the mounted path.
- **Storage wear concerns**: Keep Jacare's **Download directory** on your PC's drive; only the final ROMs and assets should live on the SD card.

With this setup, Jacare handles scanning and metadata while your R36S, RG40XXH, or any similar handheld gets an organized library ready to play.
