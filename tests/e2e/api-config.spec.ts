import { test, expect } from '@playwright/test';

/**
 * E2E tests for API URL configuration
 * 
 * These tests verify that:
 * 1. The /api-config endpoint returns correct configuration
 * 2. API calls work with relative URLs (same-origin scenario)
 * 3. The frontend can detect and use the API URL correctly
 */
test.describe('API Configuration', () => {
  test('should return API config from /api-config endpoint', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Fetch the API config endpoint
    const response = await page.request.get('/api-config');
    expect(response.ok()).toBeTruthy();
    
    const config = await response.json();
    expect(config).toHaveProperty('apiUrl');
    expect(config).toHaveProperty('port');
    expect(typeof config.apiUrl).toBe('string');
    expect(typeof config.port).toBe('number');
    
    // API URL should be a valid URL
    expect(config.apiUrl).toMatch(/^https?:\/\//);
  });

  test('should use relative URLs for same-origin API calls', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Try to fetch a simple endpoint (health check)
    const healthResponse = await page.request.get('/health');
    expect(healthResponse.ok()).toBeTruthy();
    
    const healthData = await healthResponse.json();
    expect(healthData).toHaveProperty('ok');
    expect(healthData.ok).toBe(true);
  });

  test('should successfully make API calls using detected API URL', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to initialize
    await page.waitForLoadState('networkidle');
    
    // Test that we can fetch settings (a real API endpoint)
    const settingsResponse = await page.request.get('/settings');
    expect(settingsResponse.ok()).toBeTruthy();
    
    const settings = await settingsResponse.json();
    // Settings should have a data property (wrapped response)
    expect(settings).toHaveProperty('data');
  });

  test('should handle /api-config endpoint in SPA routing', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // The /api-config endpoint should not be caught by SPA routing
    // It should return JSON, not HTML
    const response = await page.request.get('/api-config');
    expect(response.ok()).toBeTruthy();
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    const config = await response.json();
    expect(config).toHaveProperty('apiUrl');
  });
});

