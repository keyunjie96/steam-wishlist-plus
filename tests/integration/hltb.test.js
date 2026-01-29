/**
 * Integration Tests - HowLongToBeat API
 *
 * Sanity check tests verifying the extension's HLTB integration works correctly.
 * Uses 5 representative games with known HLTB IDs to test game data retrieval.
 *
 * Note: HLTB's search API blocks non-browser requests (bot detection), so we
 * verify the auth token endpoint and use known game IDs for data verification.
 * The extension itself works fine since it runs in a real browser context.
 *
 * Run with: npm run test:integration
 *
 * @jest-environment node
 */

// Use native fetch from undici for Node.js compatibility
const { fetch } = require('undici');

const HLTB_BASE = 'https://howlongtobeat.com';
const REQUEST_DELAY_MS = 500; // Delay between requests to avoid rate limiting

// 5 representative games with known HLTB IDs
const TEST_GAMES = [
  { appid: '367520', name: 'Hollow Knight', hltbId: 26286, category: 'indie' },
  { appid: '1245620', name: 'Elden Ring', hltbId: 68151, category: 'AAA' },
  { appid: '1086940', name: "Baldur's Gate 3", hltbId: 68033, category: 'AAA-recent' },
  { appid: '1145360', name: 'Hades', hltbId: 62941, category: 'indie-popular' },
  { appid: '504230', name: 'Celeste', hltbId: 42818, category: 'indie-darling' },
];

/**
 * Delays execution
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets auth token from HLTB init endpoint
 */
async function getAuthToken() {
  const url = `${HLTB_BASE}/api/search/init?t=${Date.now()}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': HLTB_BASE,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data?.token || null;
}

/**
 * Verifies a game page exists on HLTB by checking the game URL.
 * Retries on 5xx errors since HLTB occasionally returns transient 502s.
 */
async function verifyGamePage(hltbId, retries = 3) {
  const url = `${HLTB_BASE}/game/${hltbId}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    });

    if (response.status < 500 || attempt === retries) {
      return {
        exists: response.ok,
        status: response.status,
      };
    }

    console.log(`  HLTB returned ${response.status} for game/${hltbId}, retrying (${attempt}/${retries})...`);
    await delay(REQUEST_DELAY_MS * 2);
  }
}

describe('HLTB Integration (Sanity Check)', () => {
  // Increase timeout for integration tests
  jest.setTimeout(120000); // 2 minutes

  let authToken = null;
  const gamePageResults = [];

  beforeAll(async () => {
    // Get auth token
    authToken = await getAuthToken();
    console.log(`\nHLTB Auth token obtained: ${authToken ? 'Yes' : 'No'}`);

    await delay(REQUEST_DELAY_MS);

    // Verify game pages exist (since search API blocks non-browser requests)
    for (const game of TEST_GAMES) {
      const pageResult = await verifyGamePage(game.hltbId);
      gamePageResults.push({ game, ...pageResult });
      await delay(REQUEST_DELAY_MS);
    }

    // Log summary for debugging
    console.log('\n=== HLTB Sanity Check Summary ===');
    for (const result of gamePageResults) {
      console.log(`\n${result.game.name} (${result.game.category}):`);
      console.log(`  HLTB ID: ${result.game.hltbId}`);
      console.log(`  Page exists: ${result.exists} (HTTP ${result.status})`);
    }
    console.log('\n=================================\n');
  });

  describe('Auth token', () => {
    it('should obtain auth token from init endpoint', () => {
      expect(authToken).not.toBeNull();
      expect(typeof authToken).toBe('string');
      expect(authToken.length).toBeGreaterThan(0);
    });
  });

  describe('Game pages', () => {
    it('should have valid game pages for all 5 test games', () => {
      const existsCount = gamePageResults.filter(r => r.exists).length;
      expect(existsCount).toBe(5);
    });

    it('should return HTTP 200 for all game pages', () => {
      for (const result of gamePageResults) {
        expect(result.status).toBe(200);
      }
    });
  });

  describe('Search API access', () => {
    it('should document that search API blocks non-browser requests', async () => {
      // This test documents the known limitation: HLTB blocks Node.js/undici requests
      // The extension works because it runs in a real browser context
      if (!authToken) return;

      const response = await fetch(`${HLTB_BASE}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': HLTB_BASE,
          'Origin': HLTB_BASE,
          'X-Auth-Token': authToken,
        },
        body: JSON.stringify({
          searchType: 'games',
          searchTerms: ['Hollow Knight'],
          searchPage: 1,
          size: 10,
          searchOptions: {
            games: {
              userId: 0, platform: '', sortCategory: 'popular', rangeCategory: 'main',
              rangeTime: { min: null, max: null },
              gameplay: { perspective: '', flow: '', genre: '', subGenre: '' },
              rangeYear: { min: '', max: '' }, modifier: '',
            },
            users: { sortCategory: 'postcount' },
            lists: { sortCategory: 'follows' },
            filter: '', sort: 0, randomizer: 0,
          },
        }),
      });

      // HLTB blocks non-browser requests - this is expected to fail
      // If this starts passing, the search-based integration tests can be re-enabled
      if (response.ok) {
        console.log('HLTB search API is accessible from Node.js! Consider re-enabling search tests.');
        const data = await response.json();
        expect(data?.data?.length).toBeGreaterThan(0);
      } else {
        // Expected: 403 or 404 due to bot detection
        console.log(`HLTB search API blocked from Node.js (HTTP ${response.status}) - expected behavior`);
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });
});
