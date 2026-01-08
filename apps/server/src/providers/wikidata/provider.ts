/**
 * Wikidata Metadata Provider
 * 
 * Implements the MetadataProvider interface for Wikidata SPARQL queries.
 */

import crypto from "crypto";
import type {
  MetadataProvider,
  GameMetadata,
  MetadataSearchOptions,
  HealthCheckResult,
  WikidataGameResult
} from "@crocdesk/shared";
import { WikidataClient } from "./client";
import { buildSearchQuery, buildGetByQidQuery } from "./queryBuilder";
import { aggregateSparqlResults } from "./mapper";
import { rankSearchResults, normalizeGameName } from "./normalizer";
import {
  getCachedWikidataSearch,
  setCachedWikidataSearch,
  getCachedWikidataGame,
  setCachedWikidataGame
} from "../../db";

// Default cache TTL: 14-30 days (use 21 days as middle ground)
const DEFAULT_CACHE_TTL_MS = 21 * 24 * 60 * 60 * 1000; // 21 days

/**
 * Checks if cached data is still fresh
 */
function isFresh(updatedAt: number, ttlMs = DEFAULT_CACHE_TTL_MS): boolean {
  return Date.now() - updatedAt < ttlMs;
}

/**
 * Creates a stable hash for a search query
 */
function hashQuery(query: string, options?: MetadataSearchOptions): string {
  const normalized = normalizeGameName(query);
  const key = JSON.stringify({ query: normalized, ...options });
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Converts WikidataGameResult to GameMetadata
 */
function toGameMetadata(game: WikidataGameResult): GameMetadata {
  return {
    source: "wikidata",
    sourceId: game.qid,
    name: game.label,
    releaseDate: game.releaseDate,
    platforms: game.platforms,
    genres: game.genres,
    publishers: game.publishers,
    series: game.series,
    raw: game
  };
}

/**
 * Wikidata metadata provider implementation
 */
export class WikidataProvider implements MetadataProvider {
  readonly name = "wikidata";
  private client: WikidataClient;
  
  constructor(client?: WikidataClient) {
    this.client = client ?? new WikidataClient();
  }
  
  /**
   * Search for games by query string
   */
  async searchGames(
    query: string,
    options?: MetadataSearchOptions
  ): Promise<GameMetadata[]> {
    const queryHash = hashQuery(query, options);
    
    // Try cache first
    const cached = getCachedWikidataSearch(queryHash);
    if (cached && typeof cached.updatedAt === 'number' && isFresh(cached.updatedAt)) {
      const sparqlResponse = JSON.parse(cached.json);
      const games = aggregateSparqlResults(sparqlResponse.results.bindings);
      const ranked = rankSearchResults(games, query, { platform: options?.platform });
      return ranked.map(toGameMetadata);
    }
    
    // Build and execute SPARQL query
    const sparql = buildSearchQuery(query, { limit: options?.limit });
    const response = await this.client.query(sparql);
    
    // Cache the response
    setCachedWikidataSearch(queryHash, JSON.stringify(response));
    
    // Process results
    const games = aggregateSparqlResults(response.results.bindings);
    const ranked = rankSearchResults(games, query, { platform: options?.platform });
    
    return ranked.map(toGameMetadata);
  }
  
  /**
   * Get game metadata by Wikidata QID
   */
  async getGameById(id: string): Promise<GameMetadata | null> {
    // Normalize QID (remove wd: prefix if present)
    const qid = id.replace(/^wd:/, "");
    
    // Try cache first
    const cached = getCachedWikidataGame(qid);
    if (cached && typeof cached.updatedAt === 'number' && isFresh(cached.updatedAt)) {
      const sparqlResponse = JSON.parse(cached.json);
      const games = aggregateSparqlResults(sparqlResponse.results.bindings);
      
      if (games.length === 0) {
        return null;
      }
      
      return toGameMetadata(games[0]);
    }
    
    // Build and execute SPARQL query
    const sparql = buildGetByQidQuery(qid);
    const response = await this.client.query(sparql);
    
    // Cache the response
    setCachedWikidataGame(qid, JSON.stringify(response));
    
    // Process results
    const games = aggregateSparqlResults(response.results.bindings);
    
    if (games.length === 0) {
      return null;
    }
    
    return toGameMetadata(games[0]);
  }
  
  /**
   * Check if the Wikidata endpoint is available
   */
  async healthCheck(): Promise<HealthCheckResult> {
    return this.client.healthCheck();
  }
}
