import PQueue from "p-queue";
import crypto from "crypto";
import { promises as fs } from "fs";
import type { JobRecord } from "@crocdesk/shared";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from "@crocdesk/shared";
import {
  createJob,
  createJobStep,
  getProfile,
  getSettings,
  listJobSteps,
  listJobs,
  updateJobStatus,
  updateJobStep,
  upsertLibraryItem,
  getLibraryItemByPath
} from "../db";
import { publishEvent } from "../events";
import { scanLocal } from "./scanner";
import { runDownloadAndInstall, type DownloadJobPayload } from "./pipeline";

const queue = new PQueue({ concurrency: 2 });

export function getJobs(): JobRecord[] {
  return listJobs();
}

export function getJobSteps(jobId: string) {
  return listJobSteps(jobId);
}

export async function enqueueScanLocal(): Promise<JobRecord> {
  const job = createJobRecord("scan_local", {});
  const settings = getSettings() ?? DEFAULT_SETTINGS;
  queue.concurrency = settings.queue?.concurrency ?? 2;
  queue.add(() => runScanJob(job));
  return job;
}

export async function enqueueDownloadAndInstall(
  payload: DownloadJobPayload
): Promise<JobRecord> {
  const job = createJobRecord("download_and_install", payload);
  const settings = getSettings() ?? DEFAULT_SETTINGS;
  queue.concurrency = settings.queue?.concurrency ?? 2;
  queue.add(() => runDownloadJob(job, payload));
  return job;
}

function createJobRecord(
  type: JobRecord["type"],
  payload: Record<string, unknown>
): JobRecord {
  const now = Date.now();
  const job: JobRecord = {
    id: crypto.randomUUID(),
    type,
    status: "queued",
    payload,
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

export async function runDownloadJob(
  job: JobRecord,
  payload: DownloadJobPayload
): Promise<void> {
  await runJob(job, async (report) => {
    const settings = getSettings() ?? DEFAULT_SETTINGS;
    const profile = getProfile(payload.profileId) ?? DEFAULT_PROFILE;
    const result = await runDownloadAndInstall(payload, settings, profile, (progress, message) => {
      report.step("download_and_install", progress, message);
    });

    if (result.outputPath) {
      const stats = await fs.stat(result.outputPath);
      upsertLibraryItem({
        path: result.outputPath,
        size: stats.size,
        mtime: stats.mtimeMs,
        hash: null,
        platform: result.entry.platform,
        gameSlug: result.entry.slug,
        source: "remote"
      });

      const item = getLibraryItemByPath(result.outputPath);
      publishEvent({
        jobId: job.id,
        type: "JOB_RESULT",
        files: [result.outputPath],
        slug: result.entry.slug,
        libraryItemId: item?.id,
        ts: Date.now()
      });
    }
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
    updateJobStatus(job.id, "failed");
    publishEvent({
      jobId: job.id,
      type: "JOB_FAILED",
      message: error instanceof Error ? error.message : "Job failed",
      ts: Date.now()
    });
  }
}
