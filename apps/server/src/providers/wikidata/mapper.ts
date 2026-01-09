/**
 * Wikidata SPARQL Response Mapper
 * 
 * Maps SPARQL query results to structured game metadata.
 */

import type { 
  WikidataSparqlResult, 
  WikidataGameResult 
} from "@crocdesk/shared";

/**
 * Extracts QID from a Wikidata entity URI
 * 
 * @param uri - Full URI like "http://www.wikidata.org/entity/Q12345" or just "Q12345"
 * @returns QID like "Q12345"
 */
export function extractQidFromUri(uri: string): string {
  if (uri.startsWith("Q")) {
    return uri;
  }
  
  // Remove trailing slash if present
  const cleanUri = uri.replace(/\/$/, "");
  const parts = cleanUri.split("/");
  return parts[parts.length - 1];
}

/**
 * Extracts date from ISO 8601 datetime string
 * 
 * @param datetime - ISO datetime like "1985-09-13T00:00:00Z"
 * @returns Date string like "1985-09-13"
 */
function extractDate(datetime: string): string {
  return datetime.split("T")[0];
}

/**
 * Splits pipe-separated values and filters empty strings
 * 
 * @param value - Pipe-separated string like "value1|value2"
 * @returns Array of values
 */
function splitPipeSeparated(value: string): string[] | undefined {
  const parts = value
    .split("|")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  
  return parts.length > 0 ? parts : undefined;
}

/**
 * Maps a single SPARQL result binding to a partial WikidataGameResult
 * 
 * @param result - Raw SPARQL result row
 * @returns Partial game result (needs aggregation)
 */
function mapSparqlResultToPartialGame(
  result: WikidataSparqlResult
): Partial<WikidataGameResult> & { qid: string; label: string } {
  const game: Partial<WikidataGameResult> & { qid: string; label: string } = {
    qid: extractQidFromUri(result.game.value),
    label: result.gameLabel.value
  };
  
  // Map optional release date
  if (result.releaseDate) {
    game.releaseDate = extractDate(result.releaseDate.value);
  }
  
  // Map optional platform (single value, not pipe-separated)
  if (result.platformLabel && result.platformLabel.value) {
    game.platforms = [result.platformLabel.value];
  }
  
  // Map optional genre (single value, not pipe-separated)
  if (result.genreLabel && result.genreLabel.value) {
    game.genres = [result.genreLabel.value];
  }
  
  // Map optional publisher (single value, not pipe-separated)
  if (result.publisherLabel && result.publisherLabel.value) {
    game.publishers = [result.publisherLabel.value];
  }
  
  // Map optional series
  if (result.seriesLabel && result.seriesLabel.value) {
    game.series = result.seriesLabel.value;
  }
  
  return game;
}

/**
 * Maps a single SPARQL result binding to a WikidataGameResult
 * 
 * @deprecated Use aggregateSparqlResults instead - this is kept for backwards compatibility
 * @param result - Raw SPARQL result row
 * @returns Structured game result
 */
export function mapSparqlResultToGame(
  result: WikidataSparqlResult
): WikidataGameResult {
  const partial = mapSparqlResultToPartialGame(result);
  return {
    qid: partial.qid,
    label: partial.label,
    releaseDate: partial.releaseDate,
    platforms: partial.platforms,
    genres: partial.genres,
    publishers: partial.publishers,
    series: partial.series
  };
}

/**
 * Aggregates multiple SPARQL results into unique game results
 * 
 * Combines multiple rows for the same game, aggregating platforms, genres, publishers
 * 
 * @param results - Array of SPARQL result bindings
 * @returns Array of unique game results with aggregated metadata
 */
export function aggregateSparqlResults(
  results: WikidataSparqlResult[]
): WikidataGameResult[] {
  const gameMap = new Map<string, {
    qid: string;
    label: string;
    releaseDate?: string;
    platforms: Set<string>;
    genres: Set<string>;
    publishers: Set<string>;
    series?: string;
  }>();
  
  for (const result of results) {
    const partial = mapSparqlResultToPartialGame(result);
    const qid = partial.qid;
    
    if (!gameMap.has(qid)) {
      gameMap.set(qid, {
        qid,
        label: partial.label,
        releaseDate: partial.releaseDate,
        platforms: new Set(partial.platforms || []),
        genres: new Set(partial.genres || []),
        publishers: new Set(partial.publishers || []),
        series: partial.series
      });
    } else {
      const game = gameMap.get(qid)!;
      // Aggregate platforms
      if (partial.platforms) {
        partial.platforms.forEach(p => game.platforms.add(p));
      }
      // Aggregate genres
      if (partial.genres) {
        partial.genres.forEach(g => game.genres.add(g));
      }
      // Aggregate publishers
      if (partial.publishers) {
        partial.publishers.forEach(p => game.publishers.add(p));
      }
      // Keep first series found
      if (!game.series && partial.series) {
        game.series = partial.series;
      }
      // Keep first release date found
      if (!game.releaseDate && partial.releaseDate) {
        game.releaseDate = partial.releaseDate;
      }
    }
  }
  
  // Convert to final format
  return Array.from(gameMap.values()).map(game => ({
    qid: game.qid,
    label: game.label,
    releaseDate: game.releaseDate,
    platforms: game.platforms.size > 0 ? Array.from(game.platforms) : undefined,
    genres: game.genres.size > 0 ? Array.from(game.genres) : undefined,
    publishers: game.publishers.size > 0 ? Array.from(game.publishers) : undefined,
    series: game.series
  }));
}
