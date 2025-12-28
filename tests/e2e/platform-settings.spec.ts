import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * E2E tests for Platform Settings Configuration
 * 
 * Tests the full integration of platform acronyms and icons:
 * 1. API endpoints for getting/setting platform configuration
 * 2. Settings persistence across page reloads
 * 3. Validation of custom acronyms and icons
 */

test.describe('Platform Settings E2E', () => {
  const API_BASE = process.env.API_BASE_URL || 'http://localhost:3333';

  test.beforeEach(async ({ page }) => {
    // Navigate to settings page
    await page.goto('/settings');
    
    // Dismiss welcome view if present
    const welcomeSkipButton = page.getByRole('button', { name: /Skip|Get Started/i });
    try {
      await welcomeSkipButton.waitFor({ state: 'visible', timeout: 2000 });
      await welcomeSkipButton.click();
      await page.waitForTimeout(300);
    } catch {
      // Welcome view not shown
    }
  });

  test('should get default settings via API', async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/settings`);
    expect(response.ok()).toBeTruthy();
    
    const settings = await response.json();
    expect(settings).toHaveProperty('downloadDir');
    expect(settings).toHaveProperty('libraryDir');
    expect(settings).toHaveProperty('platformAcronyms');
    expect(settings).toHaveProperty('platformIcons');
    
    // Should have empty override objects by default
    expect(settings.platformAcronyms).toEqual({});
    expect(settings.platformIcons).toEqual({});
  });

  test('should accept valid custom platform acronyms via API', async ({ page }) => {
    const customSettings = {
      downloadDir: './downloads',
      libraryDir: './library',
      platformAcronyms: {
        'snes': 'sfc',
        'playstation': 'psx',
        'n64': 'n64'
      },
      platformIcons: {
        'snes': 'nintendo',
        'playstation': 'sony'
      }
    };

    const putResponse = await page.request.put(`${API_BASE}/settings`, {
      data: customSettings
    });
    expect(putResponse.ok()).toBeTruthy();
    expect(await putResponse.json()).toEqual({ ok: true });

    // Verify settings were saved
    const getResponse = await page.request.get(`${API_BASE}/settings`);
    const savedSettings = await getResponse.json();
    
    expect(savedSettings.platformAcronyms).toEqual(customSettings.platformAcronyms);
    expect(savedSettings.platformIcons).toEqual(customSettings.platformIcons);
  });

  test('should reject invalid acronyms via API', async ({ page }) => {
    const invalidSettings = {
      downloadDir: './downloads',
      libraryDir: './library',
      platformAcronyms: {
        'snes': 'x' // Too short
      }
    };

    const response = await page.request.put(`${API_BASE}/settings`, {
      data: invalidSettings
    });
    
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('Invalid acronym "x"');
    expect(error.error).toContain('2-12 characters');
  });

  test('should reject invalid icon brands via API', async ({ page }) => {
    const invalidSettings = {
      downloadDir: './downloads',
      libraryDir: './library',
      platformIcons: {
        'snes': 'playstation' // Invalid brand
      }
    };

    const response = await page.request.put(`${API_BASE}/settings`, {
      data: invalidSettings
    });
    
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('Invalid icon brand "playstation"');
  });

  test('should persist settings across page reloads', async ({ page }) => {
    // Set custom settings
    const customSettings = {
      downloadDir: './downloads',
      libraryDir: './library',
      platformAcronyms: {
        'genesis': 'md',
        'sega cd': 'scd'
      },
      platformIcons: {
        'genesis': 'sega'
      }
    };

    await page.request.put(`${API_BASE}/settings`, {
      data: customSettings
    });

    // Reload the page
    await page.reload();
    await page.waitForTimeout(500);

    // Verify settings are still there
    const response = await page.request.get(`${API_BASE}/settings`);
    const settings = await response.json();
    
    expect(settings.platformAcronyms).toEqual(customSettings.platformAcronyms);
    expect(settings.platformIcons).toEqual(customSettings.platformIcons);
  });

  test('should accept all valid icon brands', async ({ page }) => {
    const validBrands = ['nintendo', 'sony', 'xbox', 'sega', 'pc', 'atari', 'commodore', 'nec', 'generic'];
    
    for (const brand of validBrands) {
      const settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformIcons: {
          'test-platform': brand
        }
      };

      const response = await page.request.put(`${API_BASE}/settings`, {
        data: settings
      });
      
      expect(response.ok()).toBeTruthy();
    }
  });

  test('should validate acronym length constraints', async ({ page }) => {
    // Test minimum length (2 chars)
    const tooShort = await page.request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: { 'test': 'a' }
      }
    });
    expect(tooShort.status()).toBe(400);

    // Test maximum length (12 chars)
    const tooLong = await page.request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: { 'test': 'verylongacronym' }
      }
    });
    expect(tooLong.status()).toBe(400);

    // Test valid 2-char
    const validMin = await page.request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: { 'test': 'ab' }
      }
    });
    expect(validMin.ok()).toBeTruthy();

    // Test valid 12-char
    const validMax = await page.request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: { 'test': 'twelve-chars' }
      }
    });
    expect(validMax.ok()).toBeTruthy();
  });

  test('should validate acronym character constraints', async ({ page }) => {
    // Test invalid characters
    const invalidChars = ['test!', 'test@platform', 'test.platform', 'test/platform', 'test platform'];
    
    for (const acronym of invalidChars) {
      const response = await page.request.put(`${API_BASE}/settings`, {
        data: {
          downloadDir: './downloads',
          libraryDir: './library',
          platformAcronyms: { 'test': acronym }
        }
      });
      expect(response.status()).toBe(400);
    }

    // Test valid characters
    const validChars = ['test-abc', 'test_abc', 'test123', 'TEST', 'abc-123_xyz'];
    
    for (const acronym of validChars) {
      const response = await page.request.put(`${API_BASE}/settings`, {
        data: {
          downloadDir: './downloads',
          libraryDir: './library',
          platformAcronyms: { 'test': acronym }
        }
      });
      expect(response.ok()).toBeTruthy();
    }
  });

  test('should allow empty override objects', async ({ page }) => {
    const response = await page.request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {},
        platformIcons: {}
      }
    });
    
    expect(response.ok()).toBeTruthy();
  });

  test('should allow missing override fields', async ({ page }) => {
    const response = await page.request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library'
      }
    });
    
    expect(response.ok()).toBeTruthy();
  });

  test('should handle mixed valid and invalid configurations', async ({ page }) => {
    // Should reject if ANY value is invalid
    const mixedSettings = {
      downloadDir: './downloads',
      libraryDir: './library',
      platformAcronyms: {
        'snes': 'sfc',  // valid
        'n64': 'x'      // invalid - too short
      }
    };

    const response = await page.request.put(`${API_BASE}/settings`, {
      data: mixedSettings
    });
    
    expect(response.status()).toBe(400);
  });

  test.afterAll(async ({ page }) => {
    // Reset settings to defaults
    await page.request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {},
        platformIcons: {}
      }
    });
  });
});
