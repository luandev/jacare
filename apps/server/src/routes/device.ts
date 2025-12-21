import { Router } from "express";
import { listDeviceItems } from "../db";
import { listDevicesWithStatus, refreshDeviceConnection, registerDevice } from "../services/devices";

const router = Router();

router.get("/status", async (_req, res) => {
  const devices = listDevicesWithStatus();
  for (const device of devices) {
    await refreshDeviceConnection(device.id);
  }
  res.json(listDevicesWithStatus());
});

router.post("/register", async (req, res) => {
  const { type, path, name, volumeSerial, volumeLabel } = req.body ?? {};
  if (!type || !path || !name) {
    res.status(400).json({ error: "type, path, and name are required" });
    return;
  }
  const device = await registerDevice({
    type,
    path,
    name,
    volumeSerial: volumeSerial ?? null,
    volumeLabel: volumeLabel ?? null
  });
  res.json(device);
});

router.get("/items", (req, res) => {
  const deviceId = req.query.deviceId?.toString();
  const items = listDeviceItems(deviceId);
  res.json(items);
});

export default router;
