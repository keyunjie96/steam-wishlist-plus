/**
 * Unit tests for options.js (Lit component version)
 *
 * Tests the <swp-options> Lit custom element.
 * Custom Elements can only be registered once, so the module is loaded once
 * and fresh component instances are created for each test.
 */

// Load the module once to register custom elements
beforeAll(() => {
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
    SETTING_SELECT_IDS: {
      hltbDisplayStat: { elementId: 'hltb-display-stat', visibilityKey: 'showHltb' },
      reviewScoreSource: { elementId: 'review-score-source', visibilityKey: 'showReviewScores' }
    },
    USER_SETTING_KEYS: ['showNintendo', 'showPlaystation', 'showXbox', 'showSteamDeck', 'showHltb', 'hltbDisplayStat', 'showReviewScores', 'reviewScoreSource']
  };

  chrome.runtime.sendMessage.mockResolvedValue({ success: true, count: 0, oldestEntry: null });
  chrome.storage.sync.get.mockResolvedValue({});
  chrome.storage.sync.set.mockResolvedValue();

  require('../../dist/options.js');
});

describe('options.js', () => {
  let optionsEl;

  const waitForLit = async () => {
    await jest.advanceTimersByTimeAsync(0);
    if (optionsEl && optionsEl.updateComplete) {
      await optionsEl.updateComplete;
    }
    await jest.advanceTimersByTimeAsync(0);
  };

  const createOptions = async () => {
    optionsEl = document.createElement('swp-options');
    document.body.appendChild(optionsEl);
    await waitForLit();
    return optionsEl;
  };

  const shadowQuery = (selector) => optionsEl?.shadowRoot?.querySelector(selector);
  const shadowQueryAll = (selector) => optionsEl?.shadowRoot?.querySelectorAll(selector);

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.textContent = '';

    chrome.runtime.sendMessage.mockClear();
    chrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      count: 10,
      oldestEntry: Date.now() - 86400000
    });

    chrome.storage.sync.get.mockClear();
    chrome.storage.sync.set.mockClear();
    chrome.storage.sync.get.mockResolvedValue({});
    chrome.storage.sync.set.mockResolvedValue();

    global.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.confirm;
    if (optionsEl && optionsEl.parentNode) {
      optionsEl.parentNode.removeChild(optionsEl);
    }
    optionsEl = null;
  });

  describe('initialization', () => {
    it('should register the swp-options custom element', () => {
      expect(customElements.get('swp-options')).toBeTruthy();
    });

    it('should render shadow DOM content', async () => {
      await createOptions();
      expect(optionsEl.shadowRoot).toBeTruthy();
      expect(shadowQuery('.header')).toBeTruthy();
    });

    it('should render section headers', async () => {
      await createOptions();
      expect(shadowQueryAll('swp-section').length).toBe(4);
    });

    it('should load cache stats on init', async () => {
      await createOptions();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'GET_CACHE_STATS' });
    });

    it('should load settings on init', async () => {
      await createOptions();
      expect(chrome.storage.sync.get).toHaveBeenCalledWith('scpwSettings');
    });
  });

  describe('loadCacheStats', () => {
    it('should display cache count', async () => {
      await createOptions();
      expect(shadowQueryAll('swp-stat-box')[0].value).toBe('10');
    });

    it('should display cache age in days and hours', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({
        success: true, count: 5,
        oldestEntry: Date.now() - (24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)
      });
      await createOptions();
      expect(shadowQueryAll('swp-stat-box')[1].value).toMatch(/1d 2h/);
    });

    it('should display cache age in hours only when less than a day', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({
        success: true, count: 3, oldestEntry: Date.now() - (5 * 60 * 60 * 1000)
      });
      await createOptions();
      expect(shadowQueryAll('swp-stat-box')[1].value).toBe('5h');
    });

    it('should display <1h when cache is less than an hour old', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({
        success: true, count: 2, oldestEntry: Date.now() - (30 * 60 * 1000)
      });
      await createOptions();
      expect(shadowQueryAll('swp-stat-box')[1].value).toBe('<1h');
    });

    it('should display dash when no oldest entry', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({
        success: true, count: 0, oldestEntry: null
      });
      await createOptions();
      expect(shadowQueryAll('swp-stat-box')[1].value).toBe('-');
    });

    it('should display question marks on error', async () => {
      chrome.runtime.sendMessage.mockRejectedValue(new Error('Network error'));
      await createOptions();
      expect(shadowQueryAll('swp-stat-box')[0].value).toBe('?');
      expect(shadowQueryAll('swp-stat-box')[1].value).toBe('?');
    });

    it('should not update display when response.success is false', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({ success: false, count: 99, oldestEntry: Date.now() });
      await createOptions();
      expect(shadowQueryAll('swp-stat-box')[0].value).toBe('-');
    });

    it('should not update display when response is undefined', async () => {
      chrome.runtime.sendMessage.mockResolvedValue(undefined);
      await createOptions();
      expect(shadowQueryAll('swp-stat-box')[0].value).toBe('-');
    });

    it('should refresh stats when refresh button clicked', async () => {
      await createOptions();
      chrome.runtime.sendMessage.mockResolvedValueOnce({ success: true, count: 25, oldestEntry: Date.now() });
      shadowQueryAll('swp-icon-button[variant="secondary"]')[0].click();
      await waitForLit();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'GET_CACHE_STATS' });
    });
  });

  describe('clearCache', () => {
    it('should show confirmation dialog', async () => {
      await createOptions();
      shadowQuery('swp-icon-button[variant="danger"]').click();
      await waitForLit();
      expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('Are you sure'));
    });

    it('should not clear cache if user cancels', async () => {
      await createOptions();
      global.confirm.mockReturnValueOnce(false);
      shadowQuery('swp-icon-button[variant="danger"]').click();
      await waitForLit();
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({ type: 'CLEAR_CACHE' });
    });

    it('should send CLEAR_CACHE message when confirmed', async () => {
      await createOptions();
      chrome.runtime.sendMessage.mockResolvedValueOnce({ success: true });
      shadowQuery('swp-icon-button[variant="danger"]').click();
      await waitForLit();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'CLEAR_CACHE' });
    });

    it('should show success status on successful clear', async () => {
      await createOptions();
      chrome.runtime.sendMessage.mockResolvedValueOnce({ success: true });
      shadowQuery('swp-icon-button[variant="danger"]').click();
      await waitForLit();
      const cacheStatus = shadowQueryAll('swp-status-message')[1];
      expect(cacheStatus.message).toContain('cleared successfully');
      expect(cacheStatus.type).toBe('success');
    });

    it('should show error status on failed clear', async () => {
      await createOptions();
      chrome.runtime.sendMessage.mockResolvedValueOnce({ success: false });
      shadowQuery('swp-icon-button[variant="danger"]').click();
      await waitForLit();
      const cacheStatus = shadowQueryAll('swp-status-message')[1];
      expect(cacheStatus.message).toContain('Failed');
      expect(cacheStatus.type).toBe('error');
    });

    it('should show error status on exception', async () => {
      await createOptions();
      chrome.runtime.sendMessage.mockRejectedValueOnce(new Error('Network error'));
      shadowQuery('swp-icon-button[variant="danger"]').click();
      await waitForLit();
      const cacheStatus = shadowQueryAll('swp-status-message')[1];
      expect(cacheStatus.message).toContain('Failed');
      expect(cacheStatus.type).toBe('error');
    });

    it('should set loading state while clearing', async () => {
      await createOptions();
      let resolve;
      chrome.runtime.sendMessage.mockReturnValueOnce(new Promise(r => { resolve = r; }));
      const clearBtn = shadowQuery('swp-icon-button[variant="danger"]');
      clearBtn.click();
      await waitForLit();
      expect(clearBtn.loading).toBe(true);
      resolve({ success: true });
      await waitForLit();
      expect(clearBtn.loading).toBe(false);
    });

    it('should refresh stats after clearing cache', async () => {
      await createOptions();
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true, count: 0, oldestEntry: null });
      shadowQuery('swp-icon-button[variant="danger"]').click();
      await waitForLit();
      const calls = chrome.runtime.sendMessage.mock.calls;
      expect(calls.some(c => c[0].type === 'CLEAR_CACHE')).toBe(true);
      expect(calls.some(c => c[0].type === 'GET_CACHE_STATS')).toBe(true);
    });
  });

  describe('exportCache', () => {
    beforeEach(() => {
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:test-url');
      global.URL.revokeObjectURL = jest.fn();
      chrome.runtime.getManifest = jest.fn().mockReturnValue({ version: '0.8.0' });
    });

    it('should request cache export', async () => {
      await createOptions();
      chrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true, data: [{ appid: '123', gameName: 'Game A' }]
      });
      shadowQueryAll('swp-icon-button[variant="secondary"]')[1].click();
      await waitForLit();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'GET_CACHE_EXPORT' });
    });

    it('should show error when export fails', async () => {
      await createOptions();
      chrome.runtime.sendMessage.mockResolvedValueOnce({ success: false });
      shadowQueryAll('swp-icon-button[variant="secondary"]')[1].click();
      await waitForLit();
      const cacheStatus = shadowQueryAll('swp-status-message')[1];
      expect(cacheStatus.message).toBe('Failed to export cache.');
      expect(cacheStatus.type).toBe('error');
    });

    it('should show error when export throws', async () => {
      await createOptions();
      chrome.runtime.sendMessage.mockRejectedValueOnce(new Error('Network error'));
      shadowQueryAll('swp-icon-button[variant="secondary"]')[1].click();
      await waitForLit();
      expect(shadowQueryAll('swp-status-message')[1].message).toBe('Failed to export cache.');
    });

    it('should show loading state during export', async () => {
      await createOptions();
      let resolve;
      chrome.runtime.sendMessage.mockReturnValueOnce(new Promise(r => { resolve = r; }));
      const exportBtn = shadowQueryAll('swp-icon-button[variant="secondary"]')[1];
      exportBtn.click();
      await waitForLit();
      expect(exportBtn.loading).toBe(true);
      resolve({ success: true, data: [] });
      await waitForLit();
      expect(exportBtn.loading).toBe(false);
    });
  });

  describe('loadSettings', () => {
    it('should load settings from chrome.storage.sync on init', async () => {
      await createOptions();
      expect(chrome.storage.sync.get).toHaveBeenCalledWith('scpwSettings');
    });

    it('should set toggle to saved value when loading settings', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        scpwSettings: {
          showNintendo: false, showPlaystation: true, showXbox: false,
          showSteamDeck: false, showHltb: true, hltbDisplayStat: 'mainStory',
          showReviewScores: true, reviewScoreSource: 'opencritic'
        }
      });
      await createOptions();
      const toggles = shadowQueryAll('swp-toggle');
      expect(toggles[0].checked).toBe(false);
      expect(toggles[1].checked).toBe(true);
      expect(toggles[2].checked).toBe(false);
      expect(toggles[3].checked).toBe(false);
    });

    it('should default to true when no settings saved', async () => {
      await createOptions();
      const toggles = shadowQueryAll('swp-toggle');
      expect(toggles[0].checked).toBe(true);
      expect(toggles[1].checked).toBe(true);
      expect(toggles[2].checked).toBe(true);
      expect(toggles[3].checked).toBe(true);
    });

    it('should handle storage errors gracefully', async () => {
      chrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));
      await createOptions();
      expect(shadowQueryAll('swp-toggle').length).toBe(6);
    });
  });

  describe('saveSettings', () => {
    it('should save settings when Steam Deck toggle changes', async () => {
      await createOptions();
      shadowQueryAll('swp-toggle')[3].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: false }, bubbles: true, composed: true
      }));
      await waitForLit();
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({ showSteamDeck: false })
      });
    });

    it('should save settings when Nintendo toggle changes', async () => {
      await createOptions();
      shadowQueryAll('swp-toggle')[0].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: false }, bubbles: true, composed: true
      }));
      await waitForLit();
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({ showNintendo: false })
      });
    });

    it('should save settings when PlayStation toggle changes', async () => {
      await createOptions();
      shadowQueryAll('swp-toggle')[1].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: false }, bubbles: true, composed: true
      }));
      await waitForLit();
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({ showPlaystation: false })
      });
    });

    it('should save settings when Xbox toggle changes', async () => {
      await createOptions();
      shadowQueryAll('swp-toggle')[2].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: false }, bubbles: true, composed: true
      }));
      await waitForLit();
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({ showXbox: false })
      });
    });

    it('should show success status after saving', async () => {
      await createOptions();
      shadowQueryAll('swp-toggle')[0].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: false }, bubbles: true, composed: true
      }));
      await waitForLit();
      const settingsStatus = shadowQueryAll('swp-status-message')[0];
      expect(settingsStatus.message).toContain('Settings saved');
      expect(settingsStatus.type).toBe('success');
    });

    it('should show error status on save failure', async () => {
      await createOptions();
      chrome.storage.sync.set.mockRejectedValueOnce(new Error('Save failed'));
      shadowQueryAll('swp-toggle')[0].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: false }, bubbles: true, composed: true
      }));
      await waitForLit();
      const settingsStatus = shadowQueryAll('swp-status-message')[0];
      expect(settingsStatus.message).toContain('Failed');
      expect(settingsStatus.type).toBe('error');
    });

    it('should auto-hide settings status after 2 seconds', async () => {
      await createOptions();
      shadowQueryAll('swp-toggle')[0].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: false }, bubbles: true, composed: true
      }));
      await waitForLit();
      const settingsStatus = shadowQueryAll('swp-status-message')[0];
      expect(settingsStatus.type).toBe('success');
      await jest.advanceTimersByTimeAsync(2100);
      await waitForLit();
      expect(settingsStatus.type).toBe('');
    });
  });

  describe('HLTB toggle with inline select', () => {
    it('should render HLTB toggle with select options', async () => {
      await createOptions();
      const hltbToggle = shadowQueryAll('swp-toggle')[4];
      expect(hltbToggle.selectOptions.length).toBe(3);
      expect(hltbToggle.selectOptions[0].value).toBe('mainStory');
    });

    it('should show select when HLTB is enabled', async () => {
      await createOptions();
      expect(shadowQueryAll('swp-toggle')[4].selectHidden).toBe(false);
    });

    it('should hide select when HLTB is disabled', async () => {
      chrome.storage.sync.get.mockResolvedValue({
        scpwSettings: {
          showNintendo: true, showPlaystation: true, showXbox: true, showSteamDeck: true,
          showHltb: false, hltbDisplayStat: 'mainStory',
          showReviewScores: true, reviewScoreSource: 'opencritic'
        }
      });
      await createOptions();
      expect(shadowQueryAll('swp-toggle')[4].selectHidden).toBe(true);
    });

    it('should toggle select visibility when HLTB checkbox changes', async () => {
      await createOptions();
      expect(shadowQueryAll('swp-toggle')[4].selectHidden).toBe(false);
      shadowQueryAll('swp-toggle')[4].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: false }, bubbles: true, composed: true
      }));
      await waitForLit();
      expect(shadowQueryAll('swp-toggle')[4].selectHidden).toBe(true);
    });

    it('should save select value change', async () => {
      await createOptions();
      shadowQueryAll('swp-toggle')[4].dispatchEvent(new CustomEvent('swp-select-change', {
        detail: { value: 'completionist' }, bubbles: true, composed: true
      }));
      await waitForLit();
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({ hltbDisplayStat: 'completionist' })
      });
    });
  });

  describe('Review Scores toggle with inline select', () => {
    it('should render Review Scores toggle with select options', async () => {
      await createOptions();
      const reviewToggle = shadowQueryAll('swp-toggle')[5];
      expect(reviewToggle.selectOptions.length).toBe(3);
      expect(reviewToggle.selectOptions[0].value).toBe('opencritic');
    });

    it('should save review source change', async () => {
      await createOptions();
      shadowQueryAll('swp-toggle')[5].dispatchEvent(new CustomEvent('swp-select-change', {
        detail: { value: 'ign' }, bubbles: true, composed: true
      }));
      await waitForLit();
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({ reviewScoreSource: 'ign' })
      });
    });
  });

  describe('collapsible About section', () => {
    it('should render About section as collapsed', async () => {
      await createOptions();
      const aboutSection = shadowQueryAll('swp-section')[3];
      expect(aboutSection.collapsed).toBe(true);
      expect(aboutSection.collapsible).toBe(true);
    });

    it('should render about content with info boxes', async () => {
      await createOptions();
      expect(shadowQueryAll('.info-box').length).toBe(2);
    });
  });

  // Tests for shared component internals bundled in options.js
  describe('shared component internals', () => {
    const waitForEl = async (el) => {
      await jest.advanceTimersByTimeAsync(0);
      if (el && el.updateComplete) await el.updateComplete;
      await jest.advanceTimersByTimeAsync(0);
    };

    describe('swp-toggle mini variant', () => {
      let toggle;

      beforeEach(async () => {
        toggle = document.createElement('swp-toggle');
        toggle.variant = 'mini';
        toggle.label = 'Mini Toggle';
        toggle.checked = true;
        document.body.appendChild(toggle);
        await waitForEl(toggle);
      });

      afterEach(() => {
        if (toggle && toggle.parentNode) toggle.parentNode.removeChild(toggle);
      });

      it('should render mini variant', async () => {
        expect(toggle.shadowRoot.querySelector('.toggle-mini')).toBeTruthy();
      });

      it('should fire swp-toggle-change from internal checkbox', async () => {
        const input = toggle.shadowRoot.querySelector('.mini-switch input');
        const handler = jest.fn();
        toggle.addEventListener('swp-toggle-change', handler);
        input.checked = false;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await waitForEl(toggle);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { checked: false } })
        );
      });
    });

    describe('swp-toggle full variant internal handlers', () => {
      let toggle;

      beforeEach(async () => {
        toggle = document.createElement('swp-toggle');
        toggle.variant = 'full';
        toggle.label = 'Full Toggle';
        toggle.checked = true;
        document.body.appendChild(toggle);
        await waitForEl(toggle);
      });

      afterEach(() => {
        if (toggle && toggle.parentNode) toggle.parentNode.removeChild(toggle);
      });

      it('should toggle via _clickCheckbox on icon click', async () => {
        const icon = toggle.shadowRoot.querySelector('.toggle-icon');
        const handler = jest.fn();
        toggle.addEventListener('swp-toggle-change', handler);
        icon.click();
        await waitForEl(toggle);
        expect(handler).toHaveBeenCalled();
      });

      it('should toggle via _clickCheckbox on content click', async () => {
        const content = toggle.shadowRoot.querySelector('.toggle-content');
        const handler = jest.fn();
        toggle.addEventListener('swp-toggle-change', handler);
        content.click();
        await waitForEl(toggle);
        expect(handler).toHaveBeenCalled();
      });

      it('should fire swp-select-change from internal select', async () => {
        toggle.selectOptions = [
          { value: 'x', label: 'X' },
          { value: 'y', label: 'Y' }
        ];
        toggle.selectValue = 'x';
        toggle.selectHidden = false;
        await waitForEl(toggle);
        const select = toggle.shadowRoot.querySelector('.inline-select');
        const handler = jest.fn();
        toggle.addEventListener('swp-select-change', handler);
        select.value = 'y';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await waitForEl(toggle);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { value: 'y' } })
        );
      });

      it('should stop propagation on select click', async () => {
        toggle.selectOptions = [{ value: 'a', label: 'A' }];
        toggle.selectHidden = false;
        await waitForEl(toggle);
        const select = toggle.shadowRoot.querySelector('.inline-select');
        const event = new Event('click', { bubbles: true });
        const spy = jest.spyOn(event, 'stopPropagation');
        select.dispatchEvent(event);
        expect(spy).toHaveBeenCalled();
      });

      it('should not toggle when disabled', async () => {
        toggle.disabled = true;
        await waitForEl(toggle);
        const handler = jest.fn();
        toggle.addEventListener('swp-toggle-change', handler);
        toggle.shadowRoot.querySelector('.toggle-content').click();
        await waitForEl(toggle);
        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('swp-status-message', () => {
      let statusEl;

      beforeEach(async () => {
        statusEl = document.createElement('swp-status-message');
        document.body.appendChild(statusEl);
        await waitForEl(statusEl);
      });

      afterEach(() => {
        if (statusEl && statusEl.parentNode) statusEl.parentNode.removeChild(statusEl);
      });

      it('should show message via show()', async () => {
        statusEl.show('Hello', 'success');
        await waitForEl(statusEl);
        expect(statusEl.message).toBe('Hello');
        expect(statusEl.type).toBe('success');
      });

      it('should clear message via hide()', async () => {
        statusEl.show('Hello', 'error');
        await waitForEl(statusEl);
        statusEl.hide();
        await waitForEl(statusEl);
        expect(statusEl.type).toBe('');
        expect(statusEl.message).toBe('');
      });

      it('should auto-hide after specified duration', async () => {
        statusEl.autoHideMs = 500;
        statusEl.message = 'Temp';
        statusEl.type = 'success';
        await waitForEl(statusEl);
        await jest.advanceTimersByTimeAsync(600);
        await waitForEl(statusEl);
        expect(statusEl.type).toBe('');
      });
    });

    describe('swp-icon-button', () => {
      let btn;

      beforeEach(async () => {
        btn = document.createElement('swp-icon-button');
        btn.label = 'Test';
        document.body.appendChild(btn);
        await waitForEl(btn);
      });

      afterEach(() => {
        if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
      });

      it('should prevent click propagation when loading', async () => {
        btn.loading = true;
        await waitForEl(btn);
        const innerBtn = btn.shadowRoot.querySelector('button');
        const event = new Event('click', { bubbles: true, cancelable: true });
        const stopSpy = jest.spyOn(event, 'stopPropagation');
        const preventSpy = jest.spyOn(event, 'preventDefault');
        innerBtn.dispatchEvent(event);
        expect(stopSpy).toHaveBeenCalled();
        expect(preventSpy).toHaveBeenCalled();
      });

      it('should prevent click propagation when disabled', async () => {
        btn.disabled = true;
        await waitForEl(btn);
        const innerBtn = btn.shadowRoot.querySelector('button');
        const event = new Event('click', { bubbles: true, cancelable: true });
        const stopSpy = jest.spyOn(event, 'stopPropagation');
        innerBtn.dispatchEvent(event);
        expect(stopSpy).toHaveBeenCalled();
      });
    });
  });
});
