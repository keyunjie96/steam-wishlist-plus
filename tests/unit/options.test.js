/**
 * Unit tests for options.js (Preact version)
 *
 * The options page is now a Preact app that renders into #app.
 * Tests set up the mount point and chrome mocks, then require the compiled bundle.
 */

describe('options.js', () => {
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

    // Mock chrome.runtime.getManifest
    chrome.runtime.getManifest = jest.fn().mockReturnValue({ version: '0.8.0' });

    // Mock chrome.storage.sync
    chrome.storage.sync.get.mockClear();
    chrome.storage.sync.set.mockClear();
    chrome.storage.sync.get.mockResolvedValue({});
    chrome.storage.sync.set.mockResolvedValue();

    // Mock confirm dialog
    global.confirm = jest.fn(() => true);

    // Mock URL methods
    global.URL.createObjectURL = jest.fn().mockReturnValue('blob:test-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock UserSettings (centralized settings from types.js)
    globalThis.SWP_UserSettings = {
      DEFAULT_USER_SETTINGS: {
        showNintendo: true,
        showPlaystation: true,
        showXbox: true,
        showSteamDeck: true,
        showHltb: true,
        hltbDisplayStat: 'mainStory',
        showReviewScores: false,
        reviewScoreSource: 'opencritic',
        openCriticApiKey: ''
      },
      SETTING_CHECKBOX_IDS: {
        showNintendo: 'show-nintendo',
        showPlaystation: 'show-playstation',
        showXbox: 'show-xbox',
        showSteamDeck: 'show-steamdeck',
        showHltb: 'show-hltb',
        showReviewScores: 'show-review-scores'
      },
      SETTING_SELECT_IDS: {
        hltbDisplayStat: {
          elementId: 'hltb-display-stat',
          visibilityKey: 'showHltb'
        },
        reviewScoreSource: {
          elementId: 'review-score-source',
          visibilityKey: 'showReviewScores'
        }
      },
      USER_SETTING_KEYS: ['showNintendo', 'showPlaystation', 'showXbox', 'showSteamDeck', 'showHltb', 'hltbDisplayStat', 'showReviewScores', 'reviewScoreSource', 'openCriticApiKey']
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

  // Helper to load options and wait for Preact render cycle to complete
  async function loadOptions() {
    require('../../dist/preact-vendor.js');
    require('../../dist/options.js');
    await flush();
  }

  const getAppText = () => appEl.textContent;

  describe('initialization', () => {
    it('should render into #app element', async () => {
      await loadOptions();
      expect(appEl.children.length).toBeGreaterThan(0);
    });

    it('should render the header with title', async () => {
      await loadOptions();
      expect(getAppText()).toContain('Steam Wishlist Plus');
    });

    it('should display version number', async () => {
      await loadOptions();
      expect(getAppText()).toContain('Version 0.8.0');
    });

    it('should load cache stats on init', async () => {
      await loadOptions();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_CACHE_STATS'
      });
    });

    it('should load settings from chrome.storage.sync on init', async () => {
      await loadOptions();
      expect(chrome.storage.sync.get).toHaveBeenCalledWith('scpwSettings');
    });
  });

  describe('loadCacheStats', () => {
    it('should display cache count', async () => {
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        count: 25,
        oldestEntry: Date.now()
      });

      await loadOptions();
      expect(getAppText()).toContain('25');
    });

    it('should display cache age in days and hours', async () => {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        count: 5,
        oldestEntry: oneDayAgo
      });

      await loadOptions();
      expect(getAppText()).toContain('1d 2h');
    });

    it('should display cache age in hours only when less than a day', async () => {
      const hoursAgo = Date.now() - (5 * 60 * 60 * 1000);
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        count: 3,
        oldestEntry: hoursAgo
      });

      await loadOptions();
      expect(getAppText()).toContain('5h');
    });

    it('should display <1h when cache is less than an hour old', async () => {
      const recentTime = Date.now() - (30 * 60 * 1000);
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        count: 2,
        oldestEntry: recentTime
      });

      await loadOptions();
      expect(getAppText()).toContain('<1h');
    });

    it('should display dash when no oldest entry', async () => {
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        count: 0,
        oldestEntry: null
      });

      await loadOptions();
      const statValues = appEl.querySelectorAll('.swp-stat-value');
      const ageValue = statValues.length > 1 ? statValues[1].textContent : '';
      expect(ageValue).toBe('-');
    });

    it('should display question marks on error', async () => {
      chrome.runtime.sendMessage.mockRejectedValueOnce(new Error('Network error'));

      await loadOptions();
      expect(getAppText()).toContain('?');
    });

    it('should not update display when response.success is false', async () => {
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: false,
        count: 99,
        oldestEntry: Date.now()
      });

      await loadOptions();
      const statValues = appEl.querySelectorAll('.swp-stat-value');
      expect(statValues[0].textContent).toBe('-');
    });

    it('should not update display when response is undefined', async () => {
      chrome.runtime.sendMessage.mockResolvedValueOnce(undefined);

      await loadOptions();
      const statValues = appEl.querySelectorAll('.swp-stat-value');
      expect(statValues[0].textContent).toBe('-');
    });

    it('should refresh stats when refresh button is clicked', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: true, count: 20, oldestEntry: Date.now() });

      await loadOptions();

      const refreshBtn = appEl.querySelector('.swp-btn-secondary');
      refreshBtn.click();
      await flush();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_CACHE_STATS'
      });
    });
  });

  describe('clearCache', () => {
    it('should show confirmation dialog', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: true });

      await loadOptions();

      const clearBtn = appEl.querySelector('.swp-btn-full.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure')
      );
    });

    it('should not clear cache if user cancels', async () => {
      global.confirm.mockReturnValueOnce(false);

      await loadOptions();

      const clearBtn = appEl.querySelector('.swp-btn-full.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({
        type: 'CLEAR_CACHE'
      });
    });

    it('should send CLEAR_CACHE message when confirmed', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: true });

      await loadOptions();

      const clearBtn = appEl.querySelector('.swp-btn-full.swp-btn-danger');
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

      await loadOptions();

      const clearBtn = appEl.querySelector('.swp-btn-full.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(getAppText()).toContain('cleared successfully');
    });

    it('should show error status on failed clear', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: false });

      await loadOptions();

      const clearBtn = appEl.querySelector('.swp-btn-full.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(getAppText()).toContain('Failed');
    });

    it('should show error status on exception', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockRejectedValueOnce(new Error('Network error'));

      await loadOptions();

      const clearBtn = appEl.querySelector('.swp-btn-full.swp-btn-danger');
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

      await loadOptions();

      const clearBtn = appEl.querySelector('.swp-btn-full.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(clearBtn.disabled).toBe(true);

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

      await loadOptions();

      const clearBtn = appEl.querySelector('.swp-btn-full.swp-btn-danger');
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

      await loadOptions();

      const clearBtn = appEl.querySelector('.swp-btn-full.swp-btn-danger');
      clearBtn.click();
      await flush();

      expect(clearBtn.textContent).toContain('Clear Cache');
    });

    it('should refresh stats after clearing cache', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true, count: 0, oldestEntry: null });

      await loadOptions();

      const clearBtn = appEl.querySelector('.swp-btn-full.swp-btn-danger');
      clearBtn.click();
      await flush();

      const calls = chrome.runtime.sendMessage.mock.calls;
      expect(calls.some(call => call[0].type === 'CLEAR_CACHE')).toBe(true);
      expect(calls.filter(call => call[0].type === 'GET_CACHE_STATS').length).toBeGreaterThanOrEqual(2);
    });

    it('should auto-hide cache status after duration', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 10, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true, count: 0, oldestEntry: null });

      await loadOptions();

      const clearBtn = appEl.querySelector('.swp-btn-full.swp-btn-danger');
      clearBtn.click();
      await flush();

      // Cache status should be visible
      expect(getAppText()).toContain('cleared successfully');

      // Advance past the 3 second cache status duration
      await jest.advanceTimersByTimeAsync(3500);
      await flush();

      // Cache status should be hidden
      expect(getAppText()).not.toContain('cleared successfully');
    });
  });

  describe('exportCache', () => {
    it('should request cache export when export button is clicked', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 1, oldestEntry: Date.now() })
        .mockResolvedValueOnce({ success: true, data: [{ appid: '123', gameName: 'Game A' }] });

      await loadOptions();

      // Export button is the second .swp-btn-secondary
      const buttons = appEl.querySelectorAll('.swp-btn-secondary');
      const exportBtn = buttons[1]; // Second button is Export
      exportBtn.click();
      await flush();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'GET_CACHE_EXPORT' });
    });

    it('should show error when export fails', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 0, oldestEntry: null })
        .mockResolvedValueOnce({ success: false });

      await loadOptions();

      const buttons = appEl.querySelectorAll('.swp-btn-secondary');
      const exportBtn = buttons[1];
      exportBtn.click();
      await flush();

      expect(getAppText()).toContain('Failed to export cache.');
    });

    it('should show error when export throws', async () => {
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, count: 0, oldestEntry: null })
        .mockRejectedValueOnce(new Error('Network error'));

      await loadOptions();

      const buttons = appEl.querySelectorAll('.swp-btn-secondary');
      const exportBtn = buttons[1];
      exportBtn.click();
      await flush();

      expect(getAppText()).toContain('Failed to export cache.');
    });
  });

  describe('loadSettings', () => {
    it('should set checkbox states from loaded settings', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        scpwSettings: {
          showNintendo: false,
          showPlaystation: true,
          showXbox: false,
          showSteamDeck: false,
          showHltb: true,
          hltbDisplayStat: 'mainStory',
          showReviewScores: true,
          reviewScoreSource: 'opencritic',
          openCriticApiKey: 'test-key'
        }
      });

      await loadOptions();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      // 6 checkboxes: Nintendo, PlayStation, Xbox, Steam Deck, HLTB, Review Scores
      expect(checkboxes[0].checked).toBe(false); // Nintendo
      expect(checkboxes[1].checked).toBe(true);  // PlayStation
      expect(checkboxes[2].checked).toBe(false); // Xbox
      expect(checkboxes[3].checked).toBe(false); // Steam Deck
      expect(checkboxes[4].checked).toBe(true);  // HLTB
      expect(checkboxes[5].checked).toBe(true);  // Review Scores
    });

    it('should default to correct values when no settings saved', async () => {
      chrome.storage.sync.get.mockResolvedValueOnce({});

      await loadOptions();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(6);
      // All true except Review Scores (requires API key)
      expect(checkboxes[0].checked).toBe(true);  // Nintendo
      expect(checkboxes[1].checked).toBe(true);  // PlayStation
      expect(checkboxes[2].checked).toBe(true);  // Xbox
      expect(checkboxes[3].checked).toBe(true);  // Steam Deck
      expect(checkboxes[4].checked).toBe(true);  // HLTB
      expect(checkboxes[5].checked).toBe(false); // Review Scores (no API key)
    });

    it('should handle storage errors gracefully', async () => {
      chrome.storage.sync.get.mockRejectedValueOnce(new Error('Storage error'));

      await loadOptions();

      // Should render with defaults without throwing
      expect(appEl.children.length).toBeGreaterThan(0);
    });
  });

  describe('saveSettings', () => {
    it('should save settings when a toggle is changed', async () => {
      await loadOptions();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      checkboxes[0].click(); // Nintendo toggle
      await flush();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({
          showNintendo: false
        })
      });
    });

    it('should save settings when PlayStation checkbox changes', async () => {
      await loadOptions();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      checkboxes[1].click(); // PlayStation toggle
      await flush();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({
          showPlaystation: false
        })
      });
    });

    it('should save settings when Xbox checkbox changes', async () => {
      await loadOptions();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      checkboxes[2].click(); // Xbox toggle
      await flush();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({
          showXbox: false
        })
      });
    });

    it('should save settings when Steam Deck checkbox changes', async () => {
      await loadOptions();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      checkboxes[3].click(); // Steam Deck toggle
      await flush();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({
          showSteamDeck: false
        })
      });
    });

    it('should block enabling Review Scores without API key', async () => {
      await loadOptions();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      checkboxes[5].click(); // Try to enable Review Scores without API key
      await flush();

      // Should NOT save because no API key is set
      // The toggle onChange handler blocks the change
      expect(checkboxes[5].checked).toBe(false);
    });

    it('should show success status after saving', async () => {
      await loadOptions();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      checkboxes[0].click();
      await flush();

      expect(getAppText()).toContain('Settings saved');
    });

    it('should show error status on save failure', async () => {
      chrome.storage.sync.set.mockRejectedValueOnce(new Error('Save failed'));

      await loadOptions();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      checkboxes[0].click();
      await flush();

      expect(getAppText()).toContain('Failed');
    });

    it('should save HLTB display stat when select changes', async () => {
      await loadOptions();

      const selects = appEl.querySelectorAll('.swp-inline-select');
      expect(selects.length).toBe(1); // Only HLTB (Review Scores disabled by default)

      // Change the HLTB select value (Preact uses 'change' event for selects)
      selects[0].value = 'completionist';
      selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      await flush();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({
          hltbDisplayStat: 'completionist'
        })
      });
    });

    it('should save review score source when select changes', async () => {
      // Load with review scores enabled (requires API key)
      chrome.storage.sync.get.mockResolvedValueOnce({
        scpwSettings: {
          showReviewScores: true,
          openCriticApiKey: 'test-key',
          reviewScoreSource: 'opencritic'
        }
      });
      await loadOptions();

      const selects = appEl.querySelectorAll('.swp-inline-select');
      expect(selects.length).toBe(2); // HLTB + Review Scores

      // Change the review score source select (Preact uses 'change' event for selects)
      selects[1].value = 'ign';
      selects[1].dispatchEvent(new Event('change', { bubbles: true }));
      await flush();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({
          reviewScoreSource: 'ign'
        })
      });
    });

    it('should auto-hide settings status after 2 seconds', async () => {
      await loadOptions();

      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      checkboxes[0].click();
      await flush();

      // Settings status should be visible
      expect(getAppText()).toContain('Settings saved');

      // Advance past 2 second timeout
      await jest.advanceTimersByTimeAsync(2500);
      await flush();

      // Status should be gone
      expect(appEl.querySelector('.swp-settings-status')).toBeFalsy();
    });
  });

  describe('HLTB inline select visibility', () => {
    it('should show select when HLTB is enabled', async () => {
      chrome.storage.sync.get.mockResolvedValueOnce({
        scpwSettings: {
          showNintendo: true,
          showPlaystation: true,
          showXbox: true,
          showSteamDeck: true,
          showHltb: true,
          hltbDisplayStat: 'mainStory',
          showReviewScores: true,
          reviewScoreSource: 'opencritic',
          openCriticApiKey: 'test-key'
        }
      });

      await loadOptions();

      // When HLTB is enabled, the select should be rendered
      const selects = appEl.querySelectorAll('.swp-inline-select');
      expect(selects.length).toBe(2); // HLTB + Review Scores
    });

    it('should hide select when HLTB is disabled', async () => {
      chrome.storage.sync.get.mockResolvedValueOnce({
        scpwSettings: {
          showNintendo: true,
          showPlaystation: true,
          showXbox: true,
          showSteamDeck: true,
          showHltb: false,
          hltbDisplayStat: 'mainStory',
          showReviewScores: true,
          reviewScoreSource: 'opencritic',
          openCriticApiKey: 'test-key'
        }
      });

      await loadOptions();

      // When HLTB is disabled, only Review Scores select should be visible
      const selects = appEl.querySelectorAll('.swp-inline-select');
      expect(selects.length).toBe(1); // Only Review Scores
    });

    it('should toggle select visibility when HLTB checkbox changes', async () => {
      // Load with review scores enabled to start with 2 selects
      chrome.storage.sync.get.mockResolvedValueOnce({
        scpwSettings: {
          showReviewScores: true,
          openCriticApiKey: 'test-key',
          showHltb: true,
          hltbDisplayStat: 'mainStory',
          reviewScoreSource: 'opencritic'
        }
      });
      await loadOptions();

      // Initially both selects visible
      let selects = appEl.querySelectorAll('.swp-inline-select');
      expect(selects.length).toBe(2);

      // Find HLTB checkbox (5th checkbox - index 4)
      const checkboxes = appEl.querySelectorAll('input[type="checkbox"]');
      checkboxes[4].click(); // HLTB toggle off
      await flush();

      // Now only Review Scores select should be visible
      selects = appEl.querySelectorAll('.swp-inline-select');
      expect(selects.length).toBe(1);

      // Toggle back on
      checkboxes[4].click();
      await flush();

      selects = appEl.querySelectorAll('.swp-inline-select');
      expect(selects.length).toBe(2);
    });
  });

  describe('collapsible About section', () => {
    it('should render About section collapsed by default', async () => {
      await loadOptions();

      const sections = appEl.querySelectorAll('.swp-section');
      const aboutSection = sections[sections.length - 1];
      expect(aboutSection.classList.contains('swp-collapsed')).toBe(true);
    });

    it('should expand About section when clicked', async () => {
      await loadOptions();

      const collapseBtn = appEl.querySelector('.swp-collapse-btn');
      expect(collapseBtn).toBeTruthy();

      collapseBtn.click();
      await flush();

      // Section should be expanded - content should be visible
      expect(getAppText()).toContain('Your data stays local');
      expect(getAppText()).toContain('Powered by open data');
    });

    it('should toggle collapsed state on click', async () => {
      await loadOptions();

      const collapseBtn = appEl.querySelector('.swp-collapse-btn');

      // Click to expand
      collapseBtn.click();
      await flush();

      const sections = appEl.querySelectorAll('.swp-section');
      const aboutSection = sections[sections.length - 1];
      expect(aboutSection.classList.contains('swp-collapsed')).toBe(false);

      // Click to collapse
      collapseBtn.click();
      await flush();

      expect(aboutSection.classList.contains('swp-collapsed')).toBe(true);
    });
  });

  describe('section rendering', () => {
    it('should render all sections', async () => {
      await loadOptions();

      const text = getAppText();
      expect(text).toContain('Platforms');
      expect(text).toContain('Game Info');
      expect(text).toContain('Cache');
      expect(text).toContain('About');
    });

    it('should render platform toggles with descriptions', async () => {
      await loadOptions();

      const text = getAppText();
      expect(text).toContain('Nintendo Switch');
      expect(text).toContain('PlayStation');
      expect(text).toContain('Xbox');
      expect(text).toContain('eShop');
      expect(text).toContain('PS Store');
      expect(text).toContain('Game Pass');
    });

    it('should render game info toggles with descriptions', async () => {
      await loadOptions();

      const text = getAppText();
      expect(text).toContain('Steam Deck Compatibility');
      expect(text).toContain('How Long To Beat');
      expect(text).toContain('Review Scores');
    });

    it('should render cache action buttons', async () => {
      await loadOptions();

      const text = getAppText();
      expect(text).toContain('Refresh');
      expect(text).toContain('Export');
      expect(text).toContain('Clear Cache');
    });
  });
});
