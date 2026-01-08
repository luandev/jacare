import { describe, it, expect } from "vitest";
import { buildSearchQuery, buildGetByQidQuery } from "../queryBuilder";

describe("Wikidata Query Builder", () => {
  describe("buildSearchQuery", () => {
    it("should build a basic search query for a game name", () => {
      const query = buildSearchQuery("super mario");
      
      expect(query).toContain("SELECT DISTINCT");
      expect(query).toContain("?game");
      expect(query).toContain("?gameLabel");
      expect(query).toContain("wdt:P31/wdt:P279* wd:Q7889"); // instance of video game
      expect(query).toContain("CONTAINS(LCASE(?gameLabel), \"super mario\")");
      expect(query).toContain("LIMIT 25");
    });
    
    it("should escape special characters in search query", () => {
      const query = buildSearchQuery("mario's adventure");
      
      expect(query).toContain("mario\\'s adventure");
    });
    
    it("should handle custom limit", () => {
      const query = buildSearchQuery("zelda", { limit: 10 });
      
      expect(query).toContain("LIMIT 10");
    });
    
    it("should include release date in SELECT", () => {
      const query = buildSearchQuery("pokemon");
      
      expect(query).toContain("?releaseDate");
    });
    
    it("should include platforms in SELECT", () => {
      const query = buildSearchQuery("tetris");
      
      expect(query).toContain("?platformLabel");
    });
    
    it("should include genres in SELECT", () => {
      const query = buildSearchQuery("sonic");
      
      expect(query).toContain("?genreLabel");
    });
    
    it("should include publishers in SELECT", () => {
      const query = buildSearchQuery("final fantasy");
      
      expect(query).toContain("?publisherLabel");
    });
    
    it("should include series in SELECT as optional", () => {
      const query = buildSearchQuery("metroid");
      
      expect(query).toContain("?seriesLabel");
      expect(query).toContain("OPTIONAL");
    });
    
    it("should use English labels", () => {
      const query = buildSearchQuery("kirby");
      
      expect(query).toContain("SERVICE wikibase:label");
      expect(query).toContain("bd:serviceParam wikibase:language \"en\"");
    });
  });
  
  describe("buildGetByQidQuery", () => {
    it("should build a query for fetching by QID", () => {
      const query = buildGetByQidQuery("Q12345");
      
      expect(query).toContain("wd:Q12345");
      expect(query).toContain("?gameLabel");
      expect(query).toContain("wdt:P31/wdt:P279* wd:Q7889"); // validate it's a video game
    });
    
    it("should include all metadata fields", () => {
      const query = buildGetByQidQuery("Q12345");
      
      expect(query).toContain("?releaseDate");
      expect(query).toContain("?platformLabel");
      expect(query).toContain("?genreLabel");
      expect(query).toContain("?publisherLabel");
      expect(query).toContain("?seriesLabel");
    });
    
    it("should handle QID with or without 'wd:' prefix", () => {
      const query1 = buildGetByQidQuery("Q12345");
      const query2 = buildGetByQidQuery("wd:Q12345");
      
      expect(query1).toContain("wd:Q12345");
      expect(query2).toContain("wd:Q12345");
    });
  });
});
