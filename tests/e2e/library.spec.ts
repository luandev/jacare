import { test, expect, Page } from '@playwright/test';
import { captureOnCI } from './utils';

function interceptLibrary(page: Page) {
  let deleted = false;
  page.route('**/library/downloads/items', (route) => {
    const payload = deleted
      ? []
      : [
          {
            id: 1,
            path: 'C:/Library/nes/Metroid/Metroid.bin',
            size: 1024,
            mtime: Date.now(),
            hash: null,
            platform: 'nes',
            gameSlug: 'metroid-nes',
            source: 'local',
          },
        ];
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  });
  page.route('**/file**', async (route) => {
    const url = route.request().url();
    const u = new URL(url);
    const p = u.searchParams.get('path') || '';
    if (p.endsWith('.crocdesk.json')) {
      const dir = p.replace(/\\/g, '/').replace(/\/[^/]+$/, '/');
      const manifest = {
        schema: 1,
        crocdb: {
          slug: 'metroid-nes',
          title: 'Metroid',
          platform: 'nes',
          regions: ['eu'],
        },
        artifacts: [{ path: 'Metroid.bin', size: 1024 }],
        profileId: 'local-scan',
        createdAt: new Date().toISOString(),
      };
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(manifest) });
    } else {
      // Return a tiny PNG for cover
      const pngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
      const buf = Buffer.from(pngBase64, 'base64');
      route.fulfill({ status: 200, headers: { 'Content-Type': 'image/png' }, body: buf });
    }
  });
  page.route('**/library/scan/local', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  page.route('**/library/item?*', (route) => {
    deleted = true;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
}

test.describe('Library view management', () => {
  test.beforeEach(async ({ page }) => {
    interceptLibrary(page);
    await page.goto('/library');
  });

  test('shows scan button and queues scan', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Scan Local Library' })).toBeVisible();
    await page.getByRole('button', { name: 'Scan Local Library' }).click();
    await expect(page.getByText('Scan job queued')).toBeVisible();
    await captureOnCI(page, 'library-scan');
  });

  test('renders items with cover and opens detailed view', async ({ page }) => {
    const cards = page.locator('article.card');
    await expect(cards).toHaveCount(1);
    await expect(cards.nth(0).locator('img.thumb')).toBeVisible();

    // Open details (modal overlay route)
    await page.getByRole('link', { name: 'Details' }).click();
    const modal = page.getByTestId('modal-card');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Metroid' })).toBeVisible();
    await captureOnCI(page, 'library-detail');
  });

  test('delete removes item and refreshes list', async ({ page }) => {
    await expect(page.locator('article.card')).toHaveCount(1);
    // Confirm dialog
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();
    // After deletion, route now returns empty list
    await page.waitForTimeout(50);
    await expect(page.locator('article.card')).toHaveCount(0);
    await captureOnCI(page, 'library-delete');
  });
});
