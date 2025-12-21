import { expect, test, Page } from '@playwright/test';
import { captureOnCI } from './utils';

const jobsPayload = [
  {
    id: 'job-library-1',
    type: 'download_and_install',
    status: 'running',
    payload: { slug: 'metroid-nes', profileId: 'default' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    preview: {
      slug: 'metroid-nes',
      title: 'Metroid',
      platform: 'nes',
      boxart_url: 'https://example.com/boxart/metroid.jpg',
    },
  },
];

const libraryItems = [
  {
    id: 'lib-1',
    path: '/games/NES/Metroid',
    size: 8 * 1024 * 1024,
    mtime: new Date('2024-01-01T12:00:00Z').getTime(),
    platform: 'nes',
    source: 'remote',
    gameSlug: 'metroid-nes',
  },
  {
    id: 'lib-2',
    path: '/games/SNES/Zelda',
    size: 1_234_000,
    mtime: new Date('2024-02-02T12:00:00Z').getTime(),
    platform: 'snes',
    source: 'local',
    gameSlug: 'zelda-snes',
  },
];

function interceptLibrary(page: Page) {
  page.route('**/jobs', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(jobsPayload) })
  );
  page.route('**/library/items', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(libraryItems) })
  );

  const sse =
    'data: ' + JSON.stringify({ jobId: 'job-library-1', type: 'JOB_PROGRESS', progress: 0.42, ts: Date.now() }) + '\n\n';
  page.route('**/events', (route) =>
    route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse })
  );
}

test.describe('Library view', () => {
  test.beforeEach(async ({ page }) => {
    interceptLibrary(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'Library' }).click();
  });

  test('shows active downloads with preview art and progress', async ({ page }) => {
    const downloadCards = page.locator('section:has-text("Downloading") article.card');
    await expect(downloadCards).toHaveCount(1);

    const downloadCard = downloadCards.first();
    await expect(downloadCard.getByRole('heading', { name: 'Metroid' })).toBeVisible();
    await expect(downloadCard.getByText('download_and_install')).toBeVisible();
    await expect(downloadCard.locator('img.thumb')).toBeVisible();
    await expect(downloadCard.locator('.platform-badge')).toBeVisible();
    await expect(downloadCard.locator('div.progress span')).toBeVisible();

    await captureOnCI(page, 'library-downloading');
  });

  test('lists ready-to-play items with platform and source badges', async ({ page }) => {
    const readyCards = page.locator('section:has-text("Ready to play") article.card');
    await expect(readyCards).toHaveCount(2);

    await expect(readyCards.nth(0).getByText('NES', { exact: true })).toBeVisible();
    await expect(readyCards.nth(0).getByText('Downloaded')).toBeVisible();
    await expect(readyCards.nth(1).getByText('SNES', { exact: true })).toBeVisible();
    await expect(readyCards.nth(1).getByText('Local')).toBeVisible();

    await expect(page.getByText('2 items')).toBeVisible();
    await captureOnCI(page, 'library-ready-items');
  });
});
