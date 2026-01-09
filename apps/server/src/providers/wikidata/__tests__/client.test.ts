import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WikidataClient } from "../client";
import type { WikidataSparqlResponse } from "@crocdesk/shared";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe("Wikidata Client", () => {
  let client: WikidataClient;
  
  beforeEach(() => {
    client = new WikidataClient();
    mockFetch.mockClear();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  describe("query", () => {
    it("should make a GET request with SPARQL query", async () => {
      const mockResponse: WikidataSparqlResponse = {
        head: { vars: ["game", "gameLabel"] },
        results: { bindings: [] }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      
      const sparql = "SELECT ?game WHERE { ?game wdt:P31 wd:Q7889 }";
      const result = await client.query(sparql);
      
      expect(mockFetch).toHaveBeenCalledOnce();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("https://query.wikidata.org/sparql"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Accept": "application/sparql-results+json"
          })
        })
      );
      expect(result).toEqual(mockResponse);
    });
    
    it("should encode SPARQL query in URL", async () => {
      const mockResponse: WikidataSparqlResponse = {
        head: { vars: [] },
        results: { bindings: [] }
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      
      const sparql = "SELECT * WHERE { ?s ?p ?o }";
      await client.query(sparql);
      
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("query=");
      expect(callUrl).toContain(encodeURIComponent(sparql));
    });
    
    it("should throw error on non-200 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      });
      
      await expect(client.query("SELECT * WHERE { }")).rejects.toThrow(
        "Wikidata SPARQL query failed: 500 Internal Server Error"
      );
    });
    
    it("should throw error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      
      await expect(client.query("SELECT * WHERE { }")).rejects.toThrow(
        "Network error"
      );
    });
  });
  
  describe("rate limiting", () => {
    it("should enforce rate limit between requests", async () => {
      const mockResponse: WikidataSparqlResponse = {
        head: { vars: [] },
        results: { bindings: [] }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });
      
      const query1Promise = client.query("SELECT * WHERE { }");
      await vi.advanceTimersByTimeAsync(0); // Let first request start
      
      const query2Promise = client.query("SELECT * WHERE { }");
      
      // First request should execute immediately
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Second request should wait for rate limit
      await vi.advanceTimersByTimeAsync(1000);
      
      await Promise.all([query1Promise, query2Promise]);
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    
    it("should allow configurable rate limit", async () => {
      const customClient = new WikidataClient({ rateLimitMs: 500 });
      
      const mockResponse: WikidataSparqlResponse = {
        head: { vars: [] },
        results: { bindings: [] }
      };
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });
      
      const query1Promise = customClient.query("SELECT * WHERE { }");
      await vi.advanceTimersByTimeAsync(0);
      
      const query2Promise = customClient.query("SELECT * WHERE { }");
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      await vi.advanceTimersByTimeAsync(500);
      
      await Promise.all([query1Promise, query2Promise]);
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
  
  describe("healthCheck", () => {
    it("should return healthy when query succeeds", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          head: { vars: [] },
          results: { bindings: [] }
        })
      });
      
      const result = await client.healthCheck();
      
      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
    
    it("should return unhealthy when query fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable"
      });
      
      const result = await client.healthCheck();
      
      expect(result.healthy).toBe(false);
      expect(result.message).toContain("503");
    });
    
    it("should return unhealthy on network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection timeout"));
      
      const result = await client.healthCheck();
      
      expect(result.healthy).toBe(false);
      expect(result.message).toContain("Connection timeout");
    });
  });
});
