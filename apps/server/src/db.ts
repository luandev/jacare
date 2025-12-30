import Database from "better-sqlite3";
import path from "path";
import { DEFAULT_SETTINGS } from "@crocdesk/shared";
import type {
  JobRecord,
  JobStatus,
  JobStepRecord,
  LibraryItem,
  Settings
} from "@crocdesk/shared";
import { CROCDESK_DATA_DIR } from "./config";
import { ensureDir } from "./utils/fs";

const dbPath = path.join(CROCDESK_DATA_DIR, "crocdesk.db");

let db: Database.Database | null = null;

export async function initDb(): Promise<void> {
  await ensureDir(CROCDESK_DATA_DIR);
  
  // Test write permissions before opening database
  const testFile = path.join(CROCDESK_DATA_DIR, ".write_test");
  try {
    const fs = await import("fs");
    await fs.promises.writeFile(testFile, "test", "utf-8");
    await fs.promises.unlink(testFile);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new Error(
      `Cannot write to data directory: ${CROCDESK_DATA_DIR}. ` +
      `Error: ${err.message}. ` +
      `Please ensure the directory exists and has write permissions for the current user.`
    );
  }
  
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crocdb_cache_search (
      query_hash TEXT PRIMARY KEY,
      response_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crocdb_cache_entry (
      slug TEXT PRIMARY KEY,
      response_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS library_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL UNIQUE,
      size INTEGER NOT NULL,
      mtime INTEGER NOT NULL,
      hash TEXT,
      platform TEXT,
      game_slug TEXT,
      source TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      step TEXT NOT NULL,
      status TEXT NOT NULL,
      progress REAL NOT NULL,
      message TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    );
  `);

  ensureDefaults();
}

function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

function ensureDefaults(): void {
  const settings = getSettings();
  if (!settings) {
    setSettings(DEFAULT_SETTINGS);
  }
}

export function getSettings(): Settings | null {
  const row = getDb()
    .prepare("SELECT data FROM settings WHERE id = 1")
    .get() as { data: string } | undefined;
  if (!row) {
    return null;
  }
  return JSON.parse(row.data) as Settings;
}

export function setSettings(settings: Settings): void {
  const payload = JSON.stringify(settings);
  getDb()
    .prepare("INSERT INTO settings (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = ?")
    .run(payload, payload);
}

export function upsertLibraryItem(item: Omit<LibraryItem, "id">): void {
  getDb()
    .prepare(
      "INSERT INTO library_items (path, size, mtime, hash, platform, game_slug, source) VALUES (?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(path) DO UPDATE SET size = excluded.size, mtime = excluded.mtime, hash = excluded.hash, platform = excluded.platform, game_slug = excluded.game_slug, source = excluded.source"
    )
    .run(
      item.path,
      item.size,
      item.mtime,
      item.hash ?? null,
      item.platform ?? null,
      item.gameSlug ?? null,
      item.source
    );
}

export function listLibraryItems(filters?: {
  platform?: string;
}): LibraryItem[] {
  if (filters?.platform) {
    const rows = getDb()
      .prepare(
        "SELECT id, path, size, mtime, hash, platform, game_slug as gameSlug, source FROM library_items WHERE platform = ? ORDER BY path"
      )
      .all(filters.platform) as LibraryItem[];
    return rows;
  }

  const rows = getDb()
    .prepare(
      "SELECT id, path, size, mtime, hash, platform, game_slug as gameSlug, source FROM library_items ORDER BY path"
    )
    .all() as LibraryItem[];
  return rows;
}

export function getLibraryItemByPath(filePath: string): LibraryItem | null {
  const row = getDb()
    .prepare(
      "SELECT id, path, size, mtime, hash, platform, game_slug as gameSlug, source FROM library_items WHERE path = ?"
    )
    .get(filePath) as LibraryItem | undefined;
  return row ?? null;
}

export function deleteLibraryItemsUnderDir(dir: string): void {
  const unixLike = dir.replace(/\\/g, "/");
  const winLike = dir.replace(/\//g, "\\");
  getDb()
    .prepare(
      "DELETE FROM library_items WHERE path LIKE ? OR path LIKE ?"
    )
    .run(`${unixLike}/%`, `${winLike}\%`);
}

export function createJob(job: JobRecord): void {
  getDb()
    .prepare(
      "INSERT INTO jobs (id, type, status, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(
      job.id,
      job.type,
      job.status,
      JSON.stringify(job.payload),
      job.createdAt,
      job.updatedAt
    );
}

export function updateJobStatus(jobId: string, status: JobStatus): void {
  getDb()
    .prepare("UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, Date.now(), jobId);
}

export function listJobs(): JobRecord[] {
  const rows = getDb()
    .prepare("SELECT id, type, status, payload, created_at as createdAt, updated_at as updatedAt FROM jobs ORDER BY created_at DESC")
    .all() as { id: string; type: string; status: JobStatus; payload: string; createdAt: number; updatedAt: number }[];

  return rows.map((row) => ({
    id: row.id,
    type: row.type as JobRecord["type"],
    status: row.status,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

export function getJob(jobId: string): JobRecord | null {
  const row = getDb()
    .prepare("SELECT id, type, status, payload, created_at as createdAt, updated_at as updatedAt FROM jobs WHERE id = ?")
    .get(jobId) as { id: string; type: string; status: JobStatus; payload: string; createdAt: number; updatedAt: number } | undefined;
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    type: row.type as JobRecord["type"],
    status: row.status,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function createJobStep(jobId: string, step: string): JobStepRecord {
  const now = Date.now();
  const result = getDb()
    .prepare(
      "INSERT INTO job_steps (job_id, step, status, progress, message, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(jobId, step, "running", 0, null, now);

  return {
    id: Number(result.lastInsertRowid),
    jobId,
    step,
    status: "running",
    progress: 0,
    updatedAt: now
  };
}

export function updateJobStep(stepId: number, updates: Partial<JobStepRecord>): void {
  const current = getDb()
    .prepare("SELECT id, job_id as jobId, step, status, progress, message, updated_at as updatedAt FROM job_steps WHERE id = ?")
    .get(stepId) as JobStepRecord | undefined;
  if (!current) {
    return;
  }

  const next = {
    status: updates.status ?? current.status,
    progress: updates.progress ?? current.progress,
    message: updates.message ?? current.message ?? null,
    updatedAt: Date.now()
  };

  getDb()
    .prepare(
      "UPDATE job_steps SET status = ?, progress = ?, message = ?, updated_at = ? WHERE id = ?"
    )
    .run(next.status, next.progress, next.message, next.updatedAt, stepId);
}

export function listJobSteps(jobId: string): JobStepRecord[] {
  const rows = getDb()
    .prepare(
      "SELECT id, job_id as jobId, step, status, progress, message, updated_at as updatedAt FROM job_steps WHERE job_id = ? ORDER BY id"
    )
    .all(jobId) as JobStepRecord[];
  return rows;
}

export function getCachedSearch(queryHash: string): { json: string; updatedAt: number } | null {
  const row = getDb()
    .prepare("SELECT response_json as json, updated_at as updatedAt FROM crocdb_cache_search WHERE query_hash = ?")
    .get(queryHash) as { json: string; updatedAt: number } | undefined;
  return row ?? null;
}

export function setCachedSearch(queryHash: string, json: string): void {
  getDb()
    .prepare(
      "INSERT INTO crocdb_cache_search (query_hash, response_json, updated_at) VALUES (?, ?, ?) " +
        "ON CONFLICT(query_hash) DO UPDATE SET response_json = excluded.response_json, updated_at = excluded.updated_at"
    )
    .run(queryHash, json, Date.now());
}

export function getCachedEntry(slug: string): { json: string; updatedAt: number } | null {
  const row = getDb()
    .prepare("SELECT response_json as json, updated_at as updatedAt FROM crocdb_cache_entry WHERE slug = ?")
    .get(slug) as { json: string; updatedAt: number } | undefined;
  return row ?? null;
}

export function setCachedEntry(slug: string, json: string): void {
  getDb()
    .prepare(
      "INSERT INTO crocdb_cache_entry (slug, response_json, updated_at) VALUES (?, ?, ?) " +
        "ON CONFLICT(slug) DO UPDATE SET response_json = excluded.response_json, updated_at = excluded.updated_at"
    )
    .run(slug, json, Date.now());
}
