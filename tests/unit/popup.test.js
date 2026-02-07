/**
 * Unit tests for popup.js (Lit component version)
 *
 * Tests the <swp-popup> Lit custom element.
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
    SETTING_SELECT_IDS: {},
    USER_SETTING_KEYS: ['showNintendo', 'showPlaystation', 'showXbox', 'showSteamDeck', 'showHltb', 'hltbDisplayStat', 'showReviewScores', 'reviewScoreSource']
  };

  chrome.runtime.sendMessage.mockResolvedValue({ success: true, count: 0, oldestEntry: null });
  chrome.storage.sync.get.mockResolvedValue({});
  chrome.storage.sync.set.mockResolvedValue();

  require('../../dist/popup.js');
});

describe('popup.js', () => {
  let popupEl;

  // Helper to wait for Lit rendering
  const waitForLit = async () => {
    await jest.advanceTimersByTimeAsync(0);
    if (popupEl && popupEl.updateComplete) {
      await popupEl.updateComplete;
    }
    await jest.advanceTimersByTimeAsync(0);
  };

  // Helper to create a fresh popup and wait for it to render
  const createPopup = async () => {
    popupEl = document.createElement('swp-popup');
    document.body.appendChild(popupEl);
    await waitForLit();
    return popupEl;
  };

  // Helper to query shadow DOM
  const shadowQuery = (selector) => popupEl?.shadowRoot?.querySelector(selector);
  const shadowQueryAll = (selector) => popupEl?.shadowRoot?.querySelectorAll(selector);

  beforeEach(() => {
    jest.useFakeTimers();

    // Clear DOM
    document.body.textContent = '';

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
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.confirm;
    if (popupEl && popupEl.parentNode) {
      popupEl.parentNode.removeChild(popupEl);
    }
    popupEl = null;
  });

  describe('initialization', () => {
    it('should register the swp-popup custom element', () => {
      expect(customElements.get('swp-popup')).toBeTruthy();
    });

    it('should render shadow DOM content', async () => {
      await createPopup();
      expect(popupEl.shadowRoot).toBeTruthy();
      expect(shadowQuery('.header')).toBeTruthy();
    });

    it('should load cache stats on init', async () => {
      await createPopup();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_CACHE_STATS'
      });
    });

    it('should load settings on init', async () => {
      await createPopup();
      expect(chrome.storage.sync.get).toHaveBeenCalledWith('scpwSettings');
    });
  });

  describe('loadCacheStats', () => {
    it('should display cache count', async () => {
      await createPopup();
      const statBoxes = shadowQueryAll('swp-stat-box');
      expect(statBoxes.length).toBe(2);
      expect(statBoxes[0].value).toBe('10');
    });

    it('should display cache age in days and hours', async () => {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);
      chrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        count: 5,
        oldestEntry: oneDayAgo
      });

      await createPopup();
      const statBoxes = shadowQueryAll('swp-stat-box');
      expect(statBoxes[1].value).toMatch(/1d 2h/);
    });

    it('should display cache age in hours only when less than a day', async () => {
      const hoursAgo = Date.now() - (5 * 60 * 60 * 1000);
      chrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        count: 3,
        oldestEntry: hoursAgo
      });

      await createPopup();
      const statBoxes = shadowQueryAll('swp-stat-box');
      expect(statBoxes[1].value).toBe('5h');
    });

    it('should display <1h when cache is less than an hour old', async () => {
      const recentTime = Date.now() - (30 * 60 * 1000);
      chrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        count: 2,
        oldestEntry: recentTime
      });

      await createPopup();
      const statBoxes = shadowQueryAll('swp-stat-box');
      expect(statBoxes[1].value).toBe('<1h');
    });

    it('should display dash when no oldest entry', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        count: 0,
        oldestEntry: null
      });

      await createPopup();
      const statBoxes = shadowQueryAll('swp-stat-box');
      expect(statBoxes[1].value).toBe('-');
    });

    it('should display question marks on error', async () => {
      chrome.runtime.sendMessage.mockRejectedValue(new Error('Network error'));
      chrome.storage.sync.get.mockRejectedValue(new Error('Network error'));

      await createPopup();
      const statBoxes = shadowQueryAll('swp-stat-box');
      expect(statBoxes[0].value).toBe('?');
      expect(statBoxes[1].value).toBe('?');
    });

    it('should not update display when response.success is false', async () => {
      chrome.runtime.sendMessage.mockResolvedValue({
        success: false,
        count: 99,
        oldestEntry: Date.now()
      });

      await createPopup();
      const statBoxes = shadowQueryAll('swp-stat-box');
      expect(statBoxes[0].value).toBe('-');
    });

    it('should not update display when response is undefined', async () => {
      chrome.runtime.sendMessage.mockResolvedValue(undefined);

      await createPopup();
      const statBoxes = shadowQueryAll('swp-stat-box');
      expect(statBoxes[0].value).toBe('-');
    });
  });

  describe('clearCache', () => {
    it('should show confirmation dialog when clear button clicked', async () => {
      await createPopup();
      const clearBtn = shadowQuery('swp-icon-button[variant="danger-compact"]');
      clearBtn.click();
      await waitForLit();
      expect(global.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Clear')
      );
    });

    it('should not clear cache if user cancels', async () => {
      await createPopup();
      global.confirm.mockReturnValueOnce(false);
      const clearBtn = shadowQuery('swp-icon-button[variant="danger-compact"]');
      clearBtn.click();
      await waitForLit();
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith({
        type: 'CLEAR_CACHE'
      });
    });

    it('should send CLEAR_CACHE message when confirmed', async () => {
      await createPopup();
      chrome.runtime.sendMessage.mockResolvedValueOnce({ success: true });
      const clearBtn = shadowQuery('swp-icon-button[variant="danger-compact"]');
      clearBtn.click();
      await waitForLit();
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CLEAR_CACHE'
      });
    });

    it('should show success status on successful clear', async () => {
      await createPopup();
      chrome.runtime.sendMessage.mockResolvedValueOnce({ success: true });
      shadowQuery('swp-icon-button[variant="danger-compact"]').click();
      await waitForLit();
      const statusEl = shadowQuery('swp-status-message');
      expect(statusEl.message).toContain('cleared');
      expect(statusEl.type).toBe('success');
    });

    it('should show error status on failed clear', async () => {
      await createPopup();
      chrome.runtime.sendMessage.mockResolvedValueOnce({ success: false });
      shadowQuery('swp-icon-button[variant="danger-compact"]').click();
      await waitForLit();
      const statusEl = shadowQuery('swp-status-message');
      expect(statusEl.message).toContain('Failed');
      expect(statusEl.type).toBe('error');
    });

    it('should show error status on exception', async () => {
      await createPopup();
      chrome.runtime.sendMessage.mockRejectedValueOnce(new Error('Network error'));
      shadowQuery('swp-icon-button[variant="danger-compact"]').click();
      await waitForLit();
      const statusEl = shadowQuery('swp-status-message');
      expect(statusEl.message).toContain('Failed');
      expect(statusEl.type).toBe('error');
    });

    it('should set loading state on button while clearing', async () => {
      await createPopup();
      let resolveMessage;
      chrome.runtime.sendMessage.mockReturnValueOnce(new Promise(r => { resolveMessage = r; }));
      const clearBtn = shadowQuery('swp-icon-button[variant="danger-compact"]');
      clearBtn.click();
      await waitForLit();
      expect(clearBtn.loading).toBe(true);
      resolveMessage({ success: true });
      await waitForLit();
      expect(clearBtn.loading).toBe(false);
    });

    it('should auto-hide status after duration', async () => {
      await createPopup();
      chrome.runtime.sendMessage.mockResolvedValueOnce({ success: true });
      shadowQuery('swp-icon-button[variant="danger-compact"]').click();
      await waitForLit();
      const statusEl = shadowQuery('swp-status-message');
      expect(statusEl.type).toBe('success');
      await jest.advanceTimersByTimeAsync(3500);
      await waitForLit();
      expect(statusEl.type).toBe('');
    });

    it('should refresh stats after clearing cache', async () => {
      await createPopup();
      chrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true, count: 0, oldestEntry: null });
      shadowQuery('swp-icon-button[variant="danger-compact"]').click();
      await waitForLit();
      const calls = chrome.runtime.sendMessage.mock.calls;
      expect(calls.some(c => c[0].type === 'CLEAR_CACHE')).toBe(true);
      expect(calls.some(c => c[0].type === 'GET_CACHE_STATS')).toBe(true);
    });
  });

  describe('openOptionsPage', () => {
    it('should call chrome.runtime.openOptionsPage when settings button clicked', async () => {
      await createPopup();
      shadowQuery('.settings-btn').click();
      await waitForLit();
      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });

  describe('platform toggles', () => {
    it('should render platform toggles', async () => {
      await createPopup();
      const toggles = shadowQueryAll('swp-toggle');
      expect(toggles.length).toBe(6);
    });

    it('should set toggle states based on loaded settings', async () => {
      await createPopup();
      const toggles = shadowQueryAll('swp-toggle');
      expect(toggles[0].checked).toBe(true);  // Nintendo
      expect(toggles[1].checked).toBe(true);  // PlayStation
      expect(toggles[2].checked).toBe(false); // Xbox
      expect(toggles[3].checked).toBe(true);  // Steam Deck
      expect(toggles[4].checked).toBe(true);  // HLTB
    });

    it('should use default settings when none are stored', async () => {
      chrome.storage.sync.get.mockResolvedValue({});
      await createPopup();
      const toggles = shadowQueryAll('swp-toggle');
      expect(toggles[0].checked).toBe(true);
      expect(toggles[1].checked).toBe(true);
      expect(toggles[2].checked).toBe(true);
    });

    it('should save settings when a toggle changes', async () => {
      await createPopup();
      shadowQueryAll('swp-toggle')[0].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: false },
        bubbles: true,
        composed: true
      }));
      await waitForLit();
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        scpwSettings: expect.objectContaining({
          showNintendo: false
        })
      });
    });

    it('should show success status when settings are saved', async () => {
      await createPopup();
      shadowQueryAll('swp-toggle')[0].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: false }, bubbles: true, composed: true
      }));
      await waitForLit();
      expect(shadowQuery('swp-status-message').message).toContain('saved');
      expect(shadowQuery('swp-status-message').type).toBe('success');
    });

    it('should show error status when settings fail to save', async () => {
      await createPopup();
      chrome.storage.sync.set.mockRejectedValueOnce(new Error('Storage error'));
      shadowQueryAll('swp-toggle')[0].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: false }, bubbles: true, composed: true
      }));
      await waitForLit();
      expect(shadowQuery('swp-status-message').message).toContain('Failed');
      expect(shadowQuery('swp-status-message').type).toBe('error');
    });

    it('should handle loadSettings error gracefully', async () => {
      chrome.storage.sync.get.mockRejectedValue(new Error('Storage error'));
      await createPopup();
      const toggles = shadowQueryAll('swp-toggle');
      expect(toggles.length).toBe(6);
    });

    it('should remove loading state after initialization', async () => {
      await createPopup();
      expect(shadowQuery('.loaded')).toBeTruthy();
    });

    it.each([
      ['PlayStation', 1],
      ['Xbox', 2],
      ['Steam Deck', 3]
    ])('should save settings when %s toggle is changed', async (name, index) => {
      await createPopup();
      const toggles = shadowQueryAll('swp-toggle');
      toggles[index].dispatchEvent(new CustomEvent('swp-toggle-change', {
        detail: { checked: !toggles[index].checked }, bubbles: true, composed: true
      }));
      await waitForLit();
      expect(chrome.storage.sync.set).toHaveBeenCalled();
    });
  });

  // Tests for shared component internals bundled in popup.js
  describe('shared component internals', () => {
    // Helper to wait for any element's Lit update
    const waitForEl = async (el) => {
      await jest.advanceTimersByTimeAsync(0);
      if (el && el.updateComplete) await el.updateComplete;
      await jest.advanceTimersByTimeAsync(0);
    };

    describe('swp-toggle full variant', () => {
      let toggle;

      beforeEach(async () => {
        toggle = document.createElement('swp-toggle');
        toggle.variant = 'full';
        toggle.label = 'Test Toggle';
        toggle.checked = true;
        document.body.appendChild(toggle);
        await waitForEl(toggle);
      });

      afterEach(() => {
        if (toggle && toggle.parentNode) toggle.parentNode.removeChild(toggle);
      });

      it('should render full variant with label', async () => {
        expect(toggle.shadowRoot.querySelector('.toggle-full')).toBeTruthy();
        expect(toggle.shadowRoot.querySelector('.toggle-label').textContent).toBe('Test Toggle');
      });

      it('should render with select options when provided', async () => {
        toggle.selectOptions = [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' }
        ];
        toggle.selectValue = 'a';
        toggle.selectHidden = false;
        await waitForEl(toggle);
        expect(toggle.shadowRoot.querySelector('.inline-select')).toBeTruthy();
      });

      it('should toggle checked state via _clickCheckbox', async () => {
        const content = toggle.shadowRoot.querySelector('.toggle-content');
        const handler = jest.fn();
        toggle.addEventListener('swp-toggle-change', handler);
        content.click();
        await waitForEl(toggle);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { checked: false } })
        );
      });

      it('should fire swp-toggle-change from internal checkbox', async () => {
        const input = toggle.shadowRoot.querySelector('.toggle-switch input');
        const handler = jest.fn();
        toggle.addEventListener('swp-toggle-change', handler);
        input.checked = false;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        await waitForEl(toggle);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { checked: false } })
        );
      });

      it('should fire swp-select-change from internal select', async () => {
        toggle.selectOptions = [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' }
        ];
        toggle.selectValue = 'a';
        toggle.selectHidden = false;
        await waitForEl(toggle);
        const select = toggle.shadowRoot.querySelector('.inline-select');
        const handler = jest.fn();
        toggle.addEventListener('swp-select-change', handler);
        select.value = 'b';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await waitForEl(toggle);
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ detail: { value: 'b' } })
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
        statusEl.show('Test message', 'success');
        await waitForEl(statusEl);
        expect(statusEl.message).toBe('Test message');
        expect(statusEl.type).toBe('success');
      });

      it('should clear message via hide()', async () => {
        statusEl.show('Test', 'error');
        await waitForEl(statusEl);
        statusEl.hide();
        await waitForEl(statusEl);
        expect(statusEl.type).toBe('');
        expect(statusEl.message).toBe('');
      });

      it('should auto-hide after specified duration', async () => {
        statusEl.autoHideMs = 1000;
        statusEl.message = 'Auto hide test';
        statusEl.type = 'success';
        await waitForEl(statusEl);
        await jest.advanceTimersByTimeAsync(1100);
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
