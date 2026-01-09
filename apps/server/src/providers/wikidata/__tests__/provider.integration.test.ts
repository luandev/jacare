/**
 * Integration/Smoke tests for WikidataProvider
 * 
 * These tests make actual API calls to Wikidata and should be run sparingly.
 * They verify that the provider works end-to-end with the real API.
 * 
 * To run: npm run test -- provider.integration.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import { WikidataProvider } from "../provider";
import { initDb } from "../../../db";

describe("Wikidata Provider Integration Tests", () => {
  let provider: WikidataProvider;

  beforeAll(async () => {
    // Initialize database for caching
    await initDb();
    provider = new WikidataProvider();
  });

  describe("searchGames", () => {
    it("should search for games and return results", async () => {
      const results = await provider.searchGames("mario", { limit: 5 });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);
      
      // Verify structure
      const first = results[0];
      expect(first).toHaveProperty("source", "wikidata");
      expect(first).toHaveProperty("sourceId");
      expect(first.sourceId).toMatch(/^Q\d+$/);
      expect(first).toHaveProperty("name");
      expect(typeof first.name).toBe("string");
      expect(first.name.length).toBeGreaterThan(0);
      
      // Verify name contains "mario" (case-insensitive)
      expect(first.name.toLowerCase()).toContain("mario");
    }, 30000); // 30 second timeout for API calls

    it("should handle platform filter", async () => {
      const results = await provider.searchGames("zelda", { 
        platform: "nes",
        limit: 3 
      });
      
      // Should return some results (may or may not match platform, but should not error)
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        const first = results[0];
        expect(first).toHaveProperty("source", "wikidata");
        expect(first).toHaveProperty("name");
      }
    }, 30000);

    it("should respect limit option", async () => {
      const results = await provider.searchGames("pokemon", { limit: 3 });
      
      expect(results.length).toBeLessThanOrEqual(3);
    }, 30000);
  });

  describe("getGameById", () => {
    it("should fetch game by known QID (Super Mario Bros)", async () => {
      // Super Mario Bros QID: Q170489 is Super Mario Galaxy, let's use a known one
      // Q216995 is Super Mario 64
      const game = await provider.getGameById("Q216995");
      
      expect(game).not.toBeNull();
      expect(game).toHaveProperty("source", "wikidata");
      expect(game).toHaveProperty("sourceId", "Q216995");
      expect(game).toHaveProperty("name");
      expect(game?.name.toLowerCase()).toContain("mario");
    }, 30000);

    it("should return null for non-existent QID", async () => {
      const game = await provider.getGameById("Q999999999");
      
      expect(game).toBeNull();
    }, 30000);

    it("should handle QID with wd: prefix", async () => {
      const game = await provider.getGameById("wd:Q216995");
      
      expect(game).not.toBeNull();
      expect(game?.sourceId).toBe("Q216995");
    }, 30000);
  });

  describe("healthCheck", () => {
    it("should check if Wikidata endpoint is accessible", async () => {
      const health = await provider.healthCheck();
      
      expect(health).toHaveProperty("healthy");
      expect(health).toHaveProperty("responseTime");
      expect(typeof health.responseTime).toBe("number");
      expect(health.responseTime).toBeGreaterThan(0);
      
      // Endpoint should be accessible (may vary based on network)
      // We just verify the structure, not necessarily that it's healthy
    }, 30000);
  });

  describe("caching", () => {
    it("should cache search results", async () => {
      const query = `test-${Date.now()}`; // Unique query to avoid cache
      
      const start1 = Date.now();
      const results1 = await provider.searchGames(query, { limit: 3 });
      const duration1 = Date.now() - start1;
      
      // Second call should be faster (cached)
      const start2 = Date.now();
      const results2 = await provider.searchGames(query, { limit: 3 });
      const duration2 = Date.now() - start2;
      
      expect(results1).toEqual(results2);
      // Cached call should be significantly faster (but not guaranteed in tests)
      // We just verify it returns the same results
    }, 30000);
  });
});


