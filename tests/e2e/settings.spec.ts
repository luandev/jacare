import { test, expect } from '@playwright/test';

const settings = {
  downloadDir: 'C:/Games',
};

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(settings) }));
    await page.goto('/');
  });

  test('renders basic settings form', async ({ page }) => {
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Download Directory' })).toBeVisible();
    await expect(page.getByPlaceholder('./downloads')).toBeVisible();
  });
});
