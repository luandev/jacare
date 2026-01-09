/**
 * Wikidata Provider Types
 * 
 * Types specific to the Wikidata SPARQL metadata provider
 */

/**
 * Raw SPARQL query result binding for a game search
 */
export type WikidataSparqlBinding = {
  type: "uri" | "literal" | "bnode";
  value: string;
  "xml:lang"?: string;
  datatype?: string;
};

/**
 * Raw SPARQL result row
 */
export type WikidataSparqlResult = {
  [key: string]: WikidataSparqlBinding;
};

/**
 * Raw SPARQL response structure
 */
export type WikidataSparqlResponse = {
  head: {
    vars: string[];
  };
  results: {
    bindings: WikidataSparqlResult[];
  };
};

/**
 * Parsed Wikidata game result
 */
export type WikidataGameResult = {
  /** Wikidata QID (e.g., "Q12345") */
  qid: string;
  
  /** Game label/title */
  label: string;
  
  /** Release date (ISO 8601) */
  releaseDate?: string;
  
  /** Platform labels */
  platforms?: string[];
  
  /** Genre labels */
  genres?: string[];
  
  /** Publisher labels */
  publishers?: string[];
  
  /** Series label */
  series?: string;
};

/**
 * Match rank for search results
 */
export enum MatchRank {
  /** Exact label match */
  EXACT = 1,
  
  /** Label starts with query */
  PREFIX = 2,
  
  /** Label contains query */
  CONTAINS = 3,
  
  /** No special match */
  NO_MATCH = 4
}

/**
 * Ranked search result
 */
export type RankedGameResult = WikidataGameResult & {
  /** Match rank score */
  rank: MatchRank;
  
  /** Whether the platform matches (if provided) */
  platformMatch?: boolean;
};
