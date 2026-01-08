import path from "path";
import { promises as fs } from "fs";
import { Readable } from "stream";
import type { ReadableStream as NodeReadableStream } from "stream/web";
import type { LibraryItem, Manifest } from "@crocdesk/shared";
import { writeManifest } from "./manifest";
import { getEntry, searchEntries } from "./crocdb";
import { ensureDir, moveFile } from "../utils/fs";
import { logger } from "../utils/logger";

const UNKNOWN_PLATFORM = "Unknown";
const NOT_FOUND_FOLDER = "Not Found";

// Regex patterns for detecting version tags and hacks
const VERSION_TAG_PATTERN = /\s*[\(\[].*?[\)\]]/g;

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

export type UnorganizedItem = {
  filePath: string;
  size: number;
  mtime: number;
  platform?: string;
  folderName: string;
  hasManifest: boolean;
};

export type ReorganizeResult = {
  totalFiles: number;
  reorganizedFiles: number;
  skippedFiles: number;
  errors: string[];
};

export async function scanLocal(roots: ScanRoot[]): Promise<LibraryItem[]> {
  const items: LibraryItem[] = [];
  const manifestCache = new Map<string, Manifest | null>();

  for (const root of roots) {
    const rootPath = root.path;
    try {
      await walk(rootPath, undefined, items, manifestCache);
    } catch (error) {
      logger.warn(`Scan skipped for ${rootPath}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  return items;
}

/**
 * Scan for unorganized ROMs that need to be reorganized into the expected structure.
 * Expected structure: libraryRoot/platform/gameName/files
 * Unorganized: files directly in platform folders or loose in library root
 */
export async function scanForUnorganizedItems(
  libraryRoot: string,
  reportProgress?: (progress: number, message: string) => void
): Promise<UnorganizedItem[]> {
  const unorganized: UnorganizedItem[] = [];
  const report = reportProgress || (() => {});
  
  report(0.1, "Scanning library for unorganized items...");
  logger.info("Starting scan for unorganized items", { libraryRoot });
  
  try {
    const entries = await fs.readdir(libraryRoot, { withFileTypes: true });
    let processed = 0;
    const total = entries.length;
    
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      
      const fullPath = path.join(libraryRoot, entry.name);
      
      if (entry.isDirectory()) {
        // Check if this is a platform folder or a game folder
        await scanPlatformFolder(fullPath, entry.name, unorganized);
      } else if (entry.isFile() && shouldIncludeFile(entry.name)) {
        // Loose ROM file in library root - needs organization
        const stat = await fs.stat(fullPath);
        unorganized.push({
          filePath: fullPath,
          size: stat.size,
          mtime: stat.mtimeMs,
          folderName: path.basename(fullPath, path.extname(fullPath)),
          hasManifest: false
        });
      }
      
      processed++;
      report(0.1 + (0.4 * processed / total), `Scanning... (${processed}/${total})`);
    }
    
    report(0.5, `Found ${unorganized.length} unorganized items`);
    logger.info("Scan for unorganized items completed", { count: unorganized.length });
  } catch (error) {
    logger.error("Error scanning for unorganized items", error);
    throw error;
  }
  
  return unorganized;
}

async function scanPlatformFolder(
  platformPath: string,
  platformName: string,
  unorganized: UnorganizedItem[]
): Promise<void> {
  try {
    const entries = await fs.readdir(platformPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      
      const fullPath = path.join(platformPath, entry.name);
      
      if (entry.isDirectory()) {
        // This is a game folder - check if it's properly organized
        const manifestPath = path.join(fullPath, ".crocdesk.json");
        const hasManifest = await fs.access(manifestPath).then(() => true).catch(() => false);
        
        if (!hasManifest) {
          // Check if there are ROM files in this folder
          const gameEntries = await fs.readdir(fullPath, { withFileTypes: true });
          const romFiles = gameEntries.filter(e => e.isFile() && shouldIncludeFile(e.name));
          
          if (romFiles.length > 0) {
            // Game folder without manifest - needs reorganization
            for (const romFile of romFiles) {
              const romPath = path.join(fullPath, romFile.name);
              const stat = await fs.stat(romPath);
              unorganized.push({
                filePath: romPath,
                size: stat.size,
                mtime: stat.mtimeMs,
                platform: platformName,
                folderName: entry.name,
                hasManifest: false
              });
            }
          }
        }
      } else if (entry.isFile() && shouldIncludeFile(entry.name)) {
        // ROM file directly in platform folder - needs organization
        const stat = await fs.stat(fullPath);
        unorganized.push({
          filePath: fullPath,
          size: stat.size,
          mtime: stat.mtimeMs,
          platform: platformName,
          folderName: path.basename(fullPath, path.extname(fullPath)),
          hasManifest: false
        });
      }
    }
  } catch (error) {
    logger.warn(`Error scanning platform folder ${platformPath}`, { error });
  }
}

/**
 * Reorganize unorganized items into the expected structure
 */
export async function reorganizeItems(
  items: UnorganizedItem[],
  libraryRoot: string,
  autoOrganizeUnrecognized: boolean = false,
  reportProgress?: (progress: number, message: string) => void
): Promise<ReorganizeResult> {
  const report = reportProgress || (() => {});
  const result: ReorganizeResult = {
    totalFiles: items.length,
    reorganizedFiles: 0,
    skippedFiles: 0,
    errors: []
  };
  
  if (items.length === 0) {
    report(1, "No items to reorganize");
    return result;
  }
  
  logger.info("Starting reorganization", { itemCount: items.length });
  
  // Group items by folder name to handle multi-file games
  const groupedItems = new Map<string, UnorganizedItem[]>();
  for (const item of items) {
    const key = `${item.platform || 'unknown'}/${item.folderName}`;
    if (!groupedItems.has(key)) {
      groupedItems.set(key, []);
    }
    groupedItems.get(key)!.push(item);
  }
  
  const groups = Array.from(groupedItems.entries());
  let processed = 0;
  
  for (const [key, groupItems] of groups) {
    try {
      const firstItem = groupItems[0];
      const platform = firstItem.platform || await detectPlatform(firstItem.filePath);
      const folderName = firstItem.folderName;
      
      report(0.5 + (0.45 * processed / groups.length), `Reorganizing ${folderName}...`);
      
      // Try to match with Crocdb
      const match = await findCrocdbMatch(folderName, platform);
      
      let gameName: string;
      let targetPlatform: string;
      
      if (match) {
        // Found in Crocdb - use proper title and add version tags if present
        const versionTags = extractVersionTags(folderName);
        gameName = versionTags 
          ? `${match.title} ${versionTags}`
          : formatGameName(match.title, match.regions[0]);
        targetPlatform = platform;
      } else {
        // Not found in Crocdb
        if (!autoOrganizeUnrecognized) {
          // Skip organizing unrecognized files when setting is disabled
          logger.info("Game not found in Crocdb, skipping (autoOrganizeUnrecognized=false)", { 
            folderName, 
            platform 
          });
          result.skippedFiles += groupItems.length;
          processed++;
          continue;
        }
        
        // autoOrganizeUnrecognized is enabled - put in "Not Found" subfolder
        logger.info("Game not found in Crocdb, moving to Not Found folder", { folderName, platform });
        gameName = sanitizeFolderName(folderName);
        targetPlatform = `${platform}/${NOT_FOUND_FOLDER}`;
      }
      
      // Create target directory
      const targetDir = path.join(libraryRoot, targetPlatform, gameName);
      await ensureDir(targetDir);
      
      // Move all files in the group
      const movedFiles: string[] = [];
      for (const item of groupItems) {
        const fileName = path.basename(item.filePath);
        const targetPath = path.join(targetDir, fileName);
        
        // Skip if file already exists at target
        if (item.filePath === targetPath) {
          result.skippedFiles++;
          continue;
        }
        
        try {
          await moveFile(item.filePath, targetPath);
          movedFiles.push(targetPath);
          result.reorganizedFiles++;
          logger.debug("File reorganized", { from: item.filePath, to: targetPath });
        } catch (error) {
          const errorMsg = `Failed to move ${item.filePath}: ${error instanceof Error ? error.message : String(error)}`;
          logger.warn(errorMsg);
          result.errors.push(errorMsg);
        }
      }
      
      // Create manifest if we successfully moved files
      if (movedFiles.length > 0) {
        const artifacts = await Promise.all(
          movedFiles.map(async (p) => {
            const s = await fs.stat(p);
            return { path: path.basename(p), size: s.size };
          })
        );
        
        const manifest: Manifest = {
          schema: 1,
          crocdb: {
            slug: match?.slug ?? slugify(folderName),
            title: match?.title ?? folderName,
            platform: match?.platform ?? platform,
            regions: match?.regions ?? []
          },
          artifacts,
          createdAt: new Date().toISOString()
        };
        
        await writeManifest(targetDir, manifest);
        
        // Try to fetch cover art
        if (match?.slug) {
          await ensureCoverExists(targetDir, manifest).catch(() => {});
        }
        
        logger.info("Game reorganized successfully", { 
          gameName, 
          platform, 
          fileCount: movedFiles.length 
        });
      }
      
      // Clean up empty source directories
      if (movedFiles.length > 0) {
        for (const item of groupItems) {
          const sourceDir = path.dirname(item.filePath);
          try {
            const remaining = await fs.readdir(sourceDir);
            // Only remove if truly empty or only contains hidden files
            if (remaining.length === 0 || (remaining.length > 0 && remaining.every(f => f.startsWith('.')))) {
              await fs.rmdir(sourceDir).catch(() => {});
              logger.debug("Removed empty directory", { dir: sourceDir });
            }
          } catch {
            // Ignore cleanup errors
          }
        }
      }
      
    } catch (error) {
      const errorMsg = `Failed to reorganize group ${key}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(errorMsg, error);
      result.errors.push(errorMsg);
      result.skippedFiles += groupItems.length;
    }
    
    processed++;
  }
  
  report(1, `Reorganization complete: ${result.reorganizedFiles} files reorganized, ${result.skippedFiles} skipped`);
  logger.info("Reorganization completed", { result });
  
  return result;
}

async function detectPlatform(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const platformMap: Record<string, string> = {
    '.gb': 'Nintendo - Game Boy',
    '.gbc': 'Nintendo - Game Boy Color',
    '.gba': 'Nintendo - Game Boy Advance',
    '.nes': 'Nintendo - Nintendo Entertainment System',
    '.sfc': 'Nintendo - Super Nintendo Entertainment System',
    '.smc': 'Nintendo - Super Nintendo Entertainment System',
    '.n64': 'Nintendo - Nintendo 64',
    '.z64': 'Nintendo - Nintendo 64',
    '.v64': 'Nintendo - Nintendo 64',
    '.nds': 'Nintendo - Nintendo DS',
    '.md': 'Sega - Mega Drive - Genesis',
    '.gen': 'Sega - Mega Drive - Genesis',
    '.sms': 'Sega - Master System - Mark III',
    '.gg': 'Sega - Game Gear',
    '.pce': 'NEC - PC Engine - TurboGrafx 16'
  };
  
  return platformMap[ext] || UNKNOWN_PLATFORM;
}

function formatGameName(title: string, region?: string): string {
  const sanitized = sanitize(title);
  if (region) {
    return `${sanitized} (${sanitize(region)})`;
  }
  return sanitized;
}

function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "").trim();
}

function sanitize(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "").trim();
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

/**
 * Normalize ROM name by stripping version tags for better Crocdb matching.
 * Removes: region codes, revision info, hack tags, etc.
 * Example: "Super Mario Bros (USA) (Rev 1) [!]" -> "Super Mario Bros"
 */
function normalizeRomNameForSearch(fileName: string): string {
  // Remove extension
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  
  // Strip all version tags (parentheses and brackets)
  let normalized = nameWithoutExt.replace(VERSION_TAG_PATTERN, "");
  
  // Clean up extra whitespace
  normalized = normalized.trim().replace(/\s+/g, " ");
  
  return normalized;
}

/**
 * Extract version tags from ROM name (regions, revisions, hacks).
 * Returns the tags as a suffix string.
 */
function extractVersionTags(fileName: string): string {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  
  // Extract all bracketed content
  const matches = nameWithoutExt.match(VERSION_TAG_PATTERN);
  if (matches) {
    return matches.join(" ").trim();
  }
  
  return "";
}

/**
 * Check if ROM is a hack or modified version based on tags.
 */
function _isRomHack(fileName: string): boolean {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  const hackPattern = /\[(?:Hack|Translation|T\+|Trainer|Beta|Proto|Unl)\]/gi;
  return hackPattern.test(nameWithoutExt);
}

async function findCrocdbMatch(
  folderName: string,
  platform: string | undefined
): Promise<{ slug: string; title: string; platform: string; regions: string[] } | null> {
  try {
    // First try with original name
    let resp = await searchEntries({
      search_key: folderName,
      platforms: platform ? [platform] : undefined,
      max_results: 5,
      page: 1
    });
    
    let results = resp.data.results ?? [];
    
    // If no results, try with normalized name (stripped of version tags)
    if (results.length === 0) {
      const normalizedName = normalizeRomNameForSearch(folderName);
      if (normalizedName !== folderName) {
        logger.debug("Retrying Crocdb search with normalized name", { 
          original: folderName, 
          normalized: normalizedName 
        });
        
        resp = await searchEntries({
          search_key: normalizedName,
          platforms: platform ? [platform] : undefined,
          max_results: 5,
          page: 1
        });
        
        results = resp.data.results ?? [];
      }
    }
    
    if (results.length === 0) return null;
    
    // Basic fuzzy: choose the first whose normalized title includes normalized folderName
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const target = norm(normalizeRomNameForSearch(folderName));
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
