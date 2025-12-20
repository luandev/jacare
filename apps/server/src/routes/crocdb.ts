import { Router } from "express";
import {
  getEntry,
  getInfo,
  getPlatforms,
  getRegions,
  searchEntries
} from "../services/crocdb";

const router = Router();

router.post("/search", async (req, res) => {
  try {
    const response = await searchEntries(req.body ?? {});
    res.json(response);
  } catch (error) {
    res.status(500).json({
      info: { error: error instanceof Error ? error.message : "Search failed" },
      data: {}
    });
  }
});

router.post("/entry", async (req, res) => {
  const slug = req.body?.slug;
  if (!slug) {
    res.status(400).json({ info: { error: "slug is required" }, data: {} });
    return;
  }
  try {
    const response = await getEntry(slug);
    res.json(response);
  } catch (error) {
    res.status(500).json({
      info: { error: error instanceof Error ? error.message : "Entry fetch failed" },
      data: {}
    });
  }
});

router.get("/platforms", async (_req, res) => {
  try {
    const response = await getPlatforms();
    res.json(response);
  } catch (error) {
    res.status(500).json({
      info: { error: error instanceof Error ? error.message : "Platforms fetch failed" },
      data: {}
    });
  }
});

router.get("/regions", async (_req, res) => {
  try {
    const response = await getRegions();
    res.json(response);
  } catch (error) {
    res.status(500).json({
      info: { error: error instanceof Error ? error.message : "Regions fetch failed" },
      data: {}
    });
  }
});

router.get("/info", async (_req, res) => {
  try {
    const response = await getInfo();
    res.json(response);
  } catch (error) {
    res.status(500).json({
      info: { error: error instanceof Error ? error.message : "Info fetch failed" },
      data: {}
    });
  }
});

export default router;
