import { Router } from "express";
import path from "path";
import { promises as fs } from "fs";
import { listLibraryItems, getSettings, deleteLibraryItemsUnderDir } from "../db";
import { enqueueScanLocal } from "../services/jobs";
import { scanLocal } from "../services/scanner";

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

// List items found in the configured download directory by scanning it as a root
router.get("/downloads/items", async (_req, res) => {
  const settings = getSettings();
  const downloadDir = path.resolve(settings?.downloadDir || "./downloads");
  try {
    // Ensure the directory exists; if not, fall back to repository sample under apps/server/donwloads
    let dirToScan = downloadDir;
    try {
      const stat = await fs.stat(downloadDir);
      if (!stat.isDirectory()) {
        throw new Error("Download path is not a directory");
      }
    } catch {
      const repoSample = path.resolve(process.cwd(), "apps", "server", "donwloads");
      const sampleStat = await fs.stat(repoSample).catch(() => null);
      if (sampleStat && sampleStat.isDirectory()) {
        dirToScan = repoSample;
      } else {
        res.json([]);
        return;
      }
    }

    // Scan the downloads root; scanner walks subfolders (console directories) recursively
    const items = await scanLocal([{ id: "downloads", path: dirToScan }]);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list downloads" });
  }
});

router.post("/scan/local", async (_req, res) => {
  const job = await enqueueScanLocal();
  res.json(job);
});

router.delete("/item", async (req, res) => {
  const dirParam = req.query.dir?.toString();
  if (!dirParam) {
    res.status(400).json({ error: "dir is required" });
    return;
  }
  const settings = getSettings();
  const allowedRoots = [
    ...(settings?.libraryRoots?.map((r) => path.resolve(r.path)) ?? []),
    path.resolve(settings?.downloadDir || "./downloads"),
    path.resolve(process.cwd(), "apps", "server", "donwloads")
  ];
  const absDir = path.resolve(dirParam);
  if (!allowedRoots.some((root) => absDir.startsWith(root))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  try {
    // Remove directory recursively and delete DB entries under it
    await fs.rm(absDir, { recursive: true, force: true });
    deleteLibraryItemsUnderDir(absDir);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete" });
  }
});

export default router;
