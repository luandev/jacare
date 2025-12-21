import { Router } from "express";
import { enqueueDownloadAndInstall, enqueueTransfer, getJobs, getJobSteps } from "../services/jobs";
import { getJob } from "../db";
import { getEntry } from "../services/crocdb";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const jobs = getJobs();
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
    res.json(enriched);
  } catch (error) {
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
  const { slug, profileId, linkIndex } = req.body ?? {};
  if (!slug || !profileId) {
    res.status(400).json({ error: "slug and profileId are required" });
    return;
  }
  const parsedLinkIndex =
    typeof linkIndex === "number" ? linkIndex : undefined;
  const job = await enqueueDownloadAndInstall({
    slug,
    profileId,
    linkIndex: parsedLinkIndex
  });
  res.json(job);
});

router.post("/transfer", async (req, res) => {
  const { libraryItemId, deviceId, targetPath } = req.body ?? {};
  if (!libraryItemId || !deviceId) {
    res.status(400).json({ error: "libraryItemId and deviceId are required" });
    return;
  }
  const job = await enqueueTransfer({
    libraryItemId: Number(libraryItemId),
    deviceId: deviceId.toString(),
    targetPath: targetPath ? targetPath.toString() : undefined
  });
  res.json(job);
});

router.post("/:id/cancel", (_req, res) => {
  res.status(501).json({ error: "Cancel not implemented in MVP" });
});

export default router;
