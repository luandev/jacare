/**
 * Fuzzy matching utilities for ROM name recognition
 * Implements multiple strategies to improve ROM recognition rate
 */

// Scoring weights and thresholds
const SCORE_SUBSTRING_MATCH_EXACT = 0.85;  // Score when candidate contains query
const SCORE_SUBSTRING_MATCH_PARTIAL = 0.75; // Score when query contains candidate
const WEIGHT_LEVENSHTEIN = 0.5;  // Weight for character-level similarity
const WEIGHT_TOKEN = 0.35;        // Weight for word-level similarity
const WEIGHT_SUBSTRING = 0.15;    // Weight for substring matching

/**
 * Common ROM abbreviations mapping
 * Key: abbreviation (lowercase), Value: possible expansions
 */
const ABBREVIATIONS: Record<string, string[]> = {
  // Super Mario series
  "smw": ["Super Mario World"],
  "smb": ["Super Mario Bros", "Super Mario Brothers"],
  "smb2": ["Super Mario Bros 2", "Super Mario Bros. 2"],
  "smb3": ["Super Mario Bros 3", "Super Mario Bros. 3"],
  "sm64": ["Super Mario 64"],
  
  // Zelda series
  "alttp": ["A Link to the Past", "Link to the Past", "The Legend of Zelda A Link to the Past"],
  "lttp": ["Link to the Past", "A Link to the Past"],
  "oot": ["Ocarina of Time"],
  "mm": ["Majora's Mask", "Majoras Mask"],
  "loz": ["Legend of Zelda", "The Legend of Zelda"],
  
  // Final Fantasy series
  "ff": ["Final Fantasy"],
  "ff6": ["Final Fantasy 6", "Final Fantasy VI"],
  "ff7": ["Final Fantasy 7", "Final Fantasy VII"],
  "ff4": ["Final Fantasy 4", "Final Fantasy IV"],
  "ffvi": ["Final Fantasy VI", "Final Fantasy 6"],
  "ffvii": ["Final Fantasy VII", "Final Fantasy 7"],
  "ffiv": ["Final Fantasy IV", "Final Fantasy 4"],
  
  // Street Fighter series
  "sf": ["Street Fighter"],
  "sf2": ["Street Fighter 2", "Street Fighter II"],
  "sf2turbo": ["Street Fighter 2 Turbo", "Street Fighter II Turbo"],
  
  // Other common abbreviations
  "ct": ["Chrono Trigger"],
  "chronotrigger": ["Chrono Trigger"],
  "sm": ["Super Metroid"],
  "mk": ["Mortal Kombat"],
  "dkc": ["Donkey Kong Country"],
  "dkc2": ["Donkey Kong Country 2"],
  "dkc3": ["Donkey Kong Country 3"],
  "cv": ["Castlevania"],
  "sotn": ["Symphony of the Night"],
  "mmx": ["Mega Man X", "Megaman X"],
};

/**
 * Common stop words that should have lower weight in matching
 */
const STOP_WORDS = new Set([
  "the", "a", "an", "of", "and", "or", "in", "on", "at", "to", "for"
]);

/**
 * Roman numeral to Arabic number mapping
 */
const ROMAN_TO_ARABIC: Record<string, string> = {
  "i": "1",
  "ii": "2",
  "iii": "3",
  "iv": "4",
  "v": "5",
  "vi": "6",
  "vii": "7",
  "viii": "8",
  "ix": "9",
  "x": "10",
};

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits required
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate normalized similarity score (0-1) based on Levenshtein distance
 * 1.0 = perfect match, 0.0 = no similarity
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 && b.length === 0) return 1.0; // Both empty strings are equal
  if (a.length === 0 || b.length === 0) return 0.0;

  const distance = calculateLevenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return 1.0 - distance / maxLength;
}

/**
 * Normalize a string for comparison
 * - Lowercase
 * - Replace separators (underscore, dot) with spaces
 * - Remove non-alphanumeric except spaces (preserves word structure but removes ROM metadata)
 * - Normalize whitespace
 * - Convert Roman numerals to Arabic
 */
export function normalize(str: string): string {
  let normalized = str.toLowerCase();
  
  // Replace common separators with spaces (explicitly escape dot for clarity)
  normalized = normalized.replace(/[_\\.]/g, " ");
  
  // Convert Roman numerals to Arabic (word boundaries only)
  for (const [roman, arabic] of Object.entries(ROMAN_TO_ARABIC)) {
    const pattern = new RegExp(`\\b${roman}\\b`, "g");
    normalized = normalized.replace(pattern, arabic);
  }
  
  // Remove punctuation but keep spaces
  // This removes ROM metadata like colons, hyphens, parentheses while preserving word boundaries
  // Example: "Game: Subtitle" → "game subtitle", "Mario Bros." → "mario bros"
  normalized = normalized.replace(/[^\w\s]/g, " ");
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  return normalized;
}

/**
 * Extract tokens from a string, filtering stop words
 */
export function tokenize(str: string, includeStopWords: boolean = false): string[] {
  const normalized = normalize(str);
  const tokens = normalized.split(" ").filter(t => t.length > 0);
  
  if (includeStopWords) {
    return tokens;
  }
  
  return tokens.filter(t => !STOP_WORDS.has(t));
}

/**
 * Expand known abbreviations in a string
 * Returns array of possible expansions (including original)
 */
export function expandAbbreviations(name: string): string[] {
  const normalized = normalize(name);
  const lowerName = normalized.toLowerCase();
  
  // Check for exact abbreviation match
  if (ABBREVIATIONS[lowerName]) {
    return [...ABBREVIATIONS[lowerName], name];
  }
  
  // Check for abbreviation as first word
  const firstWord = normalized.split(" ")[0].toLowerCase();
  if (ABBREVIATIONS[firstWord]) {
    const rest = normalized.substring(normalized.indexOf(" ") + 1).trim();
    const expansions = ABBREVIATIONS[firstWord].map(exp => 
      rest ? `${exp} ${rest}` : exp
    );
    return [...expansions, name];
  }
  
  // Check if name without spaces matches an abbreviation (e.g., "ChronoTrigger")
  const noSpaces = normalized.replace(/\s+/g, "").toLowerCase();
  for (const [_abbr, expansions] of Object.entries(ABBREVIATIONS)) {
    // Check if any expansion without spaces matches
    for (const expansion of expansions) {
      const expNoSpaces = expansion.replace(/\s+/g, "").toLowerCase();
      if (noSpaces === expNoSpaces || noSpaces.includes(expNoSpaces)) {
        return [expansion, name];
      }
    }
  }
  
  // No expansion found
  return [name];
}

/**
 * Calculate token-based similarity score
 * Considers token overlap, order, and weights
 */
export function calculateTokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));
  
  if (tokensA.size === 0 || tokensB.size === 0) return 0.0;
  
  // Calculate Jaccard similarity (intersection over union)
  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);
  
  return intersection.size / union.size;
}

/**
 * Calculate a comprehensive match score between query and candidate
 * Combines multiple similarity metrics
 */
export function calculateMatchScore(
  query: string,
  candidate: string,
  options: {
    platformMatch?: boolean;
    exactMatch?: boolean;
  } = {}
): number {
  // Quick exact match check (case-insensitive)
  if (query.toLowerCase() === candidate.toLowerCase()) {
    return 1.0;
  }
  
  // Normalize both strings
  const normQuery = normalize(query);
  const normCandidate = normalize(candidate);
  
  // Exact match after normalization
  if (normQuery === normCandidate) {
    return 0.98;
  }
  
  // Calculate multiple similarity scores
  const levenshteinScore = calculateSimilarity(normQuery, normCandidate);
  const tokenScore = calculateTokenSimilarity(normQuery, normCandidate);
  
  // Check if candidate contains query (substring match)
  const containsScore = normCandidate.includes(normQuery) ? SCORE_SUBSTRING_MATCH_EXACT : 
                       (normQuery.includes(normCandidate) ? SCORE_SUBSTRING_MATCH_PARTIAL : 0.0);
  
  // Weighted combination - prioritizes character similarity with word-level validation
  let finalScore = (
    levenshteinScore * WEIGHT_LEVENSHTEIN +
    tokenScore * WEIGHT_TOKEN +
    containsScore * WEIGHT_SUBSTRING
  );
  
  // Boost for platform match
  if (options.platformMatch) {
    finalScore = Math.min(1.0, finalScore * 1.1);
  }
  
  return finalScore;
}

/**
 * Find best matches from a list of candidates
 * Returns matches sorted by score (highest first)
 */
export function findBestMatches<T extends { title: string }>(
  query: string,
  candidates: T[],
  options: {
    minScore?: number;
    maxResults?: number;
    platformMatch?: (candidate: T) => boolean;
  } = {}
): Array<T & { score: number }> {
  const minScore = options.minScore ?? 0.6;
  const maxResults = options.maxResults ?? 5;
  
  // Try with abbreviation expansions
  const expansions = expandAbbreviations(query);
  
  // Calculate scores for all candidates with all query variants
  const scored = candidates.map(candidate => {
    const scores = expansions.map(expansion => 
      calculateMatchScore(expansion, candidate.title, {
        platformMatch: options.platformMatch?.(candidate) ?? false
      })
    );
    
    // Use the best score from all expansions
    const bestScore = Math.max(...scores);
    
    return {
      ...candidate,
      score: bestScore
    };
  });
  
  // Filter by minimum score and sort by score descending
  return scored
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

/**
 * Extract the core game name without version tags, regions, etc.
 * More aggressive than normalizeRomNameForSearch - tries to get to the essence
 */
export function extractCoreName(filename: string): string {
  let name = filename;
  
  // Remove extension
  const lastDot = name.lastIndexOf(".");
  if (lastDot > 0) {
    name = name.substring(0, lastDot);
  }
  
  // Remove version tags (but do this BEFORE normalization to preserve game name)
  name = name.replace(/\s*[\(\[].*?[\)\]]/g, "");
  
  // Trim whitespace first
  name = name.trim();
  
  // Normalize (this converts to lowercase and cleans punctuation)
  name = normalize(name);
  
  return name;
}
