import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { DeviceRecord, DeviceType, DeviceItemRecord } from "@crocdesk/shared";
import {
  getDevice,
  listDeviceItems,
  listDevices,
  replaceDeviceItems,
  touchDeviceLastSeen,
  updateDeviceConnection,
  upsertDevice,
  upsertLibraryItem
} from "../db";
import { publishEvent } from "../events";

const POLL_INTERVAL_MS = 4000;
let pollHandle: NodeJS.Timeout | null = null;

export type RegisterDeviceRequest = {
  type: DeviceType;
  path: string;
  name: string;
  volumeSerial?: string | null;
  volumeLabel?: string | null;
};

export async function registerDevice(payload: RegisterDeviceRequest): Promise<DeviceRecord> {
  const now = Date.now();
  const idSource = buildIdSource(payload);
  const deviceId = crypto.createHash("sha256").update(idSource).digest("hex");
  const device: DeviceRecord = {
    id: deviceId,
    type: payload.type,
    path: path.resolve(payload.path),
    name: payload.name,
    volumeSerial: payload.volumeSerial ?? null,
    volumeLabel: payload.volumeLabel ?? null,
    lastSeenAt: null,
    connected: false,
    createdAt: now,
    updatedAt: now
  };

  upsertDevice(device);
  await refreshDeviceConnection(deviceId);
  return getDevice(deviceId) ?? device;
}

export async function refreshDeviceConnection(deviceId: string): Promise<DeviceRecord | null> {
  const device = getDevice(deviceId);
  if (!device) {
    return null;
  }

  const connected = await isDevicePathAvailable(device.path);
  updateDeviceConnection(device.id, connected);
  const updated = getDevice(device.id) ?? device;

  if (connected) {
    touchDeviceLastSeen(device.id);
    publishEvent({ type: "device.status", device: { ...updated, connected: true }, ts: Date.now() });
  } else {
    publishEvent({ type: "device.status", device: { ...updated, connected: false }, ts: Date.now() });
  }

  return getDevice(device.id);
}

export function startDevicePolling(): void {
  if (pollHandle) return;
  pollHandle = setInterval(() => {
    const devices = listDevices();
    devices.forEach((device) => {
      refreshDeviceConnection(device.id).catch(() => {
        // ignore background errors
      });
    });
  }, POLL_INTERVAL_MS);
}

export function stopDevicePolling(): void {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}

export async function reconcileDeviceItems(deviceId: string, libraryItems: { path: string; size: number; mtime: number }[]): Promise<DeviceItemRecord[]> {
  const device = getDevice(deviceId);
  if (!device) return [];
  const items: Omit<DeviceItemRecord, "id">[] = libraryItems.map((item) => ({
    libraryItemId: 0,
    deviceId: device.id,
    devicePath: item.path,
    checksum: null,
    lastSeenAt: Date.now(),
    status: "present"
  }));
  replaceDeviceItems(device.id, items);
  return listDeviceItems(device.id);
}

export function listDevicesWithStatus(): DeviceRecord[] {
  return listDevices();
}

export async function trackDeviceItemFromLibrary(libraryPath: string, size: number, deviceId: string): Promise<void> {
  const statsTime = Date.now();
  upsertLibraryItem({
    path: libraryPath,
    size,
    mtime: statsTime,
    hash: null,
    platform: null,
    gameSlug: null,
    source: "remote",
    deviceId
  });
}

function buildIdSource(payload: RegisterDeviceRequest): string {
  if (payload.type === "usb") {
    return `${payload.volumeSerial ?? ""}:${payload.volumeLabel ?? ""}:${payload.name}`;
  }
  return payload.path;
}

async function isDevicePathAvailable(devicePath: string): Promise<boolean> {
  try {
    await fs.access(devicePath);
    return true;
  } catch {
    return false;
  }
}
