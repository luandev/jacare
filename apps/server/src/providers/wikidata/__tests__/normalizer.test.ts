import { describe, it, expect } from "vitest";
import { 
  normalizeGameName, 
  rankSearchResults, 
  matchRank 
} from "../normalizer";
import type { WikidataGameResult, MatchRank } from "@crocdesk/shared";

describe("Wikidata Normalizer", () => {
  describe("normalizeGameName", () => {
    it("should convert to lowercase", () => {
      const normalized = normalizeGameName("Super Mario Bros");
      expect(normalized).toBe("super mario bros");
    });
    
    it("should strip region tags in parentheses", () => {
      const normalized = normalizeGameName("Pokemon Red (USA)");
      expect(normalized).toBe("pokemon red");
    });
    
    it("should strip region tags in square brackets", () => {
      const normalized = normalizeGameName("Zelda [USA]");
      expect(normalized).toBe("zelda");
    });
    
    it("should strip revision tags", () => {
      const normalized = normalizeGameName("Metroid (USA) (Rev 1)");
      expect(normalized).toBe("metroid");
    });
    
    it("should strip disc numbers", () => {
      const normalized = normalizeGameName("Final Fantasy VII (Disc 1)");
      expect(normalized).toBe("final fantasy vii");
    });
    
    it("should strip multiple tags", () => {
      const normalized = normalizeGameName("Pokemon Red (USA) (Rev 1) [!]");
      expect(normalized).toBe("pokemon red");
    });
    
    it("should handle mixed bracket types", () => {
      const normalized = normalizeGameName("Mario Kart (USA) [Rev A]");
      expect(normalized).toBe("mario kart");
    });
    
    it("should strip extra whitespace", () => {
      const normalized = normalizeGameName("  Super  Mario   Bros  ");
      expect(normalized).toBe("super mario bros");
    });
    
    it("should handle ASCII folding of common characters", () => {
      const normalized = normalizeGameName("Pokémon");
      expect(normalized).toBe("pokemon");
    });
    
    it("should strip colons and hyphens for better matching", () => {
      const normalized = normalizeGameName("The Legend of Zelda: Breath of the Wild");
      expect(normalized).toBe("the legend of zelda breath of the wild");
    });
  });
  
  describe("matchRank", () => {
    it("should return EXACT for exact match", () => {
      const rank = matchRank("super mario bros", "super mario bros");
      expect(rank).toBe(1); // MatchRank.EXACT
    });
    
    it("should return PREFIX for prefix match", () => {
      const rank = matchRank("super mario", "super mario bros");
      expect(rank).toBe(2); // MatchRank.PREFIX
    });
    
    it("should return CONTAINS for substring match", () => {
      const rank = matchRank("mario", "super mario bros");
      expect(rank).toBe(3); // MatchRank.CONTAINS
    });
    
    it("should return NO_MATCH when query not in label", () => {
      const rank = matchRank("zelda", "super mario bros");
      expect(rank).toBe(4); // MatchRank.NO_MATCH
    });
    
    it("should be case-insensitive", () => {
      const rank = matchRank("SUPER MARIO", "super mario bros");
      expect(rank).toBe(2); // MatchRank.PREFIX
    });
  });
  
  describe("rankSearchResults", () => {
    const results: WikidataGameResult[] = [
      {
        qid: "Q1",
        label: "Super Mario Bros.",
        platforms: ["Nintendo Entertainment System"]
      },
      {
        qid: "Q2",
        label: "Super Mario World"
      },
      {
        qid: "Q3",
        label: "Mario Kart",
        platforms: ["Super Nintendo Entertainment System"]
      },
      {
        qid: "Q4",
        label: "The Legend of Mario"
      }
    ];
    
    it("should rank exact matches first", () => {
      const ranked = rankSearchResults(results, "super mario bros");
      
      expect(ranked[0].qid).toBe("Q1");
      expect(ranked[0].rank).toBe(1); // EXACT
    });
    
    it("should rank prefix matches before contains matches", () => {
      const ranked = rankSearchResults(results, "super mario");
      
      // Q1 and Q2 both have PREFIX match (start with "super mario")
      // Q3 and Q4 have NO_MATCH (don't contain "super mario", only "mario")
      expect(ranked[0].rank).toBe(2); // PREFIX (Q1 or Q2)
      expect(ranked[0].qid).toMatch(/Q1|Q2/);
      expect(ranked[2].rank).toBe(4); // NO_MATCH (Q3 or Q4)
    });
    
    it("should boost results with matching platform", () => {
      // Create results where platform boost makes a difference
      const platformResults: WikidataGameResult[] = [
        {
          qid: "Q1",
          label: "Super Mario Bros.",
          platforms: ["Nintendo Entertainment System"]
        },
        {
          qid: "Q2",
          label: "Super Mario World",
          platforms: ["Game Boy"]
        }
      ];
      
      const ranked = rankSearchResults(platformResults, "super mario", { platform: "nes" });
      
      // Both have same rank (PREFIX), but Q1 has matching platform (NES matches Nintendo Entertainment System)
      expect(ranked[0].qid).toBe("Q1");
      expect(ranked[0].platformMatch).toBe(true);
      expect(ranked[1].qid).toBe("Q2");
      expect(ranked[1].platformMatch).toBe(false);
    });
    
    it("should handle case-insensitive platform matching", () => {
      const ranked = rankSearchResults(results, "mario", { platform: "NES" });
      
      // Should match "Nintendo Entertainment System" even though query is "NES"
      const q1Result = ranked.find(r => r.qid === "Q1");
      expect(q1Result?.platformMatch).toBe(true);
    });
    
    it("should sort by rank then alphabetically", () => {
      const ranked = rankSearchResults(results, "mario");
      
      // All have CONTAINS rank, should be sorted by rank then label
      expect(ranked.every((r, i) => i === 0 || r.rank >= ranked[i - 1].rank)).toBe(true);
    });
    
    it("should handle empty results", () => {
      const ranked = rankSearchResults([], "mario");
      expect(ranked).toEqual([]);
    });
    
    it("should handle results without platforms", () => {
      const resultsNoPlatforms: WikidataGameResult[] = [
        { qid: "Q1", label: "Game One" },
        { qid: "Q2", label: "Game Two" }
      ];
      
      const ranked = rankSearchResults(resultsNoPlatforms, "game", { platform: "nes" });
      
      expect(ranked).toHaveLength(2);
      expect(ranked.every(r => !r.platformMatch)).toBe(true);
    });
  });
});
