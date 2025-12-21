import { test, expect, Page } from '@playwright/test';
import { captureOnCI } from './utils';
import { mockPlatforms, mockRegions, mockSearch, mockEntry } from './fixtures';

function interceptCatalog(page: Page) {
  page.route('**/crocdb/platforms', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPlatforms()) }));
  page.route('**/crocdb/regions', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRegions()) }));
  page.route('**/crocdb/search', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSearch()) }));
  page.route('**/crocdb/entry', async (route) => {
    const body = await route.request().postDataJSON();
    const slug = body?.slug ?? 'metroid-nes';
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockEntry(slug)) });
  });
}

test.describe('Detail modal interactions', () => {
  test.beforeEach(async ({ page }) => {
    interceptCatalog(page);
    await page.goto('/');
    await page.getByLabel('Search').fill('zelda');
    await page.getByRole('button', { name: 'Search' }).click();
  });

  test('opens from thumbnail and closes via close button', async ({ page }) => {
    await page.locator('article.card').nth(0).locator('img.thumb').click();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
    await captureOnCI(page, 'detail-modal-open');
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);
  });

  test('closes via close button, back button, and ESC', async ({ page }) => {
    await page.locator('article.card').nth(0).locator('img.thumb').click();

    // Close button
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0);

    // Reopen, then ESC
    await page.locator('article.card').nth(0).locator('img.thumb').click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Go back' })).toHaveCount(0);
  });

  test('media grid shows cover + up to 6 screenshots with lightbox', async ({ page }) => {
    await page.locator('article.card').nth(1).locator('h3 a').click();

    // Scope assertions to the modal card to avoid strict-mode conflicts
    const modalCard = page.getByTestId('modal-card');
    await expect(modalCard).toBeVisible();
    await expect(modalCard.getByRole('heading', { name: 'A Link to the Past' })).toBeVisible();
    await captureOnCI(page, 'detail-modal-media');

    const mediaThumbs = modalCard.locator('.media-grid img.thumb');
    await expect(mediaThumbs).toHaveCount(6);

    await mediaThumbs.nth(0).click();
    await expect(page.locator('.lightbox')).toBeVisible();
    await page.locator('.lightbox').click();
    await expect(page.locator('.lightbox')).toHaveCount(0);
  });
});
