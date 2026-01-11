/**
 * Steam Cross-Platform Wishlist - Options Page
 *
 * Handles the options UI for managing the cache.
 */

// DOM Elements
const statusEl = document.getElementById('status');
const cacheCountEl = document.getElementById('cache-count');
const cacheAgeEl = document.getElementById('cache-age');
const refreshStatsBtn = document.getElementById('refresh-stats-btn');
const clearCacheBtn = document.getElementById('clear-cache-btn');

/**
 * Shows a status message
 * @param {string} message
 * @param {'success' | 'error'} type
 */
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

/**
 * Sets loading state on a button
 * @param {HTMLButtonElement} button
 * @param {boolean} loading
 */
function setButtonLoading(button, loading) {
  button.disabled = loading;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.innerHTML = '<span class="loading"></span>Loading...';
  } else if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
  }
}

/**
 * Loads cache statistics
 */
async function loadCacheStats() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CACHE_STATS'
    });

    if (response?.success) {
      cacheCountEl.textContent = response.count.toString();

      if (response.oldestEntry) {
        const age = Date.now() - response.oldestEntry;
        const days = Math.floor(age / (1000 * 60 * 60 * 24));
        const hours = Math.floor((age % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) {
          cacheAgeEl.textContent = `${days}d ${hours}h`;
        } else if (hours > 0) {
          cacheAgeEl.textContent = `${hours}h`;
        } else {
          cacheAgeEl.textContent = '<1h';
        }
      } else {
        cacheAgeEl.textContent = '-';
      }
    }
  } catch (error) {
    console.error('Error loading cache stats:', error);
    cacheCountEl.textContent = '?';
    cacheAgeEl.textContent = '?';
  }
}

/**
 * Clears the cache
 */
async function clearCache() {
  if (!confirm('Are you sure you want to clear the cache? All games will need to be re-resolved.')) {
    return;
  }

  setButtonLoading(clearCacheBtn, true);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CLEAR_CACHE'
    });

    if (response?.success) {
      showStatus('Cache cleared successfully.', 'success');
      await loadCacheStats();
    } else {
      showStatus('Failed to clear cache.', 'error');
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    showStatus('Failed to clear cache.', 'error');
  } finally {
    setButtonLoading(clearCacheBtn, false);
  }
}

// Event Listeners
refreshStatsBtn.addEventListener('click', loadCacheStats);
clearCacheBtn.addEventListener('click', clearCache);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadCacheStats();
});
