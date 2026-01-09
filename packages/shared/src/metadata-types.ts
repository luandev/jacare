/**
 * Metadata Provider Types
 * 
 * Defines the common interface for metadata providers (Wikidata, Crocdb, etc.)
 */

/**
 * Generic game metadata structure used across all providers
 */
export type GameMetadata = {
  /** Source of the metadata (e.g., "wikidata", "crocdb") */
  source: string;
  
  /** Source-specific unique identifier */
  sourceId: string;
  
  /** Game name/title */
  name: string;
  
  /** Release date (ISO 8601 format) */
  releaseDate?: string;
  
  /** Platforms the game is available on */
  platforms?: string[];
  
  /** Game genres */
  genres?: string[];
  
  /** Publishers */
  publishers?: string[];
  
  /** Game series (if part of a franchise) */
  series?: string;
  
  /** Original raw data from the source */
  raw?: unknown;
};

/**
 * Search options for metadata providers
 */
export type MetadataSearchOptions = {
  /** Limit number of results */
  limit?: number;
  
  /** Filter by platform */
  platform?: string;
  
  /** Additional provider-specific options */
  [key: string]: unknown;
};

/**
 * Health check result for metadata providers
 */
export type HealthCheckResult = {
  /** Whether the provider is healthy */
  healthy: boolean;
  
  /** Optional message */
  message?: string;
  
  /** Response time in milliseconds */
  responseTime?: number;
};

/**
 * Common interface that all metadata providers must implement
 */
export interface MetadataProvider {
  /**
   * Search for games by query string
   */
  searchGames(
    query: string,
    options?: MetadataSearchOptions
  ): Promise<GameMetadata[]>;
  
  /**
   * Get game metadata by source-specific ID
   */
  getGameById(id: string): Promise<GameMetadata | null>;
  
  /**
   * Check if the provider is available and healthy
   */
  healthCheck(): Promise<HealthCheckResult>;
  
  /**
   * Provider name
   */
  readonly name: string;
}
