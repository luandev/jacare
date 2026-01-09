# Provider System Examples

This document provides examples of using the metadata provider system.

## Basic Usage

### Using MetadataService

```typescript
import { metadataService } from "./providers";

// List all available platforms
const platforms = await metadataService.listPlatforms();
console.log(`Found ${platforms.length} platforms`);

// Search for games
const results = await metadataService.search({
  query: "zelda",
  platforms: ["nes", "snes"],
  regions: ["us"]
});

console.log(`Found ${results.total} games matching "zelda"`);
results.results.forEach(game => {
  console.log(`- ${game.title} (${game.platform})`);
});
```

### Using Specific Provider

```typescript
import { MyrientProvider } from "./providers/myrient";

const myrient = new MyrientProvider();

// List platforms from Myrient
const platforms = await myrient.listPlatforms();

// List all NES games
const nesGames = await myrient.listEntries({
  platform: "nes",
  limit: 100
});

console.log(`Myrient has ${nesGames.total} NES games`);
```

## API Examples

### List Platforms

```bash
curl http://localhost:3333/providers/platforms
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
      },
      {
        "id": "snes",
        "name": "Nintendo - Super Nintendo Entertainment System",
        "brand": "Nintendo",
        "collection": "No-Intro"
      }
    ]
  }
}
```

### List Games for Platform

```bash
curl -X POST http://localhost:3333/providers/entries \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "nes",
    "page": 1,
    "limit": 5
  }'
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
        "url": "https://myrient.erista.me/files/No-Intro/Nintendo.../Super Mario Bros (USA).zip",
        "metadata": {
          "collection": "No-Intro",
          "platformName": "Nintendo - Nintendo Entertainment System"
        }
      },
      {
        "id": "nes/The Legend of Zelda (USA).zip",
        "title": "The Legend of Zelda",
        "platform": "nes",
        "regions": ["us"],
        "filename": "The Legend of Zelda (USA).zip",
        "size": 131072
      }
    ],
    "total": 856,
    "page": 1,
    "totalPages": 172
  }
}
```

### Search Games

```bash
curl -X POST http://localhost:3333/providers/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mario",
    "platforms": ["nes", "snes"],
    "regions": ["us"],
    "maxResults": 10
  }'
```

**Response:**
```json
{
  "info": { "message": "Search completed successfully" },
  "data": {
    "results": [
      {
        "id": "nes/Super Mario Bros (USA).zip",
        "title": "Super Mario Bros",
        "platform": "nes",
        "regions": ["us"]
      },
      {
        "id": "nes/Super Mario Bros 2 (USA).zip",
        "title": "Super Mario Bros 2",
        "platform": "nes",
        "regions": ["us"]
      },
      {
        "id": "nes/Super Mario Bros 3 (USA).zip",
        "title": "Super Mario Bros 3",
        "platform": "nes",
        "regions": ["us"]
      },
      {
        "id": "snes/Super Mario World (USA).zip",
        "title": "Super Mario World",
        "platform": "snes",
        "regions": ["us"]
      }
    ],
    "total": 45,
    "page": 1,
    "totalPages": 5
  }
}
```

### Search All Providers

```bash
curl -X POST http://localhost:3333/providers/search-all \
  -H "Content-Type: application/json" \
  -d '{
    "query": "metroid",
    "maxResults": 20
  }'
```

Searches Myrient and Crocdb in parallel, merging results and removing duplicates.

### Get Single Entry

```bash
curl -X POST http://localhost:3333/providers/entry \
  -H "Content-Type: application/json" \
  -d '{
    "id": "nes/Metroid (USA).zip"
  }'
```

**Response:**
```json
{
  "info": { "message": "Entry retrieved successfully" },
  "data": {
    "entry": {
      "id": "nes/Metroid (USA).zip",
      "title": "Metroid",
      "platform": "nes",
      "regions": ["us"],
      "filename": "Metroid (USA).zip",
      "size": 131072,
      "url": "https://myrient.erista.me/files/No-Intro/Nintendo.../Metroid (USA).zip",
      "metadata": {
        "collection": "No-Intro",
        "platformName": "Nintendo - Nintendo Entertainment System"
      }
    }
  }
}
```

## Web Client Examples

### Using in React with TanStack Query

```typescript
import { useQuery } from "@tanstack/react-query";
import { apiPost } from "../lib/api";

function GameBrowser() {
  const searchQuery = useQuery({
    queryKey: ["provider-search", "mario", "nes"],
    queryFn: () => apiPost("/providers/search", {
      query: "mario",
      platforms: ["nes"],
      maxResults: 20
    })
  });

  if (searchQuery.isLoading) return <div>Loading...</div>;
  if (searchQuery.isError) return <div>Error loading games</div>;

  return (
    <div>
      <h2>Found {searchQuery.data.data.total} games</h2>
      {searchQuery.data.data.results.map(game => (
        <div key={game.id}>
          <h3>{game.title}</h3>
          <p>Platform: {game.platform}</p>
          <p>Regions: {game.regions.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}
```

### Platform Selector

```typescript
function PlatformSelector() {
  const platformsQuery = useQuery({
    queryKey: ["provider-platforms"],
    queryFn: () => apiGet("/providers/platforms")
  });

  if (platformsQuery.isLoading) return <select disabled />;

  return (
    <select>
      {platformsQuery.data.data.platforms.map(platform => (
        <option key={platform.id} value={platform.id}>
          {platform.name}
        </option>
      ))}
    </select>
  );
}
```

## Advanced Usage

### Custom Provider Service

```typescript
import { MetadataService } from "./providers";

// Create service with custom provider order
const customService = new MetadataService(
  "crocdb",        // Use Crocdb as primary
  ["myrient"]       // Myrient as fallback
);

// Use custom service
const results = await customService.search({ query: "zelda" });
```

### Error Handling

```typescript
try {
  const results = await metadataService.search({ query: "zelda" });
  console.log(`Found ${results.total} games`);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("All providers failed")) {
      console.error("No metadata sources available");
      // Show cached results or offline message
    } else {
      console.error("Search failed:", error.message);
    }
  }
}
```

### Provider-Specific Queries

```typescript
import { getProvider } from "./providers";

// Query specific provider without fallback
const myrient = getProvider("myrient");
try {
  const platforms = await myrient.listPlatforms();
  console.log("Myrient platforms:", platforms);
} catch (error) {
  console.error("Myrient is unavailable");
}

const crocdb = getProvider("crocdb");
try {
  const platforms = await crocdb.listPlatforms();
  console.log("Crocdb platforms:", platforms);
} catch (error) {
  console.error("Crocdb is unavailable");
}
```

### Pagination

```typescript
async function getAllGamesForPlatform(platform: string) {
  const allGames = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await metadataService.listEntries({
      platform,
      page,
      limit: 100
    });

    allGames.push(...response.results);
    totalPages = response.totalPages;
    page++;
  }

  return allGames;
}

// Usage
const allNESGames = await getAllGamesForPlatform("nes");
console.log(`Total NES games: ${allNESGames.length}`);
```

### Multi-Region Search

```typescript
// Search for games available in multiple regions
const results = await metadataService.search({
  query: "pokemon",
  platforms: ["gb", "gbc"],
  regions: ["us", "eu", "jp"]
});

// Group by region
const byRegion = results.results.reduce((acc, game) => {
  game.regions.forEach(region => {
    if (!acc[region]) acc[region] = [];
    acc[region].push(game);
  });
  return acc;
}, {});

console.log("US releases:", byRegion["us"]?.length);
console.log("EU releases:", byRegion["eu"]?.length);
console.log("JP releases:", byRegion["jp"]?.length);
```

## Testing Examples

### Mock Provider for Tests

```typescript
import { describe, it, expect } from "vitest";
import type { IMetadataProvider } from "@crocdesk/shared";

class MockProvider implements IMetadataProvider {
  async listPlatforms() {
    return [
      { id: "test", name: "Test Platform", brand: "Test" }
    ];
  }

  async listEntries({ platform }) {
    return {
      results: [
        {
          id: `${platform}/test-game.zip`,
          title: "Test Game",
          platform,
          regions: ["us"],
          filename: "test-game.zip"
        }
      ],
      total: 1,
      page: 1,
      totalPages: 1
    };
  }

  async search({ query }) {
    return {
      results: [],
      total: 0,
      page: 1,
      totalPages: 0
    };
  }

  async getEntry(id) {
    return {
      id,
      title: "Test Game",
      platform: "test",
      regions: ["us"]
    };
  }
}

describe("Provider Tests", () => {
  it("should list platforms", async () => {
    const provider = new MockProvider();
    const platforms = await provider.listPlatforms();
    expect(platforms).toHaveLength(1);
    expect(platforms[0].id).toBe("test");
  });
});
```

### Integration Test

```typescript
import { describe, it, expect } from "vitest";
import { metadataService } from "./providers";

describe("MetadataService Integration", () => {
  it("should search across providers", async () => {
    // This test requires network access
    const results = await metadataService.search({
      query: "mario",
      platforms: ["nes"],
      maxResults: 5
    });

    expect(results.results.length).toBeGreaterThan(0);
    expect(results.results[0]).toHaveProperty("title");
    expect(results.results[0]).toHaveProperty("platform");
  });
});
```

## Performance Tips

### Cache Platform Lists

```typescript
// Cache platforms in component state or global store
const [platforms, setPlatforms] = useState([]);

useEffect(() => {
  if (platforms.length === 0) {
    metadataService.listPlatforms()
      .then(setPlatforms)
      .catch(console.error);
  }
}, [platforms]);
```

### Debounce Search Queries

```typescript
import { useMemo } from "react";
import debounce from "lodash/debounce";

function SearchBox() {
  const debouncedSearch = useMemo(
    () => debounce(async (query) => {
      const results = await metadataService.search({ query });
      setResults(results);
    }, 300),
    []
  );

  return (
    <input
      onChange={(e) => debouncedSearch(e.target.value)}
      placeholder="Search games..."
    />
  );
}
```

### Batch Requests

```typescript
// Instead of multiple sequential requests
const games = [];
for (const platform of ["nes", "snes", "gb"]) {
  const result = await metadataService.listEntries({ platform });
  games.push(...result.results);
}

// Use Promise.all for parallel requests
const results = await Promise.all([
  metadataService.listEntries({ platform: "nes" }),
  metadataService.listEntries({ platform: "snes" }),
  metadataService.listEntries({ platform: "gb" })
]);

const games = results.flatMap(r => r.results);
```

## Troubleshooting

### Empty Results

```typescript
const results = await metadataService.listEntries({ platform: "nes" });

if (results.total === 0) {
  console.error("No games found for platform");
  // Check if platform ID is correct
  const platforms = await metadataService.listPlatforms();
  console.log("Available platforms:", platforms.map(p => p.id));
}
```

### Network Errors

```typescript
try {
  const results = await metadataService.search({ query: "zelda" });
} catch (error) {
  if (error.message.includes("fetch failed")) {
    console.error("Network error - check connectivity");
  } else if (error.message.includes("All providers failed")) {
    console.error("No metadata sources available");
  }
}
```

### Check Provider Health

```typescript
async function checkProviderHealth() {
  const providers = ["myrient", "crocdb"];
  const health = {};

  for (const providerName of providers) {
    try {
      const provider = getProvider(providerName);
      await provider.listPlatforms();
      health[providerName] = "healthy";
    } catch (error) {
      health[providerName] = "unhealthy";
    }
  }

  return health;
}

// Usage
const health = await checkProviderHealth();
console.log("Provider health:", health);
// { myrient: "healthy", crocdb: "unhealthy" }
```
