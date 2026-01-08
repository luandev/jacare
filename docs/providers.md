# Metadata Provider System

## Overview

The Jacare metadata provider system enables the application to fetch game metadata from multiple sources with automatic fallback support. This addresses reliability concerns when a single data source becomes unavailable.

## Architecture

### Provider Interface

All metadata providers implement the `IMetadataProvider` interface:

```typescript
interface IMetadataProvider {
  listPlatforms(): Promise<ProviderPlatform[]>;
  listEntries(request: ProviderListRequest): Promise<ProviderSearchResponse>;
  search(request: ProviderSearchRequest): Promise<ProviderSearchResponse>;
  getEntry(id: string): Promise<ProviderEntry | null>;
}
```

### Available Providers

#### 1. Myrient Provider (`myrient`)

**Purpose:** Primary metadata source for ROM discovery

**Data Source:** https://myrient.erista.me/files/No-Intro/

**Features:**
- Parses HTML directory listings from No-Intro collection
- Supports 20+ gaming platforms (Nintendo, Sega, Sony, Atari)
- Extracts metadata from standardized filenames
- Region detection (USA, Europe, Japan, World, etc.)
- 1-hour platform list caching
- Discovery-only (no download functionality)

**Platform Mappings:**
- Game Boy, GBA, GBC
- NES, SNES, N64, GameCube, Wii
- Nintendo DS, 3DS
- Sega Master System, Genesis, Game Gear, Saturn, Dreamcast
- PlayStation 1, PlayStation 2, PSP
- Atari 2600, 7800, Lynx

**Limitations:**
- Requires stable network connectivity to Myrient
- HTML parsing may break if Myrient changes page structure
- No boxart or screenshot metadata
- Filename-based region detection (not always accurate)

#### 2. Crocdb Provider (`crocdb`)

**Purpose:** Fallback metadata source with richer metadata

**Data Source:** https://api.crocdb.net

**Features:**
- Official API with structured responses
- Boxart and screenshot URLs
- Download links and file sizes
- ROM ID matching
- Cached search and entry results

**Limitations:**
- Service availability (currently offline)
- Dependent on external service maintenance

### MetadataService

The `MetadataService` class orchestrates multiple providers with fallback logic:

```typescript
const metadataService = new MetadataService(
  "myrient",  // Primary provider
  ["crocdb"]   // Fallback providers
);
```

**Fallback Behavior:**
1. Try primary provider (Myrient)
2. On failure, try each fallback provider in order
3. Return first successful result
4. Throw error if all providers fail

**Multi-Provider Search:**
```typescript
const results = await metadataService.searchAll({
  query: "mario",
  platforms: ["nes", "snes"]
});
```

This queries all providers in parallel and merges results, removing duplicates.

## API Endpoints

### List Platforms
```
GET /providers/platforms
```

**Response:**
```json
{
  "info": { "message": "Platforms retrieved successfully" },
  "data": {
    "platforms": [
      {
        "id": "nes",
        "name": "Nintendo - Nintendo Entertainment System",
        "brand": "Nintendo",
        "collection": "No-Intro"
      }
    ]
  }
}
```

### List Entries for Platform
```
POST /providers/entries
Content-Type: application/json

{
  "platform": "nes",
  "page": 1,
  "limit": 60
}
```

**Response:**
```json
{
  "info": { "message": "Entries retrieved successfully" },
  "data": {
    "results": [
      {
        "id": "nes/Super Mario Bros (USA).zip",
        "title": "Super Mario Bros",
        "platform": "nes",
        "regions": ["us"],
        "filename": "Super Mario Bros (USA).zip",
        "size": 40960,
        "url": "https://myrient.erista.me/files/No-Intro/Nintendo.../...",
        "metadata": {
          "collection": "No-Intro",
          "platformName": "Nintendo - Nintendo Entertainment System"
        }
      }
    ],
    "total": 856,
    "page": 1,
    "totalPages": 15
  }
}
```

### Search
```
POST /providers/search
Content-Type: application/json

{
  "query": "zelda",
  "platforms": ["nes", "snes"],
  "regions": ["us"],
  "maxResults": 20,
  "page": 1
}
```

### Search All Providers
```
POST /providers/search-all
Content-Type: application/json

{
  "query": "metroid",
  "maxResults": 30
}
```

Searches all configured providers in parallel and merges results.

### Get Single Entry
```
POST /providers/entry
Content-Type: application/json

{
  "id": "nes/Metroid (USA).zip"
}
```

## Adding a New Provider

### 1. Create Provider Class

```typescript
// apps/server/src/providers/my-provider.ts
import type { IMetadataProvider } from "@crocdesk/shared";

export class MyProvider implements IMetadataProvider {
  async listPlatforms(): Promise<ProviderPlatform[]> {
    // Fetch and return platforms
  }

  async listEntries(request: ProviderListRequest): Promise<ProviderSearchResponse> {
    // Fetch entries for platform
  }

  async search(request: ProviderSearchRequest): Promise<ProviderSearchResponse> {
    // Search across platforms
  }

  async getEntry(id: string): Promise<ProviderEntry | null> {
    // Get single entry by ID
  }
}
```

### 2. Register Provider

```typescript
// apps/server/src/providers/index.ts
import { MyProvider } from "./my-provider";

export function getProvider(provider: SourceProvider): IMetadataProvider {
  switch (provider) {
    case "crocdb":
      return new CrocdbProvider();
    case "myrient":
      return new MyrientProvider();
    case "my-provider":
      return new MyProvider();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

### 3. Update Types

```typescript
// packages/shared/src/types.ts
export type SourceProvider = "crocdb" | "myrient" | "my-provider";
```

### 4. Add Tests

```typescript
// apps/server/src/providers/__tests__/my-provider.spec.ts
describe("MyProvider", () => {
  it("should list platforms", async () => {
    const provider = new MyProvider();
    const platforms = await provider.listPlatforms();
    expect(platforms.length).toBeGreaterThan(0);
  });
  // ... more tests
});
```

## Configuration

The default provider configuration is:

```typescript
export const metadataService = new MetadataService(
  "myrient",   // Primary
  ["crocdb"]   // Fallbacks
);
```

To change the provider order or add new providers, modify `apps/server/src/providers/index.ts`.

## Best Practices

### 1. Implement Caching

Providers should cache frequently accessed data (like platform lists) to reduce network requests:

```typescript
private platformCache: ProviderPlatform[] | null = null;
private platformCacheTime: number = 0;
private readonly CACHE_TTL = 3600000; // 1 hour

async listPlatforms(): Promise<ProviderPlatform[]> {
  if (this.platformCache && Date.now() - this.platformCacheTime < this.CACHE_TTL) {
    return this.platformCache;
  }
  // Fetch and cache...
}
```

### 2. Handle Errors Gracefully

Always wrap network requests in try-catch blocks and throw descriptive errors:

```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return await response.json();
} catch (error) {
  logger.error(`Failed to fetch from provider`, error);
  throw new Error("Provider request failed");
}
```

### 3. Use Consistent Entry IDs

Entry IDs should be unique and allow fetching the entry later:

```typescript
// Good: platform/filename format
id: "nes/Super Mario Bros (USA).zip"

// Bad: Random or non-deterministic IDs
id: crypto.randomUUID()
```

### 4. Normalize Metadata

Convert provider-specific formats to the common `ProviderEntry` format:

```typescript
return {
  id: `${platform}/${filename}`,
  title: extractCleanTitle(filename),
  platform: normalizedPlatformId,
  regions: extractRegions(filename),
  // ... other fields
};
```

### 5. Log Important Events

Use structured logging for debugging and monitoring:

```typescript
logger.info(`Provider: Listed ${platforms.length} platforms`);
logger.warn(`Provider: Platform not found`, { platform: request.platform });
logger.error(`Provider: Failed to fetch data`, error);
```

## Troubleshooting

### Provider Returns Empty Results

**Symptoms:** API returns `results: []` with `total: 0`

**Possible Causes:**
1. Platform ID mismatch (e.g., "nes" vs "Nintendo - NES")
2. Network connectivity issues
3. Provider HTML/API structure changed

**Solution:**
- Check platform ID mappings in provider code
- Test provider connectivity with curl/fetch
- Review provider logs for error details

### All Providers Fail

**Symptoms:** API returns 500 error: "All providers failed"

**Possible Causes:**
1. Network outage
2. All data sources offline
3. Firewall blocking external requests

**Solution:**
- Check network connectivity
- Verify data source availability
- Review fallback configuration
- Check logs for specific error messages

### Stale Cache Data

**Symptoms:** Old data returned after provider updates

**Solution:**
- Restart server to clear in-memory caches
- Reduce `CACHE_TTL` value for development
- Consider implementing cache invalidation API

## Testing

### Unit Tests

Run provider-specific tests:

```bash
npm run test:unit -- apps/server/src/providers/__tests__/myrient.spec.ts
```

### Integration Testing

Test with real provider (requires network access):

```bash
# Start dev server
npm run dev:server

# Test endpoints
curl http://localhost:3333/providers/platforms
curl -X POST http://localhost:3333/providers/search \
  -H "Content-Type: application/json" \
  -d '{"query":"mario","platforms":["nes"]}'
```

### Mock Provider for Testing

Create a mock provider for integration tests:

```typescript
export class MockProvider implements IMetadataProvider {
  async listPlatforms() {
    return [
      { id: "test", name: "Test Platform", brand: "Test" }
    ];
  }
  // ... implement other methods with test data
}
```

## Future Enhancements

### Planned Features

1. **Provider Selection in Settings**
   - Allow users to choose primary provider
   - Enable/disable specific providers
   - Reorder fallback priority

2. **Advanced Caching**
   - SQLite cache for entry metadata
   - Cache invalidation API
   - Configurable TTL per provider

3. **Provider Health Monitoring**
   - Track provider uptime/success rates
   - Automatically skip unhealthy providers
   - Admin dashboard for provider status

4. **Additional Providers**
   - Vimm's Vault (with scraping)
   - IGDB (video game database)
   - Local file-based provider (offline mode)

5. **Smart Fallback**
   - Per-platform provider preferences
   - Automatic provider selection based on platform
   - Load balancing across providers

## References

- [Myrient Homepage](https://myrient.erista.me/)
- [Myrient FAQ](https://myrient.erista.me/faq/)
- [No-Intro Project](https://www.no-intro.org/)
- [Redump Project](http://redump.org/)
- [Crocdb API Documentation](https://api.crocdb.net/)
