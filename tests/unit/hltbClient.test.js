/**
 * Tests for hltbClient.js
 */

// Load the HLTB client
require('../../dist/hltbClient.js');

describe('hltbClient.js', () => {
  let HltbClient;

  beforeAll(() => {
    HltbClient = globalThis.XCPW_HltbClient;
  });

  describe('exports', () => {
    it('should export XCPW_HltbClient to globalThis', () => {
      expect(globalThis.XCPW_HltbClient).toBeDefined();
    });

    it('should export all required functions', () => {
      expect(HltbClient.queryByGameName).toBeInstanceOf(Function);
      expect(HltbClient.batchQueryByGameNames).toBeInstanceOf(Function);
      expect(HltbClient.formatHours).toBeInstanceOf(Function);
      expect(HltbClient.normalizeGameName).toBeInstanceOf(Function);
      expect(HltbClient.calculateSimilarity).toBeInstanceOf(Function);
    });
  });

  describe('formatHours', () => {
    it('should return empty string for 0', () => {
      expect(HltbClient.formatHours(0)).toBe('');
    });

    it('should return empty string for negative values', () => {
      expect(HltbClient.formatHours(-5)).toBe('');
    });

    it('should return empty string for null/undefined', () => {
      expect(HltbClient.formatHours(null)).toBe('');
      expect(HltbClient.formatHours(undefined)).toBe('');
    });

    it('should format hours under 10 with one decimal', () => {
      expect(HltbClient.formatHours(5.5)).toBe('5.5h');
      expect(HltbClient.formatHours(9.9)).toBe('9.9h');
    });

    it('should round hours 10-99 to whole numbers', () => {
      expect(HltbClient.formatHours(12.5)).toBe('13h');
      expect(HltbClient.formatHours(50.3)).toBe('50h');
    });

    it('should round hours >= 100 to whole numbers', () => {
      expect(HltbClient.formatHours(150.7)).toBe('151h');
      expect(HltbClient.formatHours(200)).toBe('200h');
    });
  });

  describe('normalizeGameName', () => {
    it('should convert to lowercase', () => {
      expect(HltbClient.normalizeGameName('HOLLOW KNIGHT')).toBe('hollowknight');
    });

    it('should remove special characters', () => {
      expect(HltbClient.normalizeGameName('Elden Ring: Shadow of the Erdtree')).toBe('eldenringshadowoftheerdtree');
    });

    it('should remove spaces and punctuation', () => {
      expect(HltbClient.normalizeGameName('The Witcher 3: Wild Hunt')).toBe('thewitcher3wildhunt');
    });

    it('should handle empty string', () => {
      expect(HltbClient.normalizeGameName('')).toBe('');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(HltbClient.calculateSimilarity('Hollow Knight', 'hollow knight')).toBe(1);
    });

    it('should return 1 for identical normalized strings', () => {
      expect(HltbClient.calculateSimilarity('Hollow-Knight', 'Hollow Knight')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      expect(HltbClient.calculateSimilarity('abcd', 'wxyz')).toBe(0);
    });

    it('should return 0 for empty strings', () => {
      expect(HltbClient.calculateSimilarity('', 'test')).toBe(0);
      expect(HltbClient.calculateSimilarity('test', '')).toBe(0);
    });

    it('should return high similarity for substring matches', () => {
      const similarity = HltbClient.calculateSimilarity('Hollow Knight', 'Hollow Knight: Silksong');
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should return high similarity when first string is longer (contains second)', () => {
      // Tests the branch where aNorm.length >= bNorm.length
      const similarity = HltbClient.calculateSimilarity('Hollow Knight: Silksong', 'Hollow Knight');
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should return positive similarity for similar strings', () => {
      const similarity = HltbClient.calculateSimilarity('Dark Souls', 'Dark Souls III');
      expect(similarity).toBeGreaterThan(0.3);
    });
  });

  describe('queryByGameName', () => {
    // Mock fetch for API calls
    let originalFetch;

    beforeAll(() => {
      originalFetch = global.fetch;
    });

    afterAll(() => {
      global.fetch = originalFetch;
    });

    it('should return null when API returns empty results', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] })
      });

      const result = await HltbClient.queryByGameName('NonExistentGame12345');
      expect(result).toBeNull();
    });

    it('should return null when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await HltbClient.queryByGameName('Test Game');
      expect(result).toBeNull();
    });

    it('should return null when API returns 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      const result = await HltbClient.queryByGameName('Test Game');
      expect(result).toBeNull();
    });

    it('should return parsed result when API returns match', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: [{
            game_id: 12345,
            game_name: 'Hollow Knight',
            comp_main: 90000, // 25 hours in seconds
            comp_plus: 144000, // 40 hours
            comp_100: 216000, // 60 hours
            comp_all: 150000,
            profile_steam: 367520
          }]
        })
      });

      const result = await HltbClient.queryByGameName('Hollow Knight', '367520');
      expect(result).toBeDefined();
      expect(result.hltbId).toBe(12345);
      expect(result.data.mainStory).toBe(25);
      expect(result.data.mainExtra).toBe(40);
      expect(result.data.completionist).toBe(60);
      expect(result.similarity).toBe(1); // Exact Steam ID match
    });

    it('should use fuzzy matching when no Steam ID match', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: [{
            game_id: 12345,
            game_name: 'Hollow Knight',
            comp_main: 90000,
            comp_plus: 144000,
            comp_100: 216000,
            comp_all: 150000,
            profile_steam: 0
          }]
        })
      });

      const result = await HltbClient.queryByGameName('Hollow Knight');
      expect(result).toBeDefined();
      expect(result.similarity).toBe(1); // Perfect name match
    });

    it('should reject matches below similarity threshold', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: [{
            game_id: 12345,
            game_name: 'Completely Different Game',
            comp_main: 90000,
            comp_plus: 144000,
            comp_100: 216000,
            comp_all: 150000,
            profile_steam: 0
          }]
        })
      });

      const result = await HltbClient.queryByGameName('Hollow Knight');
      expect(result).toBeNull();
    });

    it('should handle rate limiting with retry', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ ok: false, status: 429 });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            data: [{
              game_id: 12345,
              game_name: 'Test Game',
              comp_main: 36000,
              comp_plus: 72000,
              comp_100: 108000,
              comp_all: 72000,
              profile_steam: 0
            }]
          })
        });
      });

      const result = await HltbClient.queryByGameName('Test Game');
      expect(result).toBeDefined();
      expect(callCount).toBe(2);
    }, 10000);
  });

  describe('batchQueryByGameNames', () => {
    let originalFetch;

    beforeAll(() => {
      originalFetch = global.fetch;
    });

    afterAll(() => {
      global.fetch = originalFetch;
    });

    it('should return results for multiple games', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        const gameName = callCount === 1 ? 'Game One' : 'Game Two';
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            data: [{
              game_id: callCount,
              game_name: gameName,
              comp_main: 36000 * callCount,
              comp_plus: 72000,
              comp_100: 108000,
              comp_all: 72000,
              profile_steam: callCount * 100
            }]
          })
        });
      });

      const games = [
        { appid: '100', gameName: 'Game One' },
        { appid: '200', gameName: 'Game Two' }
      ];

      const results = await HltbClient.batchQueryByGameNames(games);
      expect(results.size).toBe(2);
      expect(results.has('100')).toBe(true);
      expect(results.has('200')).toBe(true);
    });

    it('should handle null results for games not found', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] })
      });

      const games = [{ appid: '12345', gameName: 'NonExistent Game' }];
      const results = await HltbClient.batchQueryByGameNames(games);

      expect(results.size).toBe(1);
      expect(results.get('12345')).toBeNull();
    });

    it('should handle empty games array', async () => {
      const results = await HltbClient.batchQueryByGameNames([]);
      expect(results.size).toBe(0);
    });

    it('should catch and return null for individual game errors', async () => {
      // First call succeeds, second throws
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              data: [{
                game_id: 1,
                game_name: 'Game One',
                comp_main: 36000,
                comp_plus: 72000,
                comp_100: 108000,
                comp_all: 72000,
                profile_steam: 100
              }]
            })
          });
        }
        throw new Error('Network failure');
      });

      const games = [
        { appid: '100', gameName: 'Game One' },
        { appid: '200', gameName: 'Game Two' }
      ];

      const results = await HltbClient.batchQueryByGameNames(games);
      expect(results.size).toBe(2);
      expect(results.get('100')).not.toBeNull();
      expect(results.get('200')).toBeNull();
    });
  });
});
