import path from "path";
import { promises as fs } from "fs";
import type { LibraryItem, LibraryRoot, Manifest } from "@crocdesk/shared";

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

export async function scanLocal(roots: LibraryRoot[]): Promise<LibraryItem[]> {
  const items: LibraryItem[] = [];
  const manifestCache = new Map<string, Manifest | null>();

  for (const root of roots) {
    const rootPath = root.path;
    try {
      await walk(rootPath, root.platform, items, manifestCache);
    } catch (error) {
      console.warn(`Scan skipped for ${rootPath}:`, error);
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
    const manifest = await readManifest(dir, manifestCache);

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
  manifestCache: Map<string, Manifest | null>
): Promise<Manifest | null> {
  if (manifestCache.has(dir)) {
    return manifestCache.get(dir) ?? null;
  }

  const manifestPath = path.join(dir, ".crocdesk.json");
  try {
    const data = await fs.readFile(manifestPath, "utf-8");
    const parsed = JSON.parse(data) as Manifest;
    manifestCache.set(dir, parsed);
    return parsed;
  } catch {
    manifestCache.set(dir, null);
    return null;
  }
}
