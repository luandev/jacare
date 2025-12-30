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
  ENABLE_DOWNLOADS: 'false'
}));

// Import after mocking
import { initDb } from '../db';
import { CROCDESK_DATA_DIR } from '../config';

describe('database initialization', () => {
  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.rm(CROCDESK_DATA_DIR, { recursive: true, force: true });
  });

  afterAll(async () => {
    // Clean up test directory after all tests
    await fs.rm(CROCDESK_DATA_DIR, { recursive: true, force: true });
  });

  it('should initialize database with proper permissions', async () => {
    // This test verifies that the database can be initialized in a writable directory
    await expect(initDb()).resolves.toBeUndefined();

    // Verify database file was created
    const dbPath = path.join(CROCDESK_DATA_DIR, 'crocdesk.db');
    const dbExists = await fs.access(dbPath).then(() => true).catch(() => false);
    expect(dbExists).toBe(true);
  });

  it('should fail with clear error message when directory is not writable', async () => {
    // Create directory without write permissions
    await fs.mkdir(CROCDESK_DATA_DIR, { recursive: true });
    await fs.chmod(CROCDESK_DATA_DIR, 0o444); // read-only

    // Should fail with a clear error message
    await expect(initDb()).rejects.toThrow(/Cannot write to data directory/);

    // Restore permissions for cleanup
    await fs.chmod(CROCDESK_DATA_DIR, 0o755);
  });
});
