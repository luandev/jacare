import { Router } from "express";
import { DEFAULT_SETTINGS, isValidAcronym, isValidIconBrand } from "@crocdesk/shared";
import { getSettings, setSettings } from "../db";

const router = Router();

router.get("/", (_req, res) => {
  const settings = getSettings() ?? DEFAULT_SETTINGS;
  res.json(settings);
});

router.put("/", (req, res) => {
  const nextSettings = req.body;
  if (!nextSettings || typeof nextSettings !== "object") {
    res.status(400).json({ error: "Invalid settings payload" });
    return;
  }

  // Validate platformAcronyms if present
  if (nextSettings.platformAcronyms) {
    if (typeof nextSettings.platformAcronyms !== "object") {
      res.status(400).json({ error: "platformAcronyms must be an object" });
      return;
    }
    for (const [platform, acronym] of Object.entries(nextSettings.platformAcronyms)) {
      if (typeof acronym !== "string" || !isValidAcronym(acronym)) {
        res.status(400).json({ 
          error: `Invalid acronym "${acronym}" for platform "${platform}". Must be 2-12 characters, alphanumeric with dashes/underscores.`
        });
        return;
      }
    }
  }

  // Validate platformIcons if present
  if (nextSettings.platformIcons) {
    if (typeof nextSettings.platformIcons !== "object") {
      res.status(400).json({ error: "platformIcons must be an object" });
      return;
    }
    for (const [platform, icon] of Object.entries(nextSettings.platformIcons)) {
      if (typeof icon !== "string" || !isValidIconBrand(icon)) {
        res.status(400).json({ 
          error: `Invalid icon brand "${icon}" for platform "${platform}". Must be one of: nintendo, sony, xbox, sega, pc, atari, commodore, nec, generic.`
        });
        return;
      }
    }
  }

  setSettings(nextSettings);
  res.json({ ok: true });
});

export default router;
