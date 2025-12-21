import PQueue from "p-queue";
import crypto from "crypto";
import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import type { JobRecord } from "@crocdesk/shared";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from "@crocdesk/shared";
import {
  createJob,
  createJobStep,
  getDevice,
  getLibraryItem,
  getProfile,
  getSettings,
  listJobSteps,
  listJobs,
  updateJobError,
  updateJobProgress,
  updateJobStatus,
  updateJobStep,
  upsertLibraryItem
} from "../db";
import { publishEvent } from "../events";
import { scanLocal } from "./scanner";
import { runDownloadAndInstall, type DownloadJobPayload } from "./pipeline";
import { ensureDir } from "../utils/fs";

type TransferJobPayload = {
  libraryItemId: number;
  deviceId: string;
  targetPath?: string;
};

const downloadQueue = new PQueue({ concurrency: 2 });
const transferQueue = new PQueue({ concurrency: 1 });

export function getJobs(): JobRecord[] {
  return listJobs();
}

export function getJobSteps(jobId: string) {
  return listJobSteps(jobId);
}

export async function enqueueScanLocal(): Promise<JobRecord> {
  const job = createJobRecord("scan_local", {});
  const settings = getSettings() ?? DEFAULT_SETTINGS;
  downloadQueue.concurrency = settings.queue?.maxConcurrentDownloads ?? 2;
  downloadQueue.add(() => runScanJob(job));
  return job;
}

export async function enqueueDownloadAndInstall(
  payload: DownloadJobPayload
): Promise<JobRecord> {
  const job = createJobRecord("download_and_install", payload);
  const settings = getSettings() ?? DEFAULT_SETTINGS;
  downloadQueue.concurrency = settings.queue?.maxConcurrentDownloads ?? 2;
  downloadQueue.add(() => runDownloadJob(job, payload));
  return job;
}

export async function enqueueTransfer(payload: TransferJobPayload): Promise<JobRecord> {
  const job = createJobRecord("transfer", payload, payload.deviceId);
  scheduleTransfer(job, payload);
  return job;
}

function createJobRecord(
  type: JobRecord["type"],
  payload: Record<string, unknown>,
  deviceId?: string
): JobRecord {
  const now = Date.now();
  const job: JobRecord = {
    id: crypto.randomUUID(),
    type,
    status: "queued",
    progress: 0,
    payload,
    deviceId: deviceId ?? null,
    attempts: 0,
    createdAt: now,
    updatedAt: now
  };

  createJob(job);
  publishEvent({
    jobId: job.id,
    type: "JOB_CREATED",
    ts: now
  });

  return job;
}

async function runScanJob(job: JobRecord): Promise<void> {
  await runJob(job, async (report) => {
    const settings = getSettings() ?? DEFAULT_SETTINGS;
    const roots = settings.libraryRoots ?? [];
    report.step("scan_local", 0.1, `Scanning ${roots.length} roots`);
    const items = await scanLocal(roots);
    for (const item of items) {
      upsertLibraryItem({
        path: item.path,
        size: item.size,
        mtime: item.mtime,
        hash: item.hash ?? null,
        platform: item.platform ?? null,
        gameSlug: item.gameSlug ?? null,
        source: item.source
      });
    }
    report.step("scan_local", 1, `Indexed ${items.length} files`);
  });
}

async function runDownloadJob(
  job: JobRecord,
  payload: DownloadJobPayload
): Promise<void> {
  await runJob(job, async (report) => {
    const settings = getSettings() ?? DEFAULT_SETTINGS;
    const profile = getProfile(payload.profileId) ?? DEFAULT_PROFILE;
    await runDownloadAndInstall(payload, settings, profile, (progress, message) => {
      report.step("download_and_install", progress, message);
    });
  });
}

async function runTransferJob(job: JobRecord, payload: TransferJobPayload): Promise<void> {
  await runJob(job, async (report) => {
    const libraryItem = getLibraryItem(payload.libraryItemId);
    if (!libraryItem) {
      throw new Error("Library item not found");
    }

    const device = getDevice(payload.deviceId);
    if (!device || !device.connected) {
      throw new Error("Device disconnected");
    }

    const targetDir = payload.targetPath ?? device.path;
    const fileName = path.basename(libraryItem.path);
    const targetPath = path.join(targetDir, fileName);
    await ensureDir(path.dirname(targetPath));

    const finalPath = await resolveConflict(targetPath);
    const readStream = fs.createReadStream(libraryItem.path);
    const writeStream = (await fsp.open(finalPath, "w")).createWriteStream();

    const totalBytes = libraryItem.size || (await fsp.stat(libraryItem.path)).size;
    let bytesDone = 0;

    await new Promise<void>((resolve, reject) => {
      readStream.on("data", (chunk) => {
        const size = typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
        bytesDone += size;
        report.step("transfer", Math.min(1, bytesDone / totalBytes), "Transferring");
      });
      readStream.on("error", reject);
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);
      readStream.pipe(writeStream);
    });

    report.step("transfer", 1, "Transfer complete");
  });
}

type JobReporter = {
  step: (step: string, progress: number, message?: string) => void;
};

async function runJob(job: JobRecord, handler: (report: JobReporter) => Promise<void>): Promise<void> {
  updateJobStatus(job.id, "running");

  const stepRecord = createJobStep(job.id, job.type);
  publishEvent({
    jobId: job.id,
    type: "STEP_STARTED",
    step: job.type,
    progress: 0,
    ts: Date.now()
  });

  const report: JobReporter = {
    step: (step, progress, message) => {
      updateJobProgress(job.id, progress);
      updateJobStep(stepRecord.id, {
        status: "running",
        progress,
        message
      });
      publishEvent({
        jobId: job.id,
        type: "STEP_PROGRESS",
        step,
        progress,
        message,
        ts: Date.now()
      });
    }
  };

  try {
    await handler(report);
    updateJobStep(stepRecord.id, {
      status: "done",
      progress: 1
    });
    publishEvent({
      jobId: job.id,
      type: "STEP_DONE",
      step: job.type,
      progress: 1,
      ts: Date.now()
    });

    updateJobStatus(job.id, "done");
    publishEvent({
      jobId: job.id,
      type: "JOB_DONE",
      ts: Date.now()
    });
  } catch (error) {
    updateJobStep(stepRecord.id, {
      status: "failed",
      message: error instanceof Error ? error.message : "Job failed"
    });
    updateJobError(job.id, error instanceof Error ? error.message : "Job failed");
    updateJobStatus(job.id, "failed");
    publishEvent({
      jobId: job.id,
      type: "JOB_FAILED",
      message: error instanceof Error ? error.message : "Job failed",
      ts: Date.now()
    });
  }
}

function scheduleTransfer(job: JobRecord, payload: TransferJobPayload): void {
  const device = getDevice(payload.deviceId);
  if (!device || !device.connected) {
    updateJobStatus(job.id, "waiting-device");
    setTimeout(() => scheduleTransfer(job, payload), 3000);
    return;
  }

  const settings = getSettings() ?? DEFAULT_SETTINGS;
  transferQueue.concurrency = settings.queue?.maxConcurrentTransfers ?? 1;
  transferQueue.add(() => runTransferJob(job, payload));
}

async function resolveConflict(targetPath: string): Promise<string> {
  const dir = path.dirname(targetPath);
  const base = path.basename(targetPath, path.extname(targetPath));
  const ext = path.extname(targetPath);
  let attempt = 0;
  let candidate = targetPath;

  while (true) {
    try {
      await fsp.access(candidate);
      attempt += 1;
      candidate = path.join(dir, `${base} (${attempt})${ext}`);
    } catch {
      return candidate;
    }
  }
}
