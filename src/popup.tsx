/**
 * Steam Wishlist Plus - Popup UI
 *
 * Provides quick access to cache statistics, platform toggles, and a clear cache button.
 */

import { h, render, useCallback, useLayoutEffect, useState } from './preact';
import type { UserSettings } from './types';
import { IconButton } from './components/IconButton';
import { StatBox } from './components/StatBox';
import { StatusMessage } from './components/StatusMessage';
import { Toggle } from './components/Toggle';

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;
const LOG_PREFIX = '[SWP Popup]';

const { DEFAULT_USER_SETTINGS } = globalThis.SWP_UserSettings;

function formatAge(ms: number): string {
  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return '<1h';
}

const PLATFORM_TOGGLES = [
  { key: 'showNintendo', label: 'Switch' },
  { key: 'showPlaystation', label: 'PlayStation' },
  { key: 'showXbox', label: 'Xbox' }
] as const;

const INFO_TOGGLES = [
  { key: 'showSteamDeck', label: 'Steam Deck' },
  { key: 'showHltb', label: 'Play Time' },
  { key: 'showReviewScores', label: 'Reviews' }
] as const;

interface CacheStatsResponse {
  success: boolean;
  count?: number;
  oldestEntry?: number | null;
}

interface ClearCacheResponse {
  success: boolean;
}

function SwpPopup() {
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_USER_SETTINGS });
  const [cacheCount, setCacheCount] = useState('-');
  const [cacheAge, setCacheAge] = useState('-');
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({
    message: '',
    type: ''
  });
  const [clearLoading, setClearLoading] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const result = await chrome.storage.sync.get('scpwSettings');
      setSettings((prev) => ({ ...prev, ...result.scpwSettings }));
    } catch (error) {
      console.error(`${LOG_PREFIX} Error loading settings:`, error);
    }
  }, []);

  const loadCacheStats = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CACHE_STATS' }) as CacheStatsResponse;
      if (response?.success && response.count !== undefined) {
        setCacheCount(response.count.toString());
        setCacheAge(response.oldestEntry ? formatAge(Date.now() - response.oldestEntry) : '-');
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error loading cache stats:`, error);
      setCacheCount('?');
      setCacheAge('?');
    }
  }, []);

  useLayoutEffect(() => {
    void loadSettings();
    void loadCacheStats();
  }, [loadSettings, loadCacheStats]);

  const updateSetting = useCallback(async (key: keyof UserSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await chrome.storage.sync.set({ scpwSettings: updated });
      setStatus({ message: 'Settings saved', type: 'success' });
    } catch (error) {
      console.error(`${LOG_PREFIX} Error saving settings:`, error);
      setStatus({ message: 'Failed to save', type: 'error' });
    }
  }, [settings]);

  const clearCache = useCallback(async () => {
    const confirmed = confirm('Clear all cached platform data?');
    if (!confirmed) return;

    setClearLoading(true);

    try {
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }) as ClearCacheResponse;
      if (response?.success) {
        setStatus({ message: 'Cache cleared', type: 'success' });
        await loadCacheStats();
      } else {
        setStatus({ message: 'Failed to clear cache', type: 'error' });
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error clearing cache:`, error);
      setStatus({ message: 'Failed to clear cache', type: 'error' });
    } finally {
      setClearLoading(false);
    }
  }, [loadCacheStats]);

  return (
    <div class="swp-popup">
      <div class="swp-header">
        <div class="swp-header-icon">
          <img src="../assets/icons/icon128.png" alt="" />
        </div>
        <h1>Steam Wishlist Plus</h1>
        <button
          type="button"
          class="swp-settings-btn"
          aria-label="Open settings"
          title="Settings"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      <div class="swp-stats">
        <StatBox value={cacheCount} label="Cached Games" variant="compact" />
        <StatBox value={cacheAge} label="Oldest Entry" variant="compact" />
      </div>

      <div class="swp-section-group">
        <div class="swp-section-title">Platforms</div>
        <div class="swp-toggle-list">
          {PLATFORM_TOGGLES.map(({ key, label }) => (
            <Toggle
              key={key}
              variant="mini"
              label={label}
              checked={settings[key] as boolean}
              onChange={(value) => updateSetting(key, value)}
            />
          ))}
        </div>
      </div>

      <div class="swp-section-group">
        <div class="swp-section-title">Game Info</div>
        <div class="swp-toggle-list">
          {INFO_TOGGLES.map(({ key, label }) => (
            <Toggle
              key={key}
              variant="mini"
              label={label}
              checked={settings[key] as boolean}
              onChange={(value) => updateSetting(key, value)}
            />
          ))}
        </div>
      </div>

      <IconButton
        variant="danger"
        label="Clear Cache"
        loading={clearLoading}
        fullWidth
        onClick={clearCache}
      />

      <StatusMessage
        message={status.message}
        type={status.type}
        onHide={() => setStatus({ message: '', type: '' })}
      />
    </div>
  );
}

if (typeof globalThis !== 'undefined') {
  globalThis.SWP_PopupUI = {
    Toggle,
    StatBox,
    StatusMessage,
    IconButton
  };
}

const mountNode = document.getElementById('app');
if (mountNode) {
  render(<SwpPopup />, mountNode);
}
