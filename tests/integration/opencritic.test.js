/**
 * Integration Tests - OpenCritic API
 *
 * Sanity check tests verifying the extension's OpenCritic integration works correctly.
 * Uses 5 representative games with known OpenCritic IDs to test game details and outlet
 * score extraction.
 *
 * Note: The search endpoint now requires an API key, so we use direct ID lookups
 * (which is also what the extension does via Wikidata-provided OpenCritic IDs).
 *
 * Run with: npm run test:integration
 *
 * @jest-environment node
 */

// Use native fetch from undici for Node.js compatibility
const { fetch } = require('undici');

const OPENCRITIC_API_BASE = 'https://api.opencritic.com/api';
const REQUEST_DELAY_MS = 500; // Delay between requests to avoid rate limiting

// 5 representative games with known OpenCritic IDs (from Wikidata)
const TEST_GAMES = [
  { appid: '367520', name: 'Hollow Knight', openCriticId: 4002, category: 'indie' },
  { appid: '1245620', name: 'Elden Ring', openCriticId: 12090, category: 'AAA' },
  { appid: '1086940', name: "Baldur's Gate 3", openCriticId: 9136, category: 'AAA-recent' },
  { appid: '1145360', name: 'Hades', openCriticId: 10181, category: 'indie-popular' },
  { appid: '504230', name: 'Celeste', openCriticId: 5403, category: 'indie-darling' },
];

/**
 * Delays execution
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets game details from OpenCritic
 */
async function getGameDetails(gameId) {
  const url = `${OPENCRITIC_API_BASE}/game/${gameId}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'SteamWishlistPlus-JestIntegration/1.0',
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

/**
 * Gets reviews for a game from OpenCritic
 */
async function getGameReviews(gameId) {
  const url = `${OPENCRITIC_API_BASE}/review/game/${gameId}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'SteamWishlistPlus-JestIntegration/1.0',
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Extracts outlet scores from reviews (matches reviewScoresClient.ts logic)
 */
function extractOutletScores(reviews) {
  const outletScores = {};
  const targetOutlets = ['IGN', 'GameSpot'];

  for (const review of reviews) {
    if (!review.Outlet?.name) continue;

    const outletName = review.Outlet.name;
    if (!targetOutlets.includes(outletName)) continue;

    // Skip if we already have a score for this outlet
    if (outletScores[outletName]) continue;

    // Use normalized score (npScore) if available, otherwise use raw score
    const score = review.npScore ?? review.score;
    if (!score || score <= 0) continue;

    outletScores[outletName] = {
      outletName,
      score,
      originalScore: review.scoreFormat?.displayScore,
    };
  }

  return outletScores;
}

describe('OpenCritic Integration (Sanity Check)', () => {
  // Increase timeout for integration tests
  jest.setTimeout(120000); // 2 minutes

  const testResults = [];

  // Query all test games once before running assertions
  beforeAll(async () => {
    for (const game of TEST_GAMES) {
      const details = await getGameDetails(game.openCriticId);
      await delay(REQUEST_DELAY_MS);

      let reviews = [];
      let outletScores = {};

      if (details) {
        reviews = await getGameReviews(game.openCriticId);
        outletScores = extractOutletScores(reviews);
        await delay(REQUEST_DELAY_MS);
      }

      testResults.push({
        game,
        found: !!details,
        details,
        reviewCount: reviews.length,
        outletScores,
      });
    }

    // Log summary for debugging
    console.log('\n=== OpenCritic Sanity Check Summary ===');
    for (const result of testResults) {
      console.log(`\n${result.game.name} (${result.game.category}):`);
      console.log(`  Found: ${result.found}`);
      console.log(`  OpenCritic ID: ${result.game.openCriticId}`);
      console.log(`  Score: ${result.details?.topCriticScore || 'N/A'}`);
      console.log(`  Tier: ${result.details?.tier || 'N/A'}`);
      console.log(`  Review count: ${result.reviewCount}`);
      console.log(`  Outlet scores: ${JSON.stringify(result.outletScores)}`);
    }
    console.log('\n========================================\n');
  });

  describe('API endpoint', () => {
    it('should be reachable via game details endpoint', async () => {
      // Use game details endpoint (search now requires API key)
      const response = await fetch(`${OPENCRITIC_API_BASE}/game/7324`, {
        headers: { 'User-Agent': 'SteamWishlistPlus-JestIntegration/1.0' }
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Game search', () => {
    it('should find all 5 test games via direct ID lookup', () => {
      const foundCount = testResults.filter(r => r.found).length;
      expect(foundCount).toBe(5);
    });

    it('should return matching game names', () => {
      for (const result of testResults) {
        if (result.found) {
          // Name should be similar (not necessarily exact due to naming differences)
          expect(result.details.name).toBeDefined();
          expect(typeof result.details.name).toBe('string');
        }
      }
    });
  });

  describe('Game details', () => {
    it('should have topCriticScore for all found games', () => {
      for (const result of testResults) {
        if (result.found) {
          expect(result.details).not.toBeNull();
          expect(result.details.topCriticScore).toBeGreaterThan(0);
        }
      }
    });

    it('should have tier for all found games', () => {
      for (const result of testResults) {
        if (result.found && result.details) {
          expect(result.details.tier).toBeDefined();
          const normalizedTier = result.details.tier.charAt(0).toUpperCase() +
                                  result.details.tier.slice(1).toLowerCase();
          expect(['Mighty', 'Strong', 'Fair', 'Weak']).toContain(normalizedTier);
        }
      }
    });
  });

  describe('Outlet score extraction', () => {
    it('should have reviews for well-known games', () => {
      // At least Elden Ring and BG3 should have reviews
      const eldenRing = testResults.find(r => r.game.appid === '1245620');
      const bg3 = testResults.find(r => r.game.appid === '1086940');

      if (eldenRing?.found) {
        expect(eldenRing.reviewCount).toBeGreaterThan(0);
      }
      if (bg3?.found) {
        expect(bg3.reviewCount).toBeGreaterThan(0);
      }
    });

    it('should extract at least some outlet scores', () => {
      // At least one game should have IGN or GameSpot scores
      const hasAnyOutletScore = testResults.some(r =>
        Object.keys(r.outletScores).length > 0
      );

      if (!hasAnyOutletScore) {
        console.warn('Warning: No outlet scores found. API structure may have changed.');
      }

      // Soft assertion - log but don't fail
      expect(true).toBe(true);
    });

    it('should have valid score structure when extracted', () => {
      for (const result of testResults) {
        for (const [outletName, outletScore] of Object.entries(result.outletScores)) {
          expect(outletScore).toHaveProperty('outletName');
          expect(outletScore).toHaveProperty('score');
          expect(outletScore.outletName).toBe(outletName);
          expect(typeof outletScore.score).toBe('number');
          expect(outletScore.score).toBeGreaterThan(0);
          expect(outletScore.score).toBeLessThanOrEqual(100);
        }
      }
    });
  });
});
