/**
 * Unit tests for options.js (Preact)
 */

describe('options.js', () => {
  const flush = async () => {
    for (let i = 0; i < 5; i += 1) {
      await Promise.resolve();
      jest.advanceTimersByTime(1);
    }
  };

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();

    document.body.innerHTML = '<div id="app"></div>';

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
      }
    };

    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return Promise.resolve({
          success: true,
          count: 5,
          oldestEntry: Date.now() - 2 * 60 * 60 * 1000
        });
      }
      if (message.type === 'GET_CACHE_EXPORT') {
        return Promise.resolve({
          success: true,
          data: [{ appid: 1 }]
        });
      }
      if (message.type === 'CLEAR_CACHE') {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({ success: true });
    });

    chrome.runtime.getManifest = jest.fn(() => ({ version: '0.8.0' }));

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

    global.confirm = jest.fn(() => true);

    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.confirm;
    HTMLAnchorElement.prototype.click.mockRestore();
  });

  it('renders sections and cache stats', async () => {
    require('../../dist/options.js');
    await flush();

    expect(document.querySelector('.swp-header h1')?.textContent).toBe('Steam Wishlist Plus');
    expect(document.querySelectorAll('.swp-section').length).toBeGreaterThan(2);
    expect(document.querySelector('.swp-stat-box .swp-stat-value')?.textContent).toBe('5');
  });

  it('shows inline selects when toggles are enabled', async () => {
    require('../../dist/options.js');
    await flush();

    const selects = document.querySelectorAll('select.swp-inline-select');
    expect(selects.length).toBe(2);
  });

  it('saves settings when toggles change', async () => {
    require('../../dist/options.js');
    await flush();

    const toggle = document.querySelector('.swp-toggle-item input[type="checkbox"]');
    toggle.click();

    await flush();

    expect(chrome.storage.sync.set).toHaveBeenCalled();
    expect(document.querySelector('.swp-status')?.textContent).toBe('Settings saved');
  });

  it('refreshes cache stats and exports cache', async () => {
    require('../../dist/options.js');
    await flush();

    const refreshButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Refresh'));
    const exportButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Export'));

    refreshButton.click();
    exportButton.click();

    await flush();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'GET_CACHE_STATS' });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'GET_CACHE_EXPORT' });
  });

  it('clears cache when confirmed', async () => {
    require('../../dist/options.js');
    await flush();

    const clearButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Clear Cache'));

    clearButton.click();

    await flush();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'CLEAR_CACHE' });
    expect(document.querySelector('.swp-status')?.textContent).toBe('Cache cleared successfully.');
  });

  it('hides inline selects when toggles are disabled', async () => {
    chrome.storage.sync.get.mockResolvedValueOnce({
      scpwSettings: {
        showNintendo: true,
        showPlaystation: true,
        showXbox: true,
        showSteamDeck: true,
        showHltb: false,
        hltbDisplayStat: 'mainStory',
        showReviewScores: false,
        reviewScoreSource: 'opencritic'
      }
    });

    require('../../dist/options.js');
    await flush();

    const selects = document.querySelectorAll('select.swp-inline-select');
    expect(selects.length).toBe(0);
  });

  it('handles cache stats errors', async () => {
    chrome.runtime.sendMessage.mockRejectedValueOnce(new Error('nope'));

    require('../../dist/options.js');
    await flush();

    const statValues = document.querySelectorAll('.swp-stat-box .swp-stat-value');
    expect(statValues[0]?.textContent).toBe('?');
    expect(statValues[1]?.textContent).toBe('?');
  });

  it('keeps default cache stats when response is missing a count', async () => {
    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return Promise.resolve({ success: false });
      }
      return Promise.resolve({ success: true });
    });

    require('../../dist/options.js');
    await flush();

    const statValues = document.querySelectorAll('.swp-stat-box .swp-stat-value');
    expect(statValues[0]?.textContent).toBe('-');
  });

  it('handles settings load failures gracefully', async () => {
    chrome.storage.sync.get.mockRejectedValueOnce(new Error('fail'));

    require('../../dist/options.js');
    await flush();

    expect(document.querySelectorAll('.swp-toggle-item').length).toBeGreaterThan(0);
  });

  it('shows an error when settings fail to save', async () => {
    chrome.storage.sync.set.mockRejectedValueOnce(new Error('fail'));

    require('../../dist/options.js');
    await flush();

    const toggle = document.querySelector('.swp-toggle-item input[type=\"checkbox\"]');
    toggle.click();

    await flush();

    expect(document.querySelector('.swp-status')?.textContent).toBe('Failed to save settings');
  });

  it('shows an error when cache export fails', async () => {
    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return Promise.resolve({ success: true, count: 1, oldestEntry: null });
      }
      if (message.type === 'GET_CACHE_EXPORT') {
        return Promise.resolve({ success: false });
      }
      return Promise.resolve({ success: true });
    });

    require('../../dist/options.js');
    await flush();

    const exportButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Export'));

    exportButton.click();

    await flush();

    expect(document.querySelector('.swp-status')?.textContent).toBe('Failed to export cache.');
  });

  it('handles cache export exceptions', async () => {
    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return Promise.resolve({ success: true, count: 1, oldestEntry: null });
      }
      if (message.type === 'GET_CACHE_EXPORT') {
        return Promise.reject(new Error('fail'));
      }
      return Promise.resolve({ success: true });
    });

    require('../../dist/options.js');
    await flush();

    const exportButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Export'));

    exportButton.click();

    await flush();

    expect(document.querySelector('.swp-status')?.textContent).toBe('Failed to export cache.');
  });

  it('does not clear cache when confirmation is cancelled', async () => {
    global.confirm = jest.fn(() => false);

    require('../../dist/options.js');
    await flush();

    const clearButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Clear Cache'));

    clearButton.click();

    await flush();

    expect(chrome.runtime.sendMessage.mock.calls.some(([call]) => call?.type === 'CLEAR_CACHE')).toBe(false);
  });

  it('handles cache clear errors', async () => {
    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return Promise.resolve({ success: true, count: 1, oldestEntry: null });
      }
      if (message.type === 'CLEAR_CACHE') {
        return Promise.resolve({ success: false });
      }
      return Promise.resolve({ success: true });
    });

    require('../../dist/options.js');
    await flush();

    const clearButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Clear Cache'));

    clearButton.click();

    await flush();

    expect(document.querySelector('.swp-status')?.textContent).toBe('Failed to clear cache.');
  });

  it('updates settings when select values change', async () => {
    require('../../dist/options.js');
    await flush();

    const selects = document.querySelectorAll('select.swp-inline-select');
    const hltbSelect = selects[0];
    const reviewSelect = selects[1];

    hltbSelect.value = 'completionist';
    hltbSelect.dispatchEvent(new Event('change'));

    reviewSelect.value = 'ign';
    reviewSelect.dispatchEvent(new Event('change'));

    await flush();

    expect(chrome.storage.sync.set).toHaveBeenCalledWith(expect.objectContaining({
      scpwSettings: expect.objectContaining({
        hltbDisplayStat: 'completionist'
      })
    }));
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(expect.objectContaining({
      scpwSettings: expect.objectContaining({
        reviewScoreSource: 'ign'
      })
    }));
  });

  it('auto-hides settings status messages', async () => {
    require('../../dist/options.js');
    await flush();

    const toggle = document.querySelector('.swp-toggle-item input[type=\"checkbox\"]');
    toggle.click();

    await flush();

    expect(document.querySelector('.swp-status')?.textContent).toBe('Settings saved');

    jest.advanceTimersByTime(2000);
    jest.runAllTimers();
    await flush();

    expect(document.querySelector('.swp-status')).toBeNull();
  });

  it('auto-hides cache status messages', async () => {
    require('../../dist/options.js');
    await flush();

    const clearButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Clear Cache'));

    clearButton.click();

    await flush();

    expect(document.querySelector('.swp-status')?.textContent).toBe('Cache cleared successfully.');

    jest.advanceTimersByTime(3000);
    await flush();

    expect(document.querySelector('.swp-status')).toBeNull();
  });

  it('shows loading state while refreshing cache stats', async () => {
    let resolveStats;
    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return new Promise((resolve) => {
          resolveStats = resolve;
        });
      }
      return Promise.resolve({ success: true });
    });

    require('../../dist/options.js');
    await flush();

    const refreshButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Refresh'));

    refreshButton.click();

    await flush();

    expect(refreshButton.textContent).toContain('Loading');

    resolveStats({ success: true, count: 2, oldestEntry: null });
    await flush();
  });

  it('renders mini toggles and compact stats from the options bundle', async () => {
    require('../../dist/options.js');
    await flush();

    const { Toggle, StatBox } = globalThis.SWP_OptionsUI;
    const container = document.createElement('div');
    document.body.appendChild(container);

    globalThis.preact.render(
      globalThis.preact.h(Toggle, {
        variant: 'mini',
        label: 'Mini Toggle',
        checked: false,
        onChange: jest.fn()
      }),
      container
    );

    expect(container.querySelector('.swp-toggle-mini')).not.toBeNull();

    globalThis.preact.render(
      globalThis.preact.h(StatBox, {
        value: '1',
        label: 'Compact',
        variant: 'compact'
      }),
      container
    );

    expect(container.querySelector('.swp-stat-box')).not.toBeNull();
  });

  it('toggles the about section when collapsed', async () => {
    require('../../dist/options.js');
    await flush();

    const collapseButton = document.querySelector('.swp-collapse-btn');
    expect(document.querySelector('.swp-info-box')).toBeNull();

    collapseButton.click();

    await flush();

    expect(document.querySelectorAll('.swp-info-box').length).toBeGreaterThan(0);
  });
});
