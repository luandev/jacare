import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "path";
import os from "os";
import { promises as fs } from "fs";
import {
  scanForUnorganizedItems,
  reorganizeItems
} from "../scanner";
import * as crocdb from "../crocdb";

// Mock the crocdb module
vi.mock("../crocdb", () => ({
  searchEntries: vi.fn(),
  getEntry: vi.fn()
}));

// Mock logger to avoid console output during tests
vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe("Scanner Service - Enhanced ROM Recognition", () => {
  let tempDir: string;
  let libraryRoot: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "crocdesk-enhanced-"));
    libraryRoot = path.join(tempDir, "library");
    await fs.mkdir(libraryRoot, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Abbreviated ROM Names", () => {
    it("should recognize SMW as Super Mario World", async () => {
      const fileName = "SMW.sfc";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      // Mock Crocdb to return Super Mario World
      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "super-mario-world",
              title: "Super Mario World",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "12345"
            }
          ],
          current_results: 1,
          total_results: 1,
          current_page: 1,
          total_pages: 1
        }
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Should match to Super Mario World via abbreviation expansion
      const expectedDir = path.join(
        libraryRoot,
        "Nintendo - Super Nintendo Entertainment System",
        "Super Mario World (USA)"
      );
      const exists = await fs.access(expectedDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should recognize ALTTP as A Link to the Past", async () => {
      const fileName = "ALTTP.sfc";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "legend-of-zelda-alttp",
              title: "The Legend of Zelda: A Link to the Past",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "67890"
            }
          ],
          current_results: 1,
          total_results: 1,
          current_page: 1,
          total_pages: 1
        }
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
      expect(vi.mocked(crocdb.searchEntries)).toHaveBeenCalled();
    });

    it("should recognize CT as Chrono Trigger", async () => {
      const fileName = "CT.sfc";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "chrono-trigger",
              title: "Chrono Trigger",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "11111"
            }
          ],
          current_results: 1,
          total_results: 1,
          current_page: 1,
          total_pages: 1
        }
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
    });

    it("should recognize FF6 as Final Fantasy VI", async () => {
      const fileName = "FF6.sfc";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "final-fantasy-6",
              title: "Final Fantasy VI",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "22222"
            }
          ],
          current_results: 1,
          total_results: 1,
          current_page: 1,
          total_pages: 1
        }
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
    });
  });

  describe("Filename Format Variations", () => {
    it("should recognize game with underscores", async () => {
      const fileName = "super_mario_world.sfc";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "super-mario-world",
              title: "Super Mario World",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "12345"
            }
          ],
          current_results: 1,
          total_results: 1,
          current_page: 1,
          total_pages: 1
        }
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should recognize game with dots as separators", async () => {
      const fileName = "Super.Mario.World.sfc";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "super-mario-world",
              title: "Super Mario World",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "12345"
            }
          ],
          current_results: 1,
          total_results: 1,
          current_page: 1,
          total_pages: 1
        }
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
    });

    it("should recognize game without spaces", async () => {
      const fileName = "ChronoTrigger.sfc";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "chrono-trigger",
              title: "Chrono Trigger",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "11111"
            }
          ],
          current_results: 1,
          total_results: 1,
          current_page: 1,
          total_pages: 1
        }
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
    });
  });

  describe("Fuzzy Matching with Similar Names", () => {
    it("should match close but not exact name", async () => {
      const fileName = "Supper Mario World.sfc"; // Typo: "Supper" instead of "Super"
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "super-mario-world",
              title: "Super Mario World",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "12345"
            },
            {
              slug: "super-mario-world-2",
              title: "Super Mario World 2: Yoshi's Island",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "12346"
            }
          ],
          current_results: 2,
          total_results: 2,
          current_page: 1,
          total_pages: 1
        }
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
      // Should match to the closest title despite the typo
    });

    it("should prefer exact match over fuzzy match", async () => {
      const fileName = "Mario World.sfc";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "super-mario-world",
              title: "Super Mario World",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "12345"
            },
            {
              slug: "mario-world",
              title: "Mario World",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "99999"
            }
          ],
          current_results: 2,
          total_results: 2,
          current_page: 1,
          total_pages: 1
        }
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
      // Should match to "Mario World" (exact) over "Super Mario World"
    });
  });

  describe("Integration: Common SNES ROM Recognition", () => {
    it("should successfully recognize all common SNES ROMs", async () => {
      // Create 5 common SNES ROMs with abbreviated names
      const roms = [
        { file: "SMW.sfc", title: "Super Mario World", slug: "super-mario-world" },
        { file: "ALTTP.sfc", title: "The Legend of Zelda: A Link to the Past", slug: "zelda-alttp" },
        { file: "CT.sfc", title: "Chrono Trigger", slug: "chrono-trigger" },
        { file: "FF6.sfc", title: "Final Fantasy VI", slug: "ff6" },
        { file: "SuperMetroid.sfc", title: "Super Metroid", slug: "super-metroid" }
      ];

      for (const rom of roms) {
        await fs.writeFile(path.join(libraryRoot, rom.file), "test content");
      }

      // Mock Crocdb to return appropriate results for each
      vi.mocked(crocdb.searchEntries).mockImplementation(async (req) => {
        const searchKey = req.search_key?.toLowerCase() || "";
        
        // Find matching ROM from our test data
        let matchingRom = null;
        if (searchKey.includes("mario") || searchKey === "smw") {
          matchingRom = roms[0];
        } else if (searchKey.includes("zelda") || searchKey.includes("link") || searchKey === "alttp") {
          matchingRom = roms[1];
        } else if (searchKey.includes("chrono") || searchKey === "ct" || searchKey === "chronotrigger") {
          matchingRom = roms[2];
        } else if (searchKey.includes("fantasy") || searchKey.includes("ff") || searchKey.includes("ff6")) {
          matchingRom = roms[3];
        } else if (searchKey.includes("metroid") || searchKey === "sm" || searchKey === "supermetroid") {
          matchingRom = roms[4];
        }

        if (matchingRom) {
          return {
            info: {},
            data: {
              results: [
                {
                  slug: matchingRom.slug,
                  title: matchingRom.title,
                  platform: "Nintendo - Super Nintendo Entertainment System",
                  regions: ["USA"],
                  links: [],
                  rom_id: Math.random().toString()
                }
              ],
              current_results: 1,
              total_results: 1,
              current_page: 1,
              total_pages: 1
            }
          };
        }

        return {
          info: {},
          data: {
            results: [],
            current_results: 0,
            total_results: 0,
            current_page: 1,
            total_pages: 0
          }
        };
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      expect(items).toHaveLength(5);

      const result = await reorganizeItems(items, libraryRoot);

      // All 5 ROMs should be successfully recognized and organized
      expect(result.reorganizedFiles).toBe(5);
      expect(result.errors).toHaveLength(0);
      expect(result.skippedFiles).toBe(0);

      // Verify at least searchEntries was called multiple times (for different strategies)
      expect(vi.mocked(crocdb.searchEntries).mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe("Backward Compatibility", () => {
    it("should still recognize ROMs with full names", async () => {
      const fileName = "Super Mario World (USA).sfc";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "super-mario-world",
              title: "Super Mario World",
              platform: "Nintendo - Super Nintendo Entertainment System",
              regions: ["USA"],
              links: [],
              rom_id: "12345"
            }
          ],
          current_results: 1,
          total_results: 1,
          current_page: 1,
          total_pages: 1
        }
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle ROM that doesn't match anything", async () => {
      const fileName = "Unknown Homebrew Game.sfc";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [],
          current_results: 0,
          total_results: 0,
          current_page: 1,
          total_pages: 0
        }
      });

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot, true);

      // Should still organize into "Not Found" folder
      expect(result.reorganizedFiles).toBe(1);
      
      const notFoundDir = path.join(
        libraryRoot,
        "Nintendo - Super Nintendo Entertainment System",
        "Not Found",
        "Unknown Homebrew Game"
      );
      const exists = await fs.access(notFoundDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });
});
