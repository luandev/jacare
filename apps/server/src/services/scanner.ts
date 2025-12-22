import path from "path";
import { promises as fs } from "fs";
import { Readable } from "stream";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import type { LibraryItem, Manifest } from "@crocdesk/shared";
import { writeManifest } from "./manifest";
import { getEntry, searchEntries } from "./crocdb";

const SCAN_EXTENSIONS = new Set([
  ".zip",
  ".7z",
  ".rar",
  ".iso",
  ".chd",
  ".bin",
  ".cue",
  ".sfc",
  ".smc",
  ".nes",
  ".gba",
  ".gb",
  ".gbc",
  ".n64",
  ".z64",
  ".v64",
  ".nds",
  ".md",
  ".gen",
  ".sms",
  ".gg",
  ".pce",
  ".img",
  ".ccd",
  ".sub",
  ".m3u"
]);

export type ScanRoot = { id: string; path: string };

export async function scanLocal(roots: ScanRoot[]): Promise<LibraryItem[]> {
  const items: LibraryItem[] = [];
  const manifestCache = new Map<string, Manifest | null>();

  for (const root of roots) {
    const rootPath = root.path;
    try {
      await walk(rootPath, undefined, items, manifestCache);
    } catch (error) {
      // Import logger at top if not already imported
      const { logger } = await import("../utils/logger");
      logger.warn(`Scan skipped for ${rootPath}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return items;
}

async function walk(
  dir: string,
  platform: string | undefined,
  items: LibraryItem[],
  manifestCache: Map<string, Manifest | null>
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      if (entry.isDirectory()) {
        continue;
      }
      if (entry.name !== ".crocdesk.json") {
        continue;
      }
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, platform, items, manifestCache);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!shouldIncludeFile(entry.name)) {
      continue;
    }

    const stat = await fs.stat(fullPath);
    const manifest = await readManifest(dir, platform, manifestCache);

    items.push({
      id: 0,
      path: fullPath,
      size: stat.size,
      mtime: stat.mtimeMs,
      hash: null,
      platform: manifest?.crocdb.platform ?? platform ?? null,
      gameSlug: manifest?.crocdb.slug ?? null,
      source: "local"
    });
  }
}

function shouldIncludeFile(fileName: string): boolean {
  if (fileName === ".crocdesk.json") {
    return false;
  }
  const ext = path.extname(fileName).toLowerCase();
  if (!ext) {
    return false;
  }
  return SCAN_EXTENSIONS.has(ext);
}

async function readManifest(
  dir: string,
  platform: string | undefined,
  manifestCache: Map<string, Manifest | null>
): Promise<Manifest | null> {
  if (manifestCache.has(dir)) {
    return manifestCache.get(dir) ?? null;
  }

  const manifestPath = path.join(dir, ".crocdesk.json");
  try {
    const data = await fs.readFile(manifestPath, "utf-8");
    const parsed = JSON.parse(data) as Manifest;
    // Attempt to backfill cover images for library display
    await ensureCoverExists(dir, parsed).catch(() => {});
    manifestCache.set(dir, parsed);
    return parsed;
  } catch {
    // Backfill: create a minimal manifest if eligible files exist
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const e of entries) {
      if (e.isFile() && shouldIncludeFile(e.name)) {
        files.push(path.join(dir, e.name));
      }
    }
    if (files.length === 0) {
      manifestCache.set(dir, null);
      return null;
    }

    // Try Crocdb lookup by folder name to enrich manifest
    const baseName = path.basename(dir);
    const match = await findCrocdbMatch(baseName, platform);

    const artifacts = await Promise.all(
      files.map(async (p) => {
        const s = await fs.stat(p);
        return { path: path.basename(p), size: s.size };
      })
    );
    const manifest: Manifest = {
      schema: 1,
      crocdb: {
        slug: match?.slug ?? slugify(baseName),
        title: match?.title ?? baseName,
        platform: match?.platform ?? platform ?? "unknown",
        regions: match?.regions ?? []
      },
      artifacts,
      createdAt: new Date().toISOString()
    };
    await writeManifest(dir, manifest);
    // Cover backfill will likely be skipped without a Crocdb slug, but try anyway
    await ensureCoverExists(dir, manifest).catch(() => {});
    manifestCache.set(dir, manifest);
    return manifest;
  }
}

async function ensureCoverExists(dir: string, manifest: Manifest): Promise<void> {
  const coverCandidates = ["cover.jpg", "cover.png", "cover.webp", "boxart.jpg", "boxart.png"];
  for (const name of coverCandidates) {
    try {
      await fs.access(path.join(dir, name));
      return; // Cover already present
    } catch {}
  }

  // Fetch boxart from Crocdb using slug
  const slug = manifest?.crocdb?.slug;
  if (!slug) return;
  try {
    const resp = await getEntry(slug);
    const url = resp.data.entry.boxart_url;
    if (!url) return;
    const response = await fetch(url);
    if (!response.ok || !response.body) return;
    const contentType = response.headers.get("content-type") || "";
    let ext = ".jpg";
    if (contentType.includes("png")) ext = ".png";
    else if (contentType.includes("jpeg")) ext = ".jpg";
    else if (contentType.includes("webp")) ext = ".webp";
    else {
      const urlLower = url.toLowerCase();
      if (urlLower.endsWith(".png")) ext = ".png";
      else if (urlLower.endsWith(".webp")) ext = ".webp";
    }
    const outPath = path.join(dir, `cover${ext}`);
    const tempPath = outPath + ".part";
    const file = (await fs.open(tempPath, "w")).createWriteStream();
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.fromWeb(response.body as unknown as NodeReadableStream);
      stream.on("error", reject);
      file.on("error", reject);
      file.on("finish", resolve);
      stream.pipe(file);
    });
    await fs.rename(tempPath, outPath);
  } catch {
    // ignore backfill errors
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function findCrocdbMatch(
  folderName: string,
  platform: string | undefined
): Promise<{ slug: string; title: string; platform: string; regions: string[] } | null> {
  try {
    const resp = await searchEntries({
      search_key: folderName,
      platforms: platform ? [platform] : undefined,
      max_results: 5,
      page: 1
    });
    const results = resp.data.results ?? [];
    if (results.length === 0) return null;
    // Basic fuzzy: choose the first whose normalized title includes normalized folderName
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const target = norm(folderName);
    const hit =
      results.find((r) => norm(r.title).includes(target)) || results[0];
    return {
      slug: hit.slug,
      title: hit.title,
      platform: hit.platform,
      regions: hit.regions ?? []
    };
  } catch {
    return null;
  }
}
