/**
 * Steam Wishlist Plus - Options Page (Preact)
 *
 * Handles the options UI for managing settings and cache.
 */
import { render } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { Toggle } from './components/Toggle';
import { StatBox } from './components/StatBox';
import { StatusMessage } from './components/StatusMessage';
import { Section } from './components/Section';
import { IconButton } from './components/IconButton';
import {
  NINTENDO_SVG, PLAYSTATION_SVG, XBOX_SVG, STEAMDECK_SVG,
  CLOCK_SVG, STAR_SVG, REFRESH_SVG, EXPORT_SVG, TRASH_SVG
} from './components/icons';
import type { UserSettings } from './types';

const { DEFAULT_USER_SETTINGS } = globalThis.SWP_UserSettings;
const LOG_PREFIX = '[SWP Options]';
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function formatAge(ms: number): string {
  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return '<1h';
}

interface CacheStatsResponse {
  success: boolean;
  count?: number;
  oldestEntry?: number | null;
}

interface ClearCacheResponse {
  success: boolean;
}

interface CacheExportResponse {
  success: boolean;
  data?: unknown;
}

function SwpOptions() {
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_USER_SETTINGS });
  const [cacheCount, setCacheCount] = useState('-');
  const [cacheAge, setCacheAge] = useState('-');
  const [cacheStatus, setCacheStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [settingsStatus, setSettingsStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [loaded, setLoaded] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

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

  useEffect(() => {
    Promise.all([loadSettings(), loadCacheStats()]).then(() => setLoaded(true));
  }, [loadSettings, loadCacheStats]);

  const updateSetting = useCallback(async (key: keyof UserSettings, value: unknown) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await chrome.storage.sync.set({ scpwSettings: updated });
      setSettingsStatus({ message: 'Settings saved', type: 'success' });
    } catch (err) {
      console.error(`${LOG_PREFIX} Error saving settings:`, err);
      setSettingsStatus({ message: 'Failed to save settings', type: 'error' });
    }
  }, [settings]);

  const refreshCacheStats = useCallback(async () => {
    setRefreshLoading(true);
    try {
      await loadCacheStats();
    } finally {
      setRefreshLoading(false);
    }
  }, [loadCacheStats]);

  const exportCache = useCallback(async () => {
    setExportLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CACHE_EXPORT' }) as CacheExportResponse;
      if (!response?.success || !response.data) {
        setCacheStatus({ message: 'Failed to export cache.', type: 'error' });
        return;
      }
      const entries = response.data as Array<Record<string, unknown>>;
      const exportData = {
        exportedAt: new Date().toISOString(),
        version: chrome.runtime.getManifest().version,
        entryCount: entries.length,
        entries
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scpw-cache-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setCacheStatus({ message: `Exported ${entries.length} cached entries.`, type: 'success' });
    } catch (err) {
      console.error(`${LOG_PREFIX} Error exporting cache:`, err);
      setCacheStatus({ message: 'Failed to export cache.', type: 'error' });
    } finally {
      setExportLoading(false);
    }
  }, []);

  const clearCache = useCallback(async () => {
    if (!confirm('Are you sure you want to clear the cache? All games will need to be re-resolved.')) return;
    setClearLoading(true);
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }) as ClearCacheResponse;
      if (resp?.success) {
        setCacheStatus({ message: 'Cache cleared successfully.', type: 'success' });
        await loadCacheStats();
      } else {
        setCacheStatus({ message: 'Failed to clear cache.', type: 'error' });
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Error clearing cache:`, err);
      setCacheStatus({ message: 'Failed to clear cache.', type: 'error' });
    } finally {
      setClearLoading(false);
    }
  }, [loadCacheStats]);

  if (!loaded) return null;

  return (
    <div class="swp-container">
      <header class="swp-header">
        <div class="swp-header-icon">
          <img src="../assets/icons/icon128.png" alt="Extension icon" />
        </div>
        <div class="swp-header-text">
          <h1>Steam Wishlist Plus</h1>
          <div class="swp-version">Version {chrome.runtime.getManifest().version}</div>
        </div>
      </header>

      <Section heading="Platforms" accentColor="var(--accent)"
              description="Show game availability on other platforms">
        <div class="swp-toggle-list">
          <Toggle variant="full" label="Nintendo Switch" description="Show eShop availability"
            icon={NINTENDO_SVG} platform="nintendo"
            checked={settings.showNintendo}
            onChange={val => updateSetting('showNintendo', val)} />
          <Toggle variant="full" label="PlayStation" description="Show PS Store availability"
            icon={PLAYSTATION_SVG} platform="playstation"
            checked={settings.showPlaystation}
            onChange={val => updateSetting('showPlaystation', val)} />
          <Toggle variant="full" label="Xbox" description="Show Xbox Store / Game Pass"
            icon={XBOX_SVG} platform="xbox"
            checked={settings.showXbox}
            onChange={val => updateSetting('showXbox', val)} />
        </div>
      </Section>

      <Section heading="Game Info" accentColor="var(--hltb)"
              description="Compatibility, playtime, and review information">
        <div class="swp-toggle-list">
          <Toggle variant="full" label="Steam Deck Compatibility"
            description="Show Verified / Playable status"
            icon={STEAMDECK_SVG} platform="steamdeck"
            checked={settings.showSteamDeck}
            onChange={val => updateSetting('showSteamDeck', val)} />
          <Toggle variant="full" label="How Long To Beat"
            description="Show completion time estimates"
            icon={CLOCK_SVG} platform="hltb"
            checked={settings.showHltb}
            onChange={val => updateSetting('showHltb', val)}
            selectOptions={[
              { value: 'mainStory', label: 'Main Story' },
              { value: 'mainExtra', label: 'Main + Extras' },
              { value: 'completionist', label: 'Completionist' },
            ]}
            selectValue={settings.hltbDisplayStat}
            onSelectChange={val => updateSetting('hltbDisplayStat', val)} />
          <Toggle variant="full" label="Review Scores"
            description="Show game ratings from critics"
            icon={STAR_SVG} platform="review-scores"
            checked={settings.showReviewScores}
            onChange={val => updateSetting('showReviewScores', val)}
            selectOptions={[
              { value: 'opencritic', label: 'OpenCritic' },
              { value: 'ign', label: 'IGN' },
              { value: 'gamespot', label: 'GameSpot' },
            ]}
            selectValue={settings.reviewScoreSource}
            onSelectChange={val => updateSetting('reviewScoreSource', val)} />
        </div>
        <StatusMessage message={settingsStatus.message} type={settingsStatus.type}
          autoHideMs={2000}
          onHide={() => setSettingsStatus({ message: '', type: '' })} />
      </Section>

      <Section heading="Cache" accentColor="var(--text-muted)">
        <div class="swp-stats-grid">
          <StatBox value={cacheCount} label="Games Cached" />
          <StatBox value={cacheAge} label="Oldest Entry" />
        </div>
        <div class="swp-button-row">
          <IconButton variant="secondary" label="Refresh" icon={REFRESH_SVG}
            loading={refreshLoading} onClick={refreshCacheStats} />
          <IconButton variant="secondary" label="Export" icon={EXPORT_SVG}
            loading={exportLoading} onClick={exportCache} />
        </div>
        <IconButton variant="danger" label="Clear Cache" icon={TRASH_SVG}
          fullWidth loading={clearLoading} onClick={clearCache} />
        <StatusMessage message={cacheStatus.message} type={cacheStatus.type}
          onHide={() => setCacheStatus({ message: '', type: '' })} />
      </Section>

      <Section heading="About" collapsible initialCollapsed
              accentColor="var(--border-color)">
        <div class="swp-info-box">
          <strong>Your data stays local</strong>
          <ul>
            <li>Only connects to Steam, Wikidata, HLTB, and OpenCritic</li>
            <li>Wishlist data never leaves your browser</li>
            <li>All cache stored locally in Chrome</li>
            <li>Zero analytics or telemetry</li>
          </ul>
        </div>
        <div class="swp-divider" />
        <div class="swp-info-box">
          <strong>Powered by open data</strong>
          <p style={{ marginTop: '6px' }}>
            Platform data from <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a> (community-maintained).{' '}
            Steam Deck status from Steam's official data.{' '}
            Playtime from <a href="https://howlongtobeat.com" target="_blank" rel="noopener">HowLongToBeat</a>.{' '}
            Review scores from <a href="https://opencritic.com" target="_blank" rel="noopener">OpenCritic</a>.
          </p>
        </div>
      </Section>
    </div>
  );
}

render(<SwpOptions />, document.getElementById('app')!);
