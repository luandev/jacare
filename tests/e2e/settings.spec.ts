import { test, expect } from '@playwright/test';

const settings = {
  libraryRoots: [],
  downloadDir: 'C:/Games',
};

const profiles = [
  { id: 'default', name: 'Default', platforms: {}, profileId: 'default' },
];

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(settings) }));
    await page.route('**/profiles', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profiles) }));
    await page.goto('/');
  });

  test('renders settings and profiles lists', async ({ page }) => {
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Profiles' })).toBeVisible();
    await expect(page.locator('strong', { hasText: 'Default' })).toBeVisible();
  });
});
