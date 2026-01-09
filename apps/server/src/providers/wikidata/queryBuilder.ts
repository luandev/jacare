/**
 * SPARQL Query Builder for Wikidata
 * 
 * Builds SPARQL queries to search and fetch video game metadata from Wikidata.
 */

export type QueryOptions = {
  limit?: number;
};

/**
 * Escapes special characters in SPARQL string literals
 */
function escapeSparql(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

/**
 * Normalizes a QID to ensure it has the 'wd:' prefix
 */
function normalizeQid(qid: string): string {
  return qid.startsWith("wd:") ? qid : `wd:${qid}`;
}

/**
 * Builds a SPARQL query to search for video games by name
 * 
 * Returns games that match the query with their metadata:
 * - QID, label, release date, platforms, genres, publishers, series
 */
export function buildSearchQuery(query: string, options: QueryOptions = {}): string {
  const limit = options.limit ?? 25;
  const escapedQuery = escapeSparql(query.toLowerCase());
  
  // Optimized query: Removed GROUP_CONCAT, using rdfs:label for all labels (simpler and faster)
  return `
SELECT DISTINCT ?game ?gameLabel ?releaseDate ?platform ?platformLabel ?genre ?genreLabel ?publisher ?publisherLabel ?series ?seriesLabel
WHERE {
  ?game wdt:P31/wdt:P279* wd:Q7889 .
  ?game rdfs:label ?gameLabel .
  FILTER(LANG(?gameLabel) = "en")
  FILTER(CONTAINS(LCASE(?gameLabel), "${escapedQuery}"))
  OPTIONAL { ?game wdt:P577 ?releaseDate . }
  OPTIONAL { 
    ?game wdt:P400 ?platform .
    ?platform rdfs:label ?platformLabel .
    FILTER(LANG(?platformLabel) = "en")
  }
  OPTIONAL { 
    ?game wdt:P136 ?genre .
    ?genre rdfs:label ?genreLabel .
    FILTER(LANG(?genreLabel) = "en")
  }
  OPTIONAL { 
    ?game wdt:P123 ?publisher .
    ?publisher rdfs:label ?publisherLabel .
    FILTER(LANG(?publisherLabel) = "en")
  }
  OPTIONAL { 
    ?game wdt:P179 ?series .
    ?series rdfs:label ?seriesLabel .
    FILTER(LANG(?seriesLabel) = "en")
  }
}
LIMIT ${limit * 2}
`.trim();
}

/**
 * Builds a SPARQL query to fetch a specific game by its Wikidata QID
 * 
 * Returns full metadata for the game if it exists and is a video game
 */
export function buildGetByQidQuery(qid: string): string {
  const normalizedQid = normalizeQid(qid);
  
  // Return individual rows (no GROUP_CONCAT) - aggregation happens client-side
  // This avoids timeout issues with complex GROUP_CONCAT operations
  return `
SELECT DISTINCT ?game ?gameLabel ?releaseDate ?platformLabel ?genreLabel ?publisherLabel ?seriesLabel
WHERE {
  # Bind the specific game
  BIND(${normalizedQid} AS ?game)
  
  # Validate it's a video game
  ?game wdt:P31/wdt:P279* wd:Q7889 .  # instance of (subclass of) video game
  
  # Get labels in English
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "en" .
  }
  
  # Publication date (optional)
  OPTIONAL { ?game wdt:P577 ?releaseDate . }
  
  # Platforms (optional)
  OPTIONAL { 
    ?game wdt:P400 ?platform .
    ?platform rdfs:label ?platformLabel .
    FILTER(LANG(?platformLabel) = "en")
  }
  
  # Genres (optional)
  OPTIONAL { 
    ?game wdt:P136 ?genre .
    ?genre rdfs:label ?genreLabel .
    FILTER(LANG(?genreLabel) = "en")
  }
  
  # Publishers (optional)
  OPTIONAL { 
    ?game wdt:P123 ?publisher .
    ?publisher rdfs:label ?publisherLabel .
    FILTER(LANG(?publisherLabel) = "en")
  }
  
  # Series (optional)
  OPTIONAL { 
    ?game wdt:P179 ?series .
    ?series rdfs:label ?seriesLabel .
    FILTER(LANG(?seriesLabel) = "en")
  }
}
`.trim();
}
