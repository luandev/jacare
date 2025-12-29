import { test, expect } from '@playwright/test';

/**
 * E2E tests for Platform Settings Configuration
 * 
 * Tests the full integration of platform acronyms and icons:
 * 1. API endpoints for getting/setting platform configuration
 * 2. Settings persistence across page reloads
 * 3. Validation of custom acronyms and icons
 */

test.describe('Platform Settings E2E', () => {
  const API_BASE = 'http://localhost:3333';

  test('should get default settings via API', async ({ request }) => {
    const response = await request.get(`${API_BASE}/settings`);
    expect(response.ok()).toBeTruthy();
    
    const settings = await response.json();
    expect(settings).toHaveProperty('downloadDir');
    expect(settings).toHaveProperty('libraryDir');
    expect(settings).toHaveProperty('platformAcronyms');
    expect(settings).toHaveProperty('platformIcons');
    
    // Should have empty override objects by default (or may have been set by previous tests)
    expect(settings.platformAcronyms).toBeDefined();
    expect(settings.platformIcons).toBeDefined();
  });

  test('should accept valid custom platform acronyms via API', async ({ request }) => {
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

    const putResponse = await request.put(`${API_BASE}/settings`, {
      data: customSettings
    });
    expect(putResponse.ok()).toBeTruthy();
    expect(await putResponse.json()).toEqual({ ok: true });

    // Verify settings were saved
    const getResponse = await request.get(`${API_BASE}/settings`);
    const savedSettings = await getResponse.json();
    
    expect(savedSettings.platformAcronyms).toEqual(customSettings.platformAcronyms);
    expect(savedSettings.platformIcons).toEqual(customSettings.platformIcons);
  });

  test('should reject invalid acronyms via API', async ({ request }) => {
    const invalidSettings = {
      downloadDir: './downloads',
      libraryDir: './library',
      platformAcronyms: {
        'snes': 'x' // Too short
      }
    };

    const response = await request.put(`${API_BASE}/settings`, {
      data: invalidSettings
    });
    
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('Invalid acronym "x"');
    expect(error.error).toContain('2-12 characters');
  });

  test('should reject invalid icon brands via API', async ({ request }) => {
    const invalidSettings = {
      downloadDir: './downloads',
      libraryDir: './library',
      platformIcons: {
        'snes': 'playstation' // Invalid brand
      }
    };

    const response = await request.put(`${API_BASE}/settings`, {
      data: invalidSettings
    });
    
    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toContain('Invalid icon brand "playstation"');
  });

  test('should persist settings across requests', async ({ request }) => {
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

    await request.put(`${API_BASE}/settings`, {
      data: customSettings
    });

    // Verify settings are persisted with a new request
    const response = await request.get(`${API_BASE}/settings`);
    const settings = await response.json();
    
    expect(settings.platformAcronyms).toEqual(customSettings.platformAcronyms);
    expect(settings.platformIcons).toEqual(customSettings.platformIcons);
  });

  test('should accept all valid icon brands', async ({ request }) => {
    const validBrands = ['nintendo', 'sony', 'xbox', 'sega', 'pc', 'atari', 'commodore', 'nec', 'generic'];
    
    for (const brand of validBrands) {
      const settings = {
        downloadDir: './downloads',
        libraryDir: './library',
        platformIcons: {
          'test-platform': brand
        }
      };

      const response = await request.put(`${API_BASE}/settings`, {
        data: settings
      });
      
      expect(response.ok()).toBeTruthy();
    }
  });

  test('should validate acronym length constraints', async ({ request }) => {
    // Test minimum length (2 chars)
    const tooShort = await request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: { 'test': 'a' }
      }
    });
    expect(tooShort.status()).toBe(400);

    // Test maximum length (12 chars)
    const tooLong = await request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: { 'test': 'verylongacronym' }
      }
    });
    expect(tooLong.status()).toBe(400);

    // Test valid 2-char
    const validMin = await request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: { 'test': 'ab' }
      }
    });
    expect(validMin.ok()).toBeTruthy();

    // Test valid 12-char
    const validMax = await request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: { 'test': 'twelve-chars' }
      }
    });
    expect(validMax.ok()).toBeTruthy();
  });

  test('should validate acronym character constraints', async ({ request }) => {
    // Test invalid characters
    const invalidChars = ['test!', 'test@platform', 'test.platform', 'test/platform', 'test platform'];
    
    for (const acronym of invalidChars) {
      const response = await request.put(`${API_BASE}/settings`, {
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
      const response = await request.put(`${API_BASE}/settings`, {
        data: {
          downloadDir: './downloads',
          libraryDir: './library',
          platformAcronyms: { 'test': acronym }
        }
      });
      expect(response.ok()).toBeTruthy();
    }
  });

  test('should allow empty override objects', async ({ request }) => {
    const response = await request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {},
        platformIcons: {}
      }
    });
    
    expect(response.ok()).toBeTruthy();
  });

  test('should allow missing override fields', async ({ request }) => {
    const response = await request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library'
      }
    });
    
    expect(response.ok()).toBeTruthy();
  });

  test('should handle mixed valid and invalid configurations', async ({ request }) => {
    // Should reject if ANY value is invalid
    const mixedSettings = {
      downloadDir: './downloads',
      libraryDir: './library',
      platformAcronyms: {
        'snes': 'sfc',  // valid
        'n64': 'x'      // invalid - too short
      }
    };

    const response = await request.put(`${API_BASE}/settings`, {
      data: mixedSettings
    });
    
    expect(response.status()).toBe(400);
  });

  test.afterAll(async ({ request }) => {
    // Reset settings to defaults
    await request.put(`${API_BASE}/settings`, {
      data: {
        downloadDir: './downloads',
        libraryDir: './library',
        platformAcronyms: {},
        platformIcons: {}
      }
    });
  });
});
