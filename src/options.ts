/* istanbul ignore file */
import { LitElement, html, css } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { swpTheme } from './components/swp-theme.js';
import './components/swp-toggle.js';
import './components/swp-stat-box.js';
import './components/swp-status-message.js';
import './components/swp-section.js';
import './components/swp-icon-button.js';
import type { UserSettings } from './types';
import type { SwpStatusMessage } from './components/swp-status-message.js';

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;
const LOG_PREFIX = '[SWP Options]';

const { DEFAULT_USER_SETTINGS } = globalThis.SWP_UserSettings;

const CLOCK_ICON = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>`;
const STAR_ICON = `<svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
const REFRESH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
const EXPORT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const TRASH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`;

@customElement('swp-options')
export class SwpOptions extends LitElement {
  static styles = [swpTheme, css`
    :host {
      display: block;
      min-height: 100vh;
      padding: 24px;
      box-sizing: border-box;
      color: var(--swp-text-primary);
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
    }

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

    .toggle-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    .button-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 12px;
    }

    swp-icon-button.full-width {
      width: 100%;
    }

    .about p {
      margin: 0 0 12px 0;
      color: var(--swp-text-secondary);
      font-size: 13px;
    }

    .about a {
      color: var(--swp-accent);
    }

    @media (max-width: 480px) {
      :host {
        padding: 16px;
      }

      .stats-grid,
      .button-row {
        grid-template-columns: 1fr;
      }
    }
  `];

  @state() private settings: UserSettings = { ...DEFAULT_USER_SETTINGS };
  @state() private cacheCount = '-';
  @state() private cacheAge = '-';
  @state() private clearLoading = false;
  @state() private exportLoading = false;
  @state() private refreshLoading = false;
  @state() private version = '';

  @query('#cache-status') private cacheStatus?: SwpStatusMessage;
  @query('#settings-status') private settingsStatus?: SwpStatusMessage;

  connectedCallback(): void {
    super.connectedCallback();
    this.version = chrome.runtime.getManifest().version;
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
      this.settingsStatus?.show('Settings saved', 'success');
    } catch (error) {
      console.error(`${LOG_PREFIX} Error saving settings:`, error);
      this.settingsStatus?.show('Failed to save settings', 'error');
    }
  }

  private updateSetting<Key extends keyof UserSettings>(key: Key, value: UserSettings[Key]): void {
    this.settings = { ...this.settings, [key]: value };
    void this.saveSettings();
  }

  private async clearCache(): Promise<void> {
    const confirmed = confirm('Are you sure you want to clear the cache? All games will need to be re-resolved.');
    if (!confirmed) return;

    this.clearLoading = true;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }) as { success: boolean };
      if (response?.success) {
        this.cacheStatus?.show('Cache cleared successfully.', 'success');
        await this.loadCacheStats();
      } else {
        this.cacheStatus?.show('Failed to clear cache.', 'error');
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error clearing cache:`, error);
      this.cacheStatus?.show('Failed to clear cache.', 'error');
    } finally {
      this.clearLoading = false;
    }
  }

  private async refreshStats(): Promise<void> {
    this.refreshLoading = true;
    await this.loadCacheStats();
    this.cacheStatus?.show('Cache stats refreshed.', 'success');
    this.refreshLoading = false;
  }

  private async exportCache(): Promise<void> {
    this.exportLoading = true;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CACHE_EXPORT' }) as { success: boolean; data?: unknown };
      if (!response?.success || !response.data) {
        this.cacheStatus?.show('Failed to export cache.', 'error');
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
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `scpw-cache-${date}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      this.cacheStatus?.show(`Exported ${entries.length} cached entries.`, 'success');
    } catch (error) {
      console.error(`${LOG_PREFIX} Error exporting cache:`, error);
      this.cacheStatus?.show('Failed to export cache.', 'error');
    } finally {
      this.exportLoading = false;
    }
  }

  private getPlatformIcon(platform: keyof typeof globalThis.SWP_Icons): string {
    return globalThis.SWP_Icons?.[platform] ?? '';
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
            <div class="version">Version ${this.version}</div>
          </div>
        </header>

        <swp-section heading="Platforms" accentColor="var(--swp-accent)">
          <p slot="description">Show game availability on other platforms</p>
          <div class="toggle-list">
            <swp-toggle
              variant="full"
              label="Nintendo Switch"
              description="Show eShop availability"
              platform="nintendo"
              .icon=${this.getPlatformIcon('nintendo')}
              .checked=${this.settings.showNintendo}
              @swp-toggle-change=${(event: CustomEvent) => this.updateSetting('showNintendo', event.detail.checked)}
            ></swp-toggle>
            <swp-toggle
              variant="full"
              label="PlayStation"
              description="Show PlayStation Store"
              platform="playstation"
              .icon=${this.getPlatformIcon('playstation')}
              .checked=${this.settings.showPlaystation}
              @swp-toggle-change=${(event: CustomEvent) => this.updateSetting('showPlaystation', event.detail.checked)}
            ></swp-toggle>
            <swp-toggle
              variant="full"
              label="Xbox"
              description="Show Xbox Store / Game Pass"
              platform="xbox"
              .icon=${this.getPlatformIcon('xbox')}
              .checked=${this.settings.showXbox}
              @swp-toggle-change=${(event: CustomEvent) => this.updateSetting('showXbox', event.detail.checked)}
            ></swp-toggle>
          </div>
        </swp-section>

        <swp-section heading="Game Info" accentColor="var(--swp-hltb)">
          <p slot="description">Compatibility, playtime, and review information</p>
          <div class="toggle-list">
            <swp-toggle
              variant="full"
              label="Steam Deck Compatibility"
              description="Show Verified / Playable status"
              platform="steamdeck"
              .icon=${this.getPlatformIcon('steamdeck')}
              .checked=${this.settings.showSteamDeck}
              @swp-toggle-change=${(event: CustomEvent) => this.updateSetting('showSteamDeck', event.detail.checked)}
            ></swp-toggle>
            <swp-toggle
              variant="full"
              label="How Long To Beat"
              description="Show completion time estimates"
              platform="hltb"
              .icon=${CLOCK_ICON}
              .checked=${this.settings.showHltb}
              .selectOptions=${[
                { value: 'mainStory', label: 'Main Story' },
                { value: 'mainExtra', label: 'Main + Extras' },
                { value: 'completionist', label: 'Completionist' }
              ]}
              .selectValue=${this.settings.hltbDisplayStat}
              .selectHidden=${!this.settings.showHltb}
              @swp-toggle-change=${(event: CustomEvent) => this.updateSetting('showHltb', event.detail.checked)}
              @swp-select-change=${(event: CustomEvent) => this.updateSetting('hltbDisplayStat', event.detail.value)}
            ></swp-toggle>
            <swp-toggle
              variant="full"
              label="Review Scores"
              description="Show game ratings from critics"
              platform="review-scores"
              .icon=${STAR_ICON}
              .checked=${this.settings.showReviewScores}
              .selectOptions=${[
                { value: 'opencritic', label: 'OpenCritic' },
                { value: 'ign', label: 'IGN' },
                { value: 'gamespot', label: 'GameSpot' }
              ]}
              .selectValue=${this.settings.reviewScoreSource}
              .selectHidden=${!this.settings.showReviewScores}
              @swp-toggle-change=${(event: CustomEvent) => this.updateSetting('showReviewScores', event.detail.checked)}
              @swp-select-change=${(event: CustomEvent) => this.updateSetting('reviewScoreSource', event.detail.value)}
            ></swp-toggle>
          </div>
          <swp-status-message id="settings-status"></swp-status-message>
        </swp-section>

        <swp-section heading="Cache" accentColor="var(--swp-text-muted)">
          <div class="stats-grid">
            <swp-stat-box .value=${this.cacheCount} label="Games Cached"></swp-stat-box>
            <swp-stat-box .value=${this.cacheAge} label="Oldest Entry"></swp-stat-box>
          </div>
          <div class="button-row">
            <swp-icon-button
              variant="secondary"
              label="Refresh"
              .icon=${REFRESH_ICON}
              .loading=${this.refreshLoading}
              @click=${this.refreshStats}
            ></swp-icon-button>
            <swp-icon-button
              variant="secondary"
              label="Export"
              .icon=${EXPORT_ICON}
              .loading=${this.exportLoading}
              @click=${this.exportCache}
            ></swp-icon-button>
          </div>
          <swp-icon-button
            variant="danger"
            label="Clear Cache"
            .icon=${TRASH_ICON}
            .loading=${this.clearLoading}
            fullWidth
            @click=${this.clearCache}
          ></swp-icon-button>
          <swp-status-message id="cache-status"></swp-status-message>
        </swp-section>

        <swp-section heading="About" accentColor="var(--swp-border-color)" collapsible collapsed>
          <div class="about">
            <p>Steam Wishlist Plus adds platform availability icons, Steam Deck compatibility, review scores, and playtime estimates to your Steam wishlist.</p>
            <p>Built for fast browsing with privacy-first caching.</p>
            <p><a href="https://github.com/keyunjie96/steam-wishlist-plus" target="_blank" rel="noreferrer">GitHub</a></p>
          </div>
        </swp-section>
      </div>
    `;
  }
}
