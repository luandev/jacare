import { Router } from "express";
import { listLibraryItems } from "../db";
import { enqueueScanLocal } from "../services/jobs";

const router = Router();

router.get("/items", (req, res) => {
  const platform = req.query.platform?.toString();
  const items = listLibraryItems(platform ? { platform } : undefined);
  res.json(items);
});

router.get("/games", (req, res) => {
  const platform = req.query.platform?.toString();
  const items = listLibraryItems(platform ? { platform } : undefined);
  res.json(items);
});

router.post("/scan/local", async (_req, res) => {
  const job = await enqueueScanLocal();
  res.json(job);
});

export default router;
