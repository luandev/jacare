import SimpleQueue from "../utils/simple-queue";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { JobRecord } from "@crocdesk/shared";
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
import { getDefaultSettings } from "../config";
import { publishEvent } from "../events";
import { scanLocal } from "./scanner";
import { scanForUnorganizedItems, reorganizeItems } from "./scanner";
import { runDownloadAndInstall, type DownloadJobPayload } from "./pipeline";
import { getEntry } from "./crocdb";
import { logger } from "../utils/logger";

const queue = new SimpleQueue({ concurrency: 2 });

// Track active job tasks for cancellation
const activeJobTasks = new Map<string, { abortController: AbortController; task: Promise<void> }>();

// Track paused jobs - map jobId to pause controller
// This is in-memory only - on startup, we load paused jobs from DB and resume them
const pausedJobs = new Set<string>();

export function getJobs(): JobRecord[] {
  return listJobs();
}

export function getJobSteps(jobId: string) {
  return listJobSteps(jobId);
}

export async function enqueueScanLocal(): Promise<JobRecord> {
  const job = createJobRecord("scan_local", {});
  logger.info("Scan job enqueued", { jobId: job.id });
  const settings = getSettings() ?? getDefaultSettings();
  queue.concurrencyLimit = settings.queue?.concurrency ?? 2;
  queue.add(() => runScanJob(job));
  return job;
}

export async function enqueueDownloadAndInstall(
  payload: DownloadJobPayload
): Promise<JobRecord> {
  const job = createJobRecord("download_and_install", payload);
  logger.info("Download job enqueued", { jobId: job.id, slug: payload.slug, linkIndex: payload.linkIndex });
  const settings = getSettings() ?? getDefaultSettings();
  queue.concurrencyLimit = settings.queue?.concurrency ?? 2;
  
  const abortController = new AbortController();
  const task = queue.add(() => runDownloadJob(job, payload, abortController.signal));
  activeJobTasks.set(job.id, { abortController, task });
  
  // Clean up when task completes
  task.finally(() => {
    activeJobTasks.delete(job.id);
    logger.debug("Job task cleaned up", { jobId: job.id });
  });
  
  return job;
}

export async function cancelJob(jobId: string): Promise<boolean> {
  const job = getJob(jobId);
  if (!job) {
    logger.warn("Cancel job requested for non-existent job", { jobId });
    return false;
  }
  
  logger.info("Cancelling job", { jobId, status: job.status, type: job.type });
  
  // If job is queued, remove from queue
  if (job.status === "queued") {
    // Clean up part file for download jobs (in case it exists from a previous failed attempt)
    if (job.type === "download_and_install") {
      cleanupDownloadPartFile(job).catch((err) => {
        logger.warn("Failed to cleanup part file on cancel", { jobId, error: err });
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
    logger.info("Queued job cancelled", { jobId });
    return true;
  }
  
  // If job is running, abort it
  const activeTask = activeJobTasks.get(jobId);
  if (activeTask && job.status === "running") {
    activeTask.abortController.abort();
    
    // Clean up part file for download jobs
    if (job.type === "download_and_install") {
      cleanupDownloadPartFile(job).catch((err) => {
        logger.warn("Failed to cleanup part file on cancel", { jobId, error: err });
      });
    }
    
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
    logger.info("Running job cancelled", { jobId });
    return true;
  }
  
  logger.warn("Job cannot be cancelled (not queued or running)", { jobId, status: job.status });
  return false;
}

export async function pauseJob(jobId: string): Promise<boolean> {
  const job = getJob(jobId);
  if (!job) {
    logger.warn("Pause job requested for non-existent job", { jobId });
    return false;
  }
  
  if (job.status !== "running") {
    logger.warn("Job cannot be paused (not running)", { jobId, status: job.status });
    return false;
  }
  
  logger.info("Pausing job", { jobId, type: job.type });
  
  // Mark job as paused first
  pausedJobs.add(jobId);
  updateJobStatus(jobId, "paused");
  
  // Abort the current operation (download will stop but part file is kept)
  // The downloadFile function will detect abort and stop, but we need to prevent cleanup
  // We'll handle this by checking pause state before cleanup in the pipeline
  const activeTask = activeJobTasks.get(jobId);
  if (activeTask) {
    // Abort will stop the download stream, but we want to keep the part file
    // The download will throw an error which we'll catch and not mark as failed
    activeTask.abortController.abort();
    // Remove from active tasks - we'll resume it later
    activeJobTasks.delete(jobId);
  }
  
  logger.info("Job paused", { jobId });
  return true;
}

export async function resumeJob(jobId: string): Promise<boolean> {
  const job = getJob(jobId);
  if (!job) {
    logger.warn("Resume job requested for non-existent job", { jobId });
    return false;
  }
  
  if (job.status !== "paused") {
    logger.warn("Job cannot be resumed (not paused)", { jobId, status: job.status });
    return false;
  }
  
  logger.info("Resuming job", { jobId, type: job.type });
  
  // Remove from paused set
  pausedJobs.delete(jobId);
  
  // Only resume download_and_install jobs
  if (job.type === "download_and_install") {
    const payload = job.payload as DownloadJobPayload;
    const abortController = new AbortController();
    const task = queue.add(() => runDownloadJob(job, payload, abortController.signal));
    activeJobTasks.set(job.id, { abortController, task });
    
    // Clean up when task completes
    task.finally(() => {
      activeJobTasks.delete(job.id);
      logger.debug("Job task cleaned up", { jobId: job.id });
    });
  } else {
    // For other job types, just mark as queued and let them restart
    updateJobStatus(jobId, "queued");
  }
  
  logger.info("Job resumed", { jobId });
  return true;
}

export async function pauseAllJobs(): Promise<number> {
  const jobs = listJobs();
  let pausedCount = 0;
  
  for (const job of jobs) {
    if (job.status === "running" && job.type === "download_and_install") {
      if (await pauseJob(job.id)) {
        pausedCount++;
      }
    }
  }
  
  logger.info("Paused all running download jobs", { count: pausedCount });
  return pausedCount;
}

export async function resumeAllJobs(): Promise<number> {
  const jobs = listJobs();
  let resumedCount = 0;
  
  // First, populate pausedJobs Set from database (in case server was restarted)
  for (const job of jobs) {
    if (job.status === "paused") {
      pausedJobs.add(job.id);
    }
  }
  
  // Then resume all paused download jobs
  for (const job of jobs) {
    if (job.status === "paused" && job.type === "download_and_install") {
      if (await resumeJob(job.id)) {
        resumedCount++;
      }
    }
  }
  
  logger.info("Resumed all paused download jobs", { count: resumedCount });
  return resumedCount;
}

export function isJobPaused(jobId: string): boolean {
  return pausedJobs.has(jobId);
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
  logger.info("Starting scan job", { jobId: job.id });
  await runJob(job, async (report) => {
    const settings = getSettings() ?? getDefaultSettings();
    const libraryDir = path.resolve(settings.libraryDir);
    
    // Phase 1: Scan for unorganized items
    report.step("scan_analysis", 0.05, `Analyzing library structure at ${libraryDir}`);
    logger.debug("Scanning for unorganized items", { jobId: job.id, libraryDir });
    
    const unorganizedItems = await scanForUnorganizedItems(libraryDir, (progress, message) => {
      report.step("scan_analysis", 0.05 + (progress * 0.35), message);
    });
    
    logger.info("Found unorganized items", { jobId: job.id, count: unorganizedItems.length });
    
    // Phase 2: Reorganize items if any found
    if (unorganizedItems.length > 0) {
      report.step("reorganize", 0.4, `Reorganizing ${unorganizedItems.length} items...`);
      logger.debug("Starting reorganization", { jobId: job.id, itemCount: unorganizedItems.length });
      
      const reorganizeResult = await reorganizeItems(unorganizedItems, libraryDir, (progress, message) => {
        report.step("reorganize", 0.4 + (progress * 0.4), message);
      });
      
      logger.info("Reorganization completed", { 
        jobId: job.id, 
        reorganized: reorganizeResult.reorganizedFiles,
        skipped: reorganizeResult.skippedFiles,
        errors: reorganizeResult.errors.length
      });
      
      if (reorganizeResult.errors.length > 0) {
        logger.warn("Reorganization had errors", { 
          jobId: job.id, 
          errors: reorganizeResult.errors.slice(0, 5) // Log first 5 errors
        });
      }
    } else {
      report.step("reorganize", 0.8, "No items need reorganization");
      logger.info("No unorganized items found", { jobId: job.id });
    }
    
    // Phase 3: Final scan and indexing
    report.step("indexing", 0.8, `Indexing library files...`);
    logger.debug("Performing final scan", { jobId: job.id, libraryDir });
    
    const items = await scanLocal([{ id: "library", path: libraryDir }]);
    logger.info("Final scan complete", { jobId: job.id, count: items.length });
    
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
    
    report.step("indexing", 1, `Scan complete: indexed ${items.length} files`);
    logger.info("Scan job completed", { jobId: job.id, itemsIndexed: items.length });
  });
}

export async function runDownloadJob(
  job: JobRecord,
  payload: DownloadJobPayload,
  abortSignal?: AbortSignal
): Promise<void> {
  logger.info("Starting download job", { jobId: job.id, slug: payload.slug });
  await runJob(job, async (report) => {
    if (abortSignal?.aborted) {
      logger.info("Download job aborted before start", { jobId: job.id });
      throw new Error("Cancelled by user");
    }
    
    const settings = getSettings() ?? getDefaultSettings();
    const result = await runDownloadAndInstall(payload, settings, abortSignal, (progress, message, bytesDownloaded, totalBytes) => {
      report.step("download_and_install", progress, message, bytesDownloaded, totalBytes);
      // Log progress milestones
      if (progress >= 0.25 && progress < 0.26) {
        logger.debug("Download progress: 25%", { jobId: job.id, slug: payload.slug });
      } else if (progress >= 0.5 && progress < 0.51) {
        logger.debug("Download progress: 50%", { jobId: job.id, slug: payload.slug });
      } else if (progress >= 0.75 && progress < 0.76) {
        logger.debug("Download progress: 75%", { jobId: job.id, slug: payload.slug });
      }
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
      logger.info("Download job completed successfully", { 
        jobId: job.id, 
        slug: result.entry.slug, 
        filesCount: files.length,
        platform: result.entry.platform
      });
      const firstItem = getLibraryItemByPath(files[0]);
      publishEvent({
        jobId: job.id,
        type: "JOB_RESULT",
        files,
        slug: result.entry.slug,
        libraryItemId: firstItem?.id,
        ts: Date.now()
      });
    } else {
      logger.warn("Download job completed but no files were created", { jobId: job.id, slug: payload.slug });
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
  
  // Check if job was paused before starting
  if (pausedJobs.has(job.id)) {
    logger.debug("Job is paused, skipping execution", { jobId: job.id });
    throw new Error("Job is paused");
  }
  
  logger.debug("Job execution starting", { jobId: job.id, type: job.type });
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
      // Check if job was paused
      if (pausedJobs.has(job.id)) {
        throw new Error("Job is paused");
      }
    };
    
    checkAbort();
    await handler(report);
    checkAbort();
    
    // Check if job was paused during execution
    if (pausedJobs.has(job.id)) {
      logger.debug("Job was paused during execution", { jobId: job.id });
      return; // Don't mark as done, keep it paused
    }
    
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
    logger.info("Job completed successfully", { jobId: job.id, type: job.type });
    publishEvent({
      jobId: job.id,
      type: "JOB_DONE",
      slug: job.type === "download_and_install" && typeof job.payload.slug === "string" ? (job.payload.slug as string) : undefined,
      ts: Date.now()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if job was paused - if so, don't mark as failed
    if (pausedJobs.has(job.id) || errorMessage === "Job is paused") {
      logger.debug("Job was paused, not marking as failed", { jobId: job.id });
      return; // Keep it paused
    }
    logger.error("Job failed", error, { jobId: job.id, type: job.type });
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

/**
 * Clean up partial download file (.part) for a download job
 */
async function cleanupDownloadPartFile(job: JobRecord): Promise<void> {
  if (job.type !== "download_and_install") {
    return;
  }
  
  const payload = job.payload as DownloadJobPayload;
  if (!payload.slug) {
    return;
  }
  
  try {
    // Get entry to determine download path
    const entryResponse = await getEntry(payload.slug);
    const entry = entryResponse.data.entry;
    
    if (!entry.links || entry.links.length === 0) {
      return;
    }
    
    // Choose link (same logic as in runDownloadAndInstall)
    let resolvedLinkIndex: number;
    if (typeof payload.linkIndex === "number") {
      resolvedLinkIndex = payload.linkIndex;
    } else {
      // Prefer Myrient host when available
      const myrientIdx = entry.links.findIndex(
        (l) => (l.host || "").toLowerCase() === "myrient"
      );
      resolvedLinkIndex = myrientIdx >= 0 ? myrientIdx : 0;
    }
    const link = entry.links[resolvedLinkIndex];
    
    // Reconstruct download path
    const settings = getSettings() ?? getDefaultSettings();
    const downloadDir = path.resolve(settings.downloadDir || "./downloads");
    const downloadPath = path.join(downloadDir, link.filename || `${entry.slug}.zip`);
    const partPath = `${downloadPath}.part`;
    
    // Delete part file if it exists
    try {
      await fs.access(partPath);
      await fs.unlink(partPath);
      logger.info("Part file cleaned up on cancel", { jobId: job.id, partPath });
    } catch (err) {
      // File doesn't exist, which is fine
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  } catch (error) {
    logger.warn("Error cleaning up part file", { jobId: job.id, error });
    // Don't throw - cleanup failure shouldn't prevent cancellation
  }
}
