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
import { resumeAllJobs } from "./services/jobs";
import type { Server } from "http";

let serverInstance: Server | null = null;

export interface ServerHandle {
  app: express.Application;
  server: Server;
  stop: () => Promise<void>;
}

export async function createServer(): Promise<ServerHandle> {
  logger.info("Starting CrocDesk server");
  await initDb();
  logger.info("Database initialized");
  
  // Auto-resume paused downloads on startup
  const resumedCount = await resumeAllJobs();
  if (resumedCount > 0) {
    logger.info(`Auto-resumed ${resumedCount} paused download job(s) on startup`);
  }

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
    // Only allow files under the library directory for safety (part files in downloadDir are not served)
    const settings = getSettings();
    const allowedRoots = [
      path.resolve(settings?.libraryDir || path.join(process.cwd(), "library")),
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
      // Optional cover images are expected to be missing sometimes - don't log as error
      const isOptionalImage = /\.(jpg|jpeg|png|webp)$/i.test(absPath) && 
        /(cover|boxart)/i.test(path.basename(absPath));
      if (!isOptionalImage) {
        // Only log errors for non-optional files (optional images are tried as fallbacks)
        logger.error("File not found", e, { absPath });
      }
      res.status(404).json({ error: "File not found" });
    }
  });

  // Serve static web assets in production (when bundled with desktop app)
  // Try multiple possible locations for web dist
  const fs = await import("fs");
  const resourcesPath = (process as unknown as { resourcesPath?: string }).resourcesPath;
  const possiblePaths = [
    // Packaged Electron app (extraResources)
    resourcesPath ? path.join(resourcesPath, "web", "dist") : null,
    // Development (relative to server dist)
    path.resolve(__dirname, "../../web/dist"),
    // Alternative development path
    path.resolve(process.cwd(), "apps", "web", "dist")
  ].filter((p): p is string => p !== null);

  let webDistPath: string | null = null;
  for (const testPath of possiblePaths) {
    try {
      const exists = await fs.promises.access(testPath).then(() => true).catch(() => false);
      if (exists) {
        webDistPath = testPath;
        break;
      }
    } catch {
      // Continue to next path
    }
  }

  if (webDistPath) {
    app.use(express.static(webDistPath));
    // SPA fallback: serve index.html for all non-API routes
    app.get("*", (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith("/crocdb") || 
          req.path.startsWith("/settings") || 
          req.path.startsWith("/library") || 
          req.path.startsWith("/jobs") || 
          req.path.startsWith("/events") || 
          req.path.startsWith("/file") || 
          req.path.startsWith("/health")) {
        return next();
      }
      res.sendFile(path.join(webDistPath!, "index.html"));
    });
  }

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/events", sseHandler);

  app.use("/crocdb", crocdbRouter);
  app.use("/settings", settingsRouter);
  app.use("/library", libraryRouter);
  app.use("/jobs", jobsRouter);

  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(PORT, () => {
        logger.info(`CrocDesk server listening on port ${PORT}`);
        serverInstance = server;
        resolve({
          app,
          server,
          stop: async () => {
            return new Promise<void>((resolveStop) => {
              if (serverInstance) {
                serverInstance.close(() => {
                  logger.info("Server stopped");
                  serverInstance = null;
                  resolveStop();
                });
              } else {
                resolveStop();
              }
            });
          }
        });
      });

      server.on("error", (error) => {
        logger.error("Server error", error);
        reject(error);
      });
    } catch (error) {
      logger.error("Failed to start server", error);
      reject(error);
    }
  });
}

export async function stopServer(): Promise<void> {
  if (serverInstance) {
    return new Promise<void>((resolve) => {
      serverInstance!.close(() => {
        logger.info("Server stopped");
        serverInstance = null;
        resolve();
      });
    });
  }
}

// Auto-start if running as standalone (for development/testing)
if (require.main === module) {
  createServer().catch((error) => {
    logger.error("Failed to start server", error);
    process.exit(1);
  });
}
