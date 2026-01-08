import { test, expect } from '@playwright/test';

// Cover dimensions from theme.ts (--cover-w and --cover-h)
const COVER_WIDTH = 200;
const COVER_HEIGHT = 266;
const DIMENSION_TOLERANCE = 10; // Tolerance for rendering differences

/**
 * Cover Image Rendering E2E Test
 * 
 * Validates that cover images in the library view:
 * - Use object-fit: contain (not cover) to prevent cropping
 * - Maintain proper aspect ratio
 * - Display without content loss
 */
test.describe('Cover Image Rendering', () => {
  test('cover images should use contain fit and preserve aspect ratio', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Dismiss welcome view if present
    const welcomeSkipButton = page.getByRole('button', { name: /Skip|Get Started/i });
    try {
      await welcomeSkipButton.waitFor({ state: 'visible', timeout: 2000 });
      await welcomeSkipButton.click();
      await page.waitForTimeout(500);
    } catch {
      // Welcome view not shown, continue
    }

    // Navigate to Browse page to check cover images there
    await test.step('Browse page - Verify cover image CSS', async () => {
      // Should be on browse page by default, but navigate to be sure
      await page.click('nav a[href="/browse"]');
      await expect(page.getByRole('heading', { name: 'Browse CrocDB' })).toBeVisible();
      
      // Perform a search to get some results
      await page.fill('input[name="search"]', 'Super Mario');
      await page.click('button[type="submit"]');
      
      // Wait for search results (may fail if API is unavailable)
      await page.waitForTimeout(2000);
      
      // Check if any cover images are present
      const coverImages = page.locator('.cover-img');
      const coverCount = await coverImages.count();
      
      if (coverCount > 0) {
        // Get the first cover image
        const firstCover = coverImages.first();
        
        // Verify it's visible
        await expect(firstCover).toBeVisible({ timeout: 5000 });
        
        // Check computed style for object-fit
        const objectFit = await firstCover.evaluate((el) => {
          return window.getComputedStyle(el).objectFit;
        });
        
        // Should be 'contain' not 'cover'
        expect(objectFit).toBe('contain');
        
        // Verify the image has the expected dimensions
        const dimensions = await firstCover.boundingBox();
        if (dimensions) {
          // Cover dimensions from theme.ts: --cover-w: 200px, --cover-h: 266px
          // Allow tolerance for rendering differences
          expect(Math.abs(dimensions.width - COVER_WIDTH)).toBeLessThanOrEqual(DIMENSION_TOLERANCE);
          expect(Math.abs(dimensions.height - COVER_HEIGHT)).toBeLessThanOrEqual(DIMENSION_TOLERANCE);
        }
      }
    });
    
    // Navigate to Library page
    await test.step('Library page - Verify cover image CSS', async () => {
      await page.click('nav a[href="/library"]');
      
      // Verify we're on the library page
      const libraryHeading = page.getByRole('heading', { name: /Library/i });
      await expect(libraryHeading).toBeVisible();
      
      // Wait for library to load
      await page.waitForTimeout(1000);
      
      // Check for cover images in library
      const libraryCoverImages = page.locator('.cover-img');
      const libraryCount = await libraryCoverImages.count();
      
      if (libraryCount > 0) {
        const firstLibraryCover = libraryCoverImages.first();
        await expect(firstLibraryCover).toBeVisible({ timeout: 5000 });
        
        // Verify object-fit is 'contain'
        const objectFit = await firstLibraryCover.evaluate((el) => {
          return window.getComputedStyle(el).objectFit;
        });
        
        expect(objectFit).toBe('contain');
        
        // Verify background color is set (to fill empty space)
        const backgroundColor = await firstLibraryCover.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });
        
        // Should have a background color (not transparent)
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      }
    });
  });

  test('cover image placeholder should display correctly', async ({ page }) => {
    await page.goto('/');
    
    // Dismiss welcome view if present
    const welcomeSkipButton = page.getByRole('button', { name: /Skip|Get Started/i });
    try {
      await welcomeSkipButton.waitFor({ state: 'visible', timeout: 2000 });
      await welcomeSkipButton.click();
      await page.waitForTimeout(500);
    } catch {
      // Welcome view not shown
    }

    // Navigate to library
    await page.click('nav a[href="/library"]');
    await page.waitForTimeout(1000);
    
    // Check for placeholder elements
    const placeholders = page.locator('.thumb-placeholder');
    const placeholderCount = await placeholders.count();
    
    if (placeholderCount > 0) {
      const firstPlaceholder = placeholders.first();
      await expect(firstPlaceholder).toBeVisible();
      
      // Verify placeholder has correct dimensions
      const dimensions = await firstPlaceholder.boundingBox();
      if (dimensions) {
        expect(Math.abs(dimensions.width - COVER_WIDTH)).toBeLessThanOrEqual(DIMENSION_TOLERANCE);
        expect(Math.abs(dimensions.height - COVER_HEIGHT)).toBeLessThanOrEqual(DIMENSION_TOLERANCE);
      }
    }
  });
});
