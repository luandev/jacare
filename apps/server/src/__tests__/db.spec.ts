import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

// Mock the config module before importing db
// Note: We use os.tmpdir() directly in the mock since vi.mock is hoisted
vi.mock('../config', () => ({
  PORT: 3333,
  CROCDESK_DATA_DIR: path.join(os.tmpdir(), 'crocdesk-test-db'),
  CROCDB_BASE_URL: 'https://api.crocdb.net',
  CROCDB_CACHE_TTL_MS: 86400000,
  getDefaultSettings: () => ({
    downloadDir: './downloads',
    libraryDir: './library',
    queue: {
      concurrency: 2
    }
  })
}));

// Import after mocking
import { initDb } from '../db';
import { CROCDESK_DATA_DIR } from '../config';

// Helper function to clean up database files with retry logic for Windows file locking
async function cleanupDbFiles(dir: string, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      // On Windows, database files can be locked briefly after closing
      if (err.code === 'EBUSY' && i < retries - 1) {
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        continue;
      }
      // If it's not EBUSY or we've exhausted retries, throw
      throw error;
    }
  }
}

describe('database initialization', () => {
  beforeEach(async () => {
    // Clean up test directory before each test
    await cleanupDbFiles(CROCDESK_DATA_DIR);
  });

  afterAll(async () => {
    // Clean up test directory after all tests
    await cleanupDbFiles(CROCDESK_DATA_DIR);
  });

  it('should initialize database with proper permissions', async () => {
    // This test verifies that the database can be initialized in a writable directory
    await expect(initDb()).resolves.toBeUndefined();

    // Verify database file was created
    const dbPath = path.join(CROCDESK_DATA_DIR, 'crocdesk.db');
    const dbExists = await fs.access(dbPath).then(() => true).catch(() => false);
    expect(dbExists).toBe(true);
  });

  // it('should fail with clear error message when directory is not writable', async () => {
  //   // Create directory without write permissions
  //   await fs.mkdir(CROCDESK_DATA_DIR, { recursive: true });
  //   await fs.chmod(CROCDESK_DATA_DIR, 0o444); // read-only
// 
  //   // Should fail with a clear error message
  //   await expect(initDb()).rejects.toThrow(/Cannot write to data directory/);
// 
  //   // Restore permissions for cleanup
  //   try {
  //     await fs.chmod(CROCDESK_DATA_DIR, 0o755);
  //   } catch {
  //     // Ignore chmod errors on Windows where permissions work differently
  //   }
  //   
  //   // Clean up - handle potential file locks on Windows
  //   await cleanupDbFiles(CROCDESK_DATA_DIR);
  // });
});
