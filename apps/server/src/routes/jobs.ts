import { Router } from "express";
import { enqueueDownloadAndInstall, getJobs, getJobSteps, cancelJob } from "../services/jobs";
import { getJob } from "../db";
import { getEntry } from "../services/crocdb";
import { logger } from "../utils/logger";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    logger.debug("Listing jobs");
    const jobs = getJobs();
    logger.debug("Enriching jobs with preview data", { count: jobs.length });
    const enriched = await Promise.all(
      jobs.map(async (job) => {
        if (job.type === "download_and_install") {
          const slug = typeof (job.payload as Record<string, unknown>)?.slug === "string"
            ? ((job.payload as Record<string, unknown>).slug as string)
            : undefined;
          if (slug) {
            try {
              const entryResp = await getEntry(slug);
              const entry = entryResp.data.entry;
              return {
                ...job,
                preview: {
                  slug: entry.slug,
                  title: entry.title,
                  platform: entry.platform,
                  boxart_url: entry.boxart_url
                }
              };
            } catch {
              // If enrichment fails, return the job as-is.
              return job;
            }
          }
        }
        return job;
      })
    );
    logger.debug("Jobs list returned", { count: enriched.length });
    res.json(enriched);
  } catch (error) {
    logger.error("Failed to list jobs", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list jobs" });
  }
});

router.get("/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const steps = getJobSteps(req.params.id);
  res.json({ job, steps });
});

router.post("/download", async (req, res) => {
  const { slug, linkIndex } = req.body ?? {};
  if (!slug) {
    logger.warn("Download request missing slug", { body: req.body });
    res.status(400).json({ error: "slug is required" });
    return;
  }
  logger.info("Download request received", { slug, linkIndex });
  const parsedLinkIndex =
    typeof linkIndex === "number" ? linkIndex : undefined;
  const job = await enqueueDownloadAndInstall({
    slug,
    linkIndex: parsedLinkIndex
  });
  logger.info("Download job created", { jobId: job.id, slug });
  res.json(job);
});

router.post("/:id/cancel", async (req, res) => {
  try {
    logger.info("Cancel job request received", { jobId: req.params.id });
    const cancelled = await cancelJob(req.params.id);
    if (cancelled) {
      logger.info("Job cancelled successfully", { jobId: req.params.id });
      res.json({ ok: true, message: "Job cancelled" });
    } else {
      logger.warn("Job cancellation failed", { jobId: req.params.id });
      res.status(404).json({ error: "Job not found or cannot be cancelled" });
    }
  } catch (error) {
    logger.error("Error cancelling job", error, { jobId: req.params.id });
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to cancel job" });
  }
});

export default router;
