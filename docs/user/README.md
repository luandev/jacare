# Jacare Friendly Guide 😀🐊

This guide is for anyone who wants to use Jacare without digging into code. Follow the steps below to organize your ROM collection with minimal setup.

## What is Jacare?
Jacare is a desktop app that helps you keep your game ROMs tidy. It finds details like cover art and descriptions using the Crocdb online database while storing your library on your computer.

## Quick start
1. **Install the app**
   - Download the Jacare desktop package for your system (Windows/macOS/Linux) from the releases page.
   - Install it like any other app.
2. **Open Jacare**
   - Launch the app. The server and the visual interface start automatically.
3. **Add your ROM folders**
   - Click **Add Folder** and choose the folders that contain your ROM files.
   - Jacare writes a small `.crocdesk.json` file inside each folder so it remembers what you added.
4. **Let Jacare scan**
   - Hit **Scan** to let Jacare discover the ROMs in your folders. Progress appears in the app.
5. **Search for game details**
   - Use **Search** to find matches from Crocdb. When you like a result, pick **Enrich/Entry** to pull cover art and metadata.
6. **Launch and enjoy**
   - Launch games directly from Jacare, or open the manifest to plug it into another launcher.

## Staying organized
- Keep your ROMs in clearly named folders (e.g., `NES/Mario/`).
- Re-run **Scan** after adding new games so Jacare can index them.
- If you're offline, you can still browse what was already scanned, and Jacare will use cached results until you reconnect.

## Common questions
- **Do I need an account?** No—Jacare uses Crocdb without sign-in.
- **Where does it store data?** In a `data` folder next to the app, including the small `.crocdesk.json` files in each ROM folder.
- **Can I turn off downloads?** Yes. Downloads are off by default; you can enable them in settings if you want Jacare to fetch assets.
- **Is my collection safe?** Jacare reads your ROMs and metadata but keeps everything on your device unless you choose to share it.

## Need help?
- Check for updates on the GitHub releases page.
- Open an issue on GitHub with details about what went wrong and what you expected.
- Planning to load ROMs onto a retro handheld like the R36S or RG40XXH? See the handheld-specific walkthrough in [`retro-handhelds.md`](./retro-handhelds.md).
