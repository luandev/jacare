import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "path";
import os from "os";
import { promises as fs } from "fs";
import type { CrocdbEntry, Profile, Settings } from "@crocdesk/shared";

const baseEntry: CrocdbEntry = {
  slug: "cool-game",
  title: "Cool:Game/One",
  platform: "snes",
  regions: ["NA"],
  links: [
    {
      name: "primary",
      type: "zip",
      format: "zip",
      url: "https://example.com/cool-game.zip",
      filename: "cool-game.zip",
      host: "example.com",
      size: 20
    }
  ]
};

function createProfile(root: string): Profile {
  return {
    id: "profile-1",
    name: "Test Profile",
    platforms: {
      snes: {
        root,
        naming: "{Title} ({Region})"
      }
    }
  };
}

const settingsFor = (downloadDir: string): Settings => ({
  downloadDir,
  libraryRoots: []
});

describe("runDownloadAndInstall", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "crocdesk-pipeline-"));
  });

  afterEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("downloads the asset, moves it into the platform root, and writes a manifest", async () => {
    vi.doMock("../config", () => ({ ENABLE_DOWNLOADS: true }));
    vi.doMock("./crocdb", () => ({
      getEntry: vi.fn(async () => ({ info: {}, data: { entry: baseEntry } }))
    }));

    const fileContents = "rom-binary-content";
    const fetchSpy = vi.fn(async () =>
      new Response(fileContents, {
        headers: { "content-length": `${fileContents.length}` }
      })
    );
    vi.stubGlobal("fetch", fetchSpy);

    const downloadDir = path.join(tempDir, "downloads");
    const platformRoot = path.join(tempDir, "library");
    const profile = createProfile(platformRoot);

    const { runDownloadAndInstall } = await import("./pipeline");

    const progressUpdates: { progress: number; message?: string }[] = [];
    const result = await runDownloadAndInstall(
      { slug: baseEntry.slug, profileId: profile.id },
      settingsFor(downloadDir),
      profile,
      (progress, message) => progressUpdates.push({ progress, message })
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const expectedOutput = path.join(platformRoot, "CoolGameOne (NA).zip");
    const writtenFile = await fs.readFile(expectedOutput, "utf-8");
    expect(writtenFile).toBe(fileContents);

    const manifestRaw = await fs.readFile(path.join(platformRoot, ".crocdesk.json"), "utf-8");
    const manifest = JSON.parse(manifestRaw);
    expect(manifest).toMatchObject({
      crocdb: {
        slug: baseEntry.slug,
        title: baseEntry.title,
        platform: baseEntry.platform,
        regions: baseEntry.regions
      },
      artifacts: [
        {
          path: path.basename(expectedOutput),
          size: Buffer.byteLength(fileContents)
        }
      ],
      profileId: profile.id
    });

    expect(progressUpdates.some((update) => update.message === "Complete")).toBe(true);
    expect(result.outputPath).toBe(expectedOutput);
  });

  it("short-circuits when downloads are disabled", async () => {
    vi.doMock("../config", () => ({ ENABLE_DOWNLOADS: false }));
    const getEntry = vi.fn(async () => ({ info: {}, data: { entry: baseEntry } }));
    vi.doMock("./crocdb", () => ({ getEntry }));
    const writeManifest = vi.fn();
    vi.doMock("./manifest", () => ({ writeManifest }));

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const downloadDir = path.join(tempDir, "downloads");
    const profile = createProfile(path.join(tempDir, "library"));

    const { runDownloadAndInstall } = await import("./pipeline");

    const result = await runDownloadAndInstall(
      { slug: baseEntry.slug, profileId: profile.id },
      settingsFor(downloadDir),
      profile,
      () => {}
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(writeManifest).not.toHaveBeenCalled();
    expect(result.outputPath).toBeUndefined();
  });
});
