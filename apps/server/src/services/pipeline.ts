import path from "path";
import { promises as fs } from "fs";
import { Readable } from "stream";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import type { CrocdbEntry, Manifest, Settings } from "@crocdesk/shared";
import { resolvePlatformAcronym } from "@crocdesk/shared";
import { ENABLE_DOWNLOADS } from "../config";
import { getEntry } from "./crocdb";
import { writeManifest } from "./manifest";
import { ensureDir, moveFile } from "../utils/fs";
import { Extract } from "unzipper";
import { logger } from "../utils/logger";

export type DownloadJobPayload = {
  slug: string;
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
  abortSignal?: AbortSignal,
  reportProgress?: (progress: number, message?: string, bytesDownloaded?: number, totalBytes?: number) => void,
  jobId?: string
): Promise<DownloadJobResult> {
  const defaultReport = (_progress: number, _message?: string) => {};
  const progressReporter = reportProgress || defaultReport;
  if (abortSignal?.aborted) throw new Error("Cancelled by user");
  progressReporter(0.05, "Resolving entry");
  logger.debug("Resolving entry", { slug: payload.slug });
  const entryResponse = await getEntry(payload.slug);
  const entry = entryResponse.data.entry;
  logger.debug("Entry resolved", { slug: entry.slug, platform: entry.platform, title: entry.title });

  if (!entry.links || entry.links.length === 0) {
    throw new Error("No download links available");
  }

  // Choose link with heuristics if not explicitly provided
  const resolvedLinkIndex =
    typeof payload.linkIndex === "number"
      ? payload.linkIndex
      : chooseLinkIndex(entry);
  const link = entry.links[resolvedLinkIndex];

  if (!ENABLE_DOWNLOADS) {
    logger.warn("Downloads disabled, skipping download", { slug: entry.slug });
    progressReporter(1, "Downloads disabled; skipping transfer");
    return { entry };
  }

  const downloadDir = path.resolve(settings.downloadDir || "./downloads");
  await ensureDir(downloadDir);
  const downloadPath = path.join(downloadDir, link.filename || `${entry.slug}.zip`);

  progressReporter(0.2, "Downloading asset");
  logger.info("Starting file download", { 
    slug: entry.slug, 
    url: link.url, 
    destination: downloadPath,
    format: link.format,
    size: link.size
  });
  await downloadFile(link.url, downloadPath, abortSignal, (progress, message, bytesDownloaded, totalBytes) => {
    // Map download progress (0-1) to overall progress (0.2-0.7)
    const overallProgress = 0.2 + (progress * 0.5);
    progressReporter(overallProgress, message, bytesDownloaded, totalBytes);
  }, jobId);
  logger.info("File download completed", { slug: entry.slug, destination: downloadPath });

  // If the asset is a zip, attempt extraction; otherwise, move directly.
  const isZip = (link.format?.toLowerCase() === "zip") || path.extname(downloadPath).toLowerCase() === ".zip";
  if (isZip) {
    try {
      if (abortSignal?.aborted) throw new Error("Cancelled by user");
      progressReporter(0.6, "Extracting archive");
      // Extract to libraryDir/{acronym}/{game}
      const libraryDir = path.resolve(settings.libraryDir || "./library");
      const platform = entry.platform || "unknown";
      const platformAcronym = resolvePlatformAcronym(platform, settings);
      const gameName = formatName(entry);
      const extractDir = path.join(libraryDir, platformAcronym, gameName);
      await ensureDir(extractDir);
      await extractZip(downloadPath, extractDir);

      // Remove zip after extraction
      await fs.unlink(downloadPath);

      if (abortSignal?.aborted) throw new Error("Cancelled by user");
      progressReporter(0.75, "Finalizing layout");
      const { outputDir, outputPaths } = await finalizeLayoutMany(entry, extractDir, settings);

      // Save boxart locally for library thumbnails
      await saveBoxart(entry, outputDir).catch(() => {});

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
          platformAcronym,
          regions: entry.regions
        },
        artifacts,
        createdAt: new Date().toISOString()
      };
      await writeManifest(outputDir, manifest);

      if (abortSignal?.aborted) throw new Error("Cancelled by user");
      progressReporter(1, "Complete");
      return { entry, outputPaths };
    } catch {
      // Fallback: if extraction fails, proceed with direct layout move
    }
  }

  if (abortSignal?.aborted) throw new Error("Cancelled by user");
  progressReporter(0.8, "Finalizing layout");
  const outputPath = await finalizeLayout(entry, downloadPath, settings);

  // Save boxart locally for library thumbnails
  await saveBoxart(entry, path.dirname(outputPath)).catch(() => {});

  const stats = await fs.stat(outputPath);
  const manifest = buildManifest(entry, outputPath, stats.size, settings);
  await writeManifest(path.dirname(outputPath), manifest);

  if (abortSignal?.aborted) throw new Error("Cancelled by user");
  progressReporter(1, "Complete");
  return { entry, outputPath };
}

async function saveBoxart(entry: CrocdbEntry, destDir: string): Promise<void> {
  const url = entry.boxart_url;
  if (!url) return;
  const resp = await fetch(url);
  if (!resp.ok || !resp.body) return;
  // Determine extension from content-type or URL
  const contentType = resp.headers.get("content-type") || "";
  let ext = ".jpg";
  if (contentType.includes("png")) ext = ".png";
  else if (contentType.includes("jpeg")) ext = ".jpg";
  else if (contentType.includes("webp")) ext = ".webp";
  else {
    const urlLower = url.toLowerCase();
    if (urlLower.endsWith(".png")) ext = ".png";
    else if (urlLower.endsWith(".webp")) ext = ".webp";
    else ext = ".jpg";
  }
  const outPath = path.join(destDir, `cover${ext}`);
  await ensureDir(destDir);
  const file = (await fs.open(outPath + ".part", "w")).createWriteStream();
  await new Promise<void>((resolve, reject) => {
    const stream = Readable.fromWeb(resp.body as unknown as NodeReadableStream);
    stream.on("error", reject);
    file.on("error", reject);
    file.on("finish", resolve);
    stream.pipe(file);
  });
  await moveFile(outPath + ".part", outPath);
}

function chooseLinkIndex(entry: CrocdbEntry): number {
  const links = (entry.links ?? []).filter((l) => !!l?.url);
  if (links.length === 0) {
    throw new Error("No valid links with URLs available");
  }

  const formats = Array.from(
    new Set(links.map((l) => (l.format || "").toLowerCase()))
  );
  // If multiple formats exist, require user selection via linkIndex
  if (formats.length > 1) {
    const details = formats.join(", ");
    throw new Error(
      `Multiple formats available (${details}). Please choose one (linkIndex).`
    );
  }

  // Prefer Myrient host when available
  const myrientIdx = links.findIndex(
    (l) => (l.host || "").toLowerCase() === "myrient"
  );
  if (myrientIdx >= 0) {
    // Map back to original entry.links index
    const target = links[myrientIdx];
    const originalIdx = entry.links.findIndex((l) => l.url === target.url);
    return originalIdx >= 0 ? originalIdx : myrientIdx;
  }

  // Otherwise pick the first available link
  return 0;
}

async function downloadFile(
  url: string,
  destination: string,
  abortSignal?: AbortSignal,
  reportProgress?: (progress: number, message?: string, bytesDownloaded?: number, totalBytes?: number) => void,
  jobId?: string
): Promise<void> {
  if (abortSignal?.aborted) throw new Error("Cancelled by user");
  
  const tempPath = `${destination}.part`;
  await ensureDir(path.dirname(destination));
  
  // Check for existing part file to resume
  let existingSize = 0;
  let isResuming = false;
  try {
    const stats = await fs.stat(tempPath);
    existingSize = stats.size;
    isResuming = existingSize > 0;
    if (isResuming) {
      logger.info("Resuming download", { url, destination, existingSize });
      if (reportProgress && existingSize > 0) {
        // Report initial progress based on existing file size
        // We'll update this once we know the total size
        reportProgress(0, "Resuming download", existingSize, 0);
      }
    }
  } catch (err) {
    // Part file doesn't exist, start fresh
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
  
  logger.debug("Initiating download", { url, destination, isResuming, existingSize });
  const controller = new AbortController();
  
  // Cleanup helper
  const cleanupPartFile = async () => {
    try {
      await fs.access(tempPath);
      await fs.unlink(tempPath);
      logger.debug("Part file cleaned up", { tempPath });
    } catch (err) {
      // File doesn't exist or already deleted, which is fine
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.warn("Error cleaning up part file", { tempPath, error: err });
      }
    }
  };
  
  if (abortSignal) {
    abortSignal.addEventListener("abort", async () => {
      logger.info("Download aborted", { url, destination, jobId });
      controller.abort();
      // Only clean up part file if job is not paused (i.e., it's a cancel, not a pause)
      // We need to import isJobPaused to check, but to avoid circular dependency,
      // we'll check if the error message indicates pause vs cancel
      // Actually, we can't check pause state here without importing from jobs.ts
      // So we'll skip cleanup on abort - the cancelJob function will handle cleanup
      // For pause, we want to keep the part file, so we don't clean up here
      // The cleanup will only happen in cancelJob explicitly
    });
  }
  
  // Prepare fetch options with Range header if resuming
  const fetchOptions: RequestInit = { signal: controller.signal };
  if (isResuming && existingSize > 0) {
    fetchOptions.headers = {
      Range: `bytes=${existingSize}-`
    };
  }
  
  const response = await fetch(url, fetchOptions);
  
  // Handle Range request responses
  if (isResuming) {
    if (response.status === 416) {
      // Range Not Satisfiable - file may have changed, delete part and restart
      logger.warn("Range request failed (416), restarting download", { url, existingSize });
      await cleanupPartFile();
      existingSize = 0;
      isResuming = false;
      // Retry without Range header
      const retryResponse = await fetch(url, { signal: controller.signal });
      if (!retryResponse.ok || !retryResponse.body) {
        logger.error("Download failed after retry", new Error(`HTTP ${retryResponse.status}`), { url, status: retryResponse.status });
        throw new Error(`Download failed: ${retryResponse.status}`);
      }
      const total = Number(retryResponse.headers.get("content-length") ?? 0);
      const fileStream = (await fs.open(tempPath, "w")).createWriteStream();
      let downloaded = 0;
      
      await new Promise<void>((resolve, reject) => {
        if (abortSignal?.aborted) {
          reject(new Error("Cancelled by user"));
          return;
        }
        
        const stream = Readable.fromWeb(retryResponse.body as unknown as NodeReadableStream);
        
        stream.on("data", (chunk: Buffer) => {
          if (abortSignal?.aborted) {
            stream.destroy();
            fileStream.destroy();
            reject(new Error("Cancelled by user"));
            return;
          }
          
          downloaded += chunk.length;
          const progress = total > 0 ? downloaded / total : 0;
          if (reportProgress) {
            reportProgress(progress, "Downloading asset", downloaded, total);
          }
        });

        stream.on("error", async (err) => {
          await cleanupPartFile();
          reject(err);
        });
        fileStream.on("error", async (err) => {
          await cleanupPartFile();
          reject(err);
        });
        fileStream.on("finish", resolve);
        
        if (abortSignal) {
          abortSignal.addEventListener("abort", async () => {
            stream.destroy();
            fileStream.destroy();
            // Don't clean up part file on abort - let cancelJob handle cleanup
            // For pause, we want to keep the part file
            reject(new Error("Cancelled by user"));
          });
        }

        stream.pipe(fileStream);
      });

      if (abortSignal?.aborted) {
        await cleanupPartFile();
        throw new Error("Cancelled by user");
      }

      logger.debug("Moving downloaded file to final destination", { tempPath, destination });
      await moveFile(tempPath, destination);
      logger.debug("Download file operation completed", { destination, totalBytes: total });
      return;
    } else if (response.status === 200) {
      // Server doesn't support Range requests, log warning and continue with full download
      logger.warn("Server doesn't support Range requests, downloading from beginning", { url });
      await cleanupPartFile();
      existingSize = 0;
      isResuming = false;
    }
  }
  
  if (!response.ok || !response.body) {
    logger.error("Download failed", new Error(`HTTP ${response.status}`), { url, status: response.status });
    throw new Error(`Download failed: ${response.status}`);
  }

  // Get total size from Content-Range header if resuming, otherwise Content-Length
  let total = 0;
  if (isResuming && response.status === 206) {
    // Partial Content - extract total from Content-Range header
    const contentRange = response.headers.get("content-range");
    if (contentRange) {
      const match = contentRange.match(/\/(\d+)$/);
      if (match) {
        total = Number(match[1]);
      }
    }
  } else {
    total = Number(response.headers.get("content-length") ?? 0);
  }
  
  // If we're resuming but don't have total yet, estimate from existing size
  if (isResuming && total === 0) {
    total = existingSize * 2; // Rough estimate, will be updated as we download
  }
  
  logger.debug("Download response received", { 
    url, 
    totalBytes: total, 
    existingSize,
    isResuming,
    status: response.status,
    contentType: response.headers.get("content-type") 
  });
  
  // Open file in append mode if resuming, write mode otherwise
  const fileStream = (await fs.open(tempPath, isResuming ? "a" : "w")).createWriteStream();
  let downloaded = 0;
  
  // Report initial progress if resuming
  if (isResuming && total > 0 && reportProgress) {
    const initialProgress = existingSize / total;
    reportProgress(initialProgress, "Resuming download", existingSize, total);
  }

  await new Promise<void>((resolve, reject) => {
    if (abortSignal?.aborted) {
      cleanupPartFile().catch(() => {});
      reject(new Error("Cancelled by user"));
      return;
    }
    
    const stream = Readable.fromWeb(response.body as unknown as NodeReadableStream);
    
    stream.on("data", (chunk: Buffer) => {
      if (abortSignal?.aborted) {
        stream.destroy();
        fileStream.destroy();
        cleanupPartFile().catch(() => {});
        reject(new Error("Cancelled by user"));
        return;
      }
      
      downloaded += chunk.length;
      // Calculate progress accounting for existing bytes when resuming
      const totalDownloaded = existingSize + downloaded;
      const progress = total > 0 ? totalDownloaded / total : 0;
      if (reportProgress) {
        reportProgress(progress, isResuming ? "Resuming download" : "Downloading asset", totalDownloaded, total);
      }
    });

    stream.on("error", async (err) => {
      await cleanupPartFile();
      reject(err);
    });
    fileStream.on("error", async (err) => {
      await cleanupPartFile();
      reject(err);
    });
    fileStream.on("finish", resolve);
    
    if (abortSignal) {
      abortSignal.addEventListener("abort", async () => {
        stream.destroy();
        fileStream.destroy();
        // Don't clean up part file on abort - let cancelJob handle cleanup
        // For pause, we want to keep the part file
        reject(new Error("Cancelled by user"));
      });
    }

    stream.pipe(fileStream);
  });

  if (abortSignal?.aborted) {
    await cleanupPartFile();
    throw new Error("Cancelled by user");
  }

  logger.debug("Moving downloaded file to final destination", { tempPath, destination });
  await moveFile(tempPath, destination);
  logger.debug("Download file operation completed", { destination, totalBytes: total });
}

async function finalizeLayout(
  entry: CrocdbEntry,
  sourcePath: string,
  settings: Settings
): Promise<string> {
  // Use settings.libraryDir as source of truth; place files under acronym subfolder
  const platform = entry.platform || "unknown";
  const platformAcronym = resolvePlatformAcronym(platform, settings);
  const targetRoot = path.join(path.resolve(settings.libraryDir || "./library"), platformAcronym);
  await ensureDir(targetRoot);

  const ext = path.extname(sourcePath);
  const fileName = formatName(entry) + ext;
  const outputPath = path.join(targetRoot, fileName);

  if (sourcePath !== outputPath) {
    await moveFile(sourcePath, outputPath);
  }

  return outputPath;
}

async function finalizeLayoutMany(
  entry: CrocdbEntry,
  extractRoot: string,
  settings: Settings
): Promise<{ outputDir: string; outputPaths: string[] }> {
  const libraryRoot = path.resolve(settings.libraryDir || "./library");
  const platform = entry.platform || "unknown";
  const platformAcronym = resolvePlatformAcronym(platform, settings);
  const baseRoot = path.join(libraryRoot, platformAcronym);
  // Create a dedicated folder for the game under the platform root
  const folderName = formatName(entry);
  // Avoid double-nesting if baseRoot already is the game folder
  const baseEndsWithFolder = path.basename(baseRoot) === folderName;
  const outputDir = baseEndsWithFolder ? baseRoot : path.join(baseRoot, folderName);
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
  outputPath: string,
  size: number,
  settings: Settings
): Manifest {
  const artifactPath = path.basename(outputPath);
  const platform = entry.platform || "unknown";
  const platformAcronym = resolvePlatformAcronym(platform, settings);
  return {
    schema: 1,
    crocdb: {
      slug: entry.slug,
      title: entry.title,
      platform: entry.platform,
      platformAcronym,
      regions: entry.regions
    },
    artifacts: [
      {
        path: artifactPath,
        size
      }
    ],
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
