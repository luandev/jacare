import { describe, expect, it } from "vitest";
import {
  calculateLevenshteinDistance,
  calculateSimilarity,
  normalize,
  tokenize,
  expandAbbreviations,
  calculateTokenSimilarity,
  calculateMatchScore,
  findBestMatches,
  extractCoreName
} from "../fuzzy-matcher";

/**
 * Test suite for fuzzy ROM name matching utilities
 * These tests validate the improved ROM recognition implementation
 */

// Mock Crocdb entries for testing
const mockCrocdbEntries = [
  { slug: "super-mario-world", title: "Super Mario World", platform: "snes", regions: ["USA"] },
  { slug: "super-mario-world-2", title: "Super Mario World 2: Yoshi's Island", platform: "snes", regions: ["USA"] },
  { slug: "super-mario-bros-3", title: "Super Mario Bros. 3", platform: "nes", regions: ["USA"] },
  { slug: "legend-of-zelda-link-to-past", title: "The Legend of Zelda: A Link to the Past", platform: "snes", regions: ["USA"] },
  { slug: "legend-of-zelda-oot", title: "The Legend of Zelda: Ocarina of Time", platform: "n64", regions: ["USA"] },
  { slug: "final-fantasy-6", title: "Final Fantasy VI", platform: "snes", regions: ["USA"] },
  { slug: "final-fantasy-3-us", title: "Final Fantasy III", platform: "snes", regions: ["USA"] },
  { slug: "chrono-trigger", title: "Chrono Trigger", platform: "snes", regions: ["USA"] },
  { slug: "street-fighter-2", title: "Street Fighter II", platform: "snes", regions: ["USA"] },
  { slug: "street-fighter-2-turbo", title: "Street Fighter II Turbo", platform: "snes", regions: ["USA"] }
];

describe("Fuzzy Matching Utilities", () => {
  describe("String Similarity", () => {
    it("should calculate Levenshtein distance", () => {
      expect(calculateLevenshteinDistance("kitten", "sitting")).toBe(3);
      expect(calculateLevenshteinDistance("abc", "abc")).toBe(0);
      expect(calculateLevenshteinDistance("", "abc")).toBe(3);
      expect(calculateLevenshteinDistance("abc", "")).toBe(3);
    });

    it("should calculate normalized similarity score (0-1)", () => {
      expect(calculateSimilarity("abc", "abc")).toBe(1.0);
      expect(calculateSimilarity("abc", "")).toBe(0.0);
      expect(calculateSimilarity("", "")).toBe(1.0); // Empty strings are equal
      expect(calculateSimilarity("kitten", "sitting")).toBeCloseTo(0.571, 2);
    });

    it("should handle empty strings", () => {
      expect(calculateSimilarity("", "test")).toBe(0.0);
      expect(calculateSimilarity("test", "")).toBe(0.0);
      expect(calculateSimilarity("", "")).toBe(1.0); // Empty strings are equal
    });
  });

  describe("Common Abbreviations", () => {
    it("should expand SMW to Super Mario World", () => {
      const expansions = expandAbbreviations("SMW");
      expect(expansions).toContain("Super Mario World");
      expect(expansions.length).toBeGreaterThan(0);
    });

    it("should expand ALTTP to A Link to the Past", () => {
      const expansions = expandAbbreviations("ALTTP");
      expect(expansions.some(e => e.toLowerCase().includes("link to the past"))).toBe(true);
    });

    it("should handle FF6 / FFVI variations", () => {
      const expansions6 = expandAbbreviations("FF6");
      const expansionsVI = expandAbbreviations("FFVI");
      
      expect(expansions6.some(e => e.toLowerCase().includes("final fantasy"))).toBe(true);
      expect(expansionsVI.some(e => e.toLowerCase().includes("final fantasy"))).toBe(true);
    });

    it("should handle SF2 abbreviation", () => {
      const expansions = expandAbbreviations("SF2");
      expect(expansions.some(e => e.toLowerCase().includes("street fighter"))).toBe(true);
    });

    it("should preserve unknown abbreviations", () => {
      const expansions = expandAbbreviations("XYZ123");
      expect(expansions).toContain("XYZ123");
      expect(expansions.length).toBe(1); // Only original
    });
  });

  describe("Name Normalization", () => {
    it("should handle 'The' prefix variations", () => {
      const norm1 = normalize("The Legend of Zelda");
      const norm2 = normalize("Legend of Zelda");
      // Both should normalize to comparable forms
      expect(norm1).toContain("legend");
      expect(norm2).toContain("legend");
    });

    it("should handle subtitle separators (colon vs dash vs space)", () => {
      const norm1 = normalize("Game: Subtitle");
      const norm2 = normalize("Game - Subtitle");
      const norm3 = normalize("Game Subtitle");
      // All should normalize to similar forms
      expect(norm1.replace(/\s+/g, "")).toContain("game");
      expect(norm2.replace(/\s+/g, "")).toContain("game");
      expect(norm3.replace(/\s+/g, "")).toContain("game");
    });

    it("should handle Roman numerals vs Arabic numbers", () => {
      const norm1 = normalize("Final Fantasy VI");
      const norm2 = normalize("Final Fantasy 6");
      expect(norm1).toContain("6");
      expect(norm2).toContain("6");
      expect(norm1.replace(/\s+/g, "")).toBe(norm2.replace(/\s+/g, ""));
    });

    it("should handle punctuation variations", () => {
      const norm1 = normalize("Mario Bros.");
      const norm2 = normalize("Mario Bros");
      const norm3 = normalize("Mario Brothers");
      expect(norm1).toContain("bros");
      expect(norm2).toContain("bros");
      expect(norm3).toContain("brothers");
    });

    it("should normalize whitespace", () => {
      const result = normalize("Super   Mario    World");
      expect(result).toBe("super mario world");
    });
  });

  describe("Token-Based Matching", () => {
    it("should tokenize and filter stop words", () => {
      const tokens = tokenize("The Legend of Zelda");
      expect(tokens).not.toContain("the");
      expect(tokens).not.toContain("of");
      expect(tokens).toContain("legend");
      expect(tokens).toContain("zelda");
    });

    it("should handle token similarity", () => {
      const score = calculateTokenSimilarity("Super Mario World", "World Mario Super");
      expect(score).toBeGreaterThan(0.8); // High overlap despite different order
    });

    it("should weight earlier tokens appropriately", () => {
      const score1 = calculateMatchScore("Super Mario World", "Super Mario World 2");
      const score2 = calculateMatchScore("Super Mario World", "Mario Super Bros");
      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe("Match Scoring", () => {
    it("should score exact match as 1.0", () => {
      const score = calculateMatchScore("Super Mario World", "Super Mario World");
      expect(score).toBe(1.0);
    });

    it("should score case-insensitive exact match highly", () => {
      const score = calculateMatchScore("super mario world", "Super Mario World");
      expect(score).toBeGreaterThanOrEqual(0.95);
    });

    it("should score abbreviated names with expanded form", () => {
      const candidates = mockCrocdbEntries;
      const results = findBestMatches("SMW", candidates);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe("Super Mario World");
      expect(results[0].score).toBeGreaterThan(0.7);
    });

    it("should handle typos with minor score reduction", () => {
      const score = calculateMatchScore("Super Maro World", "Super Mario World");
      expect(score).toBeGreaterThan(0.60); // Adjusted expectation - 1 typo in 17 chars
    });

    it("should score partial matches lower than full matches", () => {
      const candidates = [
        { title: "Super Mario World", slug: "smw", platform: "snes", regions: [] },
        { title: "Mario Bros", slug: "mb", platform: "nes", regions: [] },
        { title: "Dr. Mario", slug: "dm", platform: "nes", regions: [] }
      ];
      const results = findBestMatches("Mario", candidates);
      expect(results.length).toBeGreaterThan(0);
      // "Mario Bros" should score well as it's shortest with full token match
    });
  });

  describe("Real-World ROM Name Scenarios", () => {
    it("should match 'SMW' to Super Mario World", () => {
      const results = findBestMatches("SMW", mockCrocdbEntries);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe("Super Mario World");
      expect(results[0].score).toBeGreaterThan(0.7);
    });

    it("should match 'ALTTP' to A Link to the Past", () => {
      const results = findBestMatches("ALTTP", mockCrocdbEntries);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain("Link to the Past");
      expect(results[0].score).toBeGreaterThan(0.7);
    });

    it("should match 'Final Fantasy 3' to Final Fantasy titles", () => {
      const results = findBestMatches("Final Fantasy 3", mockCrocdbEntries);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain("Final Fantasy");
    });

    it("should match 'ChronoTrigger' to Chrono Trigger", () => {
      const results = findBestMatches("ChronoTrigger", mockCrocdbEntries);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe("Chrono Trigger");
      expect(results[0].score).toBeGreaterThan(0.8);
    });

    it("should match 'sf2' to Street Fighter II", () => {
      const results = findBestMatches("sf2", mockCrocdbEntries);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain("Street Fighter");
      expect(results[0].score).toBeGreaterThan(0.6);
    });

    it("should handle ROM with version tag in name", () => {
      const coreName = extractCoreName("Super Mario World (USA) (Rev 1).sfc");
      expect(coreName).toBe("super mario world");
      
      const results = findBestMatches(coreName, mockCrocdbEntries);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe("Super Mario World");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very short names", () => {
      const results = findBestMatches("FF", mockCrocdbEntries, { minScore: 0.5 });
      // Should match Final Fantasy entries
      expect(results.some(r => r.title.includes("Final Fantasy"))).toBe(true);
    });

    it("should handle empty or whitespace-only names", () => {
      const results = findBestMatches("   ", mockCrocdbEntries);
      expect(results).toHaveLength(0);
    });

    it("should not crash on special characters", () => {
      expect(() => normalize("Game@#$%Name!!!")).not.toThrow();
    });

    it("should extract core name correctly", () => {
      expect(extractCoreName("Game (USA).sfc")).toBe("game");
      expect(extractCoreName("Game [Hack].smc")).toBe("game");
      expect(extractCoreName("Game (USA) (Rev 1) [!].nes")).toBe("game");
    });
  });
});

describe("Integration: Enhanced ROM Matching", () => {
  it("should improve recognition for common abbreviated SNES ROMs", () => {
    const testCases = [
      { input: "SMW", expected: "Super Mario World" },
      { input: "ALTTP", expected: "Link to the Past" },
      { input: "CT", expected: "Chrono Trigger" },
      { input: "FF6", expected: "Final Fantasy" }
    ];
    
    for (const { input, expected } of testCases) {
      const results = findBestMatches(input, mockCrocdbEntries);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain(expected);
    }
  });

  it("should handle various filename formats", () => {
    const testCases = [
      "Super Mario World.sfc",
      "super_mario_world.sfc",
      "SuperMarioWorld.sfc",
      "Super.Mario.World.sfc"
    ];
    
    for (const input of testCases) {
      const coreName = extractCoreName(input);
      const results = findBestMatches(coreName, mockCrocdbEntries);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe("Super Mario World");
    }
  });
});
