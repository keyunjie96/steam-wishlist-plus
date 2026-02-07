/**
 * Steam Wishlist Plus - Popup UI (Lit Component)
 *
 * Provides quick access to cache statistics, platform toggles, and a clear cache button.
 */

import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { swpTheme, spinKeyframes, reducedMotion } from './components/swp-theme.js';
import './components/swp-toggle.js';
import './components/swp-stat-box.js';
import './components/swp-status-message.js';
import './components/swp-icon-button.js';
import type { UserSettings } from './types';

// Constants
const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;
const LOG_PREFIX = '[SWP Popup]';

// Get centralized settings definitions from types.ts
const { DEFAULT_USER_SETTINGS, SETTING_CHECKBOX_IDS, USER_SETTING_KEYS } = globalThis.SWP_UserSettings;

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

// SVG icons used in popup
const GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

// Platform toggle configuration
const PLATFORM_TOGGLES = [
  { key: 'showNintendo' as keyof UserSettings, label: 'Switch', platform: 'nintendo' },
  { key: 'showPlaystation' as keyof UserSettings, label: 'PlayStation', platform: 'playstation' },
  { key: 'showXbox' as keyof UserSettings, label: 'Xbox', platform: 'xbox' },
];

const GAME_INFO_TOGGLES = [
  { key: 'showSteamDeck' as keyof UserSettings, label: 'Steam Deck', platform: 'steamdeck' },
  { key: 'showHltb' as keyof UserSettings, label: 'Play Time', platform: 'hltb' },
  { key: 'showReviewScores' as keyof UserSettings, label: 'Reviews', platform: 'reviews' },
];

@customElement('swp-popup')
export class SwpPopup extends LitElement {
  static styles = [swpTheme, spinKeyframes, reducedMotion, css`
    :host {
      display: block;
      padding: 14px;
      width: 280px;
      background: linear-gradient(to bottom, var(--swp-bg-body) 0%, #171a21 100%);
    }

    * {
      box-sizing: border-box;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--swp-border-color);
    }

    .header-icon {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      border-radius: 5px;
      overflow: hidden;
    }

    .header-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .header h1 {
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      margin: 0;
      flex: 1;
    }

    .settings-btn {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      background: none;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      color: var(--swp-text-muted);
      padding: 0;
      transition: color 0.15s, background-color 0.15s;
    }

    .settings-btn:hover {
      color: var(--swp-text-primary);
      background: var(--swp-bg-hover);
    }

    .settings-btn:hover svg {
      transform: rotate(90deg);
    }

    .settings-btn:focus-visible {
      outline: 2px solid var(--swp-accent-ring);
      outline-offset: 2px;
    }

    .settings-btn svg {
      width: 18px;
      height: 18px;
      transition: transform 0.3s ease;
    }

    /* Stats */
    .stats {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }

    .stats swp-stat-box {
      flex: 1;
    }

    /* Section groups */
    .section-group {
      margin-bottom: 12px;
    }

    .section-title {
      font-size: 10px;
      color: var(--swp-text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }

    .platform-toggles {
      display: flex;
      flex-direction: column;
    }

    swp-icon-button {
      margin-top: 4px;
    }

    /* Loading state */
    .loading-hide {
      opacity: 0;
    }

    .loaded {
      opacity: 1;
      transition: opacity 0.15s ease-in;
    }
  `];

  @state() private _settings: UserSettings = { ...DEFAULT_USER_SETTINGS };
  @state() private _cacheCount = '-';
  @state() private _cacheAge = '-';
  @state() private _statusMessage = '';
  @state() private _statusType: 'success' | 'error' | '' = '';
  @state() private _clearLoading = false;
  @state() private _isLoading = true;

  connectedCallback() {
    super.connectedCallback();
    this._initialize();
  }

  private async _initialize() {
    await Promise.all([this._loadCacheStats(), this._loadSettings()]);
    this._isLoading = false;
  }

  render() {
    const contentClass = this._isLoading ? 'loading-hide' : 'loaded';

    return html`
      <div class="header">
        <div class="header-icon">
          <img src="../assets/icons/icon128.png" alt="Extension icon">
        </div>
        <h1>Steam Wishlist Plus</h1>
        <button type="button" class="settings-btn" id="settings-btn"
          aria-label="Open settings" title="Settings"
          @click=${this._openSettings}>
          <span .innerHTML=${GEAR_SVG}></span>
        </button>
      </div>

      <div class=${contentClass}>
        <div class="stats">
          <swp-stat-box value=${this._cacheCount} label="Cached Games" variant="compact"></swp-stat-box>
          <swp-stat-box value=${this._cacheAge} label="Oldest Entry" variant="compact"></swp-stat-box>
        </div>

        <div class="section-group">
          <div class="section-title">Platforms</div>
          <div class="platform-toggles">
            ${PLATFORM_TOGGLES.map(t => html`
              <swp-toggle variant="mini"
                label=${t.label}
                platform=${t.platform}
                .checked=${this._settings[t.key] as boolean}
                @swp-toggle-change=${(e: CustomEvent) => this._onToggle(t.key, e.detail.checked)}>
              </swp-toggle>
            `)}
          </div>
        </div>

        <div class="section-group">
          <div class="section-title">Game Info</div>
          <div class="platform-toggles">
            ${GAME_INFO_TOGGLES.map(t => html`
              <swp-toggle variant="mini"
                label=${t.label}
                platform=${t.platform}
                .checked=${this._settings[t.key] as boolean}
                @swp-toggle-change=${(e: CustomEvent) => this._onToggle(t.key, e.detail.checked)}>
              </swp-toggle>
            `)}
          </div>
        </div>

        <swp-icon-button
          variant="danger-compact"
          label="Clear Cache"
          .loading=${this._clearLoading}
          @click=${this._clearCache}>
        </swp-icon-button>

        <swp-status-message
          variant="compact"
          .message=${this._statusMessage}
          .type=${this._statusType}
          autoHideMs="3000">
        </swp-status-message>
      </div>
    `;
  }

  private _showStatus(message: string, type: 'success' | 'error') {
    this._statusMessage = message;
    this._statusType = type;
    setTimeout(() => {
      this._statusType = '';
      this._statusMessage = '';
    }, 3000);
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

  private async _clearCache() {
    const confirmed = confirm('Clear all cached platform data?');
    if (!confirmed) return;

    this._clearLoading = true;

    try {
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }) as ClearCacheResponse;

      if (response?.success) {
        this._showStatus('Cache cleared', 'success');
        await this._loadCacheStats();
      } else {
        this._showStatus('Failed to clear cache', 'error');
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error clearing cache:`, error);
      this._showStatus('Failed to clear cache', 'error');
    } finally {
      this._clearLoading = false;
    }
  }

  private _openSettings() {
    chrome.runtime.openOptionsPage();
  }

  private async _loadSettings() {
    try {
      const result = await chrome.storage.sync.get('scpwSettings');
      this._settings = { ...DEFAULT_USER_SETTINGS, ...result.scpwSettings };
    } catch (error) {
      console.error(`${LOG_PREFIX} Error loading settings:`, error);
    }
  }

  private async _onToggle(key: keyof UserSettings, checked: boolean) {
    (this._settings as Record<string, unknown>)[key] = checked;
    this._settings = { ...this._settings };
    await this._saveSettings();
  }

  private async _saveSettings() {
    try {
      const stored = await chrome.storage.sync.get('scpwSettings');
      const settings: UserSettings = { ...DEFAULT_USER_SETTINGS, ...stored.scpwSettings, ...this._settings };
      await chrome.storage.sync.set({ scpwSettings: settings });
      this._showStatus('Settings saved', 'success');
    } catch (error) {
      console.error(`${LOG_PREFIX} Error saving settings:`, error);
      this._showStatus('Failed to save', 'error');
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'swp-popup': SwpPopup;
  }
}
