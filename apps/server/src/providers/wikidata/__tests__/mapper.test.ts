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
    
    it("should map platforms if present", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "Super Mario Bros" },
        platforms: { type: "literal", value: "Nintendo Entertainment System|Famicom" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result.platforms).toEqual(["Nintendo Entertainment System", "Famicom"]);
    });
    
    it("should map genres if present", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "Super Mario Bros" },
        genres: { type: "literal", value: "platform game|action game" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result.genres).toEqual(["platform game", "action game"]);
    });
    
    it("should map publishers if present", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "Super Mario Bros" },
        publishers: { type: "literal", value: "Nintendo" }
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
        gameLabel: { type: "literal", value: "The Legend of Zelda" },
        releaseDate: { type: "literal", value: "1986-02-21T00:00:00Z" },
        platforms: { type: "literal", value: "Famicom Disk System|Nintendo Entertainment System" },
        genres: { type: "literal", value: "action-adventure game" },
        publishers: { type: "literal", value: "Nintendo" },
        seriesLabel: { type: "literal", value: "The Legend of Zelda" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result).toEqual({
        qid: "Q12345",
        label: "The Legend of Zelda",
        releaseDate: "1986-02-21",
        platforms: ["Famicom Disk System", "Nintendo Entertainment System"],
        genres: ["action-adventure game"],
        publishers: ["Nintendo"],
        series: "The Legend of Zelda"
      });
    });
    
    it("should handle empty pipe-separated values", () => {
      const sparqlResult: WikidataSparqlResult = {
        game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
        gameLabel: { type: "literal", value: "Game" },
        platforms: { type: "literal", value: "" }
      };
      
      const result = mapSparqlResultToGame(sparqlResult);
      
      expect(result.platforms).toBeUndefined();
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
    
    it("should deduplicate games with the same QID", () => {
      const results: WikidataSparqlResult[] = [
        {
          game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
          gameLabel: { type: "literal", value: "Super Mario Bros" },
          platforms: { type: "literal", value: "NES" }
        },
        {
          game: { type: "uri", value: "http://www.wikidata.org/entity/Q12345" },
          gameLabel: { type: "literal", value: "Super Mario Bros" },
          platforms: { type: "literal", value: "NES|Famicom" }
        }
      ];
      
      const games = aggregateSparqlResults(results);
      
      expect(games).toHaveLength(1);
      expect(games[0].qid).toBe("Q12345");
    });
    
    it("should return empty array for empty input", () => {
      const games = aggregateSparqlResults([]);
      expect(games).toEqual([]);
    });
  });
});
