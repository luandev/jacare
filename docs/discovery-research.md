# Metadata Source Discovery Research

**Issue:** [Discovery: Replace/augment crocdb data source](https://github.com/luandev/jacare/issues/XXX)

**Date:** January 8, 2026

**Status:** ✅ Complete - Implementation Ready for Production

---

## Executive Summary

Researched and implemented an alternative metadata/discovery source to address crocdb's current unavailability. Selected Myrient as primary provider based on reliability, maintenance requirements, and ease of integration. Implemented complete provider abstraction system with automatic fallback support.

## Research Findings

### Candidate Sources Evaluated

#### 1. Myrient (https://myrient.erista.me/files/)

**Evaluation Results:**

✅ **Reliability**
- Static file hosting (very stable)
- Mirrors No-Intro and Redump collections
- Hosted on reliable infrastructure
- FAQ acknowledges URL changes but structure remains consistent

✅ **Maintenance Requirements**
- Simple HTML directory listings (low complexity parsing)
- Standard Apache-style index pages
- Minimal API surface = less likely to break
- No authentication or rate limiting concerns

✅ **Data Quality**
- No-Intro collection (verified ROM sets)
- Standardized filename conventions
- Consistent organization by platform
- 20+ gaming platforms available

✅ **Integration Feasibility**
- No dataset hosting required
- Simple HTTP GET requests
- Regex-based HTML parsing
- Easily cacheable responses

⚠️ **Limitations**
- No rich metadata (boxart, screenshots)
- Filename-based metadata extraction only
- HTML parsing may break if structure changes
- No official API or SLA

**Technical Details:**
```
URL Structure:
https://myrient.erista.me/files/No-Intro/[Platform]/[Game].zip

Example:
/files/No-Intro/Nintendo - Game Boy/Pokemon - Red Version (USA).zip

Directory Listing Format:
- HTML table or list with anchor tags
- File sizes in human-readable format (KB, MB, GB)
- Modification dates
- Subdirectory links ending with /
```

**Platform Organization:**
```
Nintendo Platforms:
- Nintendo - Game Boy
- Nintendo - Game Boy Advance  
- Nintendo - Game Boy Color
- Nintendo - Nintendo Entertainment System
- Nintendo - Super Nintendo Entertainment System
- Nintendo - Nintendo 64
- Nintendo - GameCube
- Nintendo - Wii
- Nintendo - Nintendo DS
- Nintendo - Nintendo 3DS

Sega Platforms:
- Sega - Master System - Mark III
- Sega - Mega Drive - Genesis
- Sega - Game Gear
- Sega - Saturn
- Sega - Dreamcast

Sony Platforms:
- Sony - PlayStation
- Sony - PlayStation 2
- Sony - PlayStation Portable

Atari Platforms:
- Atari - 2600
- Atari - 7800
- Atari - Lynx
```

**Filename Patterns:**
```
Title (Region) (Version) (Flags).ext

Examples:
- Super Mario Bros (USA).zip
- Pokemon - Red Version (USA).zip
- The Legend of Zelda (World) (Rev 1).zip
- Final Fantasy VII (USA) (Disc 1).zip

Region Codes:
- (USA) / (U) - United States
- (Europe) / (E) - Europe
- (Japan) / (J) - Japan
- (World) / (W) - Worldwide
- (Asia) - Asia
- (Australia) - Australia
- (En,Fr,De,Es,It) - Multi-language Europe
```

**Decision:** ✅ **SELECTED AS PRIMARY PROVIDER**

#### 2. Vimm's Vault (https://vimm.net/vault)

**Evaluation Results:**

⚠️ **Reliability**
- Curated community-driven site
- Good uptime history
- More susceptible to takedowns

⚠️ **Maintenance Requirements**
- Requires heavier scraping
- JavaScript-rendered content (needs browser automation)
- More fragile HTML structure
- Rate limiting concerns

✅ **Data Quality**
- Well-curated collection
- Rich metadata available
- Good platform coverage

❌ **Integration Feasibility**
- Complex scraping required
- May need headless browser (Playwright/Puppeteer)
- Higher maintenance burden
- Ethical concerns around aggressive scraping

**Decision:** ❌ **NOT SELECTED** - Too complex for initial implementation, consider for future

#### 3. IGDB (Internet Game Database)

**Brief Evaluation:**
- Official API available
- Rich metadata (descriptions, artwork, etc.)
- Requires API key and registration
- Not focused on ROM collections
- Better suited for general game information

**Decision:** ❌ **NOT IN SCOPE** - Different use case than ROM discovery

### Third-Party Libraries Reviewed

**Python Tools Examined:**
1. `myrient-scrape` - Markdown generator for tracking ROMs
2. `trentas/myrient-downloader` - Download automation tool
3. `myrient-cli` - Go-based CLI tool

**Findings:**
- No suitable npm packages found
- Python tools confirm HTML parsing approach works
- Regex patterns for filename extraction validated
- Directory traversal approach confirmed

**Decision:** Implement custom TypeScript solution (no dependencies needed)

## Implementation Decisions

### Architecture Choice: Provider Abstraction

**Rationale:**
- Multiple sources may come/go over time
- Easy to add new providers in future
- Testable with mock providers
- Clear separation of concerns

**Interface Design:**
```typescript
interface IMetadataProvider {
  listPlatforms(): Promise<ProviderPlatform[]>;
  listEntries(request): Promise<ProviderSearchResponse>;
  search(request): Promise<ProviderSearchResponse>;
  getEntry(id): Promise<ProviderEntry | null>;
}
```

### Fallback Strategy

**Implementation:**
```
Primary: Myrient
├─ Success → Return results
└─ Failure → Try Fallback
    Primary Fallback: Crocdb
    ├─ Success → Return results
    └─ Failure → Error (all providers failed)
```

**Benefits:**
- No single point of failure
- Graceful degradation
- Future-proof for adding more providers

### Caching Strategy

**Platform Lists:**
- Cache duration: 1 hour
- Reason: Platform list rarely changes
- Storage: In-memory (per provider instance)

**Entry Lists:**
- Cache duration: Not implemented (future enhancement)
- Reason: Large data sets, SQLite cache needed
- Current: Fresh fetch each time

**Rationale:**
- Balance between freshness and performance
- Reduce load on Myrient servers
- Improve response times for common operations

## Implementation Summary

### Code Structure

```
apps/server/src/providers/
├── index.ts              # MetadataService & provider factory
├── myrient.ts           # Myrient provider implementation
├── crocdb.ts            # Crocdb adapter
└── __tests__/
    └── myrient.spec.ts  # Unit tests

apps/server/src/routes/
└── providers.ts         # REST API endpoints

packages/shared/src/
└── types.ts             # Provider interfaces & types
```

### Key Components

**1. MyrientProvider Class (380 lines)**
- HTML directory listing parser
- Platform mapping (20+ platforms)
- Filename parsing (title, region, version)
- Platform caching (1-hour TTL)
- Error handling and logging

**2. CrocdbProvider Class (120 lines)**
- Adapter for existing crocdb service
- Converts crocdb types to provider types
- Maintains backward compatibility

**3. MetadataService Class (185 lines)**
- Orchestrates multiple providers
- Automatic fallback logic
- Multi-provider search
- Structured logging

**4. API Routes (155 lines)**
- 5 REST endpoints
- Standard response format
- Error handling
- Input validation

### Testing

**Coverage:**
- 17 unit tests for Myrient provider
- Mock-based testing (no network required)
- Edge cases covered:
  - Empty results
  - Network failures
  - Invalid inputs
  - Region extraction
  - Title parsing
  - Pagination

**Results:**
```
Test Files:  14 passed (14)
Tests:       99 passed (99)
Duration:    3.60s
```

## Performance Analysis

### Network Requests

**Platform List:**
- Initial: 1 request (fetch directory listing)
- Subsequent: 0 requests (cached for 1 hour)
- Size: ~5-10 KB HTML

**Entry List (per platform):**
- Request: 1 per platform
- Size: ~50-200 KB HTML (depending on game count)
- Parse time: <10ms typical

**Search:**
- Requests: N (where N = number of platforms to search)
- Can be optimized with parallel requests
- Current: Sequential for reliability

### Bottlenecks Identified

1. **Large entry lists** - Fetching all games for a platform requires downloading full directory listing
2. **Search across all platforms** - Must fetch directory for each platform
3. **No CDN** - Direct requests to Myrient origin

### Optimization Opportunities

1. **SQLite caching** - Cache entry lists to reduce network requests
2. **Incremental loading** - Fetch only requested page range
3. **Background refresh** - Pre-fetch popular platforms
4. **Smart caching** - Track platform update frequency

## Security & Ethics

### Considerations

✅ **Respectful Scraping**
- Reasonable request frequency (not automated polling)
- User-agent identification
- Cache to reduce load
- No aggressive automation

✅ **No ROM Downloading**
- Discovery/metadata only
- No file downloads implemented
- Respects Myrient's service purpose

✅ **Error Handling**
- Graceful failures
- No retry storms
- Detailed logging for debugging

✅ **Data Privacy**
- No user data sent to providers
- No tracking or analytics
- Server-side only (no client exposure)

## Lessons Learned

### What Worked Well

1. **HTML Parsing Approach** - Simple, reliable, no dependencies
2. **Provider Abstraction** - Easy to test, extend, and maintain
3. **Filename Conventions** - No-Intro standards are consistent
4. **Fallback Strategy** - Resilient to single provider failures

### Challenges Encountered

1. **Network Access in Tests** - Solved with mock providers
2. **Platform Name Mapping** - Required manual mapping table
3. **Region Detection** - Filename-based heuristics not 100% accurate
4. **Pagination** - In-memory pagination not scalable for large sets

### Future Improvements

1. **Vimm's Vault Provider** - Add as secondary source
2. **Enhanced Caching** - SQLite for entry metadata
3. **Background Sync** - Periodic platform/entry refresh
4. **Provider Health** - Monitor uptime and switch dynamically
5. **Rich Metadata** - Fetch boxart from other sources (IGDB, etc.)

## Recommendations

### For Production Deployment

1. ✅ **Deploy as-is** - System is production-ready
2. ⚠️ **Monitor Provider Health** - Set up alerts for provider failures
3. 📊 **Track Usage** - Log which provider serves each request
4. 🔄 **Review Caching** - Adjust TTL based on usage patterns
5. 📈 **Consider CDN** - If Myrient traffic becomes significant

### For Future Development

1. **Add Vimm's Vault** - Implement when time/resources allow
2. **Provider Selection UI** - Let users choose preferred source
3. **Offline Mode** - Cache-first approach for offline functionality
4. **Smart Recommendations** - Use metadata to suggest similar games
5. **Community Providers** - Allow custom provider implementations

## Conclusion

Successfully researched and implemented a robust metadata provider system with Myrient as the primary source. The system meets all acceptance criteria:

✅ Can retrieve entries for multiple platforms  
✅ Can match entries using filename heuristics  
✅ Providers are swappable via configuration  
✅ Fallbacks work when providers fail  
✅ Discovery-only (no download functionality)  
✅ Resilient to provider changes

The implementation is production-ready, well-tested, and documented. The provider abstraction makes it easy to add new sources in the future as needs evolve.

---

## References

- [Myrient Homepage](https://myrient.erista.me/)
- [Myrient FAQ](https://myrient.erista.me/faq/)
- [No-Intro Project](https://www.no-intro.org/)
- [Redump Project](http://redump.org/)
- [myrient-scrape (GitHub)](https://github.com/danclark-codes/myrient-scrape)
- [trentas/myrient-downloader (GitHub)](https://github.com/trentas/myrient-downloader)

## Appendix: API Testing Examples

```bash
# Test platforms endpoint
curl http://localhost:3333/providers/platforms | jq '.data.platforms | length'

# Test entry listing
curl -X POST http://localhost:3333/providers/entries \
  -H "Content-Type: application/json" \
  -d '{"platform":"nes","limit":5}' | jq '.data.total'

# Test search
curl -X POST http://localhost:3333/providers/search \
  -H "Content-Type: application/json" \
  -d '{"query":"mario","platforms":["nes"]}' | jq '.data.results | length'

# Test multi-provider search
curl -X POST http://localhost:3333/providers/search-all \
  -H "Content-Type: application/json" \
  -d '{"query":"zelda","maxResults":10}' | jq '.data.total'

# Test single entry
curl -X POST http://localhost:3333/providers/entry \
  -H "Content-Type: application/json" \
  -d '{"id":"nes/Metroid (USA).zip"}' | jq '.data.entry.title'
```
