import { test, expect } from '@playwright/test';

/**
 * Big Picture Mode e2e test
 * 
 * Tests the Big Picture Mode UI including:
 * 1. Entering Big Picture mode from settings
 * 2. Navigation with keyboard
 * 3. Section switching
 * 4. Exiting Big Picture mode
 */
test.describe('Big Picture Mode E2E', () => {
  test('user can enter, navigate, and exit Big Picture mode', async ({ page }) => {
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
    
    // Step 1: Navigate to Settings
    await test.step('Navigate to Settings page', async () => {
      const settingsLink = page.getByRole('link', { name: 'Settings' });
      await settingsLink.click();
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    });
    
    // Step 2: Enter Big Picture Mode
    await test.step('Enter Big Picture Mode', async () => {
      const enterBigPictureButton = page.getByRole('button', { name: /Enter Big Picture Mode/i });
      await expect(enterBigPictureButton).toBeVisible();
      await enterBigPictureButton.click();
      
      // Wait for Big Picture mode to load
      await page.waitForTimeout(500);
      
      // Verify Big Picture elements are visible
      await expect(page.locator('.big-picture-mode')).toBeVisible();
      await expect(page.locator('.bp-logo')).toContainText('Jacare');
      
      // Verify navigation items
      await expect(page.getByText('Home')).toBeVisible();
      await expect(page.getByText('Library')).toBeVisible();
      await expect(page.getByText('Search')).toBeVisible();
      await expect(page.getByText('Downloads')).toBeVisible();
      await expect(page.getByText('Settings')).toBeVisible();
      await expect(page.getByText('Exit')).toBeVisible();
    });
    
    // Step 3: Test keyboard navigation
    await test.step('Navigate with keyboard', async () => {
      // Verify we're on Home (Welcome screen)
      await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
      await expect(page.getByText('Welcome to Big Picture Mode')).toBeVisible();
      
      // Press ArrowDown to navigate to Library
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
      
      // Press ArrowDown to navigate to Search
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
      
      // Press ArrowUp to go back to Library
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(300);
      await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
    });
    
    // Step 4: Test Library section
    await test.step('Verify Library section', async () => {
      // Should show empty state if no items
      const emptyMessage = page.getByText('Your library is empty');
      if (await emptyMessage.isVisible()) {
        await expect(page.getByText('Browse and download games to get started')).toBeVisible();
      }
    });
    
    // Step 5: Navigate to Downloads
    await test.step('Navigate to Downloads section', async () => {
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      await expect(page.getByRole('heading', { name: 'Downloads' })).toBeVisible();
    });
    
    // Step 6: Exit Big Picture Mode
    await test.step('Exit Big Picture Mode', async () => {
      // Press Escape to exit
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Verify we're back to normal mode
      const bigPictureMode = page.locator('.big-picture-mode');
      await expect(bigPictureMode).not.toBeVisible();
      
      // Verify normal UI is visible
      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toBeVisible();
    });
  });
  
  test('user can click navigation items in Big Picture mode', async ({ page }) => {
    await page.goto('/');
    
    // Dismiss welcome if shown
    try {
      await page.getByRole('button', { name: /Skip/i }).click({ timeout: 2000 });
      await page.waitForTimeout(300);
    } catch {
      // Continue
    }
    
    // Navigate to Settings and enter Big Picture
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('button', { name: /Enter Big Picture Mode/i }).click();
    await page.waitForTimeout(500);
    
    // Test clicking navigation items
    await test.step('Click Library navigation', async () => {
      const libraryButton = page.locator('.bp-nav-item', { hasText: 'Library' });
      await libraryButton.click();
      await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
    });
    
    await test.step('Click Search navigation', async () => {
      const searchButton = page.locator('.bp-nav-item', { hasText: 'Search' });
      await searchButton.click();
      await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
    });
    
    await test.step('Click Exit to leave Big Picture', async () => {
      const exitButton = page.locator('.bp-nav-item', { hasText: 'Exit' });
      await exitButton.click();
      await page.waitForTimeout(500);
      
      // Verify we exited
      await expect(page.locator('.big-picture-mode')).not.toBeVisible();
    });
  });
  
  test('Big Picture mode has proper focus indicators', async ({ page }) => {
    await page.goto('/');
    
    // Skip welcome
    try {
      await page.getByRole('button', { name: /Skip/i }).click({ timeout: 2000 });
      await page.waitForTimeout(300);
    } catch {
      // Continue
    }
    
    // Enter Big Picture mode
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('button', { name: /Enter Big Picture Mode/i }).click();
    await page.waitForTimeout(500);
    
    await test.step('Verify focus indicators on navigation', async () => {
      // Home should be focused initially
      const homeButton = page.locator('.bp-nav-item.focused', { hasText: 'Home' });
      await expect(homeButton).toBeVisible();
      
      // Navigate and check focus moves
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);
      
      const libraryButton = page.locator('.bp-nav-item.focused', { hasText: 'Library' });
      await expect(libraryButton).toBeVisible();
    });
  });
});
