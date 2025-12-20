import express from "express";
import cors from "cors";
import { initDb } from "./db";
import { PORT } from "./config";
import { sseHandler } from "./events";
import crocdbRouter from "./routes/crocdb";
import settingsRouter from "./routes/settings";
import profilesRouter from "./routes/profiles";
import libraryRouter from "./routes/library";
import jobsRouter from "./routes/jobs";

async function start(): Promise<void> {
  await initDb();

  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/events", sseHandler);

  app.use("/crocdb", crocdbRouter);
  app.use("/settings", settingsRouter);
  app.use("/profiles", profilesRouter);
  app.use("/library", libraryRouter);
  app.use("/jobs", jobsRouter);

  app.listen(PORT, () => {
    console.log(`CrocDesk server listening on ${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
