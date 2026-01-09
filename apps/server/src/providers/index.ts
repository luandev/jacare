import type {
  IMetadataProvider,
  ProviderPlatform,
  ProviderEntry,
  ProviderSearchRequest,
  ProviderSearchResponse,
  ProviderListRequest,
  SourceProvider
} from "@crocdesk/shared";
import { CrocdbProvider } from "./crocdb";
import { MyrientProvider } from "./myrient";
import { logger } from "../utils/logger";

/**
 * Get a provider instance by name
 */
export function getProvider(provider: SourceProvider): IMetadataProvider {
  switch (provider) {
    case "crocdb":
      return new CrocdbProvider();
    case "myrient":
      return new MyrientProvider();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Multi-provider metadata service with fallback support
 * Tries primary provider first, falls back to secondary if primary fails
 */
export class MetadataService implements IMetadataProvider {
  private primaryProvider: IMetadataProvider;
  private fallbackProviders: IMetadataProvider[];

  constructor(
    primary: SourceProvider = "myrient",
    fallbacks: SourceProvider[] = ["crocdb"]
  ) {
    this.primaryProvider = getProvider(primary);
    this.fallbackProviders = fallbacks.map(getProvider);
  }

  /**
   * Execute a provider operation with fallback logic
   */
  private async withFallback<T>(
    operation: (provider: IMetadataProvider) => Promise<T>,
    operationName: string
  ): Promise<T> {
    // Try primary provider first
    try {
      logger.info(`MetadataService: Trying primary provider for ${operationName}`);
      return await operation(this.primaryProvider);
    } catch (primaryError) {
      logger.warn(
        `MetadataService: Primary provider failed for ${operationName}`,
        { error: primaryError instanceof Error ? primaryError.message : String(primaryError) }
      );

      // Try fallback providers
      for (let i = 0; i < this.fallbackProviders.length; i++) {
        try {
          logger.info(
            `MetadataService: Trying fallback provider ${i + 1} for ${operationName}`
          );
          return await operation(this.fallbackProviders[i]);
        } catch (fallbackError) {
          logger.warn(
            `MetadataService: Fallback provider ${i + 1} failed for ${operationName}`,
            { error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError) }
          );
        }
      }

      // All providers failed
      const primaryErrorMsg = primaryError instanceof Error 
        ? primaryError.message 
        : "Unknown error";
      throw new Error(
        `All providers failed for ${operationName}. Primary error: ${primaryErrorMsg}`
      );
    }
  }

  /**
   * List platforms from primary provider with fallback
   */
  async listPlatforms(): Promise<ProviderPlatform[]> {
    return this.withFallback(
      (provider) => provider.listPlatforms(),
      "listPlatforms"
    );
  }

  /**
   * List entries for a platform with fallback
   */
  async listEntries(request: ProviderListRequest): Promise<ProviderSearchResponse> {
    return this.withFallback(
      (provider) => provider.listEntries(request),
      `listEntries(${request.platform})`
    );
  }

  /**
   * Search with fallback
   */
  async search(request: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    return this.withFallback(
      (provider) => provider.search(request),
      `search(${request.query || "all"})`
    );
  }

  /**
   * Get entry with fallback
   */
  async getEntry(id: string): Promise<ProviderEntry | null> {
    return this.withFallback(
      (provider) => provider.getEntry(id),
      `getEntry(${id})`
    );
  }

  /**
   * Try to get entry from specific provider without fallback
   */
  async getEntryFromProvider(
    id: string,
    provider: SourceProvider
  ): Promise<ProviderEntry | null> {
    const providerInstance = getProvider(provider);
    return providerInstance.getEntry(id);
  }

  /**
   * Search across multiple providers and merge results
   * Useful for comprehensive discovery
   */
  async searchAll(request: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    const allProviders = [this.primaryProvider, ...this.fallbackProviders];
    const allResults: ProviderEntry[] = [];
    const errors: Error[] = [];

    // Query all providers in parallel
    const promises = allProviders.map(async (provider) => {
      try {
        const response = await provider.search(request);
        return response.results;
      } catch (error) {
        errors.push(
          error instanceof Error ? error : new Error("Unknown provider error")
        );
        return [];
      }
    });

    const results = await Promise.all(promises);
    results.forEach((providerResults) => {
      allResults.push(...providerResults);
    });

    if (allResults.length === 0 && errors.length > 0) {
      throw new Error(
        `All providers failed: ${errors.map((e) => e.message).join(", ")}`
      );
    }

    // Remove duplicates based on title and platform
    const uniqueResults = Array.from(
      new Map(
        allResults.map((entry) => [
          `${entry.platform}:${entry.title}`,
          entry
        ])
      ).values()
    );

    // Apply pagination to merged results
    const page = request.page || 1;
    const maxResults = request.maxResults || 60;
    const start = (page - 1) * maxResults;
    const end = start + maxResults;
    const paginatedResults = uniqueResults.slice(start, end);

    logger.info(
      `MetadataService: searchAll found ${uniqueResults.length} unique results from ${allResults.length} total`
    );

    return {
      results: paginatedResults,
      total: uniqueResults.length,
      page,
      totalPages: Math.ceil(uniqueResults.length / maxResults)
    };
  }
}

// Export singleton instance with Myrient as primary, Crocdb as fallback
export const metadataService = new MetadataService("myrient", ["crocdb"]);
