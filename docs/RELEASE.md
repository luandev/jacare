# Release Process

This document describes how to create and publish a new release of Jacare.

## Overview

Jacare uses automated GitHub Actions workflows to build and publish releases. When you push a version tag (e.g., `v1.0.0`), the release workflow automatically:

1. Runs checks (typecheck, lint, tests)
2. Builds standalone binaries for Windows, macOS, and Linux
3. Generates SHA256 checksums for verification
4. Creates a GitHub Release with all artifacts
5. Generates release notes from commit history

## Release Checklist

Before creating a release, ensure:

- [ ] All tests pass locally (`npm run test:unit`)
- [ ] Code is properly linted (`npm run lint`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] CHANGELOG.md is updated with changes for this release
- [ ] Version numbers are updated in package.json files (if applicable)
- [ ] All PRs for this release are merged to `main`
- [ ] Local build works: `npm run package:bundle`

## Creating a Release

### 1. Tag the Release

```bash
# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create and push a version tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### 2. Monitor the Workflow

1. Go to the [Actions tab](https://github.com/luandev/jacare/actions) in GitHub
2. Watch the "Release" workflow run
3. The workflow will:
   - Run checks (should take ~2-5 minutes)
   - Build bundles (should take ~5-10 minutes)
   - Create the release (should take ~1 minute)

### 3. Verify the Release

Once the workflow completes:

1. Go to [Releases](https://github.com/luandev/jacare/releases)
2. Find your release (e.g., "Jacare v1.0.0")
3. Verify all artifacts are present:
   - `jacare-win.exe` (Windows binary)
   - `jacare-win.exe.sha256` (Windows checksum)
   - `jacare-macos` (macOS binary)
   - `jacare-macos.sha256` (macOS checksum)
   - `jacare-linux` (Linux binary)
   - `jacare-linux.sha256` (Linux checksum)
4. Download and test at least one binary on your platform

### 4. Test the Binary

```bash
# Linux/macOS
chmod +x jacare-linux  # or jacare-macos
./jacare-linux  # or ./jacare-macos

# Windows
jacare-win.exe
```

The binary should:
- Start without requiring Node.js installation
- Launch the web UI (usually at http://localhost:3333)
- Function as a complete all-in-one application

### 5. Verify Checksums

Users can verify downloaded binaries using the provided checksums:

```bash
# Linux/macOS
sha256sum -c jacare-linux.sha256

# Windows (PowerShell)
$expectedHash = Get-Content jacare-win.exe.sha256 | Select-Object -First 1 | ForEach-Object { $_.Split(' ')[0] }
$actualHash = (Get-FileHash jacare-win.exe -Algorithm SHA256).Hash
if ($expectedHash -eq $actualHash) { "✓ Checksum verified" } else { "✗ Checksum mismatch" }
```

## Artifacts

Each release includes three standalone binaries:

| Artifact | Platform | Notes |
|----------|----------|-------|
| `jacare-win.exe` | Windows (x64) | Self-contained executable |
| `jacare-macos` | macOS (x64) | Requires `chmod +x` before running |
| `jacare-linux` | Linux (x64) | Requires `chmod +x` before running |

All binaries:
- Include both frontend (React UI) and backend (Express API)
- Are fully standalone (no Node.js required)
- Default to port 3333
- Store data in `./data` directory
- Are ~50-80 MB in size

## Troubleshooting

### Workflow Fails on Checks

If the checks job fails:
1. Fix the issues locally (lint, typecheck, tests)
2. Commit and push fixes
3. Delete and recreate the tag:
   ```bash
   git tag -d v1.0.0
   git push origin :refs/tags/v1.0.0
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

### Workflow Fails on Build

If the build job fails:
1. Check the workflow logs in GitHub Actions
2. Test locally: `npm ci && npm run package:bundle`
3. Verify all dependencies are correctly specified
4. Check that `pkg` can bundle the application
5. Delete and recreate the tag after fixing

### Missing Artifacts in Release

If artifacts are missing from the release:
1. Check the workflow logs for upload errors
2. Verify the `release/bundle/` directory is created
3. Check that `pkg-platform.js` completes successfully
4. Re-run the workflow or recreate the tag

### Binary Doesn't Run

If the downloaded binary doesn't work:
1. Verify the checksum matches
2. On macOS/Linux, ensure execute permissions: `chmod +x jacare-*`
3. Check for antivirus or security software blocking execution
4. Try running with verbose output to see error messages
5. Report the issue with platform details and error messages

## Manual Release (Fallback)

If the automated workflow fails completely, you can create a manual release:

```bash
# 1. Build locally
npm ci
npm run package:bundle

# 2. Generate checksums
cd release/bundle
sha256sum jacare-linux > jacare-linux.sha256
sha256sum jacare-macos > jacare-macos.sha256
sha256sum jacare-win.exe > jacare-win.exe.sha256

# 3. Create release manually on GitHub
# - Go to https://github.com/luandev/jacare/releases/new
# - Choose your tag
# - Fill in title and description
# - Upload all files from release/bundle/
# - Publish release
```

## Version Numbering

Jacare follows [Semantic Versioning](https://semver.org/):

- **MAJOR** version (v**1**.0.0): Breaking changes
- **MINOR** version (v1.**1**.0): New features, backwards compatible
- **PATCH** version (v1.0.**1**): Bug fixes, backwards compatible

Use tags like:
- `v1.0.0` - Major release
- `v1.1.0` - Minor release with new features
- `v1.0.1` - Patch release with bug fixes
- `v1.0.0-beta.1` - Pre-release (will be marked as prerelease)

## Post-Release

After a successful release:

1. Update CHANGELOG.md to start a new "Unreleased" section
2. Announce the release (if applicable)
3. Monitor for issues from users downloading the release
4. Address critical bugs with patch releases if needed

## CI/CD Architecture

The release process involves:

1. **Trigger**: Push of `v*` tag
2. **Checks Job**: Runs on Ubuntu, validates code quality
3. **Build Job**: Runs on Ubuntu, builds all three platform binaries using `pkg`
4. **Release Job**: Creates GitHub release with artifacts

The build uses the `pkg` tool to create standalone Node.js executables that bundle:
- Compiled server code (`apps/server/dist`)
- Built web UI (`apps/web/dist`)
- Node.js runtime
- All dependencies

## Code Signing (Future)

Currently, binaries are not code-signed. To add code signing:

### Windows
1. Obtain a code signing certificate
2. Add certificate to GitHub Secrets
3. Use `signtool` in the workflow

### macOS
1. Obtain Apple Developer certificate
2. Add credentials to GitHub Secrets
3. Use `codesign` and `notarytool` in the workflow

See the workflow comments for placeholders where signing steps would be added.

## Docker Releases

Docker images are published separately via the `docker.yml` workflow:
- Triggered on tag pushes and releases
- Published to `ghcr.io/luandev/jacare`
- Multi-platform: `linux/amd64`, `linux/arm64`

Docker releases are independent of the binary releases described here.
