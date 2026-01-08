import type {
  IMetadataProvider,
  ProviderPlatform,
  ProviderEntry,
  ProviderSearchRequest,
  ProviderSearchResponse,
  ProviderListRequest
} from "@crocdesk/shared";
import { logger } from "../utils/logger";

const MYRIENT_BASE_URL = "https://myrient.erista.me/files";
const COLLECTION = "No-Intro"; // Start with No-Intro, can expand to Redump later

// Platform name mapping from Myrient directory names to standardized IDs
const PLATFORM_MAPPING: Record<string, { id: string; brand: string }> = {
  "Nintendo - Game Boy": { id: "gb", brand: "Nintendo" },
  "Nintendo - Game Boy Advance": { id: "gba", brand: "Nintendo" },
  "Nintendo - Game Boy Color": { id: "gbc", brand: "Nintendo" },
  "Nintendo - Nintendo Entertainment System": { id: "nes", brand: "Nintendo" },
  "Nintendo - Super Nintendo Entertainment System": { id: "snes", brand: "Nintendo" },
  "Nintendo - Nintendo 64": { id: "n64", brand: "Nintendo" },
  "Nintendo - GameCube": { id: "gc", brand: "Nintendo" },
  "Nintendo - Wii": { id: "wii", brand: "Nintendo" },
  "Nintendo - Nintendo DS": { id: "nds", brand: "Nintendo" },
  "Nintendo - Nintendo 3DS": { id: "3ds", brand: "Nintendo" },
  "Sega - Master System - Mark III": { id: "sms", brand: "Sega" },
  "Sega - Mega Drive - Genesis": { id: "genesis", brand: "Sega" },
  "Sega - Game Gear": { id: "gg", brand: "Sega" },
  "Sega - Saturn": { id: "saturn", brand: "Sega" },
  "Sega - Dreamcast": { id: "dc", brand: "Sega" },
  "Sony - PlayStation": { id: "ps1", brand: "Sony" },
  "Sony - PlayStation 2": { id: "ps2", brand: "Sony" },
  "Sony - PlayStation Portable": { id: "psp", brand: "Sony" },
  "Atari - 2600": { id: "atari2600", brand: "Atari" },
  "Atari - 7800": { id: "atari7800", brand: "Atari" },
  "Atari - Lynx": { id: "lynx", brand: "Atari" },
};

// Region extraction from filename patterns
const REGION_PATTERNS = [
  { pattern: /\(USA\)/i, code: "us", name: "USA" },
  { pattern: /\(Europe\)/i, code: "eu", name: "Europe" },
  { pattern: /\(Japan\)/i, code: "jp", name: "Japan" },
  { pattern: /\(World\)/i, code: "world", name: "World" },
  { pattern: /\(En,Fr,De,Es,It\)/i, code: "eu", name: "Europe" },
  { pattern: /\(Asia\)/i, code: "asia", name: "Asia" },
  { pattern: /\(Australia\)/i, code: "au", name: "Australia" },
  { pattern: /\(Korea\)/i, code: "kr", name: "Korea" },
  { pattern: /\(Brazil\)/i, code: "br", name: "Brazil" },
  { pattern: /\(China\)/i, code: "cn", name: "China" },
];

type DirectoryEntry = {
  name: string;
  isDirectory: boolean;
  size?: number;
  url: string;
};

/**
 * Parse HTML directory listing to extract files and directories
 */
function parseDirectoryListing(html: string, baseUrl: string): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];
  
  // Match anchor tags with href attributes
  // Common patterns: <a href="filename">filename</a> or <a href="dir/">dir/</a>
  const anchorRegex = /<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].trim();

    // Skip parent directory links and special entries
    if (href === "../" || href === "/" || text === "Parent Directory") {
      continue;
    }

    const isDirectory = href.endsWith("/");
    const name = isDirectory ? text.replace(/\/$/, "") : text;

    // Try to extract size if it's in the HTML (often after the anchor tag)
    let size: number | undefined = undefined;
    const sizeMatch = html
      .slice(match.index, match.index + 200)
      .match(/(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)/i);
    if (sizeMatch) {
      const value = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toUpperCase();
      const multipliers: Record<string, number> = {
        B: 1,
        KB: 1024,
        MB: 1024 * 1024,
        GB: 1024 * 1024 * 1024
      };
      size = Math.round(value * (multipliers[unit] || 1));
    }

    entries.push({
      name,
      isDirectory,
      size,
      url: `${baseUrl}/${href}`
    });
  }

  return entries;
}

/**
 * Extract game title from filename
 * Example: "Pokemon - FireRed Version (USA).zip" -> "Pokemon - FireRed Version"
 */
function extractTitle(filename: string): string {
  // Remove file extension
  let title = filename.replace(/\.(zip|7z|rar|gz|iso|bin|cue)$/i, "");
  
  // Remove region/version markers in parentheses
  title = title.replace(/\([^)]*\)/g, "").trim();
  
  // Remove brackets content
  title = title.replace(/\[[^\]]*\]/g, "").trim();
  
  // Clean up multiple spaces
  title = title.replace(/\s+/g, " ").trim();
  
  return title || filename;
}

/**
 * Extract regions from filename
 */
function extractRegions(filename: string): string[] {
  const regions: string[] = [];
  
  for (const { pattern, code } of REGION_PATTERNS) {
    if (pattern.test(filename)) {
      regions.push(code);
    }
  }
  
  // Default to USA if no region found
  return regions.length > 0 ? regions : ["us"];
}

/**
 * Myrient provider implementation for metadata discovery
 * Focuses on No-Intro collection for cartridge-based systems
 */
export class MyrientProvider implements IMetadataProvider {
  private platformCache: ProviderPlatform[] | null = null;
  private platformCacheTime: number = 0;
  private readonly CACHE_TTL = 3600000; // 1 hour

  /**
   * Fetch HTML from a Myrient URL
   */
  private async fetchHtml(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      logger.error(`Failed to fetch Myrient URL: ${url}`, error);
      throw error;
    }
  }

  /**
   * List available platforms from No-Intro collection
   */
  async listPlatforms(): Promise<ProviderPlatform[]> {
    // Return cached platforms if still fresh
    if (this.platformCache && Date.now() - this.platformCacheTime < this.CACHE_TTL) {
      return this.platformCache;
    }

    try {
      const url = `${MYRIENT_BASE_URL}/${COLLECTION}/`;
      const html = await this.fetchHtml(url);
      const entries = parseDirectoryListing(html, url);

      const platforms: ProviderPlatform[] = entries
        .filter((entry) => entry.isDirectory)
        .map((entry) => {
          const mapping = PLATFORM_MAPPING[entry.name];
          return {
            id: mapping?.id || entry.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
            name: entry.name,
            brand: mapping?.brand,
            collection: COLLECTION
          };
        });

      // Cache the result
      this.platformCache = platforms;
      this.platformCacheTime = Date.now();

      logger.info(`Myrient: Listed ${platforms.length} platforms from ${COLLECTION}`);
      return platforms;
    } catch (error) {
      logger.error("Myrient: Failed to list platforms", error);
      throw new Error("Failed to fetch platforms from Myrient");
    }
  }

  /**
   * List entries (games) for a specific platform
   */
  async listEntries(request: ProviderListRequest): Promise<ProviderSearchResponse> {
    try {
      const platforms = await this.listPlatforms();
      const platform = platforms.find(
        (p) => p.id === request.platform || p.name === request.platform
      );

      if (!platform) {
        logger.warn(`Myrient: Platform not found: ${request.platform}`);
        return {
          results: [],
          total: 0,
          page: request.page || 1,
          totalPages: 0
        };
      }

      const url = `${MYRIENT_BASE_URL}/${COLLECTION}/${encodeURIComponent(platform.name)}/`;
      const html = await this.fetchHtml(url);
      const entries = parseDirectoryListing(html, url);

      // Filter only files (games)
      const gameFiles = entries.filter((entry) => !entry.isDirectory);

      // Convert to ProviderEntry format
      const results: ProviderEntry[] = gameFiles.map((file) => ({
        id: `${platform.id}/${file.name}`,
        title: extractTitle(file.name),
        platform: platform.id,
        regions: extractRegions(file.name),
        filename: file.name,
        size: file.size,
        url: file.url,
        metadata: {
          collection: COLLECTION,
          platformName: platform.name
        }
      }));

      // Simple pagination (in-memory)
      const page = request.page || 1;
      const limit = request.limit || 60;
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedResults = results.slice(start, end);

      logger.info(
        `Myrient: Listed ${results.length} entries for platform ${platform.name} (page ${page})`
      );

      return {
        results: paginatedResults,
        total: results.length,
        page,
        totalPages: Math.ceil(results.length / limit)
      };
    } catch (error) {
      logger.error("Myrient: Failed to list entries", error);
      throw new Error("Failed to fetch entries from Myrient");
    }
  }

  /**
   * Search for games across platforms
   */
  async search(request: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    try {
      const query = request.query?.toLowerCase() || "";
      const platformFilter = request.platforms || [];
      const regionFilter = request.regions || [];

      // Get all platforms or filtered platforms
      let platforms = await this.listPlatforms();
      if (platformFilter.length > 0) {
        platforms = platforms.filter((p) => platformFilter.includes(p.id));
      }

      // Collect entries from all matching platforms
      let allResults: ProviderEntry[] = [];

      for (const platform of platforms) {
        try {
          const response = await this.listEntries({
            platform: platform.id,
            limit: 10000 // Get all for searching
          });
          allResults = allResults.concat(response.results);
        } catch (error) {
          logger.warn(`Myrient: Failed to fetch platform ${platform.id} for search`, error);
          // Continue with other platforms
        }
      }

      // Filter by query
      if (query) {
        allResults = allResults.filter((entry) =>
          entry.title.toLowerCase().includes(query) ||
          entry.filename?.toLowerCase().includes(query)
        );
      }

      // Filter by region
      if (regionFilter.length > 0) {
        allResults = allResults.filter((entry) =>
          entry.regions.some((r) => regionFilter.includes(r))
        );
      }

      // Apply pagination
      const page = request.page || 1;
      const maxResults = request.maxResults || 60;
      const start = (page - 1) * maxResults;
      const end = start + maxResults;
      const paginatedResults = allResults.slice(start, end);

      logger.info(
        `Myrient: Search "${query}" found ${allResults.length} results (page ${page})`
      );

      return {
        results: paginatedResults,
        total: allResults.length,
        page,
        totalPages: Math.ceil(allResults.length / maxResults)
      };
    } catch (error) {
      logger.error("Myrient: Search failed", error);
      throw new Error("Search failed on Myrient");
    }
  }

  /**
   * Get a specific entry by ID
   */
  async getEntry(id: string): Promise<ProviderEntry | null> {
    try {
      // ID format: "platform/filename"
      const [platformId, ...filenameParts] = id.split("/");
      const filename = filenameParts.join("/");

      if (!platformId || !filename) {
        logger.warn(`Myrient: Invalid entry ID format: ${id}`);
        return null;
      }

      // List entries for the platform and find the matching one
      const response = await this.listEntries({
        platform: platformId,
        limit: 10000
      });

      const entry = response.results.find((e) => e.filename === filename);

      if (!entry) {
        logger.warn(`Myrient: Entry not found: ${id}`);
        return null;
      }

      logger.info(`Myrient: Retrieved entry ${id}`);
      return entry;
    } catch (error) {
      logger.error(`Myrient: Failed to get entry ${id}`, error);
      return null;
    }
  }
}
