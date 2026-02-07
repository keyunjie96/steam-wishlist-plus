/**
 * Steam Wishlist Plus - Stat Box Component
 *
 * Displays a value + label pair in a card. Two variants:
 * - "compact": Used in popup (smaller, inline)
 * - "full": Used in options page (larger, centered)
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { swpTheme } from './swp-theme.js';

@customElement('swp-stat-box')
export class SwpStatBox extends LitElement {
  static styles = [swpTheme, css`
    :host {
      display: block;
    }

    .stat-box {
      text-align: center;
      background: var(--swp-card-bg);
      border: 1px solid var(--swp-card-border);
      border-radius: 8px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    /* Compact variant (popup) */
    .stat-box.compact {
      padding: 10px 8px;
    }

    .stat-box.compact .stat-value {
      font-size: 1.4rem;
      font-weight: 600;
    }

    .stat-box.compact .stat-label {
      font-size: 10px;
      margin-top: 2px;
    }

    /* Full variant (options page) */
    .stat-box.full {
      padding: 16px;
    }

    .stat-box.full .stat-value {
      font-size: 28px;
      font-weight: 300;
      line-height: 1;
      min-height: 1em;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-box.full .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }

    .stat-value {
      color: var(--swp-accent);
      font-variant-numeric: tabular-nums;
    }

    .stat-label {
      color: var(--swp-text-muted);
    }
  `];

  @property({ type: String }) value = '-';
  @property({ type: String }) label = '';
  @property({ type: String }) variant: 'compact' | 'full' = 'full';

  render() {
    return html`
      <div class="stat-box ${this.variant}">
        <div class="stat-value">${this.value}</div>
        <div class="stat-label">${this.label}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'swp-stat-box': SwpStatBox;
  }
}
