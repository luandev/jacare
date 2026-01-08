# ROM Recognition Improvements

## Overview

Jacare now includes advanced fuzzy matching capabilities to significantly improve ROM recognition rates. The system uses multiple search strategies and intelligent matching algorithms to identify ROMs even with abbreviated, misspelled, or non-standard filenames.

## Problem Solved

Previously, only 2 out of 5 well-known SNES ROMs were recognized despite having clear filenames. The system relied solely on exact or near-exact matches from the Crocdb API, resulting in many ROMs being placed in the "Not Found" folder.

## Solution

The enhanced ROM recognition system uses:

1. **Multi-Strategy Search**: Tries 5 different search strategies to maximize match rate
2. **Fuzzy Matching**: Uses Levenshtein distance and token-based matching to handle typos and variations
3. **Abbreviation Expansion**: Recognizes common ROM abbreviations (e.g., "SMW" → "Super Mario World")
4. **Intelligent Normalization**: Handles various filename formats (underscores, dots, CamelCase, etc.)
5. **Confidence Scoring**: Returns only high-quality matches above a configurable threshold

## Supported Abbreviations

The system automatically recognizes these common ROM abbreviations:

### Super Mario Series
- `SMW` → Super Mario World
- `SMB` → Super Mario Bros
- `SMB2` → Super Mario Bros 2
- `SMB3` → Super Mario Bros 3
- `SM64` → Super Mario 64

### Legend of Zelda Series
- `ALTTP`, `LTTP` → A Link to the Past
- `OOT` → Ocarina of Time
- `MM` → Majora's Mask
- `LOZ` → Legend of Zelda

### Final Fantasy Series
- `FF6`, `FFVI` → Final Fantasy VI
- `FF7`, `FFVII` → Final Fantasy VII
- `FF4`, `FFIV` → Final Fantasy IV

### Other Popular Games
- `CT` → Chrono Trigger
- `SM` → Super Metroid
- `SF2` → Street Fighter II
- `DKC` → Donkey Kong Country
- `MK` → Mortal Kombat

## Filename Format Support

The system handles various filename formats:

### Standard Formats
- `Super Mario World.sfc` ✓
- `Super Mario World (USA).sfc` ✓
- `Super Mario World (USA) (Rev 1).sfc` ✓

### Alternative Separators
- `super_mario_world.sfc` ✓ (underscores)
- `Super.Mario.World.sfc` ✓ (dots)
- `SuperMarioWorld.sfc` ✓ (CamelCase/no spaces)

### Abbreviated Names
- `SMW.sfc` ✓
- `smw.sfc` ✓ (case-insensitive)
- `SMW (USA).sfc` ✓

### With Typos
- `Super Maro World.sfc` ✓ (minor typos tolerated)
- `Supper Mario World.sfc` ✓ (fuzzy matching)

## Search Strategies

The system tries multiple strategies in order:

### Strategy 1: Original Name
Searches Crocdb with the filename as-is (after removing extension).

### Strategy 2: Normalized Name
Strips version tags, regions, and other metadata:
- `Super Mario World (USA) (Rev 1)` → `Super Mario World`

### Strategy 3: Abbreviation Expansion
Expands known abbreviations:
- `SMW` → tries "Super Mario World"
- `ALTTP` → tries "A Link to the Past", "Link to the Past"

### Strategy 4: Best Match Above Threshold
Returns the best match from previous strategies if score ≥ 0.6

### Strategy 5: Cross-Platform Fallback
Searches across all platforms (without platform filter) as a last resort.

## Match Scoring

Each potential match receives a score from 0.0 to 1.0:

- **1.0**: Perfect exact match
- **0.85+**: High confidence match (returned immediately)
- **0.6-0.84**: Moderate confidence match (returned after all strategies)
- **< 0.6**: Low confidence (not returned, file goes to "Not Found")

Scoring combines:
- **Levenshtein distance** (50%): Character-by-character similarity
- **Token similarity** (35%): Word-level matching
- **Substring matching** (15%): Partial text containment

## Configuration

### Confidence Threshold
Default: `0.6` (60% similarity required)

To adjust the threshold, modify `MIN_CONFIDENCE_SCORE` in `apps/server/src/services/scanner.ts`:

```typescript
const MIN_CONFIDENCE_SCORE = 0.6; // Adjust between 0.0 and 1.0
```

Lower values = more matches but potentially less accurate
Higher values = fewer matches but higher quality

### Logging
The enhanced matcher provides detailed debug logging:

```
[INFO] Trying strategy 1: original name
[INFO] High confidence match found with original name
[DEBUG] Trying strategy 2: normalized name
[INFO] Match found above confidence threshold
```

Enable debug logging to see detailed matching information:
```bash
export LOG_LEVEL=debug
```

## Performance

- **Search Time**: ~500ms-2s per ROM (with retries and API calls)
- **Memory Usage**: Minimal (caches API responses in SQLite)
- **API Calls**: 1-5 per ROM depending on match success

The system uses the existing Crocdb cache to minimize API calls and improve performance.

## Testing

The implementation includes comprehensive test coverage:

- **33 fuzzy matching tests**: Test core algorithms
- **12 enhanced scanner tests**: Integration scenarios
- **29 original scanner tests**: Backward compatibility

Run tests:
```bash
npm run test:unit -- apps/server/src/services/__tests__/fuzzy-matching.test.ts
npm run test:unit -- apps/server/src/services/__tests__/scanner-enhanced.test.ts
```

## Examples

### Before (2/5 recognized)
```
✗ SMW.sfc → Not Found
✗ ALTTP.sfc → Not Found
✓ Super Mario World (USA).sfc → Super Mario World
✗ CT.sfc → Not Found
✓ Chrono Trigger.sfc → Chrono Trigger
```

### After (5/5 recognized)
```
✓ SMW.sfc → Super Mario World
✓ ALTTP.sfc → The Legend of Zelda: A Link to the Past
✓ Super Mario World (USA).sfc → Super Mario World
✓ CT.sfc → Chrono Trigger
✓ Chrono Trigger.sfc → Chrono Trigger
```

## Future Improvements

Potential enhancements for future versions:

1. **User-defined abbreviations**: Allow users to add custom abbreviations
2. **Learning system**: Remember successful matches for similar patterns
3. **Multi-provider support**: Query additional metadata sources beyond Crocdb
4. **Parallel searching**: Execute multiple strategies concurrently
5. **Manual matching UI**: Allow users to confirm/correct matches

## Troubleshooting

### ROM still not recognized

1. Check the debug logs to see which strategies were tried
2. Try renaming the ROM to use a more standard format
3. Check if the ROM exists in Crocdb: https://crocdb.net
4. Lower the confidence threshold if you're getting too many "Not Found"

### Too many false positives

1. Increase the confidence threshold (e.g., to 0.7 or 0.8)
2. Check logs to see match scores for incorrectly matched ROMs
3. Report issues with specific ROM names for improvement

### Performance concerns

1. The system caches Crocdb responses to minimize API calls
2. Consider reducing `max_results` from 10 to 5 in search strategies
3. Check database cache TTL settings

## Technical Details

### Core Files

- `apps/server/src/services/fuzzy-matcher.ts`: Core matching algorithms
- `apps/server/src/services/scanner.ts`: Enhanced findCrocdbMatch function
- `apps/server/src/services/__tests__/fuzzy-matching.test.ts`: Algorithm tests
- `apps/server/src/services/__tests__/scanner-enhanced.test.ts`: Integration tests

### Key Functions

- `calculateLevenshteinDistance()`: Character edit distance
- `calculateSimilarity()`: Normalized similarity score (0-1)
- `expandAbbreviations()`: ROM abbreviation expansion
- `findBestMatches()`: Fuzzy match ranking
- `findCrocdbMatch()`: Multi-strategy search coordinator

## Contributing

To add new abbreviations or improve matching:

1. Add abbreviation to `ABBREVIATIONS` in `fuzzy-matcher.ts`
2. Add test cases to `fuzzy-matching.test.ts`
3. Run tests: `npm run test:unit`
4. Submit a pull request with examples

## References

- [Levenshtein Distance](https://en.wikipedia.org/wiki/Levenshtein_distance)
- [Crocdb API](https://api.crocdb.net)
- [ROM Naming Conventions](https://datomatic.no-intro.org/stuff/The%20Official%20No-Intro%20Convention%20(20071030).pdf)
