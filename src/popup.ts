/* istanbul ignore file */
import { LitElement, html, css } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { swpTheme } from './components/swp-theme.js';
import './components/swp-toggle.js';
import './components/swp-stat-box.js';
import './components/swp-status-message.js';
import './components/swp-icon-button.js';
import type { UserSettings } from './types';
import type { SwpStatusMessage } from './components/swp-status-message.js';

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;
const LOG_PREFIX = '[SWP Popup]';

const { DEFAULT_USER_SETTINGS } = globalThis.SWP_UserSettings;

type ToggleKey = keyof UserSettings;

@customElement('swp-popup')
export class SwpPopup extends LitElement {
  static styles = [swpTheme, css`
    :host {
      display: block;
      padding: 14px;
      background: linear-gradient(to bottom, var(--swp-bg-body) 0%, #171a21 100%);
      width: 280px;
      box-sizing: border-box;
    }

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

    h1 {
      color: var(--swp-text-bright);
      font-size: 13px;
      font-weight: 600;
      margin: 0;
      flex: 1;
    }

    .settings-btn {
      width: 28px;
      height: 28px;
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

    .settings-btn:focus-visible {
      outline: 2px solid rgba(74, 163, 255, 0.65);
      outline-offset: 2px;
    }

    .settings-btn svg {
      width: 18px;
      height: 18px;
    }

    .stats {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }

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

    .toggle-stack {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    swp-icon-button {
      width: 100%;
      margin-top: 8px;
    }
  `];

  @state() private settings: UserSettings = { ...DEFAULT_USER_SETTINGS };
  @state() private cacheCount = '-';
  @state() private cacheAge = '-';
  @state() private clearLoading = false;

  @query('swp-status-message') private statusMessage?: SwpStatusMessage;

  connectedCallback(): void {
    super.connectedCallback();
    void this.loadSettings();
    void this.loadCacheStats();
  }

  private formatAge(ms: number): string {
    const days = Math.floor(ms / MS_PER_DAY);
    const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return '<1h';
  }

  private async loadCacheStats(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CACHE_STATS' }) as { success: boolean; count?: number; oldestEntry?: number | null };
      if (response?.success && response.count !== undefined) {
        this.cacheCount = response.count.toString();
        this.cacheAge = response.oldestEntry ? this.formatAge(Date.now() - response.oldestEntry) : '-';
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error loading cache stats:`, error);
      this.cacheCount = '?';
      this.cacheAge = '?';
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get('scpwSettings');
      this.settings = { ...DEFAULT_USER_SETTINGS, ...result.scpwSettings };
    } catch (error) {
      console.error(`${LOG_PREFIX} Error loading settings:`, error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await chrome.storage.sync.set({ scpwSettings: this.settings });
      this.statusMessage?.show('Settings saved', 'success');
    } catch (error) {
      console.error(`${LOG_PREFIX} Error saving settings:`, error);
      this.statusMessage?.show('Failed to save', 'error');
    }
  }

  private updateSetting(key: ToggleKey, value: boolean | string): void {
    this.settings = { ...this.settings, [key]: value } as UserSettings;
    void this.saveSettings();
  }

  private async clearCache(): Promise<void> {
    const confirmed = confirm('Clear all cached platform data?');
    if (!confirmed) return;

    this.clearLoading = true;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }) as { success: boolean };
      if (response?.success) {
        this.statusMessage?.show('Cache cleared', 'success');
        await this.loadCacheStats();
      } else {
        this.statusMessage?.show('Failed to clear cache', 'error');
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error clearing cache:`, error);
      this.statusMessage?.show('Failed to clear cache', 'error');
    } finally {
      this.clearLoading = false;
    }
  }

  private openSettings(): void {
    chrome.runtime.openOptionsPage();
  }

  private renderToggle(label: string, key: ToggleKey, platform: string) {
    const value = Boolean(this.settings[key]);
    return html`
      <swp-toggle
        variant="mini"
        .label=${label}
        .platform=${platform}
        .checked=${value}
        @swp-toggle-change=${(event: CustomEvent) => this.updateSetting(key, event.detail.checked)}
      ></swp-toggle>
    `;
  }

  render() {
    return html`
      <div class="header">
        <div class="header-icon">
          <img src="../assets/icons/icon128.png" alt="Extension icon">
        </div>
        <h1>Steam Wishlist Plus</h1>
        <button class="settings-btn" @click=${this.openSettings} aria-label="Open settings" title="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
      </div>

      <div class="stats">
        <swp-stat-box .value=${this.cacheCount} label="Cached Games" variant="compact"></swp-stat-box>
        <swp-stat-box .value=${this.cacheAge} label="Oldest Entry" variant="compact"></swp-stat-box>
      </div>

      <div class="section-group">
        <div class="section-title">Platforms</div>
        <div class="toggle-stack">
          ${this.renderToggle('Switch', 'showNintendo', 'nintendo')}
          ${this.renderToggle('PlayStation', 'showPlaystation', 'playstation')}
          ${this.renderToggle('Xbox', 'showXbox', 'xbox')}
        </div>
      </div>

      <div class="section-group">
        <div class="section-title">Game Info</div>
        <div class="toggle-stack">
          ${this.renderToggle('Steam Deck', 'showSteamDeck', 'steamdeck')}
          ${this.renderToggle('How Long To Beat', 'showHltb', 'hltb')}
          ${this.renderToggle('Review Scores', 'showReviewScores', 'review-scores')}
        </div>
      </div>

      <swp-icon-button
        variant="danger"
        label="Clear Cache"
        .loading=${this.clearLoading}
        fullWidth
        @click=${this.clearCache}
      ></swp-icon-button>

      <swp-status-message></swp-status-message>
    `;
  }
}
