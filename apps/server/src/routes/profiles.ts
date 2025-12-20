import { Router } from "express";
import { listProfiles, getProfile, saveProfile, deleteProfile } from "../db";

const router = Router();

router.get("/", (_req, res) => {
  res.json(listProfiles());
});

router.get("/:id", (req, res) => {
  const profile = getProfile(req.params.id);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profile);
});

router.post("/", (req, res) => {
  const profile = req.body;
  if (!profile?.id) {
    res.status(400).json({ error: "Profile id is required" });
    return;
  }
  saveProfile(profile);
  res.json(profile);
});

router.put("/:id", (req, res) => {
  const profile = req.body;
  if (!profile?.id || profile.id !== req.params.id) {
    res.status(400).json({ error: "Profile id mismatch" });
    return;
  }
  saveProfile(profile);
  res.json(profile);
});

router.delete("/:id", (req, res) => {
  deleteProfile(req.params.id);
  res.json({ ok: true });
});

export default router;
