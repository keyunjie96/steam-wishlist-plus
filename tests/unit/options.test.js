/**
 * Unit tests for options.js (Lit-based)
 */

describe('options.js', () => {
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

    globalThis.SWP_Icons = {
      nintendo: '<svg></svg>',
      playstation: '<svg></svg>',
      xbox: '<svg></svg>',
      steamdeck: '<svg></svg>'
    };

    chrome.runtime.sendMessage.mockClear();
    chrome.runtime.sendMessage.mockImplementation(({ type }) => {
      if (type === 'GET_CACHE_STATS') {
        return Promise.resolve({
          success: true,
          count: 5,
          oldestEntry: Date.now() - 3600000
        });
      }
      if (type === 'GET_CACHE_EXPORT') {
        return Promise.resolve({
          success: true,
          data: [{ id: 1 }]
        });
      }
      return Promise.resolve({ success: true });
    });

    chrome.storage.sync.get.mockClear();
    chrome.storage.sync.set.mockClear();
    chrome.storage.sync.get.mockResolvedValue({
      scpwSettings: {
        showNintendo: true,
        showPlaystation: true,
        showXbox: true,
        showSteamDeck: true,
        showHltb: true,
        hltbDisplayStat: 'mainStory',
        showReviewScores: true,
        reviewScoreSource: 'opencritic'
      }
    });
    chrome.storage.sync.set.mockResolvedValue();

    chrome.runtime.getManifest = jest.fn(() => ({ version: '0.8.0' }));

    global.confirm = jest.fn(() => true);

    global.URL.createObjectURL = jest.fn(() => 'blob:test');
    global.URL.revokeObjectURL = jest.fn();

    if (!customElements.get('swp-options')) {
      require('../../dist/options.js');
    }
  });

  afterEach(() => {
    delete global.confirm;
  });

  it('loads cache stats on connect', async () => {
    const options = document.createElement('swp-options');
    document.body.appendChild(options);
    await options.updateComplete;

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'GET_CACHE_STATS'
    });
  });

  it('saves settings when toggles change', async () => {
    const options = document.createElement('swp-options');
    document.body.appendChild(options);
    await options.updateComplete;

    const toggle = options.shadowRoot.querySelector('swp-toggle');
    toggle.dispatchEvent(new CustomEvent('swp-toggle-change', {
      detail: { checked: false },
      bubbles: true,
      composed: true
    }));

    await Promise.resolve();

    expect(chrome.storage.sync.set).toHaveBeenCalled();
  });

  it('exports cache data', async () => {
    const options = document.createElement('swp-options');
    document.body.appendChild(options);
    await options.updateComplete;

    await options.exportCache();

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('clears cache after confirmation', async () => {
    const options = document.createElement('swp-options');
    document.body.appendChild(options);
    await options.updateComplete;

    await options.clearCache();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'CLEAR_CACHE'
    });
  });
});
