/**
 * Wikidata SPARQL HTTP Client
 * 
 * Handles HTTP requests to the Wikidata SPARQL endpoint with rate limiting.
 */

import type { WikidataSparqlResponse, HealthCheckResult } from "@crocdesk/shared";

const WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const DEFAULT_RATE_LIMIT_MS = 1000; // 1 request per second
const DEFAULT_USER_AGENT = "Jacare/1.0 (https://github.com/luandev/jacare)";

export type WikidataClientOptions = {
  /** Minimum time between requests in milliseconds */
  rateLimitMs?: number;
  
  /** Custom User-Agent header */
  userAgent?: string;
  
  /** Custom SPARQL endpoint URL */
  endpoint?: string;
};

/**
 * HTTP client for Wikidata SPARQL endpoint with rate limiting
 */
export class WikidataClient {
  private readonly rateLimitMs: number;
  private readonly userAgent: string;
  private readonly endpoint: string;
  private lastRequestTime = 0;
  private pendingRequest: Promise<void> | null = null;
  
  constructor(options: WikidataClientOptions = {}) {
    this.rateLimitMs = options.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.endpoint = options.endpoint ?? WIKIDATA_SPARQL_ENDPOINT;
  }
  
  /**
   * Enforces rate limiting by waiting if necessary
   */
  private async waitForRateLimit(): Promise<void> {
    // If there's a pending request, wait for it
    if (this.pendingRequest) {
      await this.pendingRequest;
    }
    
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitMs) {
      const waitTime = this.rateLimitMs - timeSinceLastRequest;
      this.pendingRequest = new Promise(resolve => setTimeout(resolve, waitTime));
      await this.pendingRequest;
      this.pendingRequest = null;
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Executes a SPARQL query against the Wikidata endpoint
   * 
   * @param sparql - SPARQL query string
   * @returns SPARQL JSON results
   * @throws Error if the request fails
   */
  async query(sparql: string): Promise<WikidataSparqlResponse> {
    await this.waitForRateLimit();
    
    const url = `${this.endpoint}?query=${encodeURIComponent(sparql)}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/sparql-results+json",
        "User-Agent": this.userAgent
      }
    });
    
    if (!response.ok) {
      throw new Error(
        `Wikidata SPARQL query failed: ${response.status} ${response.statusText}`
      );
    }
    
    return await response.json() as WikidataSparqlResponse;
  }
  
  /**
   * Checks if the Wikidata endpoint is accessible
   * 
   * @returns Health check result with response time
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple query to test endpoint availability
      const testQuery = "SELECT ?item WHERE { ?item wdt:P31 wd:Q7889 } LIMIT 1";
      await this.query(testQuery);
      
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const message = error instanceof Error ? error.message : "Unknown error";
      
      return {
        healthy: false,
        message,
        responseTime
      };
    }
  }
}
