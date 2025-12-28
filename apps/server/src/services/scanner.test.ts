import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "path";
import os from "os";
import { promises as fs } from "fs";
import {
  scanForUnorganizedItems,
  reorganizeItems,
  type UnorganizedItem,
  type ReorganizeResult
} from "./scanner";
import * as crocdb from "./crocdb";

// Mock the crocdb module
vi.mock("./crocdb", () => ({
  searchEntries: vi.fn(),
  getEntry: vi.fn()
}));

// Mock logger to avoid console output during tests
vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe("Scanner Service - ROM Detection Heuristics", () => {
  let tempDir: string;
  let libraryRoot: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "crocdesk-scanner-"));
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

  describe("ROM Version and Hack Detection", () => {
    it("should detect ROM with version tag in parentheses", async () => {
      const fileName = "Super Mario Bros (USA) (Rev 1).nes";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(1);
      expect(items[0].folderName).toBe("Super Mario Bros (USA) (Rev 1)");
      expect(items[0].filePath).toContain(fileName);
    });

    it("should detect ROM with version tag in square brackets", async () => {
      const fileName = "Zelda [USA] [Rev A].nes";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(1);
      expect(items[0].folderName).toBe("Zelda [USA] [Rev A]");
    });

    it("should detect ROM hack with descriptive tags", async () => {
      const fileName = "Super Mario Bros [Kaizo Hack v2.0].nes";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(1);
      expect(items[0].folderName).toBe("Super Mario Bros [Kaizo Hack v2.0]");
    });

    it("should detect ROM with multiple version tags", async () => {
      const fileName = "Pokemon Red (USA) (Rev 1) [T+Eng1.0].gbc";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(1);
      expect(items[0].folderName).toBe("Pokemon Red (USA) (Rev 1) [T+Eng1.0]");
    });

    it("should handle ROM with mixed bracket types", async () => {
      const fileName = "Metroid (USA) [Hack by SomeOne].nes";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(1);
      expect(items[0].folderName).toBe("Metroid (USA) [Hack by SomeOne]");
    });
  });

  describe("Packed File Detection", () => {
    it("should detect ZIP files as ROMs", async () => {
      const fileName = "Game Collection.zip";
      await fs.writeFile(path.join(libraryRoot, fileName), "test zip content");

      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(1);
      expect(items[0].folderName).toBe("Game Collection");
      expect(items[0].filePath).toContain(".zip");
    });

    it("should detect 7z files as ROMs", async () => {
      const fileName = "Retro Games.7z";
      await fs.writeFile(path.join(libraryRoot, fileName), "test 7z content");

      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(1);
      expect(items[0].folderName).toBe("Retro Games");
      expect(items[0].filePath).toContain(".7z");
    });

    it("should detect RAR files as ROMs", async () => {
      const fileName = "Classic ROMs.rar";
      await fs.writeFile(path.join(libraryRoot, fileName), "test rar content");

      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(1);
      expect(items[0].folderName).toBe("Classic ROMs");
    });

    it("should detect packed file with version tags", async () => {
      const fileName = "Super Mario Collection (USA) (Rev 1).zip";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(1);
      expect(items[0].folderName).toBe("Super Mario Collection (USA) (Rev 1)");
    });
  });

  describe("Game Not Found in Crocdb", () => {
    it("should create manifest for game not found in Crocdb", async () => {
      const fileName = "Unknown Game (USA).nes";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      // Mock Crocdb to return no results
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
      expect(items).toHaveLength(1);

      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify manifest was created in "Not Found" folder
      const expectedDir = path.join(
        libraryRoot,
        "Nintendo - Nintendo Entertainment System",
        "Not Found",
        "Unknown Game (USA)"
      );
      const manifestPath = path.join(expectedDir, ".crocdesk.json");
      const manifestExists = await fs.access(manifestPath).then(() => true).catch(() => false);
      
      expect(manifestExists).toBe(true);

      if (manifestExists) {
        const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
        expect(manifest.crocdb.slug).toBe("unknown-game-usa");
        expect(manifest.crocdb.title).toBe("Unknown Game (USA)");
      }
    });

    it("should handle homebrew ROM without Crocdb entry", async () => {
      const fileName = "My Homebrew Game v1.0.gb";
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
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
      
      // Should create folder in "Not Found" subfolder
      const expectedDir = path.join(
        libraryRoot,
        "Nintendo - Game Boy",
        "Not Found",
        "My Homebrew Game v1.0"
      );
      const exists = await fs.access(expectedDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should handle ROM with special characters not found in Crocdb", async () => {
      const fileName = "Test: Game! (Beta) [v0.1].nes";
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
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(1);
      
      // Verify special characters are sanitized and placed in "Not Found"
      const expectedDir = path.join(
        libraryRoot,
        "Nintendo - Nintendo Entertainment System",
        "Not Found",
        "Test Game! (Beta) [v0.1]"
      );
      const exists = await fs.access(expectedDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe("ROM Detection with Crocdb Match", () => {
    it("should match ROM with Crocdb and use proper title", async () => {
      const fileName = "smb.nes";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      // Mock Crocdb to return a match
      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "super-mario-bros",
              title: "Super Mario Bros.",
              platform: "Nintendo - Nintendo Entertainment System",
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

      // Should use Crocdb title instead of filename
      const expectedDir = path.join(
        libraryRoot,
        "Nintendo - Nintendo Entertainment System",
        "Super Mario Bros. (USA)"
      );
      const exists = await fs.access(expectedDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should strip version tags when searching Crocdb", async () => {
      const fileName = "Mario (USA) (Rev 1) [!].nes";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: {
          results: [
            {
              slug: "super-mario-bros",
              title: "Super Mario Bros.",
              platform: "Nintendo - Nintendo Entertainment System",
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

      // Should match based on normalized name
      expect(vi.mocked(crocdb.searchEntries)).toHaveBeenCalledWith(
        expect.objectContaining({
          search_key: "Mario (USA) (Rev 1) [!]"
        })
      );
    });
  });

  describe("Multiple ROM Versions", () => {
    it("should handle multiple versions of the same game", async () => {
      const files = [
        "Zelda (USA).nes",
        "Zelda (USA) (Rev 1).nes",
        "Zelda (Europe).nes"
      ];

      for (const file of files) {
        await fs.writeFile(path.join(libraryRoot, file), "test content");
      }

      const items = await scanForUnorganizedItems(libraryRoot);
      
      // Each version should be detected as separate item
      expect(items).toHaveLength(3);
      
      // Check that all expected folder names are present (order may vary)
      const folderNames = items.map(item => item.folderName).sort();
      expect(folderNames).toEqual([
        "Zelda (Europe)",
        "Zelda (USA)",
        "Zelda (USA) (Rev 1)"
      ]);
    });

    it("should organize different versions into separate folders", async () => {
      const files = [
        "Game (USA).nes",
        "Game (USA) (Rev A).nes",
        "Game (Japan).nes"
      ];

      for (const file of files) {
        await fs.writeFile(path.join(libraryRoot, file), "test content");
      }

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
      const result = await reorganizeItems(items, libraryRoot);

      expect(result.reorganizedFiles).toBe(3);

      // Each version should have its own folder in "Not Found"
      const platform = "Nintendo - Nintendo Entertainment System/Not Found";
      const dir1 = path.join(libraryRoot, platform, "Game (USA)");
      const dir2 = path.join(libraryRoot, platform, "Game (USA) (Rev A)");
      const dir3 = path.join(libraryRoot, platform, "Game (Japan)");

      const exists1 = await fs.access(dir1).then(() => true).catch(() => false);
      const exists2 = await fs.access(dir2).then(() => true).catch(() => false);
      const exists3 = await fs.access(dir3).then(() => true).catch(() => false);

      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
      expect(exists3).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle files with no extension", async () => {
      const fileName = "game-no-ext";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      const items = await scanForUnorganizedItems(libraryRoot);

      // Should not be detected as ROM (no valid extension)
      expect(items).toHaveLength(0);
    });

    it("should handle very long filenames with version tags", async () => {
      const fileName = "Super Ultra Mega Long Game Name With Many Words (USA) (Rev 1) (Beta) [Hack by Author] [T+Eng].nes";
      await fs.writeFile(path.join(libraryRoot, fileName), "test content");

      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(1);
      expect(items[0].folderName).toContain("Super Ultra Mega Long");
    });

    it("should handle empty library directory", async () => {
      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(0);
    });

    it("should skip hidden files", async () => {
      await fs.writeFile(path.join(libraryRoot, ".hidden-game.nes"), "test content");
      await fs.writeFile(path.join(libraryRoot, "visible-game.nes"), "test content");

      const items = await scanForUnorganizedItems(libraryRoot);

      // Should only detect the visible file
      expect(items).toHaveLength(1);
      expect(items[0].folderName).toBe("visible-game");
    });

    it("should handle ROM already in platform folder without manifest", async () => {
      const platformDir = path.join(libraryRoot, "Nintendo - Game Boy");
      await fs.mkdir(platformDir, { recursive: true });
      await fs.writeFile(path.join(platformDir, "game.gb"), "test content");

      const items = await scanForUnorganizedItems(libraryRoot);

      expect(items).toHaveLength(1);
      expect(items[0].platform).toBe("Nintendo - Game Boy");
    });

    it("should skip ROM already properly organized with manifest", async () => {
      const gameDir = path.join(libraryRoot, "Nintendo - Game Boy", "Proper Game");
      await fs.mkdir(gameDir, { recursive: true });
      await fs.writeFile(path.join(gameDir, "game.gb"), "test content");
      await fs.writeFile(
        path.join(gameDir, ".crocdesk.json"),
        JSON.stringify({
          schema: 1,
          crocdb: {
            slug: "proper-game",
            title: "Proper Game",
            platform: "Nintendo - Game Boy",
            regions: ["USA"]
          },
          artifacts: [{ path: "game.gb", size: 12 }],
          createdAt: new Date().toISOString()
        })
      );

      const items = await scanForUnorganizedItems(libraryRoot);

      // Should not detect already organized game
      expect(items).toHaveLength(0);
    });
  });

  describe("Platform Detection", () => {
    it("should detect Game Boy platform from .gb extension", async () => {
      await fs.writeFile(path.join(libraryRoot, "game.gb"), "test");
      const items = await scanForUnorganizedItems(libraryRoot);
      
      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: { results: [], current_results: 0, total_results: 0, current_page: 1, total_pages: 0 }
      });
      
      await reorganizeItems(items, libraryRoot);
      
      const platformDir = path.join(libraryRoot, "Nintendo - Game Boy");
      const exists = await fs.access(platformDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should detect Genesis platform from .md extension", async () => {
      await fs.writeFile(path.join(libraryRoot, "sonic.md"), "test");
      const items = await scanForUnorganizedItems(libraryRoot);
      
      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: { results: [], current_results: 0, total_results: 0, current_page: 1, total_pages: 0 }
      });
      
      await reorganizeItems(items, libraryRoot);
      
      const platformDir = path.join(libraryRoot, "Sega - Mega Drive - Genesis");
      const exists = await fs.access(platformDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should detect SNES platform from .sfc extension", async () => {
      await fs.writeFile(path.join(libraryRoot, "game.sfc"), "test");
      const items = await scanForUnorganizedItems(libraryRoot);
      
      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: { results: [], current_results: 0, total_results: 0, current_page: 1, total_pages: 0 }
      });
      
      await reorganizeItems(items, libraryRoot);
      
      const platformDir = path.join(libraryRoot, "Nintendo - Super Nintendo Entertainment System");
      const exists = await fs.access(platformDir).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should use Unknown platform for unrecognized extension", async () => {
      await fs.writeFile(path.join(libraryRoot, "game.xyz"), "test");
      const items = await scanForUnorganizedItems(libraryRoot);
      
      // Should not be detected (not in SCAN_EXTENSIONS)
      expect(items).toHaveLength(0);
    });
  });

  describe("Error Handling", () => {
    const READONLY_PERMISSIONS = 0o444;
    const READWRITE_PERMISSIONS = 0o755;

    it("should handle Crocdb API errors gracefully", async () => {
      await fs.writeFile(path.join(libraryRoot, "game.nes"), "test");

      // Mock Crocdb to throw an error
      vi.mocked(crocdb.searchEntries).mockRejectedValue(new Error("API Error"));

      const items = await scanForUnorganizedItems(libraryRoot);
      const result = await reorganizeItems(items, libraryRoot);

      // Should still reorganize using folder name
      expect(result.reorganizedFiles).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should track errors when file move fails", async () => {
      await fs.writeFile(path.join(libraryRoot, "game.nes"), "test");

      const items = await scanForUnorganizedItems(libraryRoot);

      // Make library root read-only to cause move to fail
      await fs.chmod(libraryRoot, READONLY_PERMISSIONS);

      const result = await reorganizeItems(items, libraryRoot);

      // Restore permissions for cleanup
      await fs.chmod(libraryRoot, READWRITE_PERMISSIONS);

      expect(result.reorganizedFiles).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should continue processing other files if one fails", async () => {
      await fs.writeFile(path.join(libraryRoot, "good-game.nes"), "test");
      await fs.writeFile(path.join(libraryRoot, "bad-game.nes"), "test");

      vi.mocked(crocdb.searchEntries).mockResolvedValue({
        info: {},
        data: { results: [], current_results: 0, total_results: 0, current_page: 1, total_pages: 0 }
      });

      const items = await scanForUnorganizedItems(libraryRoot);

      // Manually mark one for failure by creating conflicting directory
      const targetDir = path.join(
        libraryRoot,
        "Nintendo - Nintendo Entertainment System",
        "Not Found",
        "bad-game"
      );
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(path.join(targetDir, "bad-game.nes"), "existing");
      await fs.chmod(targetDir, READONLY_PERMISSIONS);

      const result = await reorganizeItems(items, libraryRoot);

      // Should process at least the good one
      expect(result.reorganizedFiles).toBeGreaterThan(0);

      // Restore permissions for cleanup
      await fs.chmod(targetDir, READWRITE_PERMISSIONS);
    });
  });
});
