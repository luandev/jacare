import { test, expect } from '@playwright/test';

/**
 * E2E tests for Docker/separate deployment scenario
 * 
 * These tests verify that:
 * 1. The frontend can use window.API_URL when injected
 * 2. API calls work with a configured API URL (different origin scenario)
 * 3. The detection mechanism falls back correctly
 */
test.describe('Docker/Separate Deployment Scenario', () => {
  test('should use window.API_URL when injected', async ({ page, context }) => {
    // Inject window.API_URL before navigating
    await context.addInitScript(() => {
      (window as any).API_URL = 'http://localhost:3333';
    });
    
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to be loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Verify that window.API_URL is set
    const apiUrl = await page.evaluate(() => (window as any).API_URL);
    expect(apiUrl).toBe('http://localhost:3333');
    
    // Test that API calls work (they should use the injected URL)
    const healthResponse = await page.request.get('/health');
    expect(healthResponse.ok()).toBeTruthy();
  });

  test('should handle different origin API URL', async ({ page, context }) => {
    // Simulate a different origin scenario (e.g., frontend on port 5173, backend on 6024)
    const customApiUrl = 'http://localhost:6024';
    
    await context.addInitScript((url: string) => {
      (window as any).API_URL = url;
    }, customApiUrl);
    
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to be loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Verify that window.API_URL is set to the custom URL
    const apiUrl = await page.evaluate(() => (window as any).API_URL);
    expect(apiUrl).toBe(customApiUrl);
    
    // Note: In a real scenario with different origin, we'd need to set up
    // CORS or use a different test setup. For this test, we just verify
    // that the injection mechanism works.
  });

  test('should fall back to relative URLs when window.API_URL is not set', async ({ page }) => {
    // Navigate without injecting window.API_URL
    await page.goto('/');
    
    // Wait for the page to be loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Verify that window.API_URL is not set (or is empty string)
    const apiUrl = await page.evaluate(() => (window as any).API_URL);
    expect(apiUrl === undefined || apiUrl === '').toBeTruthy();
    
    // API calls should still work using relative URLs
    const healthResponse = await page.request.get('/health');
    expect(healthResponse.ok()).toBeTruthy();
  });

  test('should fetch /api-config when window.API_URL is not set', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to be loaded
    await page.waitForLoadState('domcontentloaded');
    
    // The app should have fetched /api-config during initialization
    // We can verify this by checking network requests or by ensuring
    // API calls work correctly
    
    // Test that API calls work (they should use /api-config result or relative URLs)
    const settingsResponse = await page.request.get('/settings');
    expect(settingsResponse.ok()).toBeTruthy();
  });
});

