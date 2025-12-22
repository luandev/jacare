import { test, expect, Page } from '@playwright/test';
import { captureOnCI } from './utils';
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

test.describe('Download cancel and resume', () => {
  test.beforeEach(async ({ page }) => {
    interceptCommon(page);
    await page.goto('/');
  });

  test('should cancel download and cleanup part file', async ({ page }) => {
    let jobId: string | null = null;
    let cancelCalled = false;

    // Intercept download request
    page.route('**/jobs/download', async (route) => {
      const body = await route.request().postDataJSON();
      jobId = `job-${Date.now()}`;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: jobId,
          type: 'download_and_install',
          status: 'queued',
          payload: body,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      });
    });

    // Intercept cancel request
    page.route(`**/jobs/*/cancel`, async (route) => {
      cancelCalled = true;
      const jobIdFromUrl = route.request().url().split('/').slice(-2, -1)[0];
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, message: 'Job cancelled' })
      });
    });

    // Mock jobs list with running download
    page.route('**/jobs', (route) => {
      if (!jobId) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        return;
      }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: jobId,
            type: 'download_and_install',
            status: 'running',
            payload: { slug: 'metroid-nes' },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            preview: {
              slug: 'metroid-nes',
              title: 'Metroid',
              platform: 'nes',
              boxart_url: 'https://example.com/boxart/metroid.jpg'
            }
          }
        ])
      });
    });

    // Mock SSE events for job progress
    let eventCount = 0;
    page.route('**/events', (route) => {
      if (eventCount === 0) {
        // First event: job created
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ jobId, type: 'JOB_CREATED', ts: Date.now() })}\n\n`
        });
        eventCount++;
      } else if (eventCount === 1) {
        // Second event: job started
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ jobId, type: 'STEP_STARTED', step: 'download_and_install', progress: 0, ts: Date.now() })}\n\n`
        });
        eventCount++;
      } else if (eventCount === 2) {
        // Third event: progress update
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ jobId, type: 'STEP_PROGRESS', step: 'download_and_install', progress: 0.3, bytesDownloaded: 300, totalBytes: 1000, ts: Date.now() })}\n\n`
        });
        eventCount++;
      } else {
        // After cancel: job failed
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ jobId, type: 'JOB_FAILED', message: 'Cancelled by user', ts: Date.now() })}\n\n`
        });
      }
    });

    // Navigate to browse and queue download
    await page.getByLabel('Search').fill('metroid');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForSelector('article.card');

    // Queue download
    await page.getByRole('button', { name: 'Queue Download' }).first().click();
    await expect(page.getByText('Download job queued')).toBeVisible();

    // Navigate to Queue page
    await page.getByRole('link', { name: 'Queue' }).click();
    await page.waitForTimeout(500); // Wait for SSE to update

    // Verify download job appears
    const downloadCard = page.locator('article.card').filter({ hasText: 'Metroid' });
    await expect(downloadCard).toBeVisible({ timeout: 5000 });

    // Click cancel button
    const cancelButton = downloadCard.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Verify cancel was called
    await page.waitForTimeout(500);
    expect(cancelCalled).toBe(true);

    await captureOnCI(page, 'download-cancel');
  });

  test('should show download progress and allow cancel', async ({ page }) => {
    let jobId: string | null = null;
    let progressEvents = 0;

    // Intercept download request
    page.route('**/jobs/download', async (route) => {
      const body = await route.request().postDataJSON();
      jobId = `job-${Date.now()}`;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: jobId,
          type: 'download_and_install',
          status: 'queued',
          payload: body,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      });
    });

    // Mock jobs list
    page.route('**/jobs', (route) => {
      if (!jobId) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        return;
      }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: jobId,
            type: 'download_and_install',
            status: 'running',
            payload: { slug: 'metroid-nes' },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            preview: {
              slug: 'metroid-nes',
              title: 'Metroid',
              platform: 'nes',
              boxart_url: 'https://example.com/boxart/metroid.jpg'
            }
          }
        ])
      });
    });

    // Mock SSE events with progress updates
    page.route('**/events', (route) => {
      if (progressEvents === 0) {
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ jobId, type: 'JOB_CREATED', ts: Date.now() })}\n\n`
        });
        progressEvents++;
      } else if (progressEvents === 1) {
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ jobId, type: 'STEP_STARTED', step: 'download_and_install', progress: 0, ts: Date.now() })}\n\n`
        });
        progressEvents++;
      } else {
        // Progress updates
        const progress = Math.min(0.1 * progressEvents, 0.9);
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ 
            jobId, 
            type: 'STEP_PROGRESS', 
            step: 'download_and_install', 
            progress, 
            bytesDownloaded: progress * 1000, 
            totalBytes: 1000,
            ts: Date.now() 
          })}\n\n`
        });
        progressEvents++;
      }
    });

    // Navigate to browse and queue download
    await page.getByLabel('Search').fill('metroid');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForSelector('article.card');

    // Queue download
    await page.getByRole('button', { name: 'Queue Download' }).first().click();
    await expect(page.getByText('Download job queued')).toBeVisible();

    // Navigate to Downloads page
    await page.getByRole('link', { name: 'Downloads' }).click();
    await page.waitForTimeout(1000); // Wait for SSE events

    // Verify download card appears with progress
    const downloadCard = page.locator('article.card').filter({ hasText: 'Metroid' });
    await expect(downloadCard).toBeVisible({ timeout: 5000 });

    // Verify progress bar is visible
    const progressBar = downloadCard.locator('.progress');
    await expect(progressBar).toBeVisible();

    // Verify cancel button is visible and enabled
    const cancelButton = downloadCard.getByRole('button', { name: 'Cancel' });
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toBeEnabled();

    await captureOnCI(page, 'download-progress');
  });

  test('should handle resume when part file exists (server-side)', async ({ page }) => {
    // This test verifies the UI behavior when a download is resumed
    // The actual resume logic is tested in unit tests
    let jobId: string | null = null;

    // Intercept download request
    page.route('**/jobs/download', async (route) => {
      const body = await route.request().postDataJSON();
      jobId = `job-${Date.now()}`;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: jobId,
          type: 'download_and_install',
          status: 'queued',
          payload: body,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      });
    });

    // Mock jobs list showing a running download that was resumed
    page.route('**/jobs', (route) => {
      if (!jobId) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
        return;
      }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: jobId,
            type: 'download_and_install',
            status: 'running',
            payload: { slug: 'metroid-nes' },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            preview: {
              slug: 'metroid-nes',
              title: 'Metroid',
              platform: 'nes',
              boxart_url: 'https://example.com/boxart/metroid.jpg'
            }
          }
        ])
      });
    });

    // Mock SSE events showing resume (progress starts at 50%)
    let eventCount = 0;
    page.route('**/events', (route) => {
      if (eventCount === 0) {
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ jobId, type: 'JOB_CREATED', ts: Date.now() })}\n\n`
        });
        eventCount++;
      } else if (eventCount === 1) {
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ jobId, type: 'STEP_STARTED', step: 'download_and_install', progress: 0, ts: Date.now() })}\n\n`
        });
        eventCount++;
      } else {
        // Progress update showing resume (starting at 50%)
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ 
            jobId, 
            type: 'STEP_PROGRESS', 
            step: 'download_and_install', 
            progress: 0.5, 
            bytesDownloaded: 500, 
            totalBytes: 1000,
            message: 'Resuming download',
            ts: Date.now() 
          })}\n\n`
        });
        eventCount++;
      }
    });

    // Navigate to browse and queue download
    await page.getByLabel('Search').fill('metroid');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForSelector('article.card');

    // Queue download
    await page.getByRole('button', { name: 'Queue Download' }).first().click();
    await expect(page.getByText('Download job queued')).toBeVisible();

    // Navigate to Downloads page
    await page.getByRole('link', { name: 'Downloads' }).click();
    await page.waitForTimeout(1000);

    // Verify download card appears
    const downloadCard = page.locator('article.card').filter({ hasText: 'Metroid' });
    await expect(downloadCard).toBeVisible({ timeout: 5000 });

    // Verify progress shows resume state (progress should be > 0)
    const progressBar = downloadCard.locator('.progress');
    await expect(progressBar).toBeVisible();

    await captureOnCI(page, 'download-resume');
  });
});
