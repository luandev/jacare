import { Router } from "express";
import { enqueueDownloadAndInstall, getJobs, getJobSteps } from "../services/jobs";
import { getJob } from "../db";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getJobs());
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

router.post("/:id/cancel", (_req, res) => {
  res.status(501).json({ error: "Cancel not implemented in MVP" });
});

export default router;
