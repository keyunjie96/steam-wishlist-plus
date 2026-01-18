/**
 * @jest-environment jsdom
 */

describe('removalSuggestions.js', () => {
  let RemovalSuggestions;

  beforeEach(() => {
    // Reset modules
    jest.resetModules();

    // Clear any existing global
    delete globalThis.XCPW_RemovalSuggestions;

    // Load the module
    require('../../dist/removalSuggestions.js');
    RemovalSuggestions = globalThis.XCPW_RemovalSuggestions;
  });

  describe('exports', () => {
    it('should export XCPW_RemovalSuggestions to globalThis', () => {
      expect(RemovalSuggestions).toBeDefined();
    });

    it('should export all required functions', () => {
      expect(RemovalSuggestions.analyzeItem).toBeInstanceOf(Function);
      expect(RemovalSuggestions.extractWishlistAge).toBeInstanceOf(Function);
      expect(RemovalSuggestions.extractReviewData).toBeInstanceOf(Function);
      expect(RemovalSuggestions.parseWishlistDate).toBeInstanceOf(Function);
      expect(RemovalSuggestions.reviewTextToScore).toBeInstanceOf(Function);
    });

    it('should export DEFAULT_SETTINGS', () => {
      expect(RemovalSuggestions.DEFAULT_SETTINGS).toBeDefined();
      expect(RemovalSuggestions.DEFAULT_SETTINGS.enabled).toBe(false);
      expect(RemovalSuggestions.DEFAULT_SETTINGS.minDaysOnWishlist).toBe(1095);
      expect(RemovalSuggestions.DEFAULT_SETTINGS.minReviewScore).toBe(40);
      expect(RemovalSuggestions.DEFAULT_SETTINGS.showReviewWarnings).toBe(true);
    });
  });

  describe('reviewTextToScore', () => {
    it('should return 97 for Overwhelmingly Positive', () => {
      expect(RemovalSuggestions.reviewTextToScore('Overwhelmingly Positive')).toBe(97);
    });

    it('should return 89 for Very Positive', () => {
      expect(RemovalSuggestions.reviewTextToScore('Very Positive')).toBe(89);
    });

    it('should return 75 for Mostly Positive', () => {
      expect(RemovalSuggestions.reviewTextToScore('Mostly Positive')).toBe(75);
    });

    it('should return 82 for Positive', () => {
      expect(RemovalSuggestions.reviewTextToScore('Positive')).toBe(82);
    });

    it('should return 55 for Mixed', () => {
      expect(RemovalSuggestions.reviewTextToScore('Mixed')).toBe(55);
    });

    it('should return 30 for Mostly Negative', () => {
      expect(RemovalSuggestions.reviewTextToScore('Mostly Negative')).toBe(30);
    });

    it('should return 15 for Negative', () => {
      expect(RemovalSuggestions.reviewTextToScore('Negative')).toBe(15);
    });

    it('should return 5 for Very Negative', () => {
      expect(RemovalSuggestions.reviewTextToScore('Very Negative')).toBe(5);
    });

    it('should return 5 for Overwhelmingly Negative', () => {
      expect(RemovalSuggestions.reviewTextToScore('Overwhelmingly Negative')).toBe(5);
    });

    it('should be case-insensitive', () => {
      expect(RemovalSuggestions.reviewTextToScore('VERY POSITIVE')).toBe(89);
      expect(RemovalSuggestions.reviewTextToScore('mixed')).toBe(55);
    });

    it('should return null for unrecognized text', () => {
      expect(RemovalSuggestions.reviewTextToScore('Unknown')).toBeNull();
      expect(RemovalSuggestions.reviewTextToScore('')).toBeNull();
    });
  });

  describe('parseWishlistDate', () => {
    it('should parse "Added on Jan 15, 2021" format', () => {
      const date = RemovalSuggestions.parseWishlistDate('Added on Jan 15, 2021');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2021);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });

    it('should parse date without "Added on" prefix', () => {
      const date = RemovalSuggestions.parseWishlistDate('Jan 15, 2021');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2021);
    });

    it('should parse "15 Jan 2021" format', () => {
      const date = RemovalSuggestions.parseWishlistDate('15 Jan 2021');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2021);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should return null for empty string', () => {
      expect(RemovalSuggestions.parseWishlistDate('')).toBeNull();
    });

    it('should return null for invalid date', () => {
      expect(RemovalSuggestions.parseWishlistDate('not a date')).toBeNull();
    });
  });

  describe('extractWishlistAge', () => {
    it('should extract age from "Added on" text', () => {
      const item = document.createElement('div');
      // Use a date 4 years ago
      const fourYearsAgo = new Date();
      fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
      const dateStr = fourYearsAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      item.innerHTML = `<span>Added on ${dateStr}</span>`;

      const age = RemovalSuggestions.extractWishlistAge(item);
      expect(age).toBeGreaterThanOrEqual(1460 - 5); // ~4 years in days, with tolerance
      expect(age).toBeLessThanOrEqual(1460 + 5);
    });

    it('should return null when no date found', () => {
      const item = document.createElement('div');
      item.innerHTML = '<span>Some game</span>';

      expect(RemovalSuggestions.extractWishlistAge(item)).toBeNull();
    });

    it('should look for date in class-based elements', () => {
      const item = document.createElement('div');
      const dateEl = document.createElement('span');
      dateEl.className = 'wishlist-date';
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      dateEl.textContent = twoYearsAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      item.appendChild(dateEl);

      const age = RemovalSuggestions.extractWishlistAge(item);
      expect(age).toBeGreaterThanOrEqual(725); // ~2 years in days
      expect(age).toBeLessThanOrEqual(735);
    });
  });

  describe('extractReviewData', () => {
    it('should extract review score from class-based element', () => {
      const item = document.createElement('div');
      const reviewEl = document.createElement('span');
      reviewEl.className = 'review-summary';
      reviewEl.textContent = 'Very Positive';
      item.appendChild(reviewEl);

      const result = RemovalSuggestions.extractReviewData(item);
      expect(result.score).toBe(89);
      expect(result.text).toBe('Very Positive');
    });

    it('should extract review score from title attribute', () => {
      const item = document.createElement('div');
      const reviewEl = document.createElement('span');
      reviewEl.className = 'review';
      reviewEl.setAttribute('title', 'Mixed');
      item.appendChild(reviewEl);

      const result = RemovalSuggestions.extractReviewData(item);
      expect(result.score).toBe(55);
      expect(result.text).toBe('Mixed');
    });

    it('should search text content for review keywords', () => {
      const item = document.createElement('div');
      item.textContent = 'User Reviews: Mostly Negative (1,234 reviews)';

      const result = RemovalSuggestions.extractReviewData(item);
      expect(result.score).toBe(30);
      expect(result.text).toBe('mostly negative');
    });

    it('should return null when no review found', () => {
      const item = document.createElement('div');
      item.innerHTML = '<span>Some game</span>';

      const result = RemovalSuggestions.extractReviewData(item);
      expect(result.score).toBeNull();
      expect(result.text).toBeNull();
    });
  });

  describe('analyzeItem', () => {
    it('should suggest removal for old wishlist item', () => {
      const item = document.createElement('div');
      // 4 years ago (1460 days)
      const fourYearsAgo = new Date();
      fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
      const dateStr = fourYearsAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      item.innerHTML = `<span>Added on ${dateStr}</span>`;

      const suggestion = RemovalSuggestions.analyzeItem(item);
      expect(suggestion.shouldSuggest).toBe(true);
      expect(suggestion.reasons).toContain('old_wishlist');
      expect(suggestion.score).toBeGreaterThan(0);
      expect(suggestion.details.daysOnWishlist).toBeGreaterThanOrEqual(1455);
    });

    it('should suggest removal for poor reviews', () => {
      const item = document.createElement('div');
      const reviewEl = document.createElement('span');
      reviewEl.className = 'review';
      reviewEl.textContent = 'Mostly Negative';
      item.appendChild(reviewEl);

      const suggestion = RemovalSuggestions.analyzeItem(item);
      expect(suggestion.shouldSuggest).toBe(true);
      expect(suggestion.reasons).toContain('poor_reviews');
      expect(suggestion.details.reviewScore).toBe(30);
      expect(suggestion.details.reviewText).toBe('Mostly Negative');
    });

    it('should not suggest removal for recent wishlist with good reviews', () => {
      const item = document.createElement('div');
      // 1 year ago
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const dateStr = oneYearAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      item.innerHTML = `<span>Added on ${dateStr}</span>`;

      const reviewEl = document.createElement('span');
      reviewEl.className = 'review';
      reviewEl.textContent = 'Very Positive';
      item.appendChild(reviewEl);

      const suggestion = RemovalSuggestions.analyzeItem(item);
      expect(suggestion.shouldSuggest).toBe(false);
      expect(suggestion.reasons).toHaveLength(0);
    });

    it('should combine multiple reasons', () => {
      const item = document.createElement('div');
      // 5 years ago
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      const dateStr = fiveYearsAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      item.innerHTML = `<span>Added on ${dateStr}</span>`;

      const reviewEl = document.createElement('span');
      reviewEl.className = 'review';
      reviewEl.textContent = 'Mostly Negative';
      item.appendChild(reviewEl);

      const suggestion = RemovalSuggestions.analyzeItem(item);
      expect(suggestion.shouldSuggest).toBe(true);
      expect(suggestion.reasons).toContain('old_wishlist');
      expect(suggestion.reasons).toContain('poor_reviews');
      // Score should be boosted for multiple reasons
      expect(suggestion.score).toBeGreaterThan(50);
    });

    it('should respect showReviewWarnings setting', () => {
      const item = document.createElement('div');
      const reviewEl = document.createElement('span');
      reviewEl.className = 'review';
      reviewEl.textContent = 'Mostly Negative';
      item.appendChild(reviewEl);

      const settings = {
        ...RemovalSuggestions.DEFAULT_SETTINGS,
        showReviewWarnings: false
      };

      const suggestion = RemovalSuggestions.analyzeItem(item, settings);
      expect(suggestion.shouldSuggest).toBe(false);
      expect(suggestion.reasons).not.toContain('poor_reviews');
    });

    it('should use custom minDaysOnWishlist threshold', () => {
      const item = document.createElement('div');
      // 2 years ago (730 days)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const dateStr = twoYearsAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      item.innerHTML = `<span>Added on ${dateStr}</span>`;

      // With default (3 years), should not suggest
      const defaultSuggestion = RemovalSuggestions.analyzeItem(item);
      expect(defaultSuggestion.shouldSuggest).toBe(false);

      // With 1 year threshold, should suggest
      const settings = {
        ...RemovalSuggestions.DEFAULT_SETTINGS,
        minDaysOnWishlist: 365 // 1 year
      };
      const customSuggestion = RemovalSuggestions.analyzeItem(item, settings);
      expect(customSuggestion.shouldSuggest).toBe(true);
      expect(customSuggestion.reasons).toContain('old_wishlist');
    });
  });
});
