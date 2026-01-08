import { describe, it, expect } from "vitest";
import { 
  mapSparqlResultToGame, 
  aggregateSparqlResults, 
  extractQidFromUri 
} from "../mapper";
import type { WikidataSparqlResult } from "@crocdesk/shared";

describe("Wikidata Mapper", () => {
  describe("extractQidFromUri", () => {
    it("should extract QID from full Wikidata URI", () => {
      const qid = extractQidFromUri("http://www.wikidata.org/entity/Q12345");
      expect(qid).toBe("Q12345");
    });
    
    it("should handle URIs with trailing slashes", () => {
      const qid = extractQidFromUri("http://www.wikidata.org/entity/Q12345/");
      expect(qid).toBe("Q12345");
    });
    
    it("should return input if already a QID", () => {
      const qid = extractQidFromUri("Q12345");
      expect(qid).toBe("Q12345");
    });
  });
  
  describe("mapSparqlResultToGame", () => {
    it("should map a basic SPARQL result to WikidataGameResult", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "Super Mario Bros" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result.qid).toBe("Q12345");
      expect(result.label).toBe("Super Mario Bros");
    });
    
    it("should map release date if present", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "Super Mario Bros" },
        releaseDate: { type: "literal", value: "1985-09-13T00:00:00Z", datatype: "http://www.w3.org/2001/XMLSchema#dateTime" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result.releaseDate).toBe("1985-09-13");
    });
    
    it("should map platformLabel if present (single value)", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "Super Mario Bros", "xml:lang": "en" },
        platformLabel: { type: "literal", value: "Nintendo Entertainment System", "xml:lang": "en" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result.platforms).toEqual(["Nintendo Entertainment System"]);
    });
    
    it("should map genreLabel if present (single value)", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "Super Mario Bros", "xml:lang": "en" },
        genreLabel: { type: "literal", value: "platform game", "xml:lang": "en" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result.genres).toEqual(["platform game"]);
    });
    
    it("should map publisherLabel if present (single value)", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "Super Mario Bros", "xml:lang": "en" },
        publisherLabel: { type: "literal", value: "Nintendo", "xml:lang": "en" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result.publishers).toEqual(["Nintendo"]);
    });
    
    it("should map series if present", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "Super Mario Bros" },
        seriesLabel: { type: "literal", value: "Super Mario" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result.series).toBe("Super Mario");
    });
    
    it("should handle all fields together", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "The Legend of Zelda", "xml:lang": "en" },
        releaseDate: { type: "literal", value: "1986-02-21T00:00:00Z", datatype: "http://www.w3.org/2001/XMLSchema#dateTime" },
        platformLabel: { type: "literal", value: "Nintendo Entertainment System", "xml:lang": "en" },
        genreLabel: { type: "literal", value: "action-adventure game", "xml:lang": "en" },
        publisherLabel: { type: "literal", value: "Nintendo", "xml:lang": "en" },
        seriesLabel: { type: "literal", value: "The Legend of Zelda", "xml:lang": "en" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result).toEqual({
        qid: "Q12345",
        label: "The Legend of Zelda",
        releaseDate: "1986-02-21",
        platforms: ["Nintendo Entertainment System"],
        genres: ["action-adventure game"],
        publishers: ["Nintendo"],
        series: "The Legend of Zelda"
      });
    });
    
    it("should handle missing optional fields", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "Game", "xml:lang": "en" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result.platforms).toBeUndefined();
      expect(result.genres).toBeUndefined();
      expect(result.publishers).toBeUndefined();
    });
  });
  
  describe("aggregateSparqlResults", () => {
    it("should aggregate multiple results into unique games", () => {
      const results: WikidataSparqlResult[] = [
        {
          game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
          gameLabel: { type: "literal", value: "Super Mario Bros" }
        },
        {
          game: { type: "uri", value: "http://www.wikidata.org/entity/Q67890" },
          gameLabel: { type: "literal", value: "Mario Kart" }
        }
      ];
      
      const games = aggregateSparqlResults(results);
      
      expect(games).toHaveLength(2);
      expect(games[0].qid).toBe("Q12345");
      expect(games[1].qid).toBe("Q67890");
    });
    
    it("should aggregate multiple rows for the same game", () => {
      const results: WikidataSparqlResult[] = [
        {
          game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
          gameLabel: { type: "literal", value: "Super Mario Bros", "xml:lang": "en" },
          platformLabel: { type: "literal", value: "Nintendo Entertainment System", "xml:lang": "en" }
        },
        {
          game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
          gameLabel: { type: "literal", value: "Super Mario Bros", "xml:lang": "en" },
          platformLabel: { type: "literal", value: "Famicom", "xml:lang": "en" },
          genreLabel: { type: "literal", value: "platform game", "xml:lang": "en" }
        }
      ];
      
      const games = aggregateSparqlResults(results);
      
      expect(games).toHaveLength(1);
      expect(games[0].qid).toBe("Q12345");
      expect(games[0].platforms).toEqual(expect.arrayContaining(["Nintendo Entertainment System", "Famicom"]));
      expect(games[0].genres).toEqual(["platform game"]);
    });
    
    it("should return empty array for empty input", () => {
      const games = aggregateSparqlResults([]);
      expect(games).toEqual([]);
    });
  });
});
