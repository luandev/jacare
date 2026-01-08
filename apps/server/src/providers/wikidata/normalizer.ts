/**
 * Game Name Normalization and Result Ranking
 * 
 * Normalizes game names for better matching and ranks search results.
 */

import type { 
  WikidataGameResult, 
  RankedGameResult, 
  MatchRank 
} from "@crocdesk/shared";
import { MatchRank as Rank } from "@crocdesk/shared";

/**
 * Normalizes a game name for matching
 * 
 * - Strips region tags: (USA), [Europe], etc.
 * - Strips revision tags: (Rev 1), [Rev A], etc.
 * - Strips disc/part numbers: (Disc 1), (Part 2), etc.
 * - Converts to lowercase
 * - Applies ASCII folding for common characters
 * - Strips extra whitespace
 * - Removes colons and hyphens for better matching
 */
export function normalizeGameName(name: string): string {
  let normalized = name;
  
  // Strip tags in parentheses and square brackets
  // Handles: (USA), [Europe], (Rev 1), [Rev A], (Disc 1), [!], etc.
  normalized = normalized.replace(/\s*[\(\[].*?[\)\]]/g, "");
  
  // Convert to lowercase
  normalized = normalized.toLowerCase();
  
  // ASCII folding for common characters
  normalized = normalized
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ýÿ]/g, "y")
    .replace(/[ñ]/g, "n")
    .replace(/[ç]/g, "c")
    .replace(/[æ]/g, "ae")
    .replace(/[œ]/g, "oe");
  
  // Remove colons, hyphens, and common punctuation for better matching
  normalized = normalized.replace(/[:\-\.\,\!\?]/g, " ");
  
  // Strip extra whitespace and trim
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  return normalized;
}

/**
 * Determines the match rank between a query and a label
 * 
 * @param query - Normalized search query
 * @param label - Label to match against
 * @returns Match rank (EXACT, PREFIX, CONTAINS, or NO_MATCH)
 */
export function matchRank(query: string, label: string): MatchRank {
  const normalizedQuery = normalizeGameName(query);
  const normalizedLabel = normalizeGameName(label);
  
  if (normalizedLabel === normalizedQuery) {
    return Rank.EXACT;
  }
  
  if (normalizedLabel.startsWith(normalizedQuery)) {
    return Rank.PREFIX;
  }
  
  if (normalizedLabel.includes(normalizedQuery)) {
    return Rank.CONTAINS;
  }
  
  return Rank.NO_MATCH;
}

/**
 * Checks if a platform matches the query
 * 
 * Case-insensitive substring matching
 * Also handles common abbreviations (e.g., "NES" matches "Nintendo Entertainment System")
 */
function platformMatches(platforms: string[] | undefined, platformQuery: string): boolean {
  if (!platforms || platforms.length === 0) {
    return false;
  }
  
  const normalizedQuery = platformQuery.toLowerCase().trim();
  
  // Common platform abbreviations
  const abbreviations: Record<string, string[]> = {
    "nes": ["nintendo entertainment system", "famicom"],
    "snes": ["super nintendo", "super famicom"],
    "n64": ["nintendo 64"],
    "gc": ["gamecube", "nintendo gamecube"],
    "wii": ["wii", "nintendo wii"],
    "ps1": ["playstation", "playstation 1", "psx"],
    "ps2": ["playstation 2"],
    "ps3": ["playstation 3"],
    "ps4": ["playstation 4"],
    "ps5": ["playstation 5"],
    "xbox": ["xbox"],
    "gb": ["game boy"],
    "gbc": ["game boy color"],
    "gba": ["game boy advance"],
    "nds": ["nintendo ds"],
    "3ds": ["nintendo 3ds"]
  };
  
  // Check if query is an abbreviation
  const expandedTerms = abbreviations[normalizedQuery] || [normalizedQuery];
  
  // Check if any platform matches any of the expanded terms
  return platforms.some(platform => {
    const normalizedPlatform = platform.toLowerCase();
    return expandedTerms.some(term => 
      normalizedPlatform.includes(term) || term.includes(normalizedPlatform)
    );
  });
}

/**
 * Ranks and sorts search results
 * 
 * Ranking criteria:
 * 1. Match rank (EXACT > PREFIX > CONTAINS > NO_MATCH)
 * 2. Platform match (boost by 0.5 if platform matches)
 * 3. Alphabetical by label (for ties)
 * 
 * @param results - Array of game results
 * @param query - Original search query
 * @param options - Optional search options (e.g., platform filter)
 * @returns Ranked and sorted results
 */
export function rankSearchResults(
  results: WikidataGameResult[],
  query: string,
  options?: { platform?: string }
): RankedGameResult[] {
  const rankedResults: RankedGameResult[] = results.map(result => {
    const rank = matchRank(query, result.label);
    const platformMatch = options?.platform 
      ? platformMatches(result.platforms, options.platform)
      : undefined;
    
    return {
      ...result,
      rank,
      platformMatch
    };
  });
  
  // Sort by rank (lower is better), platform match, then alphabetically
  return rankedResults.sort((a, b) => {
    // Calculate effective rank with platform boost
    // Platform match reduces effective rank by 0.5
    const aEffectiveRank = a.rank - (a.platformMatch ? 0.5 : 0);
    const bEffectiveRank = b.rank - (b.platformMatch ? 0.5 : 0);
    
    // Primary: effective rank (with platform boost)
    if (aEffectiveRank !== bEffectiveRank) {
      return aEffectiveRank - bEffectiveRank;
    }
    
    // Secondary: alphabetical
    return a.label.localeCompare(b.label);
  });
}
