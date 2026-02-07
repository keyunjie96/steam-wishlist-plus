/**
 * Unit tests for popup.js (Preact)
 */

describe('popup.js', () => {
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
          count: 10,
          oldestEntry: Date.now() - 86400000
        });
      }
      if (message.type === 'CLEAR_CACHE') {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({ success: true });
    });

    chrome.runtime.openOptionsPage.mockClear();

    chrome.storage.sync.get.mockResolvedValue({
      scpwSettings: {
        showNintendo: true,
        showPlaystation: false,
        showXbox: true,
        showSteamDeck: true,
        showHltb: false,
        showReviewScores: true,
        hltbDisplayStat: 'mainStory',
        reviewScoreSource: 'opencritic'
      }
    });
    chrome.storage.sync.set.mockResolvedValue();

    global.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.confirm;
  });

  it('renders the popup header and stats after loading', async () => {
    require('../../dist/popup.js');
    await flush();

    expect(document.querySelector('.swp-header h1')?.textContent).toBe('Steam Wishlist Plus');
    expect(document.querySelectorAll('.swp-stat-box').length).toBe(2);
    expect(document.querySelector('.swp-stat-box .swp-stat-value')?.textContent).toBe('10');
  });

  it('renders platform and info toggles', async () => {
    require('../../dist/popup.js');
    await flush();

    const toggles = document.querySelectorAll('.swp-toggle-mini input[type="checkbox"]');
    expect(toggles.length).toBe(6);
  });

  it('saves settings when a toggle changes', async () => {
    require('../../dist/popup.js');
    await flush();

    const toggles = document.querySelectorAll('.swp-toggle-mini input[type="checkbox"]');
    const firstToggle = toggles[0];
    firstToggle.click();

    await flush();

    expect(chrome.storage.sync.set).toHaveBeenCalled();
  });

  it('opens the options page from the settings button', async () => {
    require('../../dist/popup.js');
    await flush();

    const settingsButton = document.querySelector('.swp-settings-btn');
    settingsButton.click();

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });

  it('clears cache when clear cache is confirmed', async () => {
    require('../../dist/popup.js');
    await flush();

    const clearButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Clear Cache'));

    clearButton.click();

    await flush();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'CLEAR_CACHE' });
    expect(document.querySelector('.swp-status')?.textContent).toBe('Cache cleared');
  });

  it('formats cache age in days and hours', async () => {
    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return Promise.resolve({
          success: true,
          count: 2,
          oldestEntry: Date.now() - (26 * 60 * 60 * 1000)
        });
      }
      return Promise.resolve({ success: true });
    });

    require('../../dist/popup.js');
    await flush();

    expect(document.querySelectorAll('.swp-stat-box').length).toBe(2);
    expect(document.querySelectorAll('.swp-stat-box .swp-stat-value')[1]?.textContent).toContain('1d');
  });

  it('formats cache age in hours only', async () => {
    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return Promise.resolve({
          success: true,
          count: 3,
          oldestEntry: Date.now() - (5 * 60 * 60 * 1000)
        });
      }
      return Promise.resolve({ success: true });
    });

    require('../../dist/popup.js');
    await flush();

    expect(document.querySelectorAll('.swp-stat-box .swp-stat-value')[1]?.textContent).toBe('5h');
  });

  it('formats cache age under an hour', async () => {
    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return Promise.resolve({
          success: true,
          count: 1,
          oldestEntry: Date.now() - (30 * 60 * 1000)
        });
      }
      return Promise.resolve({ success: true });
    });

    require('../../dist/popup.js');
    await flush();

    expect(document.querySelectorAll('.swp-stat-box .swp-stat-value')[1]?.textContent).toBe('<1h');
  });

  it('handles cache stats errors', async () => {
    chrome.runtime.sendMessage.mockRejectedValueOnce(new Error('nope'));

    require('../../dist/popup.js');
    await flush();

    expect(document.querySelectorAll('.swp-stat-box .swp-stat-value')[0]?.textContent).toBe('?');
    expect(document.querySelectorAll('.swp-stat-box .swp-stat-value')[1]?.textContent).toBe('?');
  });

  it('keeps default cache stats when response is missing a count', async () => {
    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve({ success: true });
    });

    require('../../dist/popup.js');
    await flush();

    expect(document.querySelectorAll('.swp-stat-box .swp-stat-value')[0]?.textContent).toBe('-');
  });

  it('handles settings load failures gracefully', async () => {
    chrome.storage.sync.get.mockRejectedValueOnce(new Error('fail'));

    require('../../dist/popup.js');
    await flush();

    expect(document.querySelectorAll('.swp-toggle-mini').length).toBe(6);
  });

  it('shows an error when settings fail to save', async () => {
    chrome.storage.sync.set.mockRejectedValueOnce(new Error('fail'));

    require('../../dist/popup.js');
    await flush();

    const toggles = document.querySelectorAll('.swp-toggle-mini input[type="checkbox"]');
    toggles[0].click();

    await flush();

    expect(document.querySelector('.swp-status')?.textContent).toBe('Failed to save');
  });

  it('auto-hides status messages', async () => {
    require('../../dist/popup.js');
    await flush();

    const toggles = document.querySelectorAll('.swp-toggle-mini input[type="checkbox"]');
    toggles[0].click();

    await flush();

    expect(document.querySelector('.swp-status')?.textContent).toBe('Settings saved');

    jest.advanceTimersByTime(3000);
    jest.runAllTimers();
    await flush();

    expect(document.querySelector('.swp-status')).toBeNull();
  });

  it('renders full toggle and icon button variants from the popup bundle', async () => {
    require('../../dist/popup.js');
    await flush();

    const { Toggle, IconButton } = globalThis.SWP_PopupUI;
    const container = document.createElement('div');
    document.body.appendChild(container);

    globalThis.preact.render(
      globalThis.preact.h(Toggle, {
        variant: 'full',
        label: 'Test Toggle',
        checked: true,
        onChange: jest.fn(),
        icon: '<svg viewBox=\"0 0 24 24\"></svg>',
        selectOptions: [{ value: 'one', label: 'One' }],
        selectValue: 'one',
        onSelectChange: jest.fn()
      }),
      container
    );

    expect(container.querySelector('select')).not.toBeNull();

    globalThis.preact.render(
      globalThis.preact.h(Toggle, {
        variant: 'full',
        label: 'Test Toggle',
        checked: false,
        onChange: jest.fn(),
        selectOptions: [{ value: 'one', label: 'One' }],
        selectValue: 'one'
      }),
      container
    );

    expect(container.querySelector('select')).toBeNull();

    globalThis.preact.render(
      globalThis.preact.h(IconButton, {
        label: 'Icon',
        icon: '<svg viewBox=\"0 0 24 24\"></svg>',
        onClick: jest.fn()
      }),
      container
    );

    expect(container.querySelector('svg')).not.toBeNull();

    globalThis.preact.render(
      globalThis.preact.h(IconButton, {
        label: 'Loading',
        loading: true,
        onClick: jest.fn()
      }),
      container
    );

    expect(container.textContent).toContain('Loading');
  });

  it('does not clear cache when confirmation is cancelled', async () => {
    global.confirm = jest.fn(() => false);

    require('../../dist/popup.js');
    await flush();

    const clearButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Clear Cache'));

    clearButton.click();

    await flush();

    expect(chrome.runtime.sendMessage.mock.calls.some(([call]) => call?.type === 'CLEAR_CACHE')).toBe(false);
  });

  it('shows an error when cache clear fails', async () => {
    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return Promise.resolve({ success: true, count: 1, oldestEntry: null });
      }
      if (message.type === 'CLEAR_CACHE') {
        return Promise.resolve({ success: false });
      }
      return Promise.resolve({ success: true });
    });

    require('../../dist/popup.js');
    await flush();

    const clearButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Clear Cache'));

    clearButton.click();

    await flush();

    expect(document.querySelector('.swp-status')?.textContent).toBe('Failed to clear cache');
  });

  it('handles cache clear exceptions', async () => {
    chrome.runtime.sendMessage.mockImplementation((message) => {
      if (message.type === 'GET_CACHE_STATS') {
        return Promise.resolve({ success: true, count: 1, oldestEntry: null });
      }
      if (message.type === 'CLEAR_CACHE') {
        return Promise.reject(new Error('fail'));
      }
      return Promise.resolve({ success: true });
    });

    require('../../dist/popup.js');
    await flush();

    const clearButton = Array.from(document.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Clear Cache'));

    clearButton.click();

    await flush();

    expect(document.querySelector('.swp-status')?.textContent).toBe('Failed to clear cache');
  });
});
