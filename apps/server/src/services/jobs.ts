import PQueue from "p-queue";
import crypto from "crypto";
import { promises as fs } from "fs";
import type { JobRecord } from "@crocdesk/shared";
import { DEFAULT_SETTINGS } from "@crocdesk/shared";
import {
  createJob,
  createJobStep,
  getJob,
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

// Track active job tasks for cancellation
const activeJobTasks = new Map<string, { abortController: AbortController; task: Promise<void> }>();

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
  
  const abortController = new AbortController();
  const task = queue.add(() => runDownloadJob(job, payload, abortController.signal));
  activeJobTasks.set(job.id, { abortController, task });
  
  // Clean up when task completes
  task.finally(() => {
    activeJobTasks.delete(job.id);
  });
  
  return job;
}

export async function cancelJob(jobId: string): Promise<boolean> {
  const job = getJob(jobId);
  if (!job) {
    return false;
  }
  
  // If job is queued, remove from queue
  if (job.status === "queued") {
    updateJobStatus(jobId, "failed");
    publishEvent({
      jobId,
      type: "JOB_FAILED",
      message: "Cancelled by user",
      slug: job.type === "download_and_install" && typeof job.payload.slug === "string" ? (job.payload.slug as string) : undefined,
      ts: Date.now()
    });
    activeJobTasks.delete(jobId);
    return true;
  }
  
  // If job is running, abort it
  const activeTask = activeJobTasks.get(jobId);
  if (activeTask && job.status === "running") {
    activeTask.abortController.abort();
    // Find the job step to update
    const steps = listJobSteps(jobId);
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      updateJobStep(lastStep.id, {
        status: "failed",
        message: "Cancelled by user"
      });
    }
    updateJobStatus(jobId, "failed");
    publishEvent({
      jobId,
      type: "JOB_FAILED",
      message: "Cancelled by user",
      slug: job.type === "download_and_install" && typeof job.payload.slug === "string" ? (job.payload.slug as string) : undefined,
      ts: Date.now()
    });
    activeJobTasks.delete(jobId);
    return true;
  }
  
  return false;
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
    slug: type === "download_and_install" && typeof payload.slug === "string" ? (payload.slug as string) : undefined,
    ts: now
  });

  return job;
}

async function runScanJob(job: JobRecord): Promise<void> {
  await runJob(job, async (report) => {
    const settings = getSettings() ?? DEFAULT_SETTINGS;
    const downloadDir = settings.downloadDir || "./downloads";
    report.step("scan_local", 0.1, `Scanning download root ${downloadDir}`);
    const items = await scanLocal([{ id: "downloads", path: downloadDir }]);
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
  payload: DownloadJobPayload,
  abortSignal?: AbortSignal
): Promise<void> {
  await runJob(job, async (report) => {
    if (abortSignal?.aborted) {
      throw new Error("Cancelled by user");
    }
    
    const settings = getSettings() ?? DEFAULT_SETTINGS;
    const result = await runDownloadAndInstall(payload, settings, abortSignal, (progress, message, bytesDownloaded, totalBytes) => {
      report.step("download_and_install", progress, message, bytesDownloaded, totalBytes);
    });

    const files: string[] = [];
    if (result.outputPaths && result.outputPaths.length > 0) {
      for (const p of result.outputPaths) {
        const stats = await fs.stat(p);
        upsertLibraryItem({
          path: p,
          size: stats.size,
          mtime: stats.mtimeMs,
          hash: null,
          platform: result.entry.platform,
          gameSlug: result.entry.slug,
          source: "remote"
        });
        files.push(p);
      }
    } else if (result.outputPath) {
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
      files.push(result.outputPath);
    }

    if (files.length > 0) {
      const firstItem = getLibraryItemByPath(files[0]);
      publishEvent({
        jobId: job.id,
        type: "JOB_RESULT",
        files,
        slug: result.entry.slug,
        libraryItemId: firstItem?.id,
        ts: Date.now()
      });
    }
  });
}

type JobReporter = {
  step: (step: string, progress: number, message?: string, bytesDownloaded?: number, totalBytes?: number) => void;
};

async function runJob(job: JobRecord, handler: (report: JobReporter) => Promise<void>, abortSignal?: AbortSignal): Promise<void> {
  if (abortSignal?.aborted) {
    throw new Error("Cancelled by user");
  }
  
  updateJobStatus(job.id, "running");

  const stepRecord = createJobStep(job.id, job.type);
  publishEvent({
    jobId: job.id,
    type: "STEP_STARTED",
    step: job.type,
    progress: 0,
    slug: job.type === "download_and_install" && typeof job.payload.slug === "string" ? (job.payload.slug as string) : undefined,
    ts: Date.now()
  });

  const report: JobReporter = {
    step: (step, progress, message, bytesDownloaded, totalBytes) => {
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
        bytesDownloaded,
        totalBytes,
        slug: job.type === "download_and_install" && typeof job.payload.slug === "string" ? (job.payload.slug as string) : undefined,
        ts: Date.now()
      });
    }
  };

  try {
    // Check abort signal periodically
    const checkAbort = () => {
      if (abortSignal?.aborted) {
        throw new Error("Cancelled by user");
      }
    };
    
    checkAbort();
    await handler(report);
    checkAbort();
    updateJobStep(stepRecord.id, {
      status: "done",
      progress: 1
    });
    publishEvent({
      jobId: job.id,
      type: "STEP_DONE",
      step: job.type,
      progress: 1,
      slug: job.type === "download_and_install" && typeof job.payload.slug === "string" ? (job.payload.slug as string) : undefined,
      ts: Date.now()
    });

    updateJobStatus(job.id, "done");
    publishEvent({
      jobId: job.id,
      type: "JOB_DONE",
      slug: job.type === "download_and_install" && typeof job.payload.slug === "string" ? (job.payload.slug as string) : undefined,
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
      slug: job.type === "download_and_install" && typeof job.payload.slug === "string" ? (job.payload.slug as string) : undefined,
      ts: Date.now()
    });
  }
}
