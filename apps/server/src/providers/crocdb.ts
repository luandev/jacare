import type {
  IMetadataProvider,
  ProviderPlatform,
  ProviderEntry,
  ProviderSearchRequest,
  ProviderSearchResponse,
  ProviderListRequest,
  CrocdbEntry
} from "@crocdesk/shared";
import * as crocdbService from "../services/crocdb";
import { logger } from "../utils/logger";

/**
 * Convert CrocdbEntry to ProviderEntry format
 */
function crocdbEntryToProviderEntry(entry: CrocdbEntry): ProviderEntry {
  // Extract filename from links if available
  const firstLink = entry.links?.[0];
  const filename = firstLink?.filename;
  const url = firstLink?.url;
  const size = firstLink?.size;

  return {
    id: entry.slug,
    title: entry.title,
    platform: entry.platform,
    regions: entry.regions || [],
    filename,
    size,
    url,
    metadata: {
      rom_id: entry.rom_id,
      boxart_url: entry.boxart_url,
      screenshots: entry.screenshots,
      links: entry.links
    }
  };
}

/**
 * Crocdb provider adapter
 * Wraps the existing crocdb service to implement the IMetadataProvider interface
 */
export class CrocdbProvider implements IMetadataProvider {
  /**
   * List available platforms from Crocdb
   */
  async listPlatforms(): Promise<ProviderPlatform[]> {
    try {
      const response = await crocdbService.getPlatforms();
      const platforms = response.data.platforms;

      return Object.entries(platforms).map(([id, info]) => ({
        id,
        name: info.name,
        brand: info.brand
      }));
    } catch (error) {
      logger.error("Crocdb: Failed to list platforms", error);
      throw new Error("Failed to fetch platforms from Crocdb");
    }
  }

  /**
   * List entries for a specific platform
   * Note: Crocdb doesn't have a dedicated "list all" endpoint, so we use search with platform filter
   */
  async listEntries(request: ProviderListRequest): Promise<ProviderSearchResponse> {
    try {
      const searchRequest = {
        platforms: [request.platform],
        page: request.page || 1,
        max_results: request.limit || 60
      };

      const response = await crocdbService.searchEntries(searchRequest);

      return {
        results: response.data.results.map(crocdbEntryToProviderEntry),
        total: response.data.total_results,
        page: response.data.current_page,
        totalPages: response.data.total_pages
      };
    } catch (error) {
      logger.error("Crocdb: Failed to list entries", error);
      throw new Error("Failed to fetch entries from Crocdb");
    }
  }

  /**
   * Search for games
   */
  async search(request: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    try {
      const searchRequest = {
        search_key: request.query,
        platforms: request.platforms,
        regions: request.regions,
        page: request.page || 1,
        max_results: request.maxResults || 60
      };

      const response = await crocdbService.searchEntries(searchRequest);

      return {
        results: response.data.results.map(crocdbEntryToProviderEntry),
        total: response.data.total_results,
        page: response.data.current_page,
        totalPages: response.data.total_pages
      };
    } catch (error) {
      logger.error("Crocdb: Search failed", error);
      throw new Error("Search failed on Crocdb");
    }
  }

  /**
   * Get a specific entry by slug
   */
  async getEntry(id: string): Promise<ProviderEntry | null> {
    try {
      const response = await crocdbService.getEntry(id);
      return crocdbEntryToProviderEntry(response.data.entry);
    } catch (error) {
      logger.error(`Crocdb: Failed to get entry ${id}`, error);
      return null;
    }
  }
}
