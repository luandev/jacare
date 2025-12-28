# Release Process Improvements

This document describes improvements made to the Jacare release process to ensure reliable executable packaging and distribution.

## Problem Statement

The Windows executable (`jacare-win.exe`) was failing immediately on startup with the error:
```
Error: Cannot find module 'p-queue'
```

Additionally, when crashes occurred, there were no persistent logs available for debugging, making it difficult to diagnose issues in production environments.

## Root Cause Analysis

1. **ESM Module Incompatibility**: The `p-queue` library (v7.x and v8.x) uses ES modules with `"type": "module"` in its package.json. The `pkg` bundler used to create standalone executables doesn't properly handle ESM-only dependencies, leading to runtime errors.

2. **Missing Persistent Logging**: The application only logged to stdout/stderr, which was lost when the process crashed. Users had no way to debug issues after the fact.

3. **Lack of CI Testing**: Packaged executables were not tested before release, allowing broken builds to be published.

## Solutions Implemented

### 1. SimpleQueue Implementation

**Location**: `/apps/server/src/utils/simple-queue.ts`

Replaced the `p-queue` dependency with a custom `SimpleQueue` implementation that:
- Is fully CommonJS compatible (works with pkg bundler)
- Provides the same core functionality (concurrency control, task queuing)
- Has a compatible API surface (concurrency setting, add(), onIdle(), clear())
- Includes comprehensive unit tests (14 tests covering all features)

**Benefits**:
- No external ESM dependencies
- Smaller bundle size
- Full control over the implementation
- Better compatibility with pkg

### 2. Persistent File Logging

**Location**: `/apps/server/src/utils/logger.ts`

Enhanced the logging system to:
- Write all logs to files in `<data-dir>/logs/crocdesk-YYYY-MM-DD.log`
- Automatically rotate logs older than 7 days
- Capture uncaught exceptions and unhandled promise rejections
- Continue writing to console for real-time monitoring
- Create log directory automatically on first run

**Log Location**:
- Default: `./data/logs/`
- Custom: `$CROCDESK_DATA_DIR/logs/`

**Benefits**:
- Users can check logs after crashes
- Easier debugging of production issues
- Automatic cleanup prevents disk space issues
- Logs survive process restarts

### 3. Automated Package Testing

**Location**: `.github/workflows/test-packaged.yml`

Created a comprehensive CI workflow that:
- Tests packaged executables on Windows, macOS, and Linux
- Verifies executable creation and file size
- Starts the server and checks for crashes
- Runs smoke tests (health check, settings, jobs endpoints)
- Verifies log files are created
- Uploads logs on failure for debugging

**Test Coverage**:
- Executable exists and has reasonable size (>10MB)
- Server starts without immediate crash
- Health endpoint responds
- Settings endpoint works
- Jobs endpoint works
- Log files are created
- Server shuts down cleanly

### 4. Release Workflow Integration

**Location**: `.github/workflows/release.yml`

Updated the release workflow to:
- Run package tests on all platforms before release
- Build executables natively on each platform
- Use tested artifacts in the release
- Fail the release if any platform test fails

**Benefits**:
- Catches broken builds before release
- Ensures all platforms work
- Provides confidence in releases
- Reduces deployment issues

## Testing

### Unit Tests
```bash
npm run test:unit
```

All 79 tests pass, including:
- 14 new tests for SimpleQueue
- Existing tests continue to pass

### Build Test
```bash
npm run package:bundle
```

Successfully creates executables for all platforms without ESM-related warnings.

### Smoke Test
The packaged executable now:
1. Starts successfully
2. Creates log files
3. Responds to API requests
4. Logs errors properly

## Migration Guide

### For Users

**No action required.** Future releases will:
- Work reliably on Windows, macOS, and Linux
- Create log files in `data/logs/` for troubleshooting
- Be tested before release

**If you experience issues**:
1. Check logs in `data/logs/crocdesk-YYYY-MM-DD.log`
2. Share the most recent log file when reporting issues

### For Developers

**No API changes.** The queue implementation is internal and maintains compatibility.

If you need to add new queue features:
1. Update `/apps/server/src/utils/simple-queue.ts`
2. Add tests to `/apps/server/src/utils/__tests__/simple-queue.test.ts`
3. Run `npm run test:unit` to verify

## Technical Details

### SimpleQueue API

```typescript
class SimpleQueue {
  constructor(options?: { concurrency: number });
  
  // Properties
  concurrencyLimit: number;     // Get/set concurrency
  size: number;                 // Pending tasks in queue
  pending: number;              // Currently running tasks
  
  // Methods
  add<T>(task: () => Promise<T>): Promise<T>;
  clear(): void;
  onIdle(): Promise<void>;
}
```

### Logger Configuration

The logger automatically:
- Creates the logs directory on first use
- Rotates logs older than 7 days on startup
- Handles file system errors gracefully
- Formats logs with ISO timestamps

### CI Workflow Triggers

The package test workflow runs on:
- Pull requests affecting server, web, or shared packages
- Pushes to main branch
- Manual dispatch

The release workflow:
- Tests packages first (3 platforms)
- Only creates release if all tests pass
- Runs on version tags (`v*`)

## Performance Impact

- **Build time**: Similar (pkg bundling dominates)
- **Bundle size**: Slightly smaller (no p-queue deps)
- **Runtime**: Negligible (simple in-memory queue)
- **Disk usage**: ~1MB per day of logs (auto-cleaned)

## Future Improvements

Potential enhancements:
1. Add log streaming API for remote debugging
2. Implement log compression for long-term storage
3. Add structured logging (JSON format option)
4. Create log viewer UI in the app
5. Add metrics collection

## References

- [Issue #XX]: Release failing on Windows
- [pkg documentation](https://github.com/vercel/pkg)
- [ESM compatibility issues](https://github.com/vercel/pkg/issues?q=esm)

## Changelog

### 2025-12-28
- Replaced p-queue with SimpleQueue implementation
- Added persistent file-based logging with rotation
- Created comprehensive package testing workflow
- Updated release workflow to test before publishing
- Added 14 new unit tests for SimpleQueue
- All tests passing (79 total)
