import assert from "node:assert";
import { after, before, test } from "node:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Express } from "express";

let server: ReturnType<Express["listen"]> | null = null;
let tempDir: string | null = null;

before(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "crocdesk-e2e-"));
  process.env.CROCDESK_DATA_DIR = path.join(tempDir, "data");
  process.env.CROCDESK_STAGING_DIR = path.join(tempDir, "tmp");

  const devicePath = path.join(tempDir, "device-root");
  await mkdir(devicePath, { recursive: true });

  const { createApp } = await import("../src/app");
  const app = await createApp({ startPolling: false });
  server = app.listen(0);
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    server = null;
  }
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

test("registers a device and reports status", async () => {
  assert(server, "server should be started");
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const health = await fetch(`${baseUrl}/health`).then((res) => res.json());
  assert.equal(health.ok, true);

  const registerResponse = await fetch(`${baseUrl}/device/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "usb",
      path: path.join(tempDir ?? "", "device-root"),
      name: "E2E Test Drive",
      volumeSerial: "ABC123",
      volumeLabel: "E2E",
    }),
  });

  assert.equal(registerResponse.status, 200);
  const device = (await registerResponse.json()) as { id: string; name: string; connected: boolean };
  assert.ok(device.id.length > 0);
  assert.equal(device.name, "E2E Test Drive");
  assert.equal(device.connected, true);

  const statusList = await fetch(`${baseUrl}/device/status`).then((res) => res.json());
  assert.ok(Array.isArray(statusList));
  assert.equal(statusList.length, 1);
  assert.equal(statusList[0].id, device.id);
  assert.equal(statusList[0].connected, true);
});
