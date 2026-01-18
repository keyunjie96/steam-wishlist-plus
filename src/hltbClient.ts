/**
 * Steam Cross-Platform Wishlist - HLTB Client
 *
 * Queries HowLongToBeat for game completion time estimates.
 * Uses reverse-engineered API endpoint (may break without notice).
 *
 * Note: HLTB has no official API. This uses the internal search endpoint.
 */

import type { HltbData, HltbSearchResult } from './types';

const HLTB_API_URL = 'https://howlongtobeat.com/api/search';
const HLTB_LOG_PREFIX = '[XCPW HLTB]';
const HLTB_DEBUG = false;

const REQUEST_DELAY_MS = 500;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

let requestQueue = Promise.resolve();

/**
 * HLTB API request payload structure (reverse-engineered)
 */
interface HltbSearchPayload {
  searchType: string;
  searchTerms: string[];
  searchPage: number;
  size: number;
  searchOptions: {
    games: {
      userId: number;
      platform: string;
      sortCategory: string;
      rangeCategory: string;
      rangeTime: { min: null; max: null };
      gameplay: { perspective: string; flow: string; genre: string };
      rangeYear: { min: string; max: string };
      modifier: string;
    };
    users: { sortCategory: string };
    filter: string;
    sort: number;
    randomizer: number;
  };
}

/**
 * HLTB API response structure (reverse-engineered)
 */
interface HltbApiResponse {
  color: string;
  title: string;
  category: string;
  count: number;
  pageCurrent: number;
  pageTotal: number;
  pageSize: number;
  data: HltbGameData[];
}

interface HltbGameData {
  game_id: number;
  game_name: string;
  game_name_date: number;
  game_alias: string;
  game_type: string;
  game_image: string;
  comp_lvl_combine: number;
  comp_lvl_sp: number;
  comp_lvl_co: number;
  comp_lvl_mp: number;
  comp_lvl_spd: number;
  comp_main: number;
  comp_plus: number;
  comp_100: number;
  comp_all: number;
  comp_main_count: number;
  comp_plus_count: number;
  comp_100_count: number;
  comp_all_count: number;
  invested_co: number;
  invested_mp: number;
  invested_co_count: number;
  invested_mp_count: number;
  count_comp: number;
  count_speedrun: number;
  count_backlog: number;
  count_review: number;
  review_score: number;
  count_playing: number;
  count_retired: number;
  profile_dev: string;
  profile_popular: number;
  profile_steam: number;
  profile_platform: string;
  release_world: number;
}

/**
 * Creates the search payload for HLTB API
 */
function createSearchPayload(searchTerms: string[]): HltbSearchPayload {
  return {
    searchType: 'games',
    searchTerms,
    searchPage: 1,
    size: 20,
    searchOptions: {
      games: {
        userId: 0,
        platform: '',
        sortCategory: 'popular',
        rangeCategory: 'main',
        rangeTime: { min: null, max: null },
        gameplay: { perspective: '', flow: '', genre: '' },
        rangeYear: { min: '', max: '' },
        modifier: ''
      },
      users: { sortCategory: 'postcount' },
      filter: '',
      sort: 0,
      randomizer: 0
    }
  };
}

/**
 * Converts seconds to hours (HLTB stores times in seconds)
 */
function secondsToHours(seconds: number): number {
  if (!seconds || seconds <= 0) return 0;
  return Math.round(seconds / 3600 * 10) / 10; // Round to 1 decimal
}

/**
 * Formats hours for display (e.g., "12.5h" or "100h")
 */
function formatHours(hours: number): string {
  if (!hours || hours <= 0) return '';
  if (hours >= 100) return `${Math.round(hours)}h`;
  if (hours >= 10) return `${Math.round(hours)}h`;
  return `${hours.toFixed(1)}h`;
}

/**
 * Normalizes a game name for fuzzy matching
 */
function normalizeGameName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Calculates similarity between two strings (0-1)
 * Uses Jaccard similarity on character n-grams
 */
function calculateSimilarity(a: string, b: string): number {
  const aNorm = normalizeGameName(a);
  const bNorm = normalizeGameName(b);

  if (aNorm === bNorm) return 1;
  if (!aNorm || !bNorm) return 0;

  // Simple containment check
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) {
    const shorter = aNorm.length < bNorm.length ? aNorm : bNorm;
    const longer = aNorm.length >= bNorm.length ? aNorm : bNorm;
    return shorter.length / longer.length;
  }

  // Jaccard similarity on 2-grams
  const ngramSize = 2;
  const getNgrams = (s: string): Set<string> => {
    const ngrams = new Set<string>();
    for (let i = 0; i <= s.length - ngramSize; i++) {
      ngrams.add(s.slice(i, i + ngramSize));
    }
    return ngrams;
  };

  const aGrams = getNgrams(aNorm);
  const bGrams = getNgrams(bNorm);

  if (aGrams.size === 0 || bGrams.size === 0) return 0;

  let intersection = 0;
  for (const gram of aGrams) {
    if (bGrams.has(gram)) intersection++;
  }

  const union = aGrams.size + bGrams.size - intersection;
  return intersection / union;
}

/**
 * Parses HLTB API response to HltbData
 */
function parseHltbResult(game: HltbGameData, steamGameName: string): HltbSearchResult {
  const similarity = calculateSimilarity(steamGameName, game.game_name);

  return {
    hltbId: game.game_id,
    gameName: game.game_name,
    similarity,
    data: {
      mainStory: secondsToHours(game.comp_main),
      mainExtra: secondsToHours(game.comp_plus),
      completionist: secondsToHours(game.comp_100),
      allStyles: secondsToHours(game.comp_all),
      steamId: game.profile_steam > 0 ? game.profile_steam : null
    }
  };
}

/**
 * Serializes requests through a queue to prevent concurrent bursts.
 */
async function rateLimit(): Promise<void> {
  const myTurn = requestQueue.then(() => new Promise<void>(resolve => setTimeout(resolve, REQUEST_DELAY_MS)));
  requestQueue = myTurn.catch(() => { /* ignore */ });
  await myTurn;
}

/**
 * Executes an HLTB API search with retry logic.
 * Fails silently - errors are caught and return null.
 */
async function executeHltbSearch(gameName: string, retryCount = 0): Promise<HltbApiResponse | null> {
  await rateLimit();

  try {
    const searchTerms = gameName.split(/\s+/).filter(t => t.length > 0);
    const payload = createSearchPayload(searchTerms);

    const response = await fetch(HLTB_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SteamCrossPlatformWishlist/0.5.0 (Chrome Extension)',
        'Referer': 'https://howlongtobeat.com/',
        'Origin': 'https://howlongtobeat.com'
      },
      body: JSON.stringify(payload)
    });

    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return executeHltbSearch(gameName, retryCount + 1);
      }
      return null;
    }

    if (!response.ok) {
      if (HLTB_DEBUG) console.log(`${HLTB_LOG_PREFIX} API returned ${response.status}`);
      return null;
    }

    return await response.json() as HltbApiResponse;
  } catch (error) {
    if (HLTB_DEBUG) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`${HLTB_LOG_PREFIX} Network error: ${errorMessage}`);
    }
    return null;
  }
}

/**
 * Queries HLTB for game completion time by game name.
 * Uses fuzzy matching to find the best match.
 *
 * @param gameName - The game name to search for (from Steam)
 * @param steamAppId - Optional Steam app ID for exact matching
 * @returns HltbData if found with confidence, null otherwise
 */
async function queryByGameName(gameName: string, steamAppId?: string): Promise<HltbSearchResult | null> {
  if (HLTB_DEBUG) console.log(`${HLTB_LOG_PREFIX} Searching for: ${gameName}`);

  const result = await executeHltbSearch(gameName);

  if (!result || !result.data || result.data.length === 0) {
    if (HLTB_DEBUG) console.log(`${HLTB_LOG_PREFIX} No results for: ${gameName}`);
    return null;
  }

  // If we have a Steam app ID, try to find exact match first
  if (steamAppId) {
    const steamIdNum = parseInt(steamAppId, 10);
    const exactMatch = result.data.find(g => g.profile_steam === steamIdNum);
    if (exactMatch) {
      const parsed = parseHltbResult(exactMatch, gameName);
      parsed.similarity = 1; // Perfect match via Steam ID
      if (HLTB_DEBUG) console.log(`${HLTB_LOG_PREFIX} Exact Steam ID match for ${gameName}: ${exactMatch.game_name}`);
      console.log(`${HLTB_LOG_PREFIX} Found ${gameName} -> ${parsed.data.mainStory}h main, ${parsed.data.mainExtra}h extra`);
      return parsed;
    }
  }

  // Otherwise, use fuzzy matching
  const candidates = result.data.map(g => parseHltbResult(g, gameName));

  // Sort by similarity (descending) and pick best match
  candidates.sort((a, b) => b.similarity - a.similarity);
  const bestMatch = candidates[0];

  // Require minimum similarity threshold (0.5 = 50%)
  const SIMILARITY_THRESHOLD = 0.5;
  if (bestMatch.similarity < SIMILARITY_THRESHOLD) {
    if (HLTB_DEBUG) console.log(`${HLTB_LOG_PREFIX} Best match "${bestMatch.gameName}" too dissimilar (${(bestMatch.similarity * 100).toFixed(0)}%)`);
    return null;
  }

  if (HLTB_DEBUG) console.log(`${HLTB_LOG_PREFIX} Best match for "${gameName}": "${bestMatch.gameName}" (${(bestMatch.similarity * 100).toFixed(0)}%)`);
  console.log(`${HLTB_LOG_PREFIX} Found ${gameName} -> ${bestMatch.data.mainStory}h main, ${bestMatch.data.mainExtra}h extra`);

  return bestMatch;
}

/**
 * Batch queries HLTB for multiple games.
 * Note: HLTB API doesn't support batch queries, so this runs sequentially with rate limiting.
 */
async function batchQueryByGameNames(
  games: Array<{ appid: string; gameName: string }>
): Promise<Map<string, HltbSearchResult | null>> {
  const results = new Map<string, HltbSearchResult | null>();

  for (const { appid, gameName } of games) {
    try {
      const result = await queryByGameName(gameName, appid);
      results.set(appid, result);
    } catch {
      results.set(appid, null);
    }
  }

  return results;
}

// Export for service worker
globalThis.XCPW_HltbClient = {
  queryByGameName,
  batchQueryByGameNames,
  formatHours,
  normalizeGameName,
  calculateSimilarity
};

// Also export for module imports in tests
export {
  queryByGameName,
  batchQueryByGameNames,
  formatHours,
  normalizeGameName,
  calculateSimilarity,
  parseHltbResult,
  executeHltbSearch,
  createSearchPayload
};
