# E2E Tests

This directory contains end-to-end tests for Jacare using Playwright.

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers (if not already installed):
   ```bash
   npx playwright install chromium
   ```

### Run Tests

- **Run all e2e tests:**
  ```bash
  npm run test:e2e
  ```

- **Run tests with UI mode (for debugging):**
  ```bash
  npm run test:e2e:ui
  ```

### Test Structure

The e2e tests are located in `tests/e2e/` and follow this structure:

- **happy-path.spec.ts**: Main happy path test that covers the core user journey:
  1. Browse view - Search for games
  2. Settings view - Change theme
  3. Library view - Verify library content

### How Tests Work

The tests use Playwright's built-in web server feature to:
1. Build the web UI (`npm run build -w @crocdesk/web`)
2. Start the development server (`npm run dev:server`)
3. Wait for the server to be ready at `http://localhost:3333`
4. Run the tests against the running application
5. Shut down the server after tests complete

### Test Configuration

Configuration is in `playwright.config.ts` at the project root. Key settings:
- Base URL: `http://localhost:3333`
- Test directory: `tests/e2e/`
- Browser: Chromium
- Timeout: 120 seconds for server startup

### Viewing Test Reports

After running tests, view the HTML report:
```bash
npx playwright show-report
```

### Debugging Tests

To debug a test:
1. Run with UI mode: `npm run test:e2e:ui`
2. Or add `await page.pause()` in your test code to pause execution
3. View traces for failed tests in the `test-results/` directory

### CI/CD Integration

Tests are configured to:
- Retry failed tests 2 times on CI
- Run serially (1 worker) on CI to avoid port conflicts
- Fail if `test.only` is accidentally left in code
