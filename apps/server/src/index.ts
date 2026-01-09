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
import providersRouter from "./routes/providers";
import { logger } from "./utils/logger";
import { resumeAllJobs } from "./services/jobs";
import type { Server } from "http";

// Export logger for use by desktop app
export { logger };

// Type guard to check if running as pkg bundle
function isPkgBundle(): boolean {
  return 'pkg' in process && !!(process as any).pkg;
}

export async function startServer(): Promise<Server> {
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

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // API configuration endpoint for frontend
  // Returns the API base URL and port so the frontend can configure itself
  app.get("/api-config", (req, res) => {
    const protocol = req.protocol || "http";
    const host = req.get("host") || `localhost:${PORT}`;
    res.json({ 
      apiUrl: `${protocol}://${host}`,
      port: PORT
    });
  });

  // Serve static web assets in production (when bundled with desktop app or pkg)
  // pkg bundles assets maintaining their relative path structure
  // Since entry is dist/index.js and assets are ../../web/dist/**/*,
  // the path ../../web/dist from __dirname should work in both dev and pkg bundle
  const webDistPath = path.resolve(__dirname, "../../web/dist");
  try {
    const fs = await import("fs");
    const webDistExists = await fs.promises.access(webDistPath).then(() => true).catch(() => false);
    if (webDistExists) {
      // Create static middleware once for efficiency
      const staticMiddleware = express.static(webDistPath);
      
      // Static middleware - skip API routes
      app.use((req, res, next) => {
        // Skip static file serving for API routes
        if (req.path.startsWith("/crocdb") || 
            req.path.startsWith("/providers") || 
            req.path.startsWith("/settings") || 
            req.path.startsWith("/library") || 
            req.path.startsWith("/jobs") || 
            req.path.startsWith("/events") || 
            req.path.startsWith("/file") || 
            req.path.startsWith("/health") ||
            req.path.startsWith("/api-config")) {
          return next();
        }
        staticMiddleware(req, res, next);
      });
      // SPA fallback: serve index.html for all non-API routes
      app.get("*", (req, res, next) => {
        // Skip API routes
        if (req.path.startsWith("/crocdb") || 
            req.path.startsWith("/providers") || 
            req.path.startsWith("/settings") || 
            req.path.startsWith("/library") || 
            req.path.startsWith("/jobs") || 
            req.path.startsWith("/events") || 
            req.path.startsWith("/file") || 
            req.path.startsWith("/health") ||
            req.path.startsWith("/api-config")) {
          return next();
        }
        res.sendFile(path.join(webDistPath, "index.html"));
      });
    } else if (isPkgBundle()) {
      // Log warning if running as pkg bundle but web dist not found
      logger.warn("Web UI assets not found in pkg bundle", { webDistPath });
    }
  } catch (error) {
    // Web dist not available, skip static serving
    if (isPkgBundle()) {
      logger.error("Failed to access web UI assets in pkg bundle", error);
    }
  }

  app.get("/events", sseHandler);

  app.use("/crocdb", crocdbRouter);
  app.use("/providers", providersRouter);
  app.use("/settings", settingsRouter);
  app.use("/library", libraryRouter);
  app.use("/jobs", jobsRouter);

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      logger.info(`CrocDesk server listening on port ${PORT}`);
      resolve(server);
    });
  });
}

// Auto-start if run directly (not imported)
if (require.main === module) {
  // Set up global error handlers to log crashes
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception - Application will exit', error);
    // Give time for log to be written
    setTimeout(() => process.exit(1), 100);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', reason, { promise: String(promise) });
  });

  startServer().catch((error) => {
    logger.error("Failed to start server", error);
    process.exit(1);
  });
}
