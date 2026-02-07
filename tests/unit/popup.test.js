/**
 * Unit tests for popup.js (Lit-based)
 */

describe('popup.js', () => {
  beforeEach(() => {
    jest.resetModules();

    document.body.textContent = '';

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
      SETTING_CHECKBOX_IDS: {},
      SETTING_SELECT_IDS: {},
      USER_SETTING_KEYS: []
    };

    chrome.runtime.sendMessage.mockClear();
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      count: 10,
      oldestEntry: Date.now() - 86400000
    });

    chrome.runtime.openOptionsPage.mockClear();

    chrome.storage.sync.get.mockClear();
    chrome.storage.sync.set.mockClear();
    chrome.storage.sync.get.mockResolvedValue({
      scpwSettings: {
        showNintendo: false,
        showPlaystation: true,
        showXbox: false,
        showSteamDeck: true,
        showHltb: true,
        showReviewScores: false,
        hltbDisplayStat: 'mainStory',
        reviewScoreSource: 'opencritic'
      }
    });
    chrome.storage.sync.set.mockResolvedValue();

    global.confirm = jest.fn(() => true);

    if (!customElements.get('swp-popup')) {
      require('../../dist/popup.js');
    }
  });

  afterEach(() => {
    delete global.confirm;
  });

  it('loads cache stats on connect', async () => {
    const popup = document.createElement('swp-popup');
    document.body.appendChild(popup);
    await popup.updateComplete;

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'GET_CACHE_STATS'
    });
  });

  it('saves settings when a toggle fires', async () => {
    const popup = document.createElement('swp-popup');
    document.body.appendChild(popup);
    await popup.updateComplete;

    const toggle = popup.shadowRoot.querySelector('swp-toggle');
    toggle.dispatchEvent(new CustomEvent('swp-toggle-change', {
      detail: { checked: true },
      bubbles: true,
      composed: true
    }));

    await Promise.resolve();

    expect(chrome.storage.sync.set).toHaveBeenCalled();
  });

  it('clears cache on confirmation', async () => {
    const popup = document.createElement('swp-popup');
    document.body.appendChild(popup);
    await popup.updateComplete;

    await popup.clearCache();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'CLEAR_CACHE'
    });
  });

  it('handles cache stats error', async () => {
    chrome.runtime.sendMessage.mockRejectedValueOnce(new Error('fail'));

    const popup = document.createElement('swp-popup');
    document.body.appendChild(popup);
    await popup.updateComplete;

    await popup.loadCacheStats();

    const stats = popup.shadowRoot.querySelectorAll('swp-stat-box');
    expect(stats.length).toBeGreaterThan(0);
  });

  it('opens settings page', async () => {
    const popup = document.createElement('swp-popup');
    document.body.appendChild(popup);
    await popup.updateComplete;

    const button = popup.shadowRoot.querySelector('.settings-btn');
    button.click();

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
