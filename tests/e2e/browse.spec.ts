import { test, expect, Page } from '@playwright/test';
import { mockPlatforms, mockRegions, mockSearch } from './fixtures';

function interceptCatalog(page: Page) {
  page.route('**/crocdb/platforms', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPlatforms()) }));
  page.route('**/crocdb/regions', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRegions()) }));
  page.route('**/crocdb/search', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSearch()) }));
}

test.describe('Browse search and persistence', () => {
  test.beforeEach(async ({ page }) => {
    interceptCatalog(page);
    await page.goto('/');
  });

  test('renders results with box art and platform badges', async ({ page }) => {
    await page.getByLabel('Search').fill('zelda');
    await page.getByRole('button', { name: 'Search' }).click();

    const cards = page.locator('article.card');
    await expect(cards).toHaveCount(2);

    // Card 1 has an image
    await expect(cards.nth(0).locator('img.thumb')).toBeVisible();
    await expect(cards.nth(0).locator('.platform-badge')).toBeVisible();

    // Card 2 may use a placeholder
    await expect(cards.nth(1).locator('.thumb-placeholder')).toBeVisible();
    await expect(cards.nth(1).locator('.platform-badge')).toBeVisible();
  });

  test('queue download button posts and status appears', async ({ page }) => {
    interceptCatalog(page);
    await page.getByLabel('Search').fill('zelda');
    await page.getByRole('button', { name: 'Search' }).click();

    await page.route('**/jobs/download', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
    await page.getByRole('button', { name: 'Queue Download' }).first().click();
    await expect(page.getByText('Download job queued', { exact: true })).toBeVisible();
  });

  // test('state persists across navigation to Queue and back', async ({ page }) => {
  //   await page.getByLabel('Search').fill('zelda');
  //   await page.getByRole('button', { name: 'Search' }).click();

  //   await page.getByRole('link', { name: 'Queue' }).click();
  //   await page.getByRole('link', { name: 'Browse' }).click();

  //   await expect(page.getByLabel('Search')).toHaveValue('zelda');
  //   await page.waitForSelector('article.card');
  //   await expect(page.locator('article.card')).toHaveCount(2);
  // });
});
