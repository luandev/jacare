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
  
  return `
SELECT DISTINCT ?game ?gameLabel ?releaseDate 
  (GROUP_CONCAT(DISTINCT ?platformLabel; separator="|") AS ?platforms)
  (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres)
  (GROUP_CONCAT(DISTINCT ?publisherLabel; separator="|") AS ?publishers)
  ?seriesLabel
WHERE {
  # Find video games that match the search term
  ?game wdt:P31/wdt:P279* wd:Q7889 .  # instance of (subclass of) video game
  
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
  
  # Get labels in English
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "en" .
  }
  
  # Filter by name (case-insensitive contains)
  FILTER(CONTAINS(LCASE(?gameLabel), "${escapedQuery}"))
}
GROUP BY ?game ?gameLabel ?releaseDate ?seriesLabel
LIMIT ${limit}
`.trim();
}

/**
 * Builds a SPARQL query to fetch a specific game by its Wikidata QID
 * 
 * Returns full metadata for the game if it exists and is a video game
 */
export function buildGetByQidQuery(qid: string): string {
  const normalizedQid = normalizeQid(qid);
  
  return `
SELECT DISTINCT ?game ?gameLabel ?releaseDate 
  (GROUP_CONCAT(DISTINCT ?platformLabel; separator="|") AS ?platforms)
  (GROUP_CONCAT(DISTINCT ?genreLabel; separator="|") AS ?genres)
  (GROUP_CONCAT(DISTINCT ?publisherLabel; separator="|") AS ?publishers)
  ?seriesLabel
WHERE {
  # Bind the specific game
  BIND(${normalizedQid} AS ?game)
  
  # Validate it's a video game
  ?game wdt:P31/wdt:P279* wd:Q7889 .  # instance of (subclass of) video game
  
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
  
  # Get labels in English
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "en" .
  }
}
GROUP BY ?game ?gameLabel ?releaseDate ?seriesLabel
`.trim();
}
