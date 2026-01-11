/**
 * Steam Cross-Platform Wishlist - Wikidata Client
 *
 * Queries Wikidata SPARQL endpoint for platform availability data.
 * No authentication required - works out of the box.
 * Only calls query.wikidata.org.
 */

const WIKIDATA_SPARQL_URL = 'https://query.wikidata.org/sparql';
const LOG_PREFIX = '[XCPW Wikidata]';

// Rate limiting - Wikidata asks for reasonable usage
const REQUEST_DELAY_MS = 100;
let lastRequestTime = 0;

// Wikidata Platform QIDs
const PLATFORM_QIDS = {
  // Nintendo
  SWITCH: 'Q19610114',

  // PlayStation
  PS4: 'Q5014725',
  PS5: 'Q63184502',

  // Xbox
  XBOX_ONE: 'Q13361286',
  XBOX_SERIES_X: 'Q64513817',
  XBOX_SERIES_S: 'Q98973368',

  // PC (for reference)
  WINDOWS: 'Q1406',
  MACOS: 'Q14116',
  LINUX: 'Q388',

  // Mobile
  IOS: 'Q48493',
  ANDROID: 'Q94'
};

// Wikidata Property IDs
const PROPERTIES = {
  STEAM_APP_ID: 'P1733',
  PLATFORM: 'P400',
  GOG_ID: 'P2725',
  EPIC_ID: 'P6278',
  PS_STORE_ID: 'P12069',
  XBOX_ID: 'P12465',
  ESHOP_ID: 'P8956',
  APP_STORE_ID: 'P3861',
  PLAY_STORE_ID: 'P3418',
  ITCH_ID: 'P7294'
};

// Store URL constructors
const STORE_URL_BUILDERS = {
  nintendo: (eshopId) => eshopId
    ? `https://www.nintendo.com/us/store/products/${eshopId}/`
    : null,
  playstation: (psStoreId) => psStoreId
    ? `https://store.playstation.com/en-us/product/${psStoreId}`
    : null,
  xbox: (xboxId) => xboxId
    ? `https://www.xbox.com/en-US/games/store/-/${xboxId}`
    : null,
  gog: (gogId) => gogId
    ? `https://www.gog.com/game/${gogId}`
    : null,
  epic: (epicId) => epicId
    ? `https://store.epicgames.com/en-US/p/${epicId}`
    : null,
  appStore: (appStoreId) => appStoreId
    ? `https://apps.apple.com/us/app/id${appStoreId}`
    : null,
  playStore: (playStoreId) => playStoreId
    ? `https://play.google.com/store/apps/details?id=${playStoreId}`
    : null,
  itch: (itchId) => itchId
    ? `https://${itchId}.itch.io/`
    : null
};

/**
 * @typedef {Object} WikidataResult
 * @property {string | null} wikidataId - Wikidata QID
 * @property {string} gameName - Game name from Wikidata
 * @property {boolean} found - Whether the game was found
 * @property {Object} platforms - Platform availability
 * @property {boolean} platforms.nintendo - Nintendo Switch availability
 * @property {boolean} platforms.playstation - PS4/PS5 availability
 * @property {boolean} platforms.xbox - Xbox One/Series availability
 * @property {Object} storeIds - Store IDs for URL construction
 * @property {string | null} storeIds.eshop - Nintendo eShop ID
 * @property {string | null} storeIds.psStore - PlayStation Store ID
 * @property {string | null} storeIds.xbox - Xbox Store ID
 * @property {string | null} storeIds.gog - GOG ID
 * @property {string | null} storeIds.epic - Epic Games Store ID
 */

/**
 * Delays execution to respect rate limits
 * @returns {Promise<void>}
 */
async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
}

/**
 * Executes a SPARQL query against Wikidata
 * @param {string} query - SPARQL query
 * @returns {Promise<Object | null>}
 */
async function executeSparqlQuery(query) {
  await rateLimit();

  try {
    const url = new URL(WIKIDATA_SPARQL_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'SteamCrossPlatformWishlist/0.3.0 (Chrome Extension)'
      }
    });

    if (!response.ok) {
      console.error(`${LOG_PREFIX} SPARQL query failed: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`${LOG_PREFIX} SPARQL query error:`, error);
    return null;
  }
}

/**
 * Queries Wikidata for a game by Steam App ID
 * @param {string} steamAppId - Steam application ID
 * @returns {Promise<WikidataResult>}
 */
async function queryBySteamAppId(steamAppId) {
  // SPARQL query to get game data by Steam App ID
  const query = `
    SELECT ?game ?gameLabel
           (GROUP_CONCAT(DISTINCT ?platformQID; separator=",") AS ?platforms)
           (SAMPLE(?eshopId) AS ?eshop)
           (SAMPLE(?psStoreId) AS ?psStore)
           (SAMPLE(?xboxId) AS ?xbox)
           (SAMPLE(?gogId) AS ?gog)
           (SAMPLE(?epicId) AS ?epic)
           (SAMPLE(?appStoreId) AS ?appStore)
           (SAMPLE(?playStoreId) AS ?playStore)
    WHERE {
      ?game wdt:${PROPERTIES.STEAM_APP_ID} "${steamAppId}" .

      OPTIONAL {
        ?game wdt:${PROPERTIES.PLATFORM} ?platform .
        BIND(STRAFTER(STR(?platform), "entity/") AS ?platformQID)
      }

      OPTIONAL { ?game wdt:${PROPERTIES.ESHOP_ID} ?eshopId . }
      OPTIONAL { ?game wdt:${PROPERTIES.PS_STORE_ID} ?psStoreId . }
      OPTIONAL { ?game wdt:${PROPERTIES.XBOX_ID} ?xboxId . }
      OPTIONAL { ?game wdt:${PROPERTIES.GOG_ID} ?gogId . }
      OPTIONAL { ?game wdt:${PROPERTIES.EPIC_ID} ?epicId . }
      OPTIONAL { ?game wdt:${PROPERTIES.APP_STORE_ID} ?appStoreId . }
      OPTIONAL { ?game wdt:${PROPERTIES.PLAY_STORE_ID} ?playStoreId . }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    GROUP BY ?game ?gameLabel
    LIMIT 1
  `;

  const result = await executeSparqlQuery(query);

  if (!result?.results?.bindings?.length) {
    console.log(`${LOG_PREFIX} No Wikidata match for Steam appid ${steamAppId}`);
    return {
      wikidataId: null,
      gameName: '',
      found: false,
      platforms: {
        nintendo: false,
        playstation: false,
        xbox: false
      },
      storeIds: {
        eshop: null,
        psStore: null,
        xbox: null,
        gog: null,
        epic: null,
        appStore: null,
        playStore: null
      }
    };
  }

  const binding = result.results.bindings[0];
  const platformQIDs = binding.platforms?.value?.split(',') || [];

  // Check platform availability
  const hasSwitch = platformQIDs.includes(PLATFORM_QIDS.SWITCH);
  const hasPS = platformQIDs.includes(PLATFORM_QIDS.PS4) ||
                platformQIDs.includes(PLATFORM_QIDS.PS5);
  const hasXbox = platformQIDs.includes(PLATFORM_QIDS.XBOX_ONE) ||
                  platformQIDs.includes(PLATFORM_QIDS.XBOX_SERIES_X) ||
                  platformQIDs.includes(PLATFORM_QIDS.XBOX_SERIES_S);

  // Extract Wikidata QID from URI
  const wikidataId = binding.game?.value
    ? binding.game.value.split('/').pop()
    : null;

  const gameResult = {
    wikidataId,
    gameName: binding.gameLabel?.value || '',
    found: true,
    platforms: {
      nintendo: hasSwitch,
      playstation: hasPS,
      xbox: hasXbox
    },
    storeIds: {
      eshop: binding.eshop?.value || null,
      psStore: binding.psStore?.value || null,
      xbox: binding.xbox?.value || null,
      gog: binding.gog?.value || null,
      epic: binding.epic?.value || null,
      appStore: binding.appStore?.value || null,
      playStore: binding.playStore?.value || null
    }
  };

  console.log(`${LOG_PREFIX} Found ${steamAppId} -> ${wikidataId}: NS=${hasSwitch}, PS=${hasPS}, XB=${hasXbox}`);

  return gameResult;
}

/**
 * Batch query multiple Steam App IDs
 * @param {string[]} steamAppIds - Array of Steam App IDs
 * @returns {Promise<Map<string, WikidataResult>>}
 */
async function batchQueryBySteamAppIds(steamAppIds) {
  const results = new Map();

  // Wikidata SPARQL doesn't handle large IN clauses well
  // Process in smaller batches
  const BATCH_SIZE = 20;

  for (let i = 0; i < steamAppIds.length; i += BATCH_SIZE) {
    const batch = steamAppIds.slice(i, i + BATCH_SIZE);

    // Build VALUES clause for batch query
    const valuesClause = batch.map(id => `"${id}"`).join(' ');

    const query = `
      SELECT ?steamId ?game ?gameLabel
             (GROUP_CONCAT(DISTINCT ?platformQID; separator=",") AS ?platforms)
             (SAMPLE(?eshopId) AS ?eshop)
             (SAMPLE(?psStoreId) AS ?psStore)
             (SAMPLE(?xboxId) AS ?xbox)
             (SAMPLE(?gogId) AS ?gog)
             (SAMPLE(?epicId) AS ?epic)
      WHERE {
        VALUES ?steamId { ${valuesClause} }
        ?game wdt:${PROPERTIES.STEAM_APP_ID} ?steamId .

        OPTIONAL {
          ?game wdt:${PROPERTIES.PLATFORM} ?platform .
          BIND(STRAFTER(STR(?platform), "entity/") AS ?platformQID)
        }

        OPTIONAL { ?game wdt:${PROPERTIES.ESHOP_ID} ?eshopId . }
        OPTIONAL { ?game wdt:${PROPERTIES.PS_STORE_ID} ?psStoreId . }
        OPTIONAL { ?game wdt:${PROPERTIES.XBOX_ID} ?xboxId . }
        OPTIONAL { ?game wdt:${PROPERTIES.GOG_ID} ?gogId . }
        OPTIONAL { ?game wdt:${PROPERTIES.EPIC_ID} ?epicId . }

        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?steamId ?game ?gameLabel
    `;

    const result = await executeSparqlQuery(query);

    if (result?.results?.bindings) {
      for (const binding of result.results.bindings) {
        const steamId = binding.steamId?.value;
        if (!steamId) continue;

        const platformQIDs = binding.platforms?.value?.split(',') || [];

        const hasSwitch = platformQIDs.includes(PLATFORM_QIDS.SWITCH);
        const hasPS = platformQIDs.includes(PLATFORM_QIDS.PS4) ||
                      platformQIDs.includes(PLATFORM_QIDS.PS5);
        const hasXbox = platformQIDs.includes(PLATFORM_QIDS.XBOX_ONE) ||
                        platformQIDs.includes(PLATFORM_QIDS.XBOX_SERIES_X) ||
                        platformQIDs.includes(PLATFORM_QIDS.XBOX_SERIES_S);

        const wikidataId = binding.game?.value
          ? binding.game.value.split('/').pop()
          : null;

        results.set(steamId, {
          wikidataId,
          gameName: binding.gameLabel?.value || '',
          found: true,
          platforms: {
            nintendo: hasSwitch,
            playstation: hasPS,
            xbox: hasXbox
          },
          storeIds: {
            eshop: binding.eshop?.value || null,
            psStore: binding.psStore?.value || null,
            xbox: binding.xbox?.value || null,
            gog: binding.gog?.value || null,
            epic: binding.epic?.value || null,
            appStore: null,
            playStore: null
          }
        });
      }
    }

    // Log progress
    if (steamAppIds.length > BATCH_SIZE) {
      console.log(`${LOG_PREFIX} Batch progress: ${Math.min(i + BATCH_SIZE, steamAppIds.length)}/${steamAppIds.length}`);
    }
  }

  // Mark unfound games
  for (const appId of steamAppIds) {
    if (!results.has(appId)) {
      results.set(appId, {
        wikidataId: null,
        gameName: '',
        found: false,
        platforms: { nintendo: false, playstation: false, xbox: false },
        storeIds: { eshop: null, psStore: null, xbox: null, gog: null, epic: null, appStore: null, playStore: null }
      });
    }
  }

  return results;
}

/**
 * Gets the store URL for a platform
 * @param {string} platform - 'nintendo', 'playstation', or 'xbox'
 * @param {Object} storeIds - Store IDs from Wikidata
 * @returns {string | null}
 */
function getStoreUrl(platform, storeIds) {
  switch (platform) {
    case 'nintendo':
      return STORE_URL_BUILDERS.nintendo(storeIds.eshop);
    case 'playstation':
      return STORE_URL_BUILDERS.playstation(storeIds.psStore);
    case 'xbox':
      return STORE_URL_BUILDERS.xbox(storeIds.xbox);
    default:
      return null;
  }
}

/**
 * Tests the Wikidata connection with a simple query
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function testConnection() {
  try {
    // Query for a well-known game (Portal 2 - Steam App ID 620)
    const result = await queryBySteamAppId('620');

    if (result.found) {
      return { success: true, message: 'Wikidata connection successful' };
    }
    return { success: true, message: 'Wikidata reachable (test game not found)' };
  } catch (error) {
    return { success: false, message: `Connection failed: ${error.message}` };
  }
}

// Export for service worker
globalThis.XCPW_WikidataClient = {
  queryBySteamAppId,
  batchQueryBySteamAppIds,
  getStoreUrl,
  testConnection,
  STORE_URL_BUILDERS,
  PLATFORM_QIDS
};
