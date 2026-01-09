import { Router } from "express";
import { metadataService } from "../providers";
import type {
  ProviderSearchRequest,
  ProviderListRequest
} from "@crocdesk/shared";

const router = Router();

/**
 * List available platforms from metadata provider
 * GET /providers/platforms
 */
router.get("/platforms", async (_req, res) => {
  try {
    const platforms = await metadataService.listPlatforms();
    res.json({
      info: { message: "Platforms retrieved successfully" },
      data: { platforms }
    });
  } catch (error) {
    res.status(500).json({
      info: { error: error instanceof Error ? error.message : "Failed to fetch platforms" },
      data: {}
    });
  }
});

/**
 * List entries for a specific platform
 * POST /providers/entries
 * Body: { platform: string, collection?: string, page?: number, limit?: number }
 */
router.post("/entries", async (req, res) => {
  try {
    const request: ProviderListRequest = {
      platform: req.body.platform,
      collection: req.body.collection,
      page: req.body.page,
      limit: req.body.limit
    };

    if (!request.platform || !request.platform.trim()) {
      res.status(400).json({
        info: { error: "platform is required" },
        data: {}
      });
      return;
    }

    const response = await metadataService.listEntries(request);
    res.json({
      info: { message: "Entries retrieved successfully" },
      data: response
    });
  } catch (error) {
    res.status(500).json({
      info: { error: error instanceof Error ? error.message : "Failed to fetch entries" },
      data: {}
    });
  }
});

/**
 * Search for games across platforms
 * POST /providers/search
 * Body: { query?: string, platforms?: string[], regions?: string[], maxResults?: number, page?: number }
 */
router.post("/search", async (req, res) => {
  try {
    const request: ProviderSearchRequest = {
      query: req.body.query,
      platforms: req.body.platforms,
      regions: req.body.regions,
      maxResults: req.body.maxResults,
      page: req.body.page
    };

    const response = await metadataService.search(request);
    res.json({
      info: { message: "Search completed successfully" },
      data: response
    });
  } catch (error) {
    res.status(500).json({
      info: { error: error instanceof Error ? error.message : "Search failed" },
      data: {}
    });
  }
});

/**
 * Search across all providers and merge results
 * POST /providers/search-all
 * Body: { query?: string, platforms?: string[], regions?: string[], maxResults?: number, page?: number }
 */
router.post("/search-all", async (req, res) => {
  try {
    const request: ProviderSearchRequest = {
      query: req.body.query,
      platforms: req.body.platforms,
      regions: req.body.regions,
      maxResults: req.body.maxResults,
      page: req.body.page
    };

    const response = await metadataService.searchAll(request);
    res.json({
      info: { message: "Multi-provider search completed successfully" },
      data: response
    });
  } catch (error) {
    res.status(500).json({
      info: { error: error instanceof Error ? error.message : "Multi-provider search failed" },
      data: {}
    });
  }
});

/**
 * Get a specific entry by ID
 * POST /providers/entry
 * Body: { id: string }
 */
router.post("/entry", async (req, res) => {
  try {
    const id = req.body.id;
    if (!id || !id.trim()) {
      res.status(400).json({
        info: { error: "id is required" },
        data: {}
      });
      return;
    }

    const entry = await metadataService.getEntry(id);
    if (!entry) {
      res.status(404).json({
        info: { error: "Entry not found" },
        data: {}
      });
      return;
    }

    res.json({
      info: { message: "Entry retrieved successfully" },
      data: { entry }
    });
  } catch (error) {
    res.status(500).json({
      info: { error: error instanceof Error ? error.message : "Failed to fetch entry" },
      data: {}
    });
  }
});

export default router;
