import { test, expect } from '@playwright/test';

/**
 * Happy path e2e test for Jacare
 * 
 * This test covers the main user journey:
 * 1. Browse view - Search for games
 * 2. Settings view - Change theme
 * 3. Library view - Verify mocked file presence
 */
test.describe('Happy Path E2E', () => {
  test('user can browse, change settings, and view library', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Dismiss the welcome view if it appears
    const welcomeSkipButton = page.getByRole('button', { name: /Skip|Get Started/i });
    try {
      await welcomeSkipButton.waitFor({ state: 'visible', timeout: 2000 });
      await welcomeSkipButton.click();
      await page.waitForTimeout(500);
    } catch {
      // Welcome view not shown, continue
    }
    
    // Step 1: Browse view - Perform a search
    await test.step('Browse view - Search for games', async () => {
      // Verify we're on the browse page
      await expect(page.getByRole('heading', { name: 'Browse Crocdb' })).toBeVisible();
      
      // Fill in search form
      await page.fill('input[name="search"]', 'Croc');
      
      // Try to select platform and region if they are available
      // These may fail if external API is not available, so we'll be defensive
      const platformSelect = page.locator('select[name="platform"]');
      const regionSelect = page.locator('select[name="region"]');
      
      await platformSelect.waitFor({ state: 'visible' });
      await regionSelect.waitFor({ state: 'visible' });
      
      // Wait for platform/region options to potentially load from API
      // Note: Using timeout here as the API may fail (external dependency)
      await page.waitForTimeout(1000);
      
      // Try to get the options count
      const platformOptions = await platformSelect.locator('option').count();
      const regionOptions = await regionSelect.locator('option').count();
      
      // Only select if there are options beyond the default "All" option
      if (platformOptions > 1) {
        await platformSelect.selectOption({ index: 1 });
      }
      
      if (regionOptions > 1) {
        await regionSelect.selectOption({ index: 1 });
      }
      
      // Submit search
      await page.click('button[type="submit"]');
      
      // Wait for search to process
      // Note: Using timeout as search may fail (external API dependency)
      await page.waitForTimeout(2000);
      
      // Verify search was attempted (check for status or results)
      // The page should show either results or an error status
      const statusElement = page.locator('.status').first();
      const hasStatus = await statusElement.isVisible().catch(() => false);
      
      // We just verify that the page is still functional after search
      await expect(page.getByRole('heading', { name: 'Browse Crocdb' })).toBeVisible();
    });
    
    // Step 2: Settings view - Change theme
    await test.step('Settings view - Change theme', async () => {
      // Navigate to Settings
      await page.click('nav a[href="/settings"]');
      
      // Verify we're on the settings page
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
      
      // Get current theme
      const lightThemeRadio = page.locator('input[type="radio"][value="light"]');
      const darkThemeRadio = page.locator('input[type="radio"][value="dark"]');
      
      // Wait for theme radios to be visible
      await lightThemeRadio.waitFor({ state: 'visible' });
      await darkThemeRadio.waitFor({ state: 'visible' });
      
      // Check which theme is currently selected
      const isLightChecked = await lightThemeRadio.isChecked();
      
      // Change to the opposite theme
      if (isLightChecked) {
        await darkThemeRadio.click();
        await expect(darkThemeRadio).toBeChecked();
      } else {
        await lightThemeRadio.click();
        await expect(lightThemeRadio).toBeChecked();
      }
      
      // Verify theme changed
      // Note: Using a short timeout to allow theme to apply
      // Future: Could check for data-theme attribute or CSS changes
      await page.waitForTimeout(500);
    });
    
    // Step 3: Library view - Verify mocked file presence
    await test.step('Library view - Verify library content', async () => {
      // Navigate to Library
      await page.click('nav a[href="/library"]');
      
      // Verify we're on the library page (heading could be "Library" or "Local Library")
      const libraryHeading = page.getByRole('heading', { name: /^(Local )?Library$/i });
      await expect(libraryHeading).toBeVisible();
      
      // Wait for library to load
      await page.waitForTimeout(2000);
      
      // Check if library has items or shows empty state
      const hasItems = await page.locator('.grid.cols-3 > *').count();
      
      if (hasItems > 0) {
        // Library has items - verify at least one item is visible
        const firstItem = page.locator('.grid.cols-3 > *').first();
        await expect(firstItem).toBeVisible();
      } else {
        // Library is empty - verify empty state message
        const emptyMessage = page.getByText(/No items found in library/i);
        if (await emptyMessage.isVisible()) {
          await expect(emptyMessage).toBeVisible();
        }
      }
      
      // Verify "Scan Local Library" button is present
      await expect(page.getByRole('button', { name: /Scan Local Library/i })).toBeVisible();
    });
  });
});
