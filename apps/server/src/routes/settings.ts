import { Router } from "express";
import { getSettings, setSettings } from "../db";
import { getDefaultSettings } from "../config";

const router = Router();

router.get("/", (_req, res) => {
  const settings = getSettings() ?? getDefaultSettings();
  res.json(settings);
});

router.put("/", (req, res) => {
  const nextSettings = req.body;
  if (!nextSettings || typeof nextSettings !== "object") {
    res.status(400).json({ error: "Invalid settings payload" });
    return;
  }
  setSettings(nextSettings);
  res.json({ ok: true });
});

export default router;
