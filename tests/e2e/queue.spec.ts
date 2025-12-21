import { test, expect, Page } from '@playwright/test';
import { mockPlatforms, mockRegions, mockSearch, mockEntry } from './fixtures';

function interceptCommon(page: Page) {
  page.route('**/crocdb/platforms', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPlatforms()) }));
  page.route('**/crocdb/regions', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRegions()) }));
  page.route('**/crocdb/search', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSearch()) }));
  page.route('**/crocdb/entry', async (route) => {
    const body = await route.request().postDataJSON();
    const slug = body?.slug ?? 'metroid-nes';
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockEntry(slug)) });
  });
}

const jobsPayload = [
  {
    id: 'job-1',
    type: 'download_and_install',
    status: 'queued',
    payload: { slug: 'metroid-nes', profileId: 'default' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    preview: { slug: 'metroid-nes', title: 'Metroid', platform: 'nes', boxart_url: 'https://example.com/boxart/metroid.jpg' },
  },
  {
    id: 'job-2',
    type: 'scan_local',
    status: 'done',
    payload: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

function interceptQueue(page: Page) {
  page.route('**/jobs', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(jobsPayload) }));
  // Single SSE message
  const sse = 'data: ' + JSON.stringify({ jobId: 'job-1', type: 'JOB_CREATED', ts: Date.now() }) + '\n\n';
  page.route('**/events', (route) => route.fulfill({ status: 200, contentType: 'text/event-stream', body: sse }));
}

test.describe('Queue page with SSE and previews', () => {
  test.beforeEach(async ({ page }) => {
    interceptCommon(page);
    interceptQueue(page);
    await page.goto('/');
  });

  test('shows latest event and job cards with preview thumbnail and badge', async ({ page }) => {
    await page.getByRole('link', { name: 'Queue' }).click();

    await expect(page.getByText('Latest event')).toBeVisible();
    await expect(page.locator('article.card')).toHaveCount(2);

    const firstThumb = page.locator('article.card').nth(0).locator('img.thumb');
    await expect(firstThumb).toBeVisible();
    await expect(page.locator('article.card').nth(0).locator('.platform-badge')).toBeVisible();
  });
});
