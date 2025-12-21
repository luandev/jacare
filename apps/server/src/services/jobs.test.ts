import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "path";
import os from "os";
import { promises as fs } from "fs";
import type { JobRecord, Profile, Settings } from "@crocdesk/shared";

const downloadPayload = { slug: "cool-game", profileId: "profile-1" };
const baseEntry = {
  slug: "cool-game",
  title: "Cool Game",
  platform: "snes",
  regions: ["NA"],
  links: []
};

const createJob = (): JobRecord => ({
  id: "job-1",
  type: "download_and_install",
  status: "queued",
  payload: downloadPayload,
  createdAt: Date.now(),
  updatedAt: Date.now()
});

const createProfile = (root: string): Profile => ({
  id: "profile-1",
  name: "Profile",
  platforms: {
    snes: {
      root,
      naming: "{Title} ({Region})"
    }
  }
});

const settingsFor = (downloadDir: string): Settings => ({
  downloadDir,
  libraryRoots: []
});

describe("runDownloadJob", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "crocdesk-jobs-"));
  });

  afterEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("upserts the downloaded file into the library", async () => {
    const downloadPath = path.join(tempDir, "Cool Game (NA).zip");
    await fs.writeFile(downloadPath, "rom-binary");

    const upsertLibraryItem = vi.fn();
    const getSettings = vi.fn(() => settingsFor(path.join(tempDir, "downloads")));
    const getProfile = vi.fn(() => createProfile(tempDir));
    const createJobStep = vi.fn(() => ({ id: 1 }));

    vi.doMock(
      "@crocdesk/shared",
      () => ({
        DEFAULT_PROFILE: createProfile(tempDir),
        DEFAULT_SETTINGS: settingsFor(path.join(tempDir, "downloads"))
      }),
      { virtual: true }
    );
    vi.doMock("../db", () => ({
      createJob: vi.fn(),
      createJobStep,
      getProfile,
      getSettings,
      listJobSteps: vi.fn(),
      listJobs: vi.fn(),
      updateJobStatus: vi.fn(),
      updateJobStep: vi.fn(),
      upsertLibraryItem
    }));
    vi.doMock("../events", () => ({ publishEvent: vi.fn() }));
    vi.doMock("./pipeline", () => ({
      runDownloadAndInstall: vi.fn(async () => ({
        entry: baseEntry,
        outputPath: downloadPath
      }))
    }));

    const { runDownloadJob } = await import("./jobs");

    await runDownloadJob(createJob(), downloadPayload);

    const stats = await fs.stat(downloadPath);
    expect(upsertLibraryItem).toHaveBeenCalledWith({
      path: downloadPath,
      size: stats.size,
      mtime: stats.mtimeMs,
      hash: null,
      platform: baseEntry.platform,
      gameSlug: baseEntry.slug,
      source: "remote"
    });
    expect(createJobStep).toHaveBeenCalled();
    expect(getSettings).toHaveBeenCalled();
    expect(getProfile).toHaveBeenCalledWith(downloadPayload.profileId);
  });

  it("skips library updates when no file was downloaded", async () => {
    const upsertLibraryItem = vi.fn();

    vi.doMock(
      "@crocdesk/shared",
      () => ({
        DEFAULT_PROFILE: createProfile(tempDir),
        DEFAULT_SETTINGS: settingsFor(path.join(tempDir, "downloads"))
      }),
      { virtual: true }
    );
    vi.doMock("../db", () => ({
      createJob: vi.fn(),
      createJobStep: vi.fn(() => ({ id: 1 })),
      getProfile: vi.fn(() => createProfile(tempDir)),
      getSettings: vi.fn(() => settingsFor(path.join(tempDir, "downloads"))),
      listJobSteps: vi.fn(),
      listJobs: vi.fn(),
      updateJobStatus: vi.fn(),
      updateJobStep: vi.fn(),
      upsertLibraryItem
    }));
    vi.doMock("../events", () => ({ publishEvent: vi.fn() }));
    vi.doMock("./pipeline", () => ({
      runDownloadAndInstall: vi.fn(async () => ({ entry: baseEntry }))
    }));

    const { runDownloadJob } = await import("./jobs");

    await runDownloadJob(createJob(), downloadPayload);

    expect(upsertLibraryItem).not.toHaveBeenCalled();
  });
});
