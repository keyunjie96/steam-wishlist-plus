/**
 * Unit tests for popup.js (Preact version)
 *
 * The popup is now a Preact app that renders into #app.
 * Tests set up the mount point and chrome mocks, then require the compiled bundle.
 */

describe('popup.js', () => {
  let appEl;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    // Set up the mount point for Preact
    document.body.textContent = '';
    appEl = document.createElement('div');
    appEl.id = 'app';
    document.body.appendChild(appEl);

    // Mock chrome.runtime.sendMessage
    chrome.runtime.sendMessage.mockClear();
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      count: 10,
      oldestEntry: Date.now() - 86400000 // 1 day ago
    });

    // Mock chrome.runtime.openOptionsPage
    chrome.runtime.openOptionsPage.mockClear();

    // Mock chrome.storage.sync
    chrome.storage.sync.get.mockClear();
    chrome.storage.sync.get.mockResolvedValue({
      scpwSettings: {
        showNintendo: true,
        showPlaystation: true,
        showXbox: false,
        showSteamDeck: true,
        showHltb: true,
        hltbDisplayStat: 'mainStory',
        showReviewScores: true,
        reviewScoreSource: 'opencritic'
      }
    });
    chrome.storage.sync.set.mockClear();
    chrome.storage.sync.set.mockResolvedValue();

    // Mock confirm dialog
    global.confirm = jest.fn(() => true);

    // Mock UserSettings (centralized settings from types.js)
    globalThis.SWP_UserSettings = {
      DEFAULT_USER_SETTINGS: {
        showNintendo: true,
        showPlaystation: true,
        showXbox: true,
        showSteamDeck: true,
        showHltb: true,
        hltbDisplayStat: 'mainStory',
        showReviewScores: true,
        reviewScoreSource: 'opencritic'
      },
      SETTING_CHECKBOX_IDS: {
        showNintendo: 'show-nintendo',
        showPlaystation: 'show-playstation',
        showXbox: 'show-xbox',
        showSteamDeck: 'show-steamdeck',
        showHltb: 'show-hltb',
        showReviewScores: 'show-review-scores'
      },
      USER_SETTING_KEYS: ['showNintendo', 'showPlaystation', 'showXbox', 'showSteamDeck', 'showHltb', 'hltbDisplayStat', 'showReviewScores', 'reviewScoreSource']
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.confirm;
  });

  // Preact uses requestAnimationFrame for scheduling effects.
  // With fake timers, rAF callbacks need ~16ms to fire (sinon treats rAF as 16ms timer).
  // Multiple rounds handle: effects → promise resolution → state update → re-render.
  async function flush() {
    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(50);
    }
  }

  // Helper to load popup and wait for Preact render cycle to complete
  async function loadPopup() {
    require('../../dist/preact-vendor.js');
    require('../../dist/popup.js');
    await flush();
  }

  // Helper to get rendered text content
  const getAppText = () => appEl.textContent;

  describe('initialization', () => {
    it('should render into #app element', async () => {
      await loadPopup();
      expect(appEl.children.length).toBeGreaterThan(0);
    });

    it('should render the header with title', async () => {
      await loadPopup();
      expect(getAppText()).toContain('Steam Wishlist Plus');
    });

    it('should load cache stats on init', async () => {
      await loadPopup();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_CACHE_STATS'
      });
    });

    it('should load settings from chrome.storage.sync on init', async () => {
      await loadPopup();
      expect(chrome.storage.sync.get).toHaveBeenCalledWith('scpwSettings');
    });
  });

  describe('loadCacheStats', () => {
    it('should display cache count on init', async () => {
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        count: 25,
        oldestEntry: Date.now()
      });

      await loadPopup();
      expect(getAppText()).toContain('25');
    });

    it('should display cache age in days and hours', async () => {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        count: 5,
        oldestEntry: oneDayAgo
      });

      await loadPopup();
      expect(getAppText()).toContain('1d 2h');
    });

    it('should display cache age in hours only when less than a day', async () => {
      const hoursAgo = Date.now() - (5 * 60 * 60 * 1000);
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        count: 3,
        oldestEntry: hoursAgo
      });

      await loadPopup();
      expect(getAppText()).toContain('5h');
    });

    it('should display <1h when cache is less than an hour old', async () => {
      const recentTime = Date.now() - (30 * 60 * 1000);
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        count: 2,
        oldestEntry: recentTime
      });

      await loadPopup();
      expect(getAppText()).toContain('<1h');
    });

    it('should display dash when no oldest entry', async () => {
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        count: 0,
        oldestEntry: null
      });

      await loadPopup();
      // Two dashes: one for cache count (0), and one for cache age
      const statValues = appEl.querySelectorAll('.swp-stat-value');
      const ageValue = statValues.length > 1 ? statValues[1].textContent : '';
      expect(ageValue).toBe('-');
    });

    it('should display question marks on error', async () => {
      chrome.runtime.sendMessage.mockRejectedValueOnce(new Error('Network error'));

      await loadPopup();
      expect(getAppText()).toContain('?');
    });

    it('should not update display when response.success is false', async () => {
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: false,
        count: 99,
        oldestEntry: Date.now()
      });

      await loadPopup();
      // Default dash values should remain
      const statValues = appEl.querySelectorAll('.swp-stat-value');
      expect(statValues[0].textContent).toBe('-');
    });

    it('should not update display when response is undefined', async () => {
      chrome.runtime.sendMessage.mockResolvedValueOnce(undefined);

      await loadPopup();
      const statValues = appEl.querySelectorAll('.swp-stat-value');
      expect(statValues[0].textContent).toBe('-');
    });
  });

  describe('clearCache', () => {
    it('should show confirmation dialog when clear cache button is clicked', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() }) // stats
        .mockResolvedValueOnce({ success: true }); // clear

      await loadPopup();

      const clearBtn = appEl.querySelector('.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Clear')
      );
    });

    it('should not clear cache if user cancels', async () => {
      global.confirm.mockReturnValueOnce(false);

      await loadPopup();

      const clearBtn = appEl.querySelector('.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({
        type: 'CLEAR_CACHE'
      });
    });

    it('should send CLEAR_CACHE message when confirmed', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() }) // stats
        .mockResolvedValueOnce({ success: true }); // clear

      await loadPopup();

      const clearBtn = appEl.querySelector('.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CLEAR_CACHE'
      });
    });

    it('should show success status on successful clear', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true, count: 0, oldestEntry: null });

      await loadPopup();

      const clearBtn = appEl.querySelector('.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(getAppText()).toContain('cleared');
    });

    it('should show error status on failed clear', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: false });

      await loadPopup();

      const clearBtn = appEl.querySelector('.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(getAppText()).toContain('Failed');
    });

    it('should show error status on exception', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockRejectedValueOnce(new Error('Network error'));

      await loadPopup();

      const clearBtn = appEl.querySelector('.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(getAppText()).toContain('Failed');
    });

    it('should disable button while loading', async () => {
      let resolveMessage;
      const messagePromise = new Promise(resolve => {
        resolveMessage = resolve;
      });

      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockReturnValueOnce(messagePromise);

      await loadPopup();

      const clearBtn = appEl.querySelector('.swp-btn-danger');
      clearBtn.click();
      await flush();

      // Button should be disabled during loading
      const disabledBtn = appEl.querySelector('.swp-btn-danger[disabled]');
      expect(disabledBtn).toBeTruthy();

      resolveMessage({ success: true });
      await flush();
    });

    it('should show loading text while loading', async () => {
      let resolveMessage;
      const messagePromise = new Promise(resolve => {
        resolveMessage = resolve;
      });

      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockReturnValueOnce(messagePromise);

      await loadPopup();

      const clearBtn = appEl.querySelector('.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(clearBtn.textContent).toContain('Loading');

      resolveMessage({ success: true });
      await flush();
    });

    it('should restore original button text after loading', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true, count: 0, oldestEntry: null });

      await loadPopup();

      const clearBtn = appEl.querySelector('.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(clearBtn.textContent).toContain('Clear Cache');
    });

    it('should refresh stats after clearing cache', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true, count: 0, oldestEntry: null });

      await loadPopup();

      const clearBtn = appEl.querySelector('.swp-btn-danger');
      clearBtn.click();
      await flush();

      const calls = chrome.runtime.sendMessage.mock.calls;
      expect(calls.some(call => call[0].type === 'CLEAR_CACHE')).toBe(true);
      expect(calls.filter(call => call[0].type === 'GET_CACHE_STATS').length).toBeGreaterThanOrEqual(2);
    });

    it('should auto-hide status after duration', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true, count: 0, oldestEntry: null });

      await loadPopup();

      const clearBtn = appEl.querySelector('.swp-btn-danger');
      clearBtn.click();
      await flush();

      // Status should be visible
      expect(appEl.querySelector('.swp-status')).toBeTruthy();

      // Advance past the 3 second status duration
      await jest.advanceTimersByTimeAsync(3500);
      await flush();

      // Status should be hidden (Preact removes it from DOM)
      expect(appEl.querySelector('.swp-status')).toBeFalsy();
    });
  });

  describe('openOptionsPage', () => {
    it('should call chrome.runtime.openOptionsPage when settings button clicked', async () => {
      await loadPopup();

      const settingsBtn = appEl.querySelector('.swp-settings-btn');
      settingsBtn.click();
      await flush();

      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });

  describe('platform toggles', () => {
    it('should set checkbox states based on loaded settings', async () => {
      chrome.storage.sync.get.mockResolvedValueOnce({
        scpwSettings: {
          showNintendo: true,
          showPlaystation: false,
          showXbox: true,
          showSteamDeck: false,
          showHltb: true,
          hltbDisplayStat: 'mainStory',
          showReviewScores: true,
          reviewScoreSource: 'opencritic'
        }
      });

      await loadPopup();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      // 6 toggles: Nintendo, PlayStation, Xbox, Steam Deck, Play Time, Reviews
      expect(checkboxes.length).toBe(6);

      // Nintendo (checked), PlayStation (unchecked), Xbox (checked), Steam Deck (unchecked), Play Time (checked), Reviews (checked)
      expect(checkboxes[0].checked).toBe(true);  // Nintendo
      expect(checkboxes[1].checked).toBe(false); // PlayStation
      expect(checkboxes[2].checked).toBe(true);  // Xbox
      expect(checkboxes[3].checked).toBe(false); // Steam Deck
      expect(checkboxes[4].checked).toBe(true);  // Play Time
      expect(checkboxes[5].checked).toBe(true);  // Reviews
    });

    it('should use default settings when none are stored', async () => {
      chrome.storage.sync.get.mockResolvedValueOnce({});

      await loadPopup();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(6);
      // All defaults are true
      for (const checkbox of checkboxes) {
        expect(checkbox.checked).toBe(true);
      }
    });

    it('should save settings when a platform toggle is changed', async () => {
      await loadPopup();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      // Click the first toggle (Nintendo)
      checkboxes[0].click();
      await flush();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({
          showNintendo: false
        })
      });
    });

    it('should save settings when an info toggle is changed', async () => {
      await loadPopup();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      // Click the Play Time toggle (index 4, first info toggle)
      checkboxes[4].click();
      await flush();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({
          showHltb: false
        })
      });
    });

    it('should show success status when settings are saved', async () => {
      await loadPopup();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      checkboxes[0].click();
      await flush();

      expect(getAppText()).toContain('saved');
    });

    it('should show error status when settings fail to save', async () => {
      await loadPopup();

      chrome.storage.sync.set.mockRejectedValueOnce(new Error('Storage error'));

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      checkboxes[0].click();
      await flush();

      expect(getAppText()).toContain('Failed');
    });

    it('should handle loadSettings error gracefully', async () => {
      chrome.storage.sync.get.mockRejectedValueOnce(new Error('Storage error'));

      await loadPopup();

      // Should not throw - renders with defaults
      expect(appEl.children.length).toBeGreaterThan(0);
    });

    it('should render toggle labels correctly', async () => {
      await loadPopup();

      const text = getAppText();
      expect(text).toContain('Switch');
      expect(text).toContain('PlayStation');
      expect(text).toContain('Xbox');
      expect(text).toContain('Steam Deck');
      expect(text).toContain('Play Time');
      expect(text).toContain('Reviews');
    });

    it('should render section titles', async () => {
      await loadPopup();

      const text = getAppText();
      expect(text).toContain('Platforms');
      expect(text).toContain('Game Info');
    });
  });
});
