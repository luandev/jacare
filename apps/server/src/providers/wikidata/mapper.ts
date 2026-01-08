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
 * Maps a single SPARQL result binding to a WikidataGameResult
 * 
 * @param result - Raw SPARQL result row
 * @returns Structured game result
 */
export function mapSparqlResultToGame(
  result: WikidataSparqlResult
): WikidataGameResult {
  const game: WikidataGameResult = {
    qid: extractQidFromUri(result.game.value),
    label: result.gameLabel.value
  };
  
  // Map optional release date
  if (result.releaseDate) {
    game.releaseDate = extractDate(result.releaseDate.value);
  }
  
  // Map optional platforms (pipe-separated)
  if (result.platforms) {
    game.platforms = splitPipeSeparated(result.platforms.value);
  }
  
  // Map optional genres (pipe-separated)
  if (result.genres) {
    game.genres = splitPipeSeparated(result.genres.value);
  }
  
  // Map optional publishers (pipe-separated)
  if (result.publishers) {
    game.publishers = splitPipeSeparated(result.publishers.value);
  }
  
  // Map optional series
  if (result.seriesLabel) {
    game.series = result.seriesLabel.value;
  }
  
  return game;
}

/**
 * Aggregates multiple SPARQL results into unique game results
 * 
 * Deduplicates by QID (takes first occurrence)
 * 
 * @param results - Array of SPARQL result bindings
 * @returns Array of unique game results
 */
export function aggregateSparqlResults(
  results: WikidataSparqlResult[]
): WikidataGameResult[] {
  const gameMap = new Map<string, WikidataGameResult>();
  
  for (const result of results) {
    const game = mapSparqlResultToGame(result);
    
    // Keep first occurrence (SPARQL already groups, but this handles edge cases)
    if (!gameMap.has(game.qid)) {
      gameMap.set(game.qid, game);
    }
  }
  
  return Array.from(gameMap.values());
}
