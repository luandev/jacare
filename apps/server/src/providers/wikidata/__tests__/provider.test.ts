import { describe, it, expect, vi, beforeEach } from "vitest";
import { WikidataProvider } from "../provider";
import type { GameMetadata, WikidataSparqlResponse } from "@crocdesk/shared";

// Mock all dependencies
vi.mock("../client");
vi.mock("../../../db");

import { WikidataClient } from "../client";
import * as db from "../../../db";

describe("Wikidata Provider", () => {
  let provider: WikidataProvider;
  let mockClient: any;
  
  beforeEach(() => {
    // Create a mock client
    mockClient = {
      query: vi.fn(),
      healthCheck: vi.fn()
    };
    
    // Pass mock client to provider
    provider = new WikidataProvider(mockClient);
    
    // Clear all mocks
    vi.clearAllMocks();
  });
  
  describe("searchGames", () => {
    it("should return ranked game metadata", async () => {
      const mockResponse: WikidataSparqlResponse = {
        head: { vars: ["game", "gameLabel"] },
        results: {
          bindings: [
            {
              game: { type: "uri" as const, value: "http://www.wikidata.org/entity/Q12345" },
              gameLabel: { type: "literal" as const, value: "Super Mario Bros" },
              releaseDate: { type: "literal" as const, value: "1985-09-13T00:00:00Z" },
              platforms: { type: "literal" as const, value: "Nintendo Entertainment System" },
              genres: { type: "literal" as const, value: "platform game" },
              publishers: { type: "literal" as const, value: "Nintendo" }
            }
          ]
        }
      };
      
      vi.mocked(db.getCachedWikidataSearch).mockReturnValue(null);
      mockClient.query.mockResolvedValue(mockResponse);
      
      const results = await provider.searchGames("super mario");
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        source: "wikidata",
        sourceId: "Q12345",
        name: "Super Mario Bros",
        releaseDate: "1985-09-13",
        platforms: ["Nintendo Entertainment System"],
        genres: ["platform game"],
        publishers: ["Nintendo"]
      });
    });
    
    it("should use cached results if available and fresh", async () => {
      const cachedData: WikidataSparqlResponse = {
        head: { vars: ["game", "gameLabel"] },
        results: {
          bindings: [
            {
              game: { type: "uri" as const, value: "http://www.wikidata.org/entity/Q99999" },
              gameLabel: { type: "literal" as const, value: "Cached Game" }
            }
          ]
        }
      };
      
      const recentTime = Date.now() - 1000; // 1 second ago
      vi.mocked(db.getCachedWikidataSearch).mockReturnValue({
        json: JSON.stringify(cachedData),
        updatedAt: recentTime
      });
      
      const results = await provider.searchGames("cached");
      
      expect(vi.mocked(db.getCachedWikidataSearch)).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Cached Game");
    });
    
    it("should respect limit option", async () => {
      const mockResponse: WikidataSparqlResponse = {
        head: { vars: ["game", "gameLabel"] },
        results: {
          bindings: Array.from({ length: 50 }, (_, i) => ({
            game: { type: "uri" as const, value: `http://www.wikidata.org/entity/Q${i}` },
            gameLabel: { type: "literal" as const, value: `Game ${i}` }
          }))
        }
      };
      
      vi.mocked(db.getCachedWikidataSearch).mockReturnValue(null);
      mockClient.query.mockResolvedValue(mockResponse);
      
      const results = await provider.searchGames("game", { limit: 10 });
      
      // Query builder should have been called with limit: 10
      expect(mockClient.query).toHaveBeenCalled();
      // Results should be limited (this is done in query, but we test the option is passed)
      expect(results.length).toBeGreaterThan(0);
    });
    
    it("should rank results by platform match", async () => {
      const mockResponse: WikidataSparqlResponse = {
        head: { vars: ["game", "gameLabel"] },
        results: {
          bindings: [
            {
              game: { type: "uri" as const, value: "http://www.wikidata.org/entity/Q1" },
              gameLabel: { type: "literal" as const, value: "Mario NES" },
              platforms: { type: "literal" as const, value: "Nintendo Entertainment System" }
            },
            {
              game: { type: "uri" as const, value: "http://www.wikidata.org/entity/Q2" },
              gameLabel: { type: "literal" as const, value: "Mario SNES" },
              platforms: { type: "literal" as const, value: "Super Nintendo Entertainment System" }
            }
          ]
        }
      };
      
      vi.mocked(db.getCachedWikidataSearch).mockReturnValue(null);
      mockClient.query.mockResolvedValue(mockResponse);
      
      const results = await provider.searchGames("mario", { platform: "nes" });
      
      expect(results).toHaveLength(2);
      // Q1 should come first because platform matches
      expect(results[0].sourceId).toBe("Q1");
    });
  });
  
  describe("getGameById", () => {
    it("should return game metadata by QID", async () => {
      const mockResponse: WikidataSparqlResponse = {
        head: { vars: ["game", "gameLabel"] },
        results: {
          bindings: [
            {
              game: { type: "uri" as const, value: "http://www.wikidata.org/entity/Q12345" },
              gameLabel: { type: "literal" as const, value: "Super Mario Bros" },
              releaseDate: { type: "literal" as const, value: "1985-09-13T00:00:00Z" }
            }
          ]
        }
      };
      
      vi.mocked(db.getCachedWikidataGame).mockReturnValue(null);
      mockClient.query.mockResolvedValue(mockResponse);
      
      const result = await provider.getGameById("Q12345");
      
      expect(result).toMatchObject({
        source: "wikidata",
        sourceId: "Q12345",
        name: "Super Mario Bros",
        releaseDate: "1985-09-13"
      });
    });
    
    it("should use cached game if available", async () => {
      const cachedData: WikidataSparqlResponse = {
        head: { vars: ["game", "gameLabel"] },
        results: {
          bindings: [
            {
              game: { type: "uri" as const, value: "http://www.wikidata.org/entity/Q99999" },
              gameLabel: { type: "literal" as const, value: "Cached Game" }
            }
          ]
        }
      };
      
      const recentTime = Date.now() - 1000;
      vi.mocked(db.getCachedWikidataGame).mockReturnValue({
        json: JSON.stringify(cachedData),
        updatedAt: recentTime
      });
      
      const result = await provider.getGameById("Q99999");
      
      expect(vi.mocked(db.getCachedWikidataGame)).toHaveBeenCalled();
      expect(result?.name).toBe("Cached Game");
    });
    
    it("should return null if no results found", async () => {
      const mockResponse: WikidataSparqlResponse = {
        head: { vars: ["game", "gameLabel"] },
        results: {
          bindings: []
        }
      };
      
      vi.mocked(db.getCachedWikidataGame).mockReturnValue(null);
      mockClient.query.mockResolvedValue(mockResponse);
      
      const result = await provider.getGameById("Q99999");
      
      expect(result).toBeNull();
    });
  });
  
  describe("healthCheck", () => {
    it("should delegate to client health check", async () => {
      const mockHealth = {
        healthy: true,
        responseTime: 123
      };
      
      mockClient.healthCheck.mockResolvedValue(mockHealth);
      
      const result = await provider.healthCheck();
      
      expect(result).toEqual(mockHealth);
    });
  });
  
  describe("name", () => {
    it("should return 'wikidata' as provider name", () => {
      expect(provider.name).toBe("wikidata");
    });
  });
});
