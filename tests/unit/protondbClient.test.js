/**
 * Unit tests for protondbClient.js
 */

describe('protondbClient.js', () => {
  let ProtonDBClient;
  let originalFetch;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    // Store original fetch and mock it
    originalFetch = global.fetch;
    global.fetch = jest.fn();

    // Load the module fresh for each test
    require('../../src/protondbClient.js');
    ProtonDBClient = globalThis.XCPW_ProtonDBClient;
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  describe('queryByAppId', () => {
    it('should return empty result for empty appid', async () => {
      const result = await ProtonDBClient.queryByAppId('');

      expect(result.found).toBe(false);
      expect(result.tier).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('should return empty result for null appid', async () => {
      const result = await ProtonDBClient.queryByAppId(null);

      expect(result.found).toBe(false);
      expect(result.tier).toBe('unknown');
    });

    it('should return empty result for undefined appid', async () => {
      const result = await ProtonDBClient.queryByAppId(undefined);

      expect(result.found).toBe(false);
      expect(result.tier).toBe('unknown');
    });

    it('should query ProtonDB API with correct URL', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tier: 'gold', confidence: 0.8 })
      });

      const promise = ProtonDBClient.queryByAppId('12345');

      // Advance past rate limit delay
      await jest.advanceTimersByTimeAsync(350);
      await promise;

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.protondb.com/api/v1/reports/summaries/12345.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json'
          })
        })
      );
    });

    it('should return found result with tier and confidence', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          tier: 'platinum',
          confidence: 0.95,
          bestReportedTier: 'platinum'
        })
      });

      const promise = ProtonDBClient.queryByAppId('367520');
      await jest.advanceTimersByTimeAsync(350);
      const result = await promise;

      expect(result.found).toBe(true);
      expect(result.tier).toBe('platinum');
      expect(result.confidence).toBe(0.95);
      expect(result.bestReportedTier).toBe('platinum');
    });

    it('should normalize tier to lowercase', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tier: 'GOLD', confidence: 0.7 })
      });

      const promise = ProtonDBClient.queryByAppId('12345');
      await jest.advanceTimersByTimeAsync(350);
      const result = await promise;

      expect(result.tier).toBe('gold');
    });

    it('should return pending tier for 404 response', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      const promise = ProtonDBClient.queryByAppId('999999');
      await jest.advanceTimersByTimeAsync(350);
      const result = await promise;

      expect(result.found).toBe(false);
      expect(result.tier).toBe('pending');
    });

    it('should return empty result for other HTTP errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      const promise = ProtonDBClient.queryByAppId('12345');
      await jest.advanceTimersByTimeAsync(350);
      const result = await promise;

      expect(result.found).toBe(false);
      expect(result.tier).toBe('unknown');
    });

    it('should return empty result for network errors', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const promise = ProtonDBClient.queryByAppId('12345');
      await jest.advanceTimersByTimeAsync(350);
      const result = await promise;

      expect(result.found).toBe(false);
      expect(result.tier).toBe('unknown');
    });

    it('should handle missing confidence in response', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tier: 'gold' })
      });

      const promise = ProtonDBClient.queryByAppId('12345');
      await jest.advanceTimersByTimeAsync(350);
      const result = await promise;

      expect(result.found).toBe(true);
      expect(result.confidence).toBe(0);
    });

    it('should handle missing bestReportedTier in response', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tier: 'silver', confidence: 0.6 })
      });

      const promise = ProtonDBClient.queryByAppId('12345');
      await jest.advanceTimersByTimeAsync(350);
      const result = await promise;

      expect(result.bestReportedTier).toBeNull();
    });

    it('should rate limit sequential requests', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ tier: 'gold', confidence: 0.8 })
      });

      // Start two requests
      const promise1 = ProtonDBClient.queryByAppId('11111');
      const promise2 = ProtonDBClient.queryByAppId('22222');

      // First request should be pending
      expect(global.fetch).not.toHaveBeenCalled();

      // Advance past first delay
      await jest.advanceTimersByTimeAsync(350);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Advance past second delay
      await jest.advanceTimersByTimeAsync(350);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      await promise1;
      await promise2;
    });
  });

  describe('normalizeTier', () => {
    it('should normalize native tier', () => {
      expect(ProtonDBClient.normalizeTier('native')).toBe('native');
      expect(ProtonDBClient.normalizeTier('NATIVE')).toBe('native');
      expect(ProtonDBClient.normalizeTier('Native')).toBe('native');
    });

    it('should normalize platinum tier', () => {
      expect(ProtonDBClient.normalizeTier('platinum')).toBe('platinum');
      expect(ProtonDBClient.normalizeTier('PLATINUM')).toBe('platinum');
    });

    it('should normalize gold tier', () => {
      expect(ProtonDBClient.normalizeTier('gold')).toBe('gold');
      expect(ProtonDBClient.normalizeTier('GOLD')).toBe('gold');
    });

    it('should normalize silver tier', () => {
      expect(ProtonDBClient.normalizeTier('silver')).toBe('silver');
    });

    it('should normalize bronze tier', () => {
      expect(ProtonDBClient.normalizeTier('bronze')).toBe('bronze');
    });

    it('should normalize borked tier', () => {
      expect(ProtonDBClient.normalizeTier('borked')).toBe('borked');
    });

    it('should normalize pending tier', () => {
      expect(ProtonDBClient.normalizeTier('pending')).toBe('pending');
    });

    it('should return unknown for invalid tiers', () => {
      expect(ProtonDBClient.normalizeTier('invalid')).toBe('unknown');
      expect(ProtonDBClient.normalizeTier('foo')).toBe('unknown');
      expect(ProtonDBClient.normalizeTier('')).toBe('unknown');
    });

    it('should return unknown for undefined', () => {
      expect(ProtonDBClient.normalizeTier(undefined)).toBe('unknown');
    });

    it('should return unknown for null', () => {
      expect(ProtonDBClient.normalizeTier(null)).toBe('unknown');
    });
  });

  describe('getProtonDBUrl', () => {
    it('should return correct ProtonDB URL', () => {
      expect(ProtonDBClient.getProtonDBUrl('367520'))
        .toBe('https://www.protondb.com/app/367520');
    });

    it('should handle various appid formats', () => {
      expect(ProtonDBClient.getProtonDBUrl('12345'))
        .toBe('https://www.protondb.com/app/12345');
      expect(ProtonDBClient.getProtonDBUrl('1'))
        .toBe('https://www.protondb.com/app/1');
    });
  });

  describe('tierToStatus', () => {
    it('should return available for native tier', () => {
      expect(ProtonDBClient.tierToStatus('native')).toBe('available');
    });

    it('should return available for platinum tier', () => {
      expect(ProtonDBClient.tierToStatus('platinum')).toBe('available');
    });

    it('should return available for gold tier', () => {
      expect(ProtonDBClient.tierToStatus('gold')).toBe('available');
    });

    it('should return available for silver tier', () => {
      expect(ProtonDBClient.tierToStatus('silver')).toBe('available');
    });

    it('should return available for bronze tier', () => {
      expect(ProtonDBClient.tierToStatus('bronze')).toBe('available');
    });

    it('should return unavailable for borked tier', () => {
      expect(ProtonDBClient.tierToStatus('borked')).toBe('unavailable');
    });

    it('should return unknown for pending tier', () => {
      expect(ProtonDBClient.tierToStatus('pending')).toBe('unknown');
    });

    it('should return unknown for unknown tier', () => {
      expect(ProtonDBClient.tierToStatus('unknown')).toBe('unknown');
    });

    it('should return unknown for invalid tier', () => {
      expect(ProtonDBClient.tierToStatus('invalid')).toBe('unknown');
    });
  });

  describe('module export', () => {
    it('should export to globalThis.XCPW_ProtonDBClient', () => {
      expect(globalThis.XCPW_ProtonDBClient).toBeDefined();
      expect(typeof globalThis.XCPW_ProtonDBClient).toBe('object');
    });

    it('should export queryByAppId function', () => {
      expect(typeof globalThis.XCPW_ProtonDBClient.queryByAppId).toBe('function');
    });

    it('should export getProtonDBUrl function', () => {
      expect(typeof globalThis.XCPW_ProtonDBClient.getProtonDBUrl).toBe('function');
    });

    it('should export tierToStatus function', () => {
      expect(typeof globalThis.XCPW_ProtonDBClient.tierToStatus).toBe('function');
    });

    it('should export normalizeTier function', () => {
      expect(typeof globalThis.XCPW_ProtonDBClient.normalizeTier).toBe('function');
    });
  });
});
