import Database from "better-sqlite3";
import path from "path";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from "@crocdesk/shared";
import type {
  DeviceItemRecord,
  DeviceRecord,
  JobRecord,
  JobStatus,
  JobStepRecord,
  LibraryItem,
  Profile,
  Settings
} from "@crocdesk/shared";
import { CROCDESK_DATA_DIR } from "./config";
import { ensureDir } from "./utils/fs";

const dbPath = path.join(CROCDESK_DATA_DIR, "crocdesk.db");

let db: Database.Database | null = null;

export async function initDb(): Promise<void> {
  await ensureDir(CROCDESK_DATA_DIR);
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
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
      source TEXT NOT NULL,
      device_id TEXT
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress REAL NOT NULL,
      payload TEXT NOT NULL,
      source_ref TEXT,
      target_ref TEXT,
      device_id TEXT,
      attempts INTEGER NOT NULL,
      error TEXT,
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

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      path TEXT NOT NULL,
      name TEXT NOT NULL,
      volume_serial TEXT,
      volume_label TEXT,
      last_seen_at INTEGER,
      connected INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS device_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      library_item_id INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      device_path TEXT NOT NULL,
      checksum TEXT,
      last_seen_at INTEGER,
      status TEXT NOT NULL,
      FOREIGN KEY (library_item_id) REFERENCES library_items(id),
      FOREIGN KEY (device_id) REFERENCES devices(id)
    );
  `);

  ensureColumn("jobs", "progress", "REAL NOT NULL DEFAULT 0");
  ensureColumn("jobs", "source_ref", "TEXT");
  ensureColumn("jobs", "target_ref", "TEXT");
  ensureColumn("jobs", "device_id", "TEXT");
  ensureColumn("jobs", "attempts", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("jobs", "error", "TEXT");
  ensureColumn("library_items", "device_id", "TEXT");

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

  if (listProfiles().length === 0) {
    saveProfile(DEFAULT_PROFILE);
  }
}

function ensureColumn(table: string, column: string, definition: string): void {
  const existing = getDb()
    .prepare("PRAGMA table_info(\"" + table + "\")")
    .all() as { name: string }[];
  const hasColumn = existing.some((entry) => entry.name === column);
  if (!hasColumn) {
    getDb().prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
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

export function listProfiles(): Profile[] {
  const rows = getDb()
    .prepare("SELECT data FROM profiles")
    .all() as { data: string }[];
  return rows.map((row) => JSON.parse(row.data) as Profile);
}

export function getProfile(id: string): Profile | null {
  const row = getDb()
    .prepare("SELECT data FROM profiles WHERE id = ?")
    .get(id) as { data: string } | undefined;
  return row ? (JSON.parse(row.data) as Profile) : null;
}

export function saveProfile(profile: Profile): void {
  const payload = JSON.stringify(profile);
  getDb()
    .prepare("INSERT INTO profiles (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = ?")
    .run(profile.id, payload, payload);
}

export function deleteProfile(id: string): void {
  getDb().prepare("DELETE FROM profiles WHERE id = ?").run(id);
}

export function upsertLibraryItem(item: Omit<LibraryItem, "id">): void {
  getDb()
    .prepare(
      "INSERT INTO library_items (path, size, mtime, hash, platform, game_slug, source, device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(path) DO UPDATE SET size = excluded.size, mtime = excluded.mtime, hash = excluded.hash, platform = excluded.platform, game_slug = excluded.game_slug, source = excluded.source, device_id = excluded.device_id"
    )
    .run(
      item.path,
      item.size,
      item.mtime,
      item.hash ?? null,
      item.platform ?? null,
      item.gameSlug ?? null,
      item.source,
      item.deviceId ?? null
    );
}

export function listLibraryItems(filters?: {
  platform?: string;
}): LibraryItem[] {
  if (filters?.platform) {
    const rows = getDb()
      .prepare(
        "SELECT id, path, size, mtime, hash, platform, game_slug as gameSlug, source, device_id as deviceId FROM library_items WHERE platform = ? ORDER BY path"
      )
      .all(filters.platform) as LibraryItem[];
    return rows;
  }

  const rows = getDb()
    .prepare(
      "SELECT id, path, size, mtime, hash, platform, game_slug as gameSlug, source, device_id as deviceId FROM library_items ORDER BY path"
    )
    .all() as LibraryItem[];
  return rows;
}

export function getLibraryItem(id: number): LibraryItem | null {
  const row = getDb()
    .prepare(
      "SELECT id, path, size, mtime, hash, platform, game_slug as gameSlug, source, device_id as deviceId FROM library_items WHERE id = ?"
    )
    .get(id) as LibraryItem | undefined;
  return row ?? null;
}

export function createJob(job: JobRecord): void {
  getDb()
    .prepare(
      "INSERT INTO jobs (id, type, status, progress, payload, source_ref, target_ref, device_id, attempts, error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      job.id,
      job.type,
      job.status,
      job.progress,
      JSON.stringify(job.payload),
      job.sourceRef ?? null,
      job.targetRef ?? null,
      job.deviceId ?? null,
      job.attempts,
      job.error ?? null,
      job.createdAt,
      job.updatedAt
    );
}

export function updateJobStatus(jobId: string, status: JobStatus): void {
  getDb()
    .prepare("UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, Date.now(), jobId);
}

export function updateJobProgress(jobId: string, progress: number): void {
  getDb()
    .prepare("UPDATE jobs SET progress = ?, updated_at = ? WHERE id = ?")
    .run(progress, Date.now(), jobId);
}

export function updateJobError(jobId: string, error: string): void {
  getDb()
    .prepare("UPDATE jobs SET error = ?, updated_at = ? WHERE id = ?")
    .run(error, Date.now(), jobId);
}

export function listJobs(): JobRecord[] {
  const rows = getDb()
    .prepare(
      "SELECT id, type, status, progress, payload, source_ref as sourceRef, target_ref as targetRef, device_id as deviceId, attempts, error, created_at as createdAt, updated_at as updatedAt FROM jobs ORDER BY created_at DESC"
    )
    .all() as {
      id: string;
      type: string;
      status: JobStatus;
      progress: number;
      payload: string;
      sourceRef?: string | null;
      targetRef?: string | null;
      deviceId?: string | null;
      attempts: number;
      error?: string | null;
      createdAt: number;
      updatedAt: number;
    }[];

  return rows.map((row) => ({
    id: row.id,
    type: row.type as JobRecord["type"],
    status: row.status,
    progress: row.progress,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    sourceRef: row.sourceRef ?? null,
    targetRef: row.targetRef ?? null,
    deviceId: row.deviceId ?? null,
    attempts: row.attempts,
    error: row.error ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

export function getJob(jobId: string): JobRecord | null {
  const row = getDb()
    .prepare(
      "SELECT id, type, status, progress, payload, source_ref as sourceRef, target_ref as targetRef, device_id as deviceId, attempts, error, created_at as createdAt, updated_at as updatedAt FROM jobs WHERE id = ?"
    )
    .get(jobId) as {
      id: string;
      type: string;
      status: JobStatus;
      progress: number;
      payload: string;
      sourceRef?: string | null;
      targetRef?: string | null;
      deviceId?: string | null;
      attempts: number;
      error?: string | null;
      createdAt: number;
      updatedAt: number;
    } | undefined;
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    type: row.type as JobRecord["type"],
    status: row.status,
    progress: row.progress,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    sourceRef: row.sourceRef ?? null,
    targetRef: row.targetRef ?? null,
    deviceId: row.deviceId ?? null,
    attempts: row.attempts,
    error: row.error ?? null,
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

export function upsertDevice(device: DeviceRecord): void {
  getDb()
    .prepare(
      "INSERT INTO devices (id, type, path, name, volume_serial, volume_label, last_seen_at, connected, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET type = excluded.type, path = excluded.path, name = excluded.name, volume_serial = excluded.volume_serial, volume_label = excluded.volume_label, last_seen_at = excluded.last_seen_at, connected = excluded.connected, updated_at = excluded.updated_at"
    )
    .run(
      device.id,
      device.type,
      device.path,
      device.name,
      device.volumeSerial ?? null,
      device.volumeLabel ?? null,
      device.lastSeenAt ?? null,
      device.connected ? 1 : 0,
      device.createdAt,
      device.updatedAt
    );
}

export function listDevices(): DeviceRecord[] {
  const rows = getDb()
    .prepare(
      "SELECT id, type, path, name, volume_serial as volumeSerial, volume_label as volumeLabel, last_seen_at as lastSeenAt, connected, created_at as createdAt, updated_at as updatedAt FROM devices ORDER BY name"
    )
    .all() as Array<Omit<DeviceRecord, "connected"> & { connected: number }>;
  return rows.map((row) => ({ ...row, connected: Boolean(row.connected) }));
}

export function getDevice(id: string): DeviceRecord | null {
  const row = getDb()
    .prepare(
      "SELECT id, type, path, name, volume_serial as volumeSerial, volume_label as volumeLabel, last_seen_at as lastSeenAt, connected, created_at as createdAt, updated_at as updatedAt FROM devices WHERE id = ?"
    )
    .get(id) as (Omit<DeviceRecord, "connected"> & { connected: number }) | undefined;
  return row ? { ...row, connected: Boolean(row.connected) } : null;
}

export function updateDeviceConnection(deviceId: string, connected: boolean): void {
  getDb()
    .prepare("UPDATE devices SET connected = ?, updated_at = ? WHERE id = ?")
    .run(connected ? 1 : 0, Date.now(), deviceId);
}

export function touchDeviceLastSeen(deviceId: string): void {
  getDb()
    .prepare("UPDATE devices SET last_seen_at = ?, updated_at = ? WHERE id = ?")
    .run(Date.now(), Date.now(), deviceId);
}

export function replaceDeviceItems(deviceId: string, items: Omit<DeviceItemRecord, "id">[]): void {
  const dbInstance = getDb();
  const deleteStmt = dbInstance.prepare("DELETE FROM device_items WHERE device_id = ?");
  const insertStmt = dbInstance.prepare(
    "INSERT INTO device_items (library_item_id, device_id, device_path, checksum, last_seen_at, status) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const transaction = dbInstance.transaction(() => {
    deleteStmt.run(deviceId);
    for (const item of items) {
      insertStmt.run(
        item.libraryItemId,
        item.deviceId,
        item.devicePath,
        item.checksum ?? null,
        item.lastSeenAt ?? null,
        item.status
      );
    }
  });

  transaction();
}

export function listDeviceItems(deviceId?: string): DeviceItemRecord[] {
  if (deviceId) {
    const rows = getDb()
      .prepare(
        "SELECT id, library_item_id as libraryItemId, device_id as deviceId, device_path as devicePath, checksum, last_seen_at as lastSeenAt, status FROM device_items WHERE device_id = ? ORDER BY device_path"
      )
      .all(deviceId) as DeviceItemRecord[];
    return rows;
  }

  const rows = getDb()
    .prepare(
      "SELECT id, library_item_id as libraryItemId, device_id as deviceId, device_path as devicePath, checksum, last_seen_at as lastSeenAt, status FROM device_items ORDER BY device_path"
    )
    .all() as DeviceItemRecord[];
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
