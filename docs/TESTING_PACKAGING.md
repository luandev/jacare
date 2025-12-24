# Testing Packaging Locally

This guide explains how to test the packaging and distribution process locally before pushing to CI.

## Quick Test (Current Platform)

Test packaging for your current platform:

```bash
# From the project root
npm run package:desktop
```

This will:
1. Build all workspace artifacts (shared, server, web, desktop)
2. Rebuild native modules (better-sqlite3) for Electron
3. Package the desktop app for your current platform

**Output location:** `release/desktop/`

**What to check:**
- Artifacts are created in `release/desktop/`
- For Windows: `Jacare Setup X.X.X.exe` (NSIS installer) and `Jacare X.X.X.exe` (portable)
- For macOS: `Jacare-X.X.X.dmg` and `Jacare-X.X.X-mac.zip`
- For Linux: `Jacare-X.X.X.AppImage`, `jacare_X.X.X_amd64.deb`, `jacare-X.X.X.x86_64.rpm`

## Step-by-Step Testing

Test each step individually to match the CI workflow:

### 1. Install Dependencies
```bash
npm ci
```

### 2. Build All Workspaces
```bash
npm run build
```

Verify:
- `packages/shared/dist/` exists
- `apps/server/dist/` exists
- `apps/web/dist/` exists
- `apps/desktop/dist/` exists

### 3. Rebuild Native Modules
```bash
npm run rebuild -w @crocdesk/desktop
```

This rebuilds `better-sqlite3` for Electron. You should see output indicating the rebuild completed successfully.

**Note:** This step is critical - native modules must be rebuilt for Electron before packaging.

### 4. Package Desktop App
```bash
cd apps/desktop
npm run package
```

Or from root:
```bash
npm run package -w @crocdesk/desktop
```

### 5. Verify Artifacts

Check that artifacts are created in `release/desktop/`:

**Windows:**
- `Jacare Setup X.X.X.exe` (NSIS installer)
- `Jacare X.X.X.exe` (portable executable)

**macOS:**
- `Jacare-X.X.X.dmg` (disk image)
- `Jacare-X.X.X-mac.zip` (zip archive)

**Linux:**
- `Jacare-X.X.X.AppImage` (AppImage)
- `jacare_X.X.X_amd64.deb` (Debian package)
- `jacare-X.X.X.x86_64.rpm` (RPM package)

## Testing Embedded Mode (Production-Like)

Test the packaged app behavior without actually packaging:

```bash
npm run dev:desktop:embedded
```

This:
1. Builds all workspaces
2. Rebuilds native modules
3. Runs the desktop app with embedded server (no hot reload)

This simulates the production environment where the server runs embedded in Electron.

## Testing Cross-Platform Packaging

**Note:** Cross-platform packaging requires the target OS or Docker. You cannot build Windows binaries on macOS/Linux or vice versa without special tooling.

### Option 1: Use Docker (Linux builds)

You can test Linux packaging on any platform using Docker:

```bash
# Build a Linux package in Docker
docker run --rm -v "$(pwd):/workspace" -w /workspace node:20 bash -c "npm ci && npm run package:desktop"
```

### Option 2: Use GitHub Actions

The CI workflow will build for all platforms. You can trigger it manually via:
- Push to `main` branch
- Use "Run workflow" button in GitHub Actions UI

## Verifying Package Contents

### Check ASAR Contents (Optional)

Electron packages use ASAR archives. You can inspect them:

```bash
# Install asar tool globally
npm install -g asar

# Extract and inspect (example path)
asar extract release/desktop/win-unpacked/resources/app.asar ./extracted-app
```

### Verify Native Modules

Check that `better-sqlite3` is properly unpacked:

```bash
# On Windows
dir release\desktop\win-unpacked\resources\app.asar.unpacked\node_modules\better-sqlite3

# On macOS/Linux
ls -la release/desktop/mac/Jacare.app/Contents/Resources/app.asar.unpacked/node_modules/better-sqlite3
```

### Verify Extra Resources

Check that web, server, and shared packages are included:

```bash
# On Windows
dir release\desktop\win-unpacked\resources\web\dist
dir release\desktop\win-unpacked\resources\server\dist
dir release\desktop\win-unpacked\resources\packages\shared\dist

# On macOS/Linux
ls -la release/desktop/mac/Jacare.app/Contents/Resources/web/dist
ls -la release/desktop/mac/Jacare.app/Contents/Resources/server/dist
ls -la release/desktop/mac/Jacare.app/Contents/Resources/packages/shared/dist
```

## Testing the Packaged App

### Windows
1. Run the NSIS installer: `Jacare Setup X.X.X.exe`
2. Or run the portable: `Jacare X.X.X.exe`
3. Verify the app starts and the embedded server works

### macOS
1. Open the DMG: `Jacare-X.X.X.dmg`
2. Drag the app to Applications
3. Run the app and verify it works
4. Or extract the ZIP and run directly

### Linux
1. Make AppImage executable: `chmod +x Jacare-X.X.X.AppImage`
2. Run: `./Jacare-X.X.X.AppImage`
3. Or install DEB/RPM and run from applications menu

## Common Issues

### Native Module Build Fails
**Error:** `better-sqlite3` build errors

**Solution:**
```bash
# Clean and rebuild
rm -rf node_modules apps/desktop/node_modules
npm ci
npm run rebuild -w @crocdesk/desktop
```

### Missing Files in Package
**Error:** App fails to start, missing web/server files

**Check:**
- Verify `apps/web/dist/` exists and has files
- Verify `apps/server/dist/` exists and has files
- Verify `packages/shared/dist/` exists and has files
- Check `apps/desktop/package.json` `extraResources` paths are correct

### Electron Builder chmod Error on Windows
**Error:** `ENOENT: no such file or directory, chmod 'E:\jacare\node_modules\7zip-bin\win\x64\7za.exe'`

This is a known issue with electron-builder on Windows. The package tries to set file permissions using `chmod`, which doesn't work on Windows.

**Solutions:**

1. **Run PowerShell as Administrator** (Recommended):
   - Right-click PowerShell and select "Run as Administrator"
   - Navigate to project directory and run `npm run package:desktop`

2. **Enable Windows Developer Mode**:
   - Open Windows Settings → Update & Security → For developers
   - Enable "Developer Mode"
   - This allows creating symbolic links without admin privileges
   - Restart PowerShell and try again

3. **Use CI/CD for Packaging**:
   - The GitHub Actions workflow handles packaging correctly
   - Push to `main` branch or use "Run workflow" in GitHub Actions
   - Download artifacts from the created release

4. **Use WSL (Windows Subsystem for Linux)**:
   ```bash
   # In WSL terminal
   npm ci
   npm run package:desktop
   ```

**Note:** For local testing of the packaged app, you can use `npm run dev:desktop:embedded` which simulates the production environment without packaging.

### Electron Builder Errors
**Error:** Various electron-builder errors

**Solution:**
- Ensure all dependencies are installed: `npm ci`
- Check electron-builder version matches in `package.json`
- Verify icons exist in `apps/desktop/build/` (icon.ico, icon.icns, icon.png)
- Check electron-builder logs in `release/desktop/builder-debug.log`
- For Windows chmod errors, see above section

## Simulating CI Workflow Locally

To test the exact CI workflow steps:

```bash
# 1. Install dependencies
npm ci

# 2. Build workspace artifacts
npm run build

# 3. Rebuild native modules
npm run rebuild -w @crocdesk/desktop

# 4. Package desktop app
cd apps/desktop
npm run package

# 5. Verify artifacts exist
ls -la ../../release/desktop/
```

## Testing Artifact Organization (Release Step)

To test the artifact organization that happens in CI:

```bash
# Create test structure
mkdir -p test-artifacts/desktop-windows test-artifacts/desktop-macos test-artifacts/desktop-linux

# Copy your artifacts (adjust paths as needed)
cp release/desktop/*.exe test-artifacts/desktop-windows/ 2>/dev/null || true
cp release/desktop/*.dmg test-artifacts/desktop-macos/ 2>/dev/null || true
cp release/desktop/*.AppImage test-artifacts/desktop-linux/ 2>/dev/null || true

# Test organization script (simulating CI)
mkdir -p test-release/windows test-release/macos test-release/linux

if [ -d "test-artifacts/desktop-windows" ]; then
  mv test-artifacts/desktop-windows/* test-release/windows/ 2>/dev/null || true
fi

if [ -d "test-artifacts/desktop-macos" ]; then
  mv test-artifacts/desktop-macos/* test-release/macos/ 2>/dev/null || true
fi

if [ -d "test-artifacts/desktop-linux" ]; then
  mv test-artifacts/desktop-linux/* test-release/linux/ 2>/dev/null || true
fi

# Verify organization
ls -la test-release/windows/
ls -la test-release/macos/
ls -la test-release/linux/
```

## Next Steps

After local testing passes:
1. Commit your changes
2. Push to trigger CI workflow
3. Monitor GitHub Actions for build results
4. Check the created release for properly organized artifacts

