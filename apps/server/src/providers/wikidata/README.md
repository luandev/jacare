# Wikidata Metadata Provider

A free, open metadata provider for video games using Wikidata's SPARQL endpoint.

## Features

- ✅ **No API Key Required** - Free and open access to Wikidata
- ✅ **Rich Metadata** - Title, platforms, genres, publishers, series, release date
- ✅ **Intelligent Matching** - Name normalization and ranking with platform boost
- ✅ **Aggressive Caching** - 21-day TTL for search and game results
- ✅ **Rate Limiting** - Configurable rate limit (default: 1 req/sec)
- ✅ **Offline Support** - Works from cache when network unavailable

## Architecture

```
WikidataProvider
├── client.ts       - HTTP client with rate limiting
├── queryBuilder.ts - SPARQL query templates
├── mapper.ts       - SPARQL → GameMetadata transformation
├── normalizer.ts   - Name normalization and result ranking
└── provider.ts     - MetadataProvider implementation
```

## Usage

### Basic Search

```typescript
import { WikidataProvider } from './providers/wikidata';

const provider = new WikidataProvider();

// Search for games
const games = await provider.searchGames("super mario");

console.log(games[0]);
// {
//   source: "wikidata",
//   sourceId: "Q12345",
//   name: "Super Mario Bros.",
//   releaseDate: "1985-09-13",
//   platforms: ["Nintendo Entertainment System"],
//   genres: ["platform game"],
//   publishers: ["Nintendo"]
// }
```

### Search with Platform Filter

```typescript
// Boost results matching the specified platform
const games = await provider.searchGames("mario", {
  platform: "nes",
  limit: 10
});
```

### Get Game by QID

```typescript
const game = await provider.getGameById("Q12345");

if (game) {
  console.log(game.name); // "Super Mario Bros."
}
```

### Health Check

```typescript
const health = await provider.healthCheck();

if (health.healthy) {
  console.log(`Wikidata is available (${health.responseTime}ms)`);
}
```

### Custom Client Options

```typescript
import { WikidataProvider, WikidataClient } from './providers/wikidata';

const client = new WikidataClient({
  rateLimitMs: 500,  // Faster rate limit
  userAgent: "MyApp/1.0"
});

const provider = new WikidataProvider(client);
```

## Caching

The provider uses two cache tables in SQLite:

- `wikidata_cache_search` - Caches search results by normalized query hash
- `wikidata_cache_game` - Caches individual game metadata by QID

Cache TTL is 21 days by default. Cache is checked first before making HTTP requests.

## Name Normalization

The normalizer strips common ROM naming conventions for better matching:

- Region tags: `(USA)`, `[Europe]`, `(Japan)`
- Revision tags: `(Rev 1)`, `[Rev A]`
- Disc numbers: `(Disc 1)`, `(Disc 2)`
- Extra whitespace and punctuation

## Result Ranking

Results are ranked by:

1. **Match Quality** - EXACT > PREFIX > CONTAINS > NO_MATCH
2. **Platform Boost** - Games matching the platform filter rank 0.5 higher
3. **Alphabetical** - Tiebreaker for equal ranks

## Rate Limiting

The client enforces rate limiting to be respectful of Wikidata's resources:

- Default: 1 request per second
- Configurable via `WikidataClient` options
- Queued requests wait for rate limit

## SPARQL Queries

### Search Query

Searches for video games matching the normalized query string:

```sparql
SELECT DISTINCT ?game ?gameLabel ?releaseDate 
  (GROUP_CONCAT(DISTINCT ?platformLabel; separator="|") AS ?platforms)
  (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres)
  (GROUP_CONCAT(DISTINCT ?publisherLabel; separator="|") AS ?publishers)
  ?seriesLabel
WHERE {
  ?game wdt:P31/wdt:P279* wd:Q7889 .  # instance of video game
  FILTER(CONTAINS(LCASE(?gameLabel), "query"))
  # ... optional metadata fields
}
GROUP BY ?game ?gameLabel ?releaseDate ?seriesLabel
LIMIT 25
```

### Get by QID Query

Fetches full metadata for a specific game by Wikidata QID:

```sparql
SELECT DISTINCT ?game ?gameLabel ?releaseDate ...
WHERE {
  BIND(wd:Q12345 AS ?game)
  ?game wdt:P31/wdt:P279* wd:Q7889 .  # validate it's a video game
  # ... optional metadata fields
}
```

## Testing

The provider has comprehensive test coverage:

- **queryBuilder.test.ts** - 12 tests for SPARQL query generation
- **mapper.test.ts** - 14 tests for SPARQL → GameMetadata mapping
- **normalizer.test.ts** - 22 tests for normalization and ranking
- **client.test.ts** - 9 tests for HTTP client and rate limiting
- **provider.test.ts** - 9 tests for provider integration

Run tests:

```bash
npm run test:unit -- wikidata
```

## Data Model

### GameMetadata

```typescript
type GameMetadata = {
  source: "wikidata";
  sourceId: string;        // QID (e.g., "Q12345")
  name: string;            // Game title
  releaseDate?: string;    // ISO 8601 date
  platforms?: string[];    // Platform names
  genres?: string[];       // Genre names
  publishers?: string[];   // Publisher names
  series?: string;         // Game series name
  raw?: unknown;           // Original WikidataGameResult
};
```

### WikidataGameResult

```typescript
type WikidataGameResult = {
  qid: string;
  label: string;
  releaseDate?: string;
  platforms?: string[];
  genres?: string[];
  publishers?: string[];
  series?: string;
};
```

## Known Limitations

- **Wikidata Coverage** - Not all games are in Wikidata
- **English Only** - Only English labels are fetched
- **Platform Names** - May differ from ROM naming conventions
- **Rate Limits** - Respect Wikidata's rate limits

## Future Enhancements

- [ ] Multi-language support
- [ ] Platform name mapping/aliases
- [ ] Additional metadata fields (developers, modes, ratings)
- [ ] Fallback to other providers when not found

## License

This provider is part of Jacare and follows the same license.
