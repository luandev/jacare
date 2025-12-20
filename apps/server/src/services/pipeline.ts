import path from "path";
import { promises as fs } from "fs";
import { Readable } from "stream";
import type { CrocdbEntry, Manifest, Profile, Settings } from "@crocdesk/shared";
import { ENABLE_DOWNLOADS } from "../config";
import { getEntry } from "./crocdb";
import { writeManifest } from "./manifest";
import { ensureDir, moveFile } from "../utils/fs";

export type DownloadJobPayload = {
  slug: string;
  profileId: string;
  linkIndex?: number;
};

export type DownloadJobResult = {
  entry: CrocdbEntry;
  outputPath?: string;
};

export async function runDownloadAndInstall(
  payload: DownloadJobPayload,
  settings: Settings,
  profile: Profile,
  reportProgress: (progress: number, message?: string) => void
): Promise<DownloadJobResult> {
  reportProgress(0.05, "Resolving entry");
  const entryResponse = await getEntry(payload.slug);
  const entry = entryResponse.data.entry;

  if (!entry.links || entry.links.length === 0) {
    throw new Error("No download links available");
  }

  const link = entry.links[payload.linkIndex ?? 0];

  if (!ENABLE_DOWNLOADS) {
    reportProgress(1, "Downloads disabled; skipping transfer");
    return { entry };
  }

  const downloadDir = path.resolve(settings.downloadDir || "./downloads");
  await ensureDir(downloadDir);
  const downloadPath = path.join(downloadDir, link.filename || `${entry.slug}.zip`);

  reportProgress(0.2, "Downloading asset");
  await downloadFile(link.url, downloadPath, reportProgress);

  reportProgress(0.8, "Finalizing layout");
  const outputPath = await finalizeLayout(entry, downloadPath, profile);

  if (profile.postActions?.writeManifest ?? true) {
    const stats = await fs.stat(outputPath);
    const manifest = buildManifest(entry, profile, outputPath, stats.size);
    await writeManifest(path.dirname(outputPath), manifest);
  }

  reportProgress(1, "Complete");
  return { entry, outputPath };
}

async function downloadFile(
  url: string,
  destination: string,
  reportProgress: (progress: number, message?: string) => void
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const total = Number(response.headers.get("content-length") ?? 0);
  const tempPath = `${destination}.part`;
  await ensureDir(path.dirname(destination));

  const fileStream = (await fs.open(tempPath, "w")).createWriteStream();
  let downloaded = 0;

  await new Promise<void>((resolve, reject) => {
    const stream = Readable.fromWeb(response.body as unknown as ReadableStream);
    stream.on("data", (chunk: Buffer) => {
      downloaded += chunk.length;
      if (total > 0) {
        reportProgress(0.2 + 0.5 * (downloaded / total), "Downloading asset");
      }
    });

    stream.on("error", reject);
    fileStream.on("error", reject);
    fileStream.on("finish", resolve);

    stream.pipe(fileStream);
  });

  await moveFile(tempPath, destination);
}

async function finalizeLayout(
  entry: CrocdbEntry,
  sourcePath: string,
  profile: Profile
): Promise<string> {
  const platformProfile = profile.platforms[entry.platform];
  const targetRoot = platformProfile?.root ?? path.dirname(sourcePath);
  await ensureDir(targetRoot);

  const ext = path.extname(sourcePath);
  const fileName = formatName(entry, platformProfile?.naming) + ext;
  const outputPath = path.join(targetRoot, fileName);

  if (sourcePath !== outputPath) {
    await moveFile(sourcePath, outputPath);
  }

  return outputPath;
}

function formatName(entry: CrocdbEntry, template?: string): string {
  const region = entry.regions?.[0] ?? "unknown";
  const base = template || "{Title} ({Region})";
  return base
    .replace("{Title}", sanitize(entry.title))
    .replace("{Region}", sanitize(region))
    .replace("{Platform}", sanitize(entry.platform));
}

function sanitize(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "").trim();
}

function buildManifest(
  entry: CrocdbEntry,
  profile: Profile,
  outputPath: string,
  size: number
): Manifest {
  const artifactPath = path.basename(outputPath);
  return {
    schema: 1,
    crocdb: {
      slug: entry.slug,
      title: entry.title,
      platform: entry.platform,
      regions: entry.regions
    },
    artifacts: [
      {
        path: artifactPath,
        size
      }
    ],
    profileId: profile.id,
    createdAt: new Date().toISOString()
  };
}
