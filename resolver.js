/**
 * Steam Cross-Platform Wishlist - Resolver
 *
 * Coordinates between data sources and the cache system.
 * Resolution priority:
 *   1. Cache (if valid)
 *   2. Manual overrides
 *   3. Wikidata (no auth required - primary source)
 *   4. IGDB (if credentials configured - enhanced mode)
 *   5. Fallback (unknown status with search URLs)
 */

const LOG_PREFIX = '[XCPW Resolver]';

/**
 * Gets the store URLs helper from types.js
 * @returns {Object}
 */
function getStoreUrls() {
  return globalThis.XCPW_StoreUrls;
}

/**
 * Converts Wikidata result to cache entry format
 * @param {string} appid
 * @param {string} gameName
 * @param {Object} wikidataResult - Result from Wikidata client
 * @returns {import('./types.js').CacheEntry}
 */
function wikidataResultToCacheEntry(appid, gameName, wikidataResult) {
  const StoreUrls = getStoreUrls();
  const WikidataClient = globalThis.XCPW_WikidataClient;

  /**
   * Determines platform status from Wikidata result
   * @param {boolean} available
   * @param {boolean} foundInWikidata
   * @returns {'available' | 'unavailable' | 'unknown'}
   */
  function getStatus(available, foundInWikidata) {
    if (!foundInWikidata) {
      return 'unknown';
    }
    return available ? 'available' : 'unavailable';
  }

  /**
   * Gets the best URL for a platform
   * @param {string} platform
   * @param {boolean} available
   * @param {Object} storeIds
   * @param {string} name
   * @returns {string}
   */
  function getUrl(platform, available, storeIds, name) {
    // Try to get official store URL from Wikidata
    const officialUrl = WikidataClient.getStoreUrl(platform, storeIds);
    if (officialUrl) {
      return officialUrl;
    }
    // Fall back to search URL
    return StoreUrls[platform](name);
  }

  const displayName = wikidataResult.gameName || gameName;

  return {
    appid,
    gameName: displayName,
    platforms: {
      nintendo: {
        status: getStatus(wikidataResult.platforms.nintendo, wikidataResult.found),
        storeUrl: getUrl('nintendo', wikidataResult.platforms.nintendo, wikidataResult.storeIds, displayName)
      },
      playstation: {
        status: getStatus(wikidataResult.platforms.playstation, wikidataResult.found),
        storeUrl: getUrl('playstation', wikidataResult.platforms.playstation, wikidataResult.storeIds, displayName)
      },
      xbox: {
        status: getStatus(wikidataResult.platforms.xbox, wikidataResult.found),
        storeUrl: getUrl('xbox', wikidataResult.platforms.xbox, wikidataResult.storeIds, displayName)
      }
    },
    source: wikidataResult.found ? 'wikidata' : 'fallback',
    wikidataId: wikidataResult.wikidataId,
    igdbId: null,
    resolvedAt: Date.now(),
    ttlDays: 7
  };
}

/**
 * Converts IGDB resolution to cache entry format
 * @param {string} appid
 * @param {string} gameName
 * @param {Object} igdbResult - Result from IGDB client
 * @returns {import('./types.js').CacheEntry}
 */
function igdbResultToCacheEntry(appid, gameName, igdbResult) {
  const StoreUrls = getStoreUrls();

  /**
   * Determines platform status from IGDB result
   * @param {Object} platformResult
   * @param {boolean} foundInIGDB
   * @returns {'available' | 'unavailable' | 'unknown'}
   */
  function getStatus(platformResult, foundInIGDB) {
    if (!foundInIGDB) {
      return 'unknown';
    }
    return platformResult.available ? 'available' : 'unavailable';
  }

  /**
   * Gets the best URL for a platform
   * @param {Object} platformResult
   * @param {string} platform
   * @param {string} name
   * @returns {string}
   */
  function getUrl(platformResult, platform, name) {
    if (platformResult.storeUrl) {
      return platformResult.storeUrl;
    }
    return StoreUrls[platform](name);
  }

  const displayName = igdbResult.gameName || gameName;

  return {
    appid,
    gameName: displayName,
    platforms: {
      nintendo: {
        status: getStatus(igdbResult.nintendo, igdbResult.found),
        storeUrl: getUrl(igdbResult.nintendo, 'nintendo', displayName)
      },
      playstation: {
        status: getStatus(igdbResult.playstation, igdbResult.found),
        storeUrl: getUrl(igdbResult.playstation, 'playstation', displayName)
      },
      xbox: {
        status: getStatus(igdbResult.xbox, igdbResult.found),
        storeUrl: getUrl(igdbResult.xbox, 'xbox', displayName)
      }
    },
    source: igdbResult.found ? 'igdb' : 'fallback',
    wikidataId: null,
    igdbId: igdbResult.igdbId,
    resolvedAt: Date.now(),
    ttlDays: 7
  };
}

/**
 * Creates a fallback cache entry when resolution fails.
 * All platforms marked as "unknown".
 * @param {string} appid
 * @param {string} gameName
 * @returns {import('./types.js').CacheEntry}
 */
function createFallbackEntry(appid, gameName) {
  const StoreUrls = getStoreUrls();

  return {
    appid,
    gameName,
    platforms: {
      nintendo: {
        status: 'unknown',
        storeUrl: StoreUrls.nintendo(gameName)
      },
      playstation: {
        status: 'unknown',
        storeUrl: StoreUrls.playstation(gameName)
      },
      xbox: {
        status: 'unknown',
        storeUrl: StoreUrls.xbox(gameName)
      }
    },
    source: 'fallback',
    wikidataId: null,
    igdbId: null,
    resolvedAt: Date.now(),
    ttlDays: 7
  };
}

/**
 * Resolves platform availability for a single game.
 * Priority: Cache -> Manual Override -> Wikidata -> IGDB -> Fallback
 *
 * @param {string} appid - Steam application ID
 * @param {string} gameName - Game name
 * @returns {Promise<{entry: import('./types.js').CacheEntry, fromCache: boolean}>}
 */
async function resolvePlatformData(appid, gameName) {
  const Cache = globalThis.XCPW_Cache;
  const WikidataClient = globalThis.XCPW_WikidataClient;
  const TokenManager = globalThis.XCPW_TokenManager;
  const IGDBClient = globalThis.XCPW_IGDBClient;

  // 1. Check cache first
  const cached = await Cache.getFromCache(appid);
  if (cached) {
    // Update game name if changed
    if (cached.gameName !== gameName) {
      cached.gameName = gameName;
      const StoreUrls = getStoreUrls();
      // Update search URLs for unknown status (don't override official URLs)
      for (const platform of ['nintendo', 'playstation', 'xbox']) {
        if (cached.platforms[platform].status === 'unknown') {
          cached.platforms[platform].storeUrl = StoreUrls[platform](gameName);
        }
      }
      await Cache.saveToCache(cached);
    }
    return { entry: cached, fromCache: true };
  }

  // 2. Check for manual overrides
  const override = Cache.MANUAL_OVERRIDES?.[appid];
  if (override) {
    const StoreUrls = getStoreUrls();
    const entry = {
      appid,
      gameName,
      platforms: {
        nintendo: { status: override.nintendo || 'unknown', storeUrl: StoreUrls.nintendo(gameName) },
        playstation: { status: override.playstation || 'unknown', storeUrl: StoreUrls.playstation(gameName) },
        xbox: { status: override.xbox || 'unknown', storeUrl: StoreUrls.xbox(gameName) }
      },
      source: 'manual',
      wikidataId: null,
      igdbId: null,
      resolvedAt: Date.now(),
      ttlDays: 7
    };
    await Cache.saveToCache(entry);
    console.log(`${LOG_PREFIX} Using manual override for appid ${appid}`);
    return { entry, fromCache: false };
  }

  // 3. Try Wikidata (primary - no auth required)
  try {
    const wikidataResult = await WikidataClient.queryBySteamAppId(appid);

    if (wikidataResult.found) {
      const entry = wikidataResultToCacheEntry(appid, gameName, wikidataResult);
      await Cache.saveToCache(entry);
      console.log(`${LOG_PREFIX} Resolved via Wikidata: ${appid}`);
      return { entry, fromCache: false };
    }

    // Wikidata didn't have the game, continue to IGDB if available
    console.log(`${LOG_PREFIX} Not found in Wikidata, trying IGDB...`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Wikidata resolution failed for ${appid}:`, error);
    // Continue to IGDB fallback
  }

  // 4. Try IGDB if credentials are configured
  const tokenResult = await TokenManager?.getValidToken?.();

  if (tokenResult) {
    try {
      const igdbResult = await IGDBClient.resolvePlatformAvailability(
        appid,
        gameName,
        tokenResult.accessToken,
        tokenResult.clientId
      );

      if (igdbResult.found) {
        const entry = igdbResultToCacheEntry(appid, gameName, igdbResult);
        await Cache.saveToCache(entry);
        console.log(`${LOG_PREFIX} Resolved via IGDB: ${appid}`);
        return { entry, fromCache: false };
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} IGDB resolution failed for ${appid}:`, error);
    }
  }

  // 5. Fallback - unknown status with search URLs
  console.log(`${LOG_PREFIX} Using fallback for appid ${appid}`);
  const entry = createFallbackEntry(appid, gameName);
  await Cache.saveToCache(entry);
  return { entry, fromCache: false };
}

/**
 * Batch resolves platform availability for multiple games.
 * More efficient for bulk operations.
 *
 * @param {Array<{appid: string, gameName: string}>} games
 * @returns {Promise<Map<string, {entry: import('./types.js').CacheEntry, fromCache: boolean}>>}
 */
async function batchResolvePlatformData(games) {
  const Cache = globalThis.XCPW_Cache;
  const WikidataClient = globalThis.XCPW_WikidataClient;
  const TokenManager = globalThis.XCPW_TokenManager;
  const IGDBClient = globalThis.XCPW_IGDBClient;
  const results = new Map();

  // 1. Check cache for all games
  const uncached = [];
  for (const { appid, gameName } of games) {
    const cached = await Cache.getFromCache(appid);
    if (cached) {
      results.set(appid, { entry: cached, fromCache: true });
    } else {
      uncached.push({ appid, gameName });
    }
  }

  if (uncached.length === 0) {
    console.log(`${LOG_PREFIX} All ${games.length} games found in cache`);
    return results;
  }

  console.log(`${LOG_PREFIX} Batch resolving ${uncached.length} games (${games.length - uncached.length} cached)`);

  // 2. Check for manual overrides
  const needsResolution = [];
  for (const { appid, gameName } of uncached) {
    const override = Cache.MANUAL_OVERRIDES?.[appid];
    if (override) {
      const StoreUrls = getStoreUrls();
      const entry = {
        appid,
        gameName,
        platforms: {
          nintendo: { status: override.nintendo || 'unknown', storeUrl: StoreUrls.nintendo(gameName) },
          playstation: { status: override.playstation || 'unknown', storeUrl: StoreUrls.playstation(gameName) },
          xbox: { status: override.xbox || 'unknown', storeUrl: StoreUrls.xbox(gameName) }
        },
        source: 'manual',
        wikidataId: null,
        igdbId: null,
        resolvedAt: Date.now(),
        ttlDays: 7
      };
      await Cache.saveToCache(entry);
      results.set(appid, { entry, fromCache: false });
    } else {
      needsResolution.push({ appid, gameName });
    }
  }

  if (needsResolution.length === 0) {
    return results;
  }

  // 3. Batch query Wikidata
  const needsIGDB = [];
  try {
    const appIds = needsResolution.map(g => g.appid);
    const wikidataResults = await WikidataClient.batchQueryBySteamAppIds(appIds);

    for (const { appid, gameName } of needsResolution) {
      const wikidataResult = wikidataResults.get(appid);

      if (wikidataResult?.found) {
        const entry = wikidataResultToCacheEntry(appid, gameName, wikidataResult);
        await Cache.saveToCache(entry);
        results.set(appid, { entry, fromCache: false });
      } else {
        needsIGDB.push({ appid, gameName });
      }
    }

    console.log(`${LOG_PREFIX} Wikidata resolved ${needsResolution.length - needsIGDB.length} games`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Batch Wikidata resolution failed:`, error);
    needsIGDB.push(...needsResolution.filter(g => !results.has(g.appid)));
  }

  if (needsIGDB.length === 0) {
    return results;
  }

  // 4. Try IGDB for remaining games
  const tokenResult = await TokenManager?.getValidToken?.();

  if (tokenResult && needsIGDB.length > 0) {
    try {
      const igdbResults = await IGDBClient.batchResolvePlatformAvailability(
        needsIGDB,
        tokenResult.accessToken,
        tokenResult.clientId
      );

      for (const { appid, gameName } of needsIGDB) {
        const igdbResult = igdbResults.get(appid);
        if (igdbResult?.found) {
          const entry = igdbResultToCacheEntry(appid, gameName, igdbResult);
          await Cache.saveToCache(entry);
          results.set(appid, { entry, fromCache: false });
        }
      }

      console.log(`${LOG_PREFIX} IGDB resolved additional games`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Batch IGDB resolution failed:`, error);
    }
  }

  // 5. Fallback for remaining games
  for (const { appid, gameName } of needsIGDB) {
    if (!results.has(appid)) {
      const entry = createFallbackEntry(appid, gameName);
      await Cache.saveToCache(entry);
      results.set(appid, { entry, fromCache: false });
    }
  }

  return results;
}

/**
 * Checks if enhanced mode (IGDB) is available
 * @returns {Promise<boolean>}
 */
async function isEnhancedModeAvailable() {
  const TokenManager = globalThis.XCPW_TokenManager;
  return TokenManager?.hasCredentials?.() ?? false;
}

/**
 * Forces a refresh of platform data, bypassing cache
 * @param {string} appid
 * @param {string} gameName
 * @returns {Promise<{entry: import('./types.js').CacheEntry, fromCache: boolean}>}
 */
async function forceRefresh(appid, gameName) {
  const Cache = globalThis.XCPW_Cache;

  // Remove from cache first
  const cacheKey = `xcpw_cache_${appid}`;
  await chrome.storage.local.remove(cacheKey);

  // Resolve fresh
  return resolvePlatformData(appid, gameName);
}

// Export for service worker
globalThis.XCPW_Resolver = {
  resolvePlatformData,
  batchResolvePlatformData,
  isEnhancedModeAvailable,
  forceRefresh,
  createFallbackEntry
};
