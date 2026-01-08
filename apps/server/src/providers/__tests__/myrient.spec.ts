import { describe, it, expect, vi, beforeEach } from "vitest";
import { MyrientProvider } from "../myrient";

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

describe("MyrientProvider", () => {
  let provider: MyrientProvider;

  beforeEach(() => {
    provider = new MyrientProvider();
  });

  const mockPlatformListingHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>Index of /files/No-Intro/</title></head>
    <body>
      <h1>Index of /files/No-Intro/</h1>
      <table>
        <tr><td><a href="../">Parent Directory</a></td></tr>
        <tr><td><a href="Nintendo - Game Boy/">Nintendo - Game Boy/</a></td><td>-</td><td>2025-01-01</td></tr>
        <tr><td><a href="Nintendo - Game Boy Advance/">Nintendo - Game Boy Advance/</a></td><td>-</td><td>2025-01-01</td></tr>
        <tr><td><a href="Sega - Mega Drive - Genesis/">Sega - Mega Drive - Genesis/</a></td><td>-</td><td>2025-01-01</td></tr>
      </table>
    </body>
    </html>
  `;

  const mockGameListingHtml = `
    <!DOCTYPE html>
    <html>
    <head><title>Index of /files/No-Intro/Nintendo - Game Boy/</title></head>
    <body>
      <h1>Index of /files/No-Intro/Nintendo - Game Boy/</h1>
      <table>
        <tr><td><a href="../">Parent Directory</a></td></tr>
        <tr><td><a href="Pokemon - Red Version (USA).zip">Pokemon - Red Version (USA).zip</a></td><td>512 KB</td><td>2025-01-01</td></tr>
        <tr><td><a href="Pokemon - Blue Version (USA).zip">Pokemon - Blue Version (USA).zip</a></td><td>512 KB</td><td>2025-01-01</td></tr>
        <tr><td><a href="Super Mario Land (World).zip">Super Mario Land (World).zip</a></td><td>256 KB</td><td>2025-01-01</td></tr>
        <tr><td><a href="Tetris (Japan).zip">Tetris (Japan).zip</a></td><td>128 KB</td><td>2025-01-01</td></tr>
      </table>
    </body>
    </html>
  `;

  describe("listPlatforms", () => {
    it("should fetch and parse platform directories", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      const platforms = await provider.listPlatforms();

      expect(platforms).toHaveLength(3);
      expect(platforms[0]).toEqual({
        id: "gb",
        name: "Nintendo - Game Boy",
        brand: "Nintendo",
        collection: "No-Intro"
      });
      expect(platforms[1]).toEqual({
        id: "gba",
        name: "Nintendo - Game Boy Advance",
        brand: "Nintendo",
        collection: "No-Intro"
      });
      expect(platforms[2]).toEqual({
        id: "genesis",
        name: "Sega - Mega Drive - Genesis",
        brand: "Sega",
        collection: "No-Intro"
      });
    });

    it("should cache platform list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      await provider.listPlatforms();
      mockFetch.mockClear(); // Clear call count but keep stubbed
      await provider.listPlatforms();

      // Should not fetch again due to caching
      expect(mockFetch).toHaveBeenCalledTimes(0);
    });

    it("should throw error on fetch failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      });

      await expect(provider.listPlatforms()).rejects.toThrow(
        "Failed to fetch platforms from Myrient"
      );
    });
  });

  describe("listEntries", () => {
    it("should list game entries for a platform", async () => {
      // First call for platforms
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      // Second call for games
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockGameListingHtml
      });

      const response = await provider.listEntries({ platform: "gb" });

      expect(response.results).toHaveLength(4);
      expect(response.total).toBe(4);
      expect(response.results[0]).toMatchObject({
        id: "gb/Pokemon - Red Version (USA).zip",
        title: "Pokemon - Red Version",
        platform: "gb",
        regions: ["us"],
        filename: "Pokemon - Red Version (USA).zip",
        size: 512 * 1024
      });
    });

    it("should handle pagination", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockGameListingHtml
      });

      const response = await provider.listEntries({
        platform: "gb",
        page: 1,
        limit: 2
      });

      expect(response.results).toHaveLength(2);
      expect(response.total).toBe(4);
      expect(response.totalPages).toBe(2);
      expect(response.page).toBe(1);
    });

    it("should return empty results for unknown platform", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      const response = await provider.listEntries({ platform: "unknown" });

      expect(response.results).toHaveLength(0);
      expect(response.total).toBe(0);
    });
  });

  describe("search", () => {
    it("should search across platforms", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockGameListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockGameListingHtml
      });

      const response = await provider.search({ query: "pokemon" });

      expect(response.results.length).toBeGreaterThan(0);
      expect(
        response.results.every((r) => r.title.toLowerCase().includes("pokemon"))
      ).toBe(true);
    });

    it("should filter by platform", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockGameListingHtml
      });

      const response = await provider.search({
        query: "pokemon",
        platforms: ["gb"]
      });

      expect(response.results.every((r) => r.platform === "gb")).toBe(true);
    });

    it("should filter by region", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockGameListingHtml
      });

      const response = await provider.search({
        query: "",
        regions: ["jp"]
      });

      expect(response.results.every((r) => r.regions.includes("jp"))).toBe(true);
    });
  });

  describe("getEntry", () => {
    it("should get a specific entry by ID", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockGameListingHtml
      });

      const entry = await provider.getEntry("gb/Pokemon - Red Version (USA).zip");

      expect(entry).toMatchObject({
        id: "gb/Pokemon - Red Version (USA).zip",
        title: "Pokemon - Red Version",
        platform: "gb",
        regions: ["us"]
      });
    });

    it("should return null for non-existent entry", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockGameListingHtml
      });

      const entry = await provider.getEntry("gb/NonExistent.zip");

      expect(entry).toBeNull();
    });

    it("should return null for invalid ID format", async () => {
      const entry = await provider.getEntry("invalid-id");

      expect(entry).toBeNull();
    });
  });

  describe("Region extraction", () => {
    it("should extract USA region", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <html><body>
            <a href="Game (USA).zip">Game (USA).zip</a>
          </body></html>
        `
      });

      const response = await provider.listEntries({ platform: "gb" });
      expect(response.results[0].regions).toContain("us");
    });

    it("should extract Japan region", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <html><body>
            <a href="Game (Japan).zip">Game (Japan).zip</a>
          </body></html>
        `
      });

      const response = await provider.listEntries({ platform: "gb" });
      expect(response.results[0].regions).toContain("jp");
    });

    it("should default to USA region if none specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <html><body>
            <a href="Game.zip">Game.zip</a>
          </body></html>
        `
      });

      const response = await provider.listEntries({ platform: "gb" });
      expect(response.results[0].regions).toContain("us");
    });
  });

  describe("Title extraction", () => {
    it("should extract clean title without region markers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <html><body>
            <a href="Super Mario World (USA) (Rev 1).zip">Super Mario World (USA) (Rev 1).zip</a>
          </body></html>
        `
      });

      const response = await provider.listEntries({ platform: "gb" });
      expect(response.results[0].title).toBe("Super Mario World");
    });

    it("should handle titles with hyphens", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockPlatformListingHtml
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `
          <html><body>
            <a href="Pokemon - Red Version (USA).zip">Pokemon - Red Version (USA).zip</a>
          </body></html>
        `
      });

      const response = await provider.listEntries({ platform: "gb" });
      expect(response.results[0].title).toBe("Pokemon - Red Version");
    });
  });
});
