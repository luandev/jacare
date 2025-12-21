import path from "path";
import { promises as fs } from "fs";
import { Readable } from "stream";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import type { CrocdbEntry, Manifest, Profile, Settings } from "@crocdesk/shared";
import { ENABLE_DOWNLOADS } from "../config";
import { getEntry } from "./crocdb";
import { writeManifest } from "./manifest";
import { ensureDir, moveFile } from "../utils/fs";
import { Extract } from "unzipper";

export type DownloadJobPayload = {
  slug: string;
  profileId: string;
  linkIndex?: number;
};

export type DownloadJobResult = {
  entry: CrocdbEntry;
  outputPath?: string;
  outputPaths?: string[];
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

  // If the asset is a zip, attempt extraction; otherwise, move directly.
  const isZip = (link.format?.toLowerCase() === "zip") || path.extname(downloadPath).toLowerCase() === ".zip";
  if (isZip) {
    try {
      reportProgress(0.6, "Extracting archive");
      const extractDir = path.join(downloadDir, `${entry.slug}-extract`);
      await ensureDir(extractDir);
      await extractZip(downloadPath, extractDir);

      reportProgress(0.75, "Finalizing layout");
      const { outputDir, outputPaths } = await finalizeLayoutMany(entry, extractDir, profile);

      if (profile.postActions?.writeManifest ?? true) {
        const artifacts = await Promise.all(
          outputPaths.map(async (p) => {
            const s = await fs.stat(p);
            return { path: path.basename(p), size: s.size };
          })
        );
        const manifest: Manifest = {
          schema: 1,
          crocdb: {
            slug: entry.slug,
            title: entry.title,
            platform: entry.platform,
            regions: entry.regions
          },
          artifacts,
          profileId: profile.id,
          createdAt: new Date().toISOString()
        };
        await writeManifest(outputDir, manifest);
      }

      reportProgress(1, "Complete");
      return { entry, outputPaths };
    } catch (e) {
      // Fallback: if extraction fails, proceed with direct layout move
    }
  }

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
    const stream = Readable.fromWeb(response.body as unknown as NodeReadableStream);
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

async function finalizeLayoutMany(
  entry: CrocdbEntry,
  extractRoot: string,
  profile: Profile
): Promise<{ outputDir: string; outputPaths: string[] }> {
  const platformProfile = profile.platforms[entry.platform];
  const baseRoot = platformProfile?.root ?? extractRoot;
  // Create a dedicated folder for the game under the platform root
  const folderName = formatName(entry, platformProfile?.naming);
  const outputDir = path.join(baseRoot, folderName);
  await ensureDir(outputDir);

  const files = await listFilesRecursive(extractRoot);
  const outputPaths: string[] = [];
  for (const file of files) {
    const dest = path.join(outputDir, path.basename(file));
    if (file !== dest) {
      await ensureDir(path.dirname(dest));
      await moveFile(file, dest);
    }
    outputPaths.push(dest);
  }
  return { outputDir, outputPaths };
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

async function extractZip(zipPath: string, destDir: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const stream = Extract({ path: destDir });
    stream.on("close", () => resolve());
    stream.on("error", reject);

    // Pipe the zip file into extractor
    fs.readFile(zipPath)
      .then((buffer) => {
        Readable.from(buffer).pipe(stream);
      })
      .catch(reject);
  });
}

async function listFilesRecursive(rootDir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile()) {
        out.push(full);
      }
    }
  }
  await walk(rootDir);
  return out;
}
