import cors from "cors";
import express, { type Express } from "express";
import { PORT } from "./config";
import { initDb } from "./db";
import { sseHandler } from "./events";
import crocdbRouter from "./routes/crocdb";
import deviceRouter from "./routes/device";
import jobsRouter from "./routes/jobs";
import libraryRouter from "./routes/library";
import profilesRouter from "./routes/profiles";
import settingsRouter from "./routes/settings";
import { startDevicePolling } from "./services/devices";

type CreateAppOptions = {
  startPolling?: boolean;
};

export async function createApp(options: CreateAppOptions = {}): Promise<Express> {
  await initDb();

  if (options.startPolling ?? true) {
    startDevicePolling();
  }

  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, port: PORT });
  });

  app.get("/events", sseHandler);

  app.use("/crocdb", crocdbRouter);
  app.use("/settings", settingsRouter);
  app.use("/profiles", profilesRouter);
  app.use("/library", libraryRouter);
  app.use("/jobs", jobsRouter);
  app.use("/device", deviceRouter);

  return app;
}
