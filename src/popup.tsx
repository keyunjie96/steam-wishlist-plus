/**
 * Steam Wishlist Plus - Popup UI (Preact)
 *
 * Provides quick access to cache statistics, platform toggles, and a clear cache button.
 */
import { render } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { Toggle } from './components/Toggle';
import { StatBox } from './components/StatBox';
import { StatusMessage } from './components/StatusMessage';
import { IconButton } from './components/IconButton';
import { GEAR_SVG } from './components/icons';
import type { UserSettings } from './types';

const { DEFAULT_USER_SETTINGS } = globalThis.SWP_UserSettings;
const LOG_PREFIX = '[SWP Popup]';
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function formatAge(ms: number): string {
  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return '<1h';
}

const PLATFORM_TOGGLES = [
  { key: 'showNintendo' as const, label: 'Switch' },
  { key: 'showPlaystation' as const, label: 'PlayStation' },
  { key: 'showXbox' as const, label: 'Xbox' },
];

const INFO_TOGGLES = [
  { key: 'showSteamDeck' as const, label: 'Steam Deck' },
  { key: 'showHltb' as const, label: 'Play Time' },
  { key: 'showReviewScores' as const, label: 'Reviews' },
];

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
    message: '', type: ''
  });
  const [clearLoading, setClearLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadCacheStats = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CACHE_STATS' }) as CacheStatsResponse;
      if (response?.success && response.count !== undefined) {
        setCacheCount(response.count.toString());
        setCacheAge(response.oldestEntry ? formatAge(Date.now() - response.oldestEntry) : '-');
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Error loading cache stats:`, err);
      setCacheCount('?');
      setCacheAge('?');
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const result = await chrome.storage.sync.get('scpwSettings');
      setSettings(prev => ({ ...prev, ...result.scpwSettings }));
    } catch (err) {
      console.error(`${LOG_PREFIX} Error loading settings:`, err);
    }
  }, []);

  // Load settings + cache stats on mount
  useEffect(() => {
    Promise.all([loadSettings(), loadCacheStats()]).then(() => setLoaded(true));
  }, [loadSettings, loadCacheStats]);

  const updateSetting = useCallback(async (key: keyof UserSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await chrome.storage.sync.set({ scpwSettings: updated });
      setStatus({ message: 'Settings saved', type: 'success' });
    } catch (err) {
      console.error(`${LOG_PREFIX} Error saving settings:`, err);
      setStatus({ message: 'Failed to save', type: 'error' });
    }
  }, [settings]);

  const clearCache = useCallback(async () => {
    if (!confirm('Clear all cached platform data?')) return;
    setClearLoading(true);
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }) as ClearCacheResponse;
      if (resp?.success) {
        setStatus({ message: 'Cache cleared', type: 'success' });
        await loadCacheStats();
      } else {
        setStatus({ message: 'Failed to clear cache', type: 'error' });
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Error clearing cache:`, err);
      setStatus({ message: 'Failed to clear cache', type: 'error' });
    } finally {
      setClearLoading(false);
    }
  }, [loadCacheStats]);

  if (!loaded) return null;

  return (
    <div class="swp-popup">
      <div class="swp-header">
        <div class="swp-header-icon">
          <img src="../assets/icons/icon128.png" alt="Extension icon" />
        </div>
        <h1>Steam Wishlist Plus</h1>
        <button
          type="button"
          class="swp-settings-btn"
          aria-label="Open settings"
          title="Settings"
          onClick={() => chrome.runtime.openOptionsPage()}
          dangerouslySetInnerHTML={{ __html: GEAR_SVG }}
        />
      </div>

      <div class="swp-stats">
        <StatBox value={cacheCount} label="Cached Games" variant="compact" />
        <StatBox value={cacheAge} label="Oldest Entry" variant="compact" />
      </div>

      <div class="swp-section-group">
        <div class="swp-section-title">Platforms</div>
        <div class="swp-toggles">
          {PLATFORM_TOGGLES.map(({ key, label }) => (
            <Toggle
              key={key}
              variant="mini"
              label={label}
              checked={settings[key] as boolean}
              onChange={(val) => updateSetting(key, val)}
            />
          ))}
        </div>
      </div>

      <div class="swp-section-group">
        <div class="swp-section-title">Game Info</div>
        <div class="swp-toggles">
          {INFO_TOGGLES.map(({ key, label }) => (
            <Toggle
              key={key}
              variant="mini"
              label={label}
              checked={settings[key] as boolean}
              onChange={(val) => updateSetting(key, val)}
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

// Mount
render(<SwpPopup />, document.getElementById('app')!);
