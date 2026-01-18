/**
 * Steam Cross-Platform Wishlist - Removal Suggestions
 *
 * Analyzes wishlist items to surface games the user might want to remove.
 * Signals analyzed:
 * - Wishlist age (games added 3+ years ago)
 * - Review score (games with poor/negative reviews)
 *
 * This feature is opt-in and designed to be non-intrusive.
 */

import type { RemovalSuggestion, RemovalSettings, RemovalReason } from './types';

const DEBUG = false;
const LOG_PREFIX = '[XCPW Removal]';

/** Default settings for removal suggestions */
export const DEFAULT_SETTINGS: RemovalSettings = {
  enabled: false, // Opt-in by default
  minDaysOnWishlist: 1095, // 3 years
  minReviewScore: 40, // Below "Mixed" (typically 40-69%)
  showReviewWarnings: true
};

/** Milliseconds per day */
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Maps Steam review text to a numeric score (0-100).
 * Steam uses these categories:
 * - Overwhelmingly Positive (95-100%)
 * - Very Positive (85-94%)
 * - Positive (80-84%)
 * - Mostly Positive (70-79%)
 * - Mixed (40-69%)
 * - Mostly Negative (20-39%)
 * - Negative (10-19%)
 * - Very Negative (0-9%)
 * - Overwhelmingly Negative (0-9%)
 */
export function reviewTextToScore(text: string): number | null {
  const normalized = text.toLowerCase().trim();

  // Positive reviews
  if (normalized.includes('overwhelmingly positive')) return 97;
  if (normalized.includes('very positive')) return 89;
  if (normalized.includes('mostly positive')) return 75;
  if (normalized === 'positive' || normalized.includes('positive')) return 82;

  // Mixed
  if (normalized.includes('mixed')) return 55;

  // Negative reviews
  if (normalized.includes('overwhelmingly negative')) return 5;
  if (normalized.includes('very negative')) return 5;
  if (normalized.includes('mostly negative')) return 30;
  if (normalized === 'negative' || normalized.includes('negative')) return 15;

  return null;
}

/**
 * Parses a Steam wishlist date string into a Date object.
 * Steam formats: "Added on Jan 15, 2021" or "Added on 15 Jan 2021"
 */
export function parseWishlistDate(dateText: string): Date | null {
  if (!dateText) return null;

  // Remove "Added on " prefix if present
  const cleaned = dateText.replace(/^Added\s+on\s+/i, '').trim();

  // Try parsing directly
  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try common Steam formats
  // Format: "Jan 15, 2021" or "15 Jan 2021"
  const monthDayYearMatch = cleaned.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDayYearMatch) {
    const [, month, day, year] = monthDayYearMatch;
    const parsed = new Date(`${month} ${day}, ${year}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const dayMonthYearMatch = cleaned.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (dayMonthYearMatch) {
    const [, day, month, year] = dayMonthYearMatch;
    const parsed = new Date(`${month} ${day}, ${year}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

/**
 * Extracts the wishlist age (days since added) from a wishlist item.
 * Returns null if the date cannot be determined.
 */
export function extractWishlistAge(item: Element): number | null {
  // Look for "Added on" text in the item
  // Steam typically shows this as "Added on Jan 15, 2021"
  const textContent = item.textContent || '';

  // Match "Added on [date]" pattern
  const addedMatch = textContent.match(/Added\s+on\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
  if (addedMatch) {
    const date = parseWishlistDate(addedMatch[0]);
    if (date) {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      return Math.floor(diffMs / MS_PER_DAY);
    }
  }

  // Alternative: Look for date in a specific element
  const dateEl = item.querySelector('[class*="date"], [class*="added"], [class*="Date"], [class*="Added"]');
  if (dateEl) {
    const dateText = dateEl.textContent?.trim();
    if (dateText) {
      const date = parseWishlistDate(dateText);
      if (date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        return Math.floor(diffMs / MS_PER_DAY);
      }
    }
  }

  return null;
}

/**
 * Extracts review data from a wishlist item.
 * Returns the review score (0-100) and text description.
 */
export function extractReviewData(item: Element): { score: number | null; text: string | null } {
  // Look for review summary elements
  // Steam typically has class names containing "review"
  const reviewSelectors = [
    '[class*="review"]',
    '[class*="Review"]',
    '[data-tooltip*="review"]',
    '[title*="review"]',
    '[title*="Review"]'
  ];

  for (const selector of reviewSelectors) {
    const el = item.querySelector(selector);
    if (el) {
      const text = el.textContent?.trim() || el.getAttribute('title') || el.getAttribute('data-tooltip');
      if (text) {
        const score = reviewTextToScore(text);
        if (score !== null) {
          return { score, text };
        }
      }
    }
  }

  // Fallback: Search in all text content for review keywords
  const textContent = item.textContent || '';
  const reviewPatterns = [
    'overwhelmingly positive',
    'very positive',
    'mostly positive',
    'positive',
    'mixed',
    'mostly negative',
    'negative',
    'very negative',
    'overwhelmingly negative'
  ];

  for (const pattern of reviewPatterns) {
    if (textContent.toLowerCase().includes(pattern)) {
      const score = reviewTextToScore(pattern);
      if (score !== null) {
        return { score, text: pattern };
      }
    }
  }

  return { score: null, text: null };
}

/**
 * Analyzes a wishlist item and determines if it should be suggested for removal.
 * Returns analysis results including reasons and confidence score.
 */
export function analyzeItem(item: Element, settings: RemovalSettings = DEFAULT_SETTINGS): RemovalSuggestion {
  const reasons: RemovalReason[] = [];
  let score = 0;
  const details: RemovalSuggestion['details'] = {};

  // Check wishlist age
  const daysOnWishlist = extractWishlistAge(item);
  if (daysOnWishlist !== null) {
    details.daysOnWishlist = daysOnWishlist;
    if (daysOnWishlist >= settings.minDaysOnWishlist) {
      reasons.push('old_wishlist');
      // Score based on how much older than threshold
      const yearsPastThreshold = (daysOnWishlist - settings.minDaysOnWishlist) / 365;
      score += Math.min(50, 30 + yearsPastThreshold * 10);
      if (DEBUG) console.log(`${LOG_PREFIX} Old wishlist: ${daysOnWishlist} days (${Math.floor(daysOnWishlist / 365)} years)`);
    }
  }

  // Check review score
  if (settings.showReviewWarnings) {
    const reviewData = extractReviewData(item);
    if (reviewData.score !== null) {
      details.reviewScore = reviewData.score;
      details.reviewText = reviewData.text ?? undefined;
      if (reviewData.score < settings.minReviewScore) {
        reasons.push('poor_reviews');
        // Score based on how poor the reviews are
        const reviewPenalty = (settings.minReviewScore - reviewData.score) / settings.minReviewScore;
        score += Math.min(50, 20 + reviewPenalty * 30);
        if (DEBUG) console.log(`${LOG_PREFIX} Poor reviews: ${reviewData.score}% (${reviewData.text})`);
      }
    }
  }

  // Combine signals - multiple reasons increase confidence
  if (reasons.length > 1) {
    score = Math.min(100, score * 1.2);
  }

  const shouldSuggest = reasons.length > 0 && score >= 25;

  return {
    shouldSuggest,
    reasons,
    score: Math.round(score),
    details
  };
}

/**
 * Generates a human-readable tooltip for a removal suggestion.
 */
export function generateTooltip(suggestion: RemovalSuggestion): string {
  const parts: string[] = [];

  if (suggestion.details.daysOnWishlist !== undefined) {
    const years = Math.floor(suggestion.details.daysOnWishlist / 365);
    if (years >= 1) {
      parts.push(`On wishlist for ${years}+ year${years > 1 ? 's' : ''}`);
    }
  }

  if (suggestion.details.reviewText) {
    parts.push(`Reviews: ${suggestion.details.reviewText}`);
  }

  if (parts.length === 0) {
    return 'Consider removing from wishlist';
  }

  return parts.join(' | ');
}

// Export globally for content scripts
if (typeof globalThis !== 'undefined') {
  globalThis.XCPW_RemovalSuggestions = {
    analyzeItem,
    extractWishlistAge,
    extractReviewData,
    parseWishlistDate,
    reviewTextToScore,
    DEFAULT_SETTINGS
  };
}
