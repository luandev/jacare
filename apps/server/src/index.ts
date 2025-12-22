import express from "express";
import path from "path";
import { getSettings } from "./db";
import cors from "cors";
import { initDb } from "./db";
import { PORT } from "./config";
import { sseHandler } from "./events";
import crocdbRouter from "./routes/crocdb";
import settingsRouter from "./routes/settings";
import libraryRouter from "./routes/library";
import jobsRouter from "./routes/jobs";
import { logger } from "./utils/logger";

async function start(): Promise<void> {
  logger.info("Starting CrocDesk server");
  await initDb();
  logger.info("Database initialized");

  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "2mb" }));
  
  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.path}`, {
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      });
    });
    next();
  });

  // Serve files by absolute path (for manifest loading in web UI)
  app.get("/file", async (req, res) => {
    const filePath = req.query.path;
    if (typeof filePath !== "string" || !filePath) {
      logger.warn("File request with invalid path", { filePath });
      res.status(400).json({ error: "Missing or invalid path" });
      return;
    }
    // Only allow files under the downloads or donwloads folder for safety
    const settings = getSettings();
    const allowedRoots = [
      path.resolve(settings?.downloadDir || path.join(process.cwd(), "downloads")),
      path.resolve(process.cwd(), "apps", "server", "donwloads")
    ];
    const absPath = path.resolve(filePath);
    if (!allowedRoots.some((root) => absPath.startsWith(root))) {
      logger.warn("File access denied", { absPath, allowedRoots });
      res.status(403).json({ error: "Access denied" });
      return;
    }
    try {
      const fs = await import("fs");
      await fs.promises.access(absPath);
      if (absPath.endsWith(".json")) {
        const json = await fs.promises.readFile(absPath, "utf-8");
        res.json(JSON.parse(json));
        return;
      }
      // Stream binary/text files directly
      res.sendFile(absPath);
    } catch (e) {
      logger.error("File not found", e, { absPath });
      res.status(404).json({ error: "File not found" });
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/events", sseHandler);

  app.use("/crocdb", crocdbRouter);
  app.use("/settings", settingsRouter);
  app.use("/library", libraryRouter);
  app.use("/jobs", jobsRouter);

  app.listen(PORT, () => {
    logger.info(`CrocDesk server listening on port ${PORT}`);
  });
}

start().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});
