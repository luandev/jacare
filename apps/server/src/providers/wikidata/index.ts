/**
 * Wikidata Metadata Provider
 * 
 * A free, open metadata provider for video games using Wikidata's SPARQL endpoint.
 * 
 * Features:
 * - No API key required
 * - Rich game metadata (title, platforms, genres, publishers, series, release date)
 * - Name normalization and intelligent ranking
 * - Aggressive caching (21 days TTL)
 * - Rate limiting (1 req/sec by default)
 * 
 * @example
 * ```typescript
 * import { WikidataProvider } from './providers/wikidata';
 * 
 * const provider = new WikidataProvider();
 * 
 * // Search for games
 * const games = await provider.searchGames("super mario");
 * console.log(games[0].name); // "Super Mario Bros."
 * 
 * // Get game by QID
 * const game = await provider.getGameById("Q12345");
 * ```
 */

export { WikidataProvider } from "./provider";
export { WikidataClient } from "./client";
export type { WikidataClientOptions } from "./client";
