/**
 * Steam Wishlist Plus - Options Page (Lit Component)
 *
 * Full settings page with platform toggles, game info toggles with inline selects,
 * cache management, and about section.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { swpTheme, spinKeyframes, reducedMotion } from './components/swp-theme.js';
import './components/swp-toggle.js';
import './components/swp-stat-box.js';
import './components/swp-status-message.js';
import './components/swp-section.js';
import './components/swp-icon-button.js';
import type { UserSettings } from './types';

// Constants
const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;
const LOG_PREFIX = '[SWP Options]';

// Get centralized settings definitions from types.ts
const { DEFAULT_USER_SETTINGS, SETTING_CHECKBOX_IDS, SETTING_SELECT_IDS, USER_SETTING_KEYS } = globalThis.SWP_UserSettings;

/**
 * Formats a duration in milliseconds to a human-readable string
 */
function formatAge(ms: number): string {
  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
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

// SVG icons for buttons
const REFRESH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>';
const EXPORT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
const TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

// Platform toggle icons (SVG strings)
const NINTENDO_SVG = '<svg viewBox="0 0 32 32"><path d="M18.901 32h4.901c4.5 0 8.198-3.698 8.198-8.198v-15.604c0-4.5-3.698-8.198-8.198-8.198h-5c-0.099 0-0.203 0.099-0.203 0.198v31.604c0 0.099 0.099 0.198 0.302 0.198zM25 14.401c1.802 0 3.198 1.5 3.198 3.198 0 1.802-1.5 3.198-3.198 3.198-1.802 0-3.198-1.396-3.198-3.198-0.104-1.797 1.396-3.198 3.198-3.198zM15.198 0h-7c-4.5 0-8.198 3.698-8.198 8.198v15.604c0 4.5 3.698 8.198 8.198 8.198h7c0.099 0 0.203-0.099 0.203-0.198v-31.604c0-0.099-0.099-0.198-0.203-0.198zM12.901 29.401h-4.703c-3.099 0-5.599-2.5-5.599-5.599v-15.604c0-3.099 2.5-5.599 5.599-5.599h4.604zM5 9.599c0 1.698 1.302 3 3 3s3-1.302 3-3c0-1.698-1.302-3-3-3s-3 1.302-3 3z"/></svg>';
const PLAYSTATION_SVG = '<svg viewBox="0 0 32 32"><path d="M3.262 24.248c-2.374-0.681-2.767-2.084-1.69-2.899 0.776-0.51 1.668-0.954 2.612-1.288l0.087-0.027 7.017-2.516v2.89l-5.030 1.839c-0.881 0.339-1.031 0.79-0.299 1.032 0.365 0.093 0.783 0.147 1.214 0.147 0.615 0 1.204-0.109 1.749-0.308l-0.035 0.011 2.422-0.882v2.592c-0.15 0.037-0.32 0.055-0.487 0.091-0.775 0.136-1.667 0.214-2.577 0.214-1.778 0-3.486-0.298-5.078-0.846l0.11 0.033zM18.049 24.544l7.868-2.843c0.893-0.322 1.032-0.781 0.307-1.022-0.363-0.089-0.779-0.14-1.208-0.14-0.622 0-1.22 0.108-1.774 0.305l0.037-0.011-5.255 1.874v-2.983l0.3-0.106c1.050-0.349 2.284-0.62 3.557-0.761l0.083-0.008c0.468-0.050 1.010-0.078 1.559-0.078 1.877 0 3.677 0.331 5.343 0.939l-0.108-0.035c2.309 0.751 2.549 1.839 1.969 2.589-0.559 0.557-1.235 0.998-1.988 1.282l-0.039 0.013-10.677 3.883v-2.869zM12.231 4.248v21.927l4.892 1.576v-18.39c0-0.862 0.38-1.438 0.992-1.238 0.795 0.225 0.95 1.017 0.95 1.881v7.342c3.050 1.491 5.451-0.003 5.451-3.939 0-4.045-1.407-5.842-5.546-7.282-1.785-0.648-4.040-1.294-6.347-1.805l-0.389-0.072z"/></svg>';
const XBOX_SVG = '<svg viewBox="0 0 32 32"><path d="M16 5.425c-1.888-1.125-4.106-1.922-6.473-2.249l-0.092-0.010c-0.070-0.005-0.152-0.008-0.234-0.008-0.613 0-1.188 0.16-1.687 0.441l0.017-0.009c2.357-1.634 5.277-2.61 8.426-2.61 0.008 0 0.016 0 0.024 0h0.019c0.005 0 0.011 0 0.018 0 3.157 0 6.086 0.976 8.501 2.642l-0.050-0.033c-0.478-0.272-1.051-0.433-1.662-0.433-0.085 0-0.169 0.003-0.252 0.009l0.011-0.001c-2.459 0.336-4.677 1.13-6.648 2.297l0.082-0.045zM5.554 5.268c-0.041 0.014-0.077 0.032-0.11 0.054l0.002-0.001c-2.758 2.723-4.466 6.504-4.466 10.684 0 3.584 1.256 6.875 3.353 9.457l-0.022-0.028c-1.754-3.261 4.48-12.455 7.61-16.159-3.53-3.521-5.277-4.062-6.015-4.062-0.010-0-0.021-0.001-0.032-0.001-0.115 0-0.225 0.021-0.326 0.060l0.006-0.002zM20.083 9.275c3.129 3.706 9.367 12.908 7.605 16.161 2.075-2.554 3.332-5.845 3.332-9.43 0-4.181-1.709-7.962-4.467-10.684l-0.002-0.002c-0.029-0.021-0.063-0.039-0.1-0.052l-0.003-0.001c-0.1-0.036-0.216-0.056-0.336-0.056-0.005 0-0.011 0-0.016 0h0.001c-0.741-0-2.485 0.543-6.014 4.063zM6.114 27.306c2.627 2.306 6.093 3.714 9.888 3.714s7.261-1.407 9.905-3.728l-0.017 0.015c2.349-2.393-5.402-10.901-9.89-14.29-4.483 3.39-12.24 11.897-9.886 14.29z"/></svg>';
const STEAMDECK_SVG = '<svg viewBox="0 0 600.75 799.79"><defs><linearGradient id="sd-gradient" gradientUnits="userSpaceOnUse" x1="-154.087" x2="316.283" y1="274.041" y2="501.116"><stop offset=".107" stop-color="#c957e6"/><stop offset="1" stop-color="#1a9fff"/></linearGradient></defs><path d="M200.25 600.27C89.51 600.27 0 510.89 0 400.32s89.51-199.95 200.25-199.95 200.26 89.38 200.26 199.95-89.52 199.95-200.26 199.95z" fill="url(#sd-gradient)"/><path d="M456.98 399.89c0-141.57-114.95-256.34-256.74-256.34V0c221.2 0 400.51 179.04 400.51 399.89 0 220.86-179.31 399.9-400.51 399.9V656.24c141.79 0 256.74-114.77 256.74-256.35z" fill="#ffffff"/></svg>';
const CLOCK_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>';
const STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';

// HLTB select options
const HLTB_OPTIONS = [
  { value: 'mainStory', label: 'Main Story' },
  { value: 'mainExtra', label: 'Main + Extras' },
  { value: 'completionist', label: 'Completionist' }
];

// Review score source options
const REVIEW_SOURCE_OPTIONS = [
  { value: 'opencritic', label: 'OpenCritic' },
  { value: 'ign', label: 'IGN' },
  { value: 'gamespot', label: 'GameSpot' }
];

@customElement('swp-options')
export class SwpOptions extends LitElement {
  static styles = [swpTheme, spinKeyframes, reducedMotion, css`
    :host {
      display: block;
      min-height: 100vh;
      padding: 24px;
      background: linear-gradient(to bottom, #1b2838 0%, #171a21 100%);
      background-attachment: fixed;
    }

    * {
      box-sizing: border-box;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--swp-border-color);
    }

    .header-icon {
      width: 64px;
      height: 64px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      flex-shrink: 0;
    }

    .header-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .header-text h1 {
      font-size: 22px;
      font-weight: 300;
      color: var(--swp-text-bright);
      letter-spacing: 0.5px;
      margin: 0;
    }

    .header-text .version {
      font-size: 12px;
      color: var(--swp-text-muted);
      margin-top: 4px;
    }

    /* Toggle list */
    .toggle-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* Stats grid */
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    /* Button row */
    .button-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    /* Info box */
    .info-box {
      background: var(--swp-bg-input);
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 13px;
      color: var(--swp-text-secondary);
      border-left: 3px solid var(--swp-accent);
    }

    .info-box strong {
      color: var(--swp-text-bright);
      font-weight: 500;
    }

    .info-box a {
      color: var(--swp-accent);
      text-decoration: none;
    }

    .info-box a:hover {
      text-decoration: underline;
    }

    .info-box ul {
      margin: 10px 0 0;
      padding-left: 18px;
    }

    .info-box li {
      padding: 2px 0;
    }

    .section-divider {
      height: 1px;
      background: var(--swp-border-subtle);
      margin: 12px 0;
    }

    /* Loading state */
    :host(.is-loading) swp-section {
      opacity: 0.6;
    }

    /* Responsive */
    @media (max-width: 480px) {
      :host {
        padding: 16px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .button-row {
        grid-template-columns: 1fr;
      }
    }
  `];

  @state() private _settings: UserSettings = { ...DEFAULT_USER_SETTINGS };
  @state() private _cacheCount = '-';
  @state() private _cacheAge = '-';
  @state() private _cacheStatusMsg = '';
  @state() private _cacheStatusType: 'success' | 'error' | '' = '';
  @state() private _settingsStatusMsg = '';
  @state() private _settingsStatusType: 'success' | 'error' | '' = '';
  @state() private _clearLoading = false;
  @state() private _exportLoading = false;
  @state() private _isLoading = true;

  connectedCallback() {
    super.connectedCallback();
    this._initialize();
  }

  private async _initialize() {
    await Promise.all([this._loadCacheStats(), this._loadSettings()]);
    this._isLoading = false;
    this.classList.remove('is-loading');
  }

  render() {
    return html`
      <div class="container">
        <header class="header">
          <div class="header-icon">
            <img src="../assets/icons/icon128.png" alt="Extension icon">
          </div>
          <div class="header-text">
            <h1>Steam Wishlist Plus</h1>
            <div class="version">Version 0.8.0</div>
          </div>
        </header>

        <swp-section heading="Platforms" accentColor="var(--swp-accent)">
          <p slot="description">Show game availability on other platforms</p>
          <div class="toggle-list">
            ${this._renderPlatformToggle('showNintendo', 'Nintendo Switch', 'Show eShop availability', 'nintendo', NINTENDO_SVG)}
            ${this._renderPlatformToggle('showPlaystation', 'PlayStation', 'Show PS Store availability', 'playstation', PLAYSTATION_SVG)}
            ${this._renderPlatformToggle('showXbox', 'Xbox', 'Show Xbox Store / Game Pass', 'xbox', XBOX_SVG)}
          </div>
        </swp-section>

        <swp-section heading="Game Info" accentColor="var(--swp-hltb)">
          <p slot="description">Compatibility, playtime, and review information</p>
          <div class="toggle-list">
            ${this._renderPlatformToggle('showSteamDeck', 'Steam Deck Compatibility', 'Show Verified / Playable status', 'steamdeck', STEAMDECK_SVG)}
            <swp-toggle variant="full"
              label="How Long To Beat"
              description="Show completion time estimates"
              platform="hltb"
              .icon=${CLOCK_SVG}
              .checked=${this._settings.showHltb}
              .selectOptions=${HLTB_OPTIONS}
              .selectValue=${this._settings.hltbDisplayStat}
              .selectHidden=${!this._settings.showHltb}
              @swp-toggle-change=${(e: CustomEvent) => this._onToggle('showHltb', e.detail.checked)}
              @swp-select-change=${(e: CustomEvent) => this._onSelectChange('hltbDisplayStat', e.detail.value)}>
            </swp-toggle>
            <swp-toggle variant="full"
              label="Review Scores"
              description="Show game ratings from critics"
              platform="review-scores"
              .icon=${STAR_SVG}
              .checked=${this._settings.showReviewScores}
              .selectOptions=${REVIEW_SOURCE_OPTIONS}
              .selectValue=${this._settings.reviewScoreSource}
              .selectHidden=${!this._settings.showReviewScores}
              @swp-toggle-change=${(e: CustomEvent) => this._onToggle('showReviewScores', e.detail.checked)}
              @swp-select-change=${(e: CustomEvent) => this._onSelectChange('reviewScoreSource', e.detail.value)}>
            </swp-toggle>
          </div>
          <swp-status-message
            .message=${this._settingsStatusMsg}
            .type=${this._settingsStatusType}
            autoHideMs="2000">
          </swp-status-message>
        </swp-section>

        <swp-section heading="Cache" accentColor="var(--swp-text-muted)">
          <div class="stats-grid">
            <swp-stat-box value=${this._cacheCount} label="Games Cached"></swp-stat-box>
            <swp-stat-box value=${this._cacheAge} label="Oldest Entry"></swp-stat-box>
          </div>
          <div class="button-row">
            <swp-icon-button variant="secondary" label="Refresh" .icon=${REFRESH_SVG}
              @click=${this._refreshStats}></swp-icon-button>
            <swp-icon-button variant="secondary" label="Export" .icon=${EXPORT_SVG}
              .loading=${this._exportLoading}
              @click=${this._exportCache}></swp-icon-button>
          </div>
          <swp-icon-button variant="danger" label="Clear Cache" .icon=${TRASH_SVG}
            fullWidth
            .loading=${this._clearLoading}
            @click=${this._clearCache}></swp-icon-button>
          <swp-status-message
            .message=${this._cacheStatusMsg}
            .type=${this._cacheStatusType}>
          </swp-status-message>
        </swp-section>

        <swp-section heading="About" collapsible collapsed
          accentColor="var(--swp-border-color)">
          <div class="info-box">
            <strong>Your data stays local</strong>
            <ul>
              <li>Only connects to Steam, Wikidata, HLTB, and OpenCritic</li>
              <li>Wishlist data never leaves your browser</li>
              <li>All cache stored locally in Chrome</li>
              <li>Zero analytics or telemetry</li>
            </ul>
          </div>
          <div class="section-divider"></div>
          <div class="info-box">
            <strong>Powered by open data</strong>
            <p style="margin-top: 6px;">
              Platform data from <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a> (community-maintained).
              Steam Deck status from Steam's official data.
              Playtime from <a href="https://howlongtobeat.com" target="_blank" rel="noopener">HowLongToBeat</a>.
              Review scores from <a href="https://opencritic.com" target="_blank" rel="noopener">OpenCritic</a>.
            </p>
          </div>
        </swp-section>
      </div>
    `;
  }

  private _renderPlatformToggle(
    key: keyof UserSettings,
    label: string,
    description: string,
    platform: string,
    iconSvg: string
  ) {
    return html`
      <swp-toggle variant="full"
        label=${label}
        description=${description}
        platform=${platform}
        .icon=${iconSvg}
        .checked=${this._settings[key] as boolean}
        @swp-toggle-change=${(e: CustomEvent) => this._onToggle(key, e.detail.checked)}>
      </swp-toggle>
    `;
  }

  private _showCacheStatus(message: string, type: 'success' | 'error') {
    this._cacheStatusMsg = message;
    this._cacheStatusType = type;
  }

  private _showSettingsStatus(message: string, type: 'success' | 'error') {
    this._settingsStatusMsg = message;
    this._settingsStatusType = type;
    setTimeout(() => {
      this._settingsStatusType = '';
      this._settingsStatusMsg = '';
    }, 2000);
  }

  private async _loadSettings() {
    try {
      const result = await chrome.storage.sync.get('scpwSettings');
      this._settings = { ...DEFAULT_USER_SETTINGS, ...result.scpwSettings };
    } catch (error) {
      console.error(`${LOG_PREFIX} Error loading settings:`, error);
    }
  }

  private async _saveSettings() {
    try {
      await chrome.storage.sync.set({ scpwSettings: this._settings });
      this._showSettingsStatus('Settings saved', 'success');
    } catch (error) {
      console.error(`${LOG_PREFIX} Error saving settings:`, error);
      this._showSettingsStatus('Failed to save settings', 'error');
    }
  }

  private async _onToggle(key: keyof UserSettings, checked: boolean) {
    this._settings = { ...this._settings, [key]: checked };
    await this._saveSettings();
  }

  private async _onSelectChange(key: keyof UserSettings, value: string) {
    this._settings = { ...this._settings, [key]: value };
    await this._saveSettings();
  }

  private async _loadCacheStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CACHE_STATS' }) as CacheStatsResponse;

      if (response?.success && response.count !== undefined) {
        this._cacheCount = response.count.toString();
        this._cacheAge = response.oldestEntry
          ? formatAge(Date.now() - response.oldestEntry)
          : '-';
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error loading cache stats:`, error);
      this._cacheCount = '?';
      this._cacheAge = '?';
    }
  }

  private async _refreshStats() {
    await this._loadCacheStats();
  }

  private async _clearCache() {
    const confirmed = confirm('Are you sure you want to clear the cache? All games will need to be re-resolved.');
    if (!confirmed) return;

    this._clearLoading = true;

    try {
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }) as ClearCacheResponse;

      if (response?.success) {
        this._showCacheStatus('Cache cleared successfully.', 'success');
        await this._loadCacheStats();
      } else {
        this._showCacheStatus('Failed to clear cache.', 'error');
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error clearing cache:`, error);
      this._showCacheStatus('Failed to clear cache.', 'error');
    } finally {
      this._clearLoading = false;
    }
  }

  private async _exportCache() {
    this._exportLoading = true;

    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CACHE_EXPORT' }) as CacheExportResponse;

      if (!response?.success || !response.data) {
        this._showCacheStatus('Failed to export cache.', 'error');
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

      this._showCacheStatus(`Exported ${entries.length} cached entries.`, 'success');
    } catch (error) {
      console.error(`${LOG_PREFIX} Error exporting cache:`, error);
      this._showCacheStatus('Failed to export cache.', 'error');
    } finally {
      this._exportLoading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'swp-options': SwpOptions;
  }
}
