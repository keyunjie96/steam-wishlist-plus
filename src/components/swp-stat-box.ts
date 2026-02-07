/* istanbul ignore file */
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { swpTheme } from './swp-theme.js';

@customElement('swp-stat-box')
export class SwpStatBox extends LitElement {
  static styles = [swpTheme, css`
    :host {
      display: block;
    }

    .box {
      text-align: center;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--swp-border-subtle);
      border-radius: 8px;
      padding: 10px 8px;
    }

    .box.compact {
      padding: 8px 6px;
    }

    .value {
      font-size: 1.4rem;
      font-weight: 600;
      color: var(--swp-accent);
      font-variant-numeric: tabular-nums;
    }

    .value.compact {
      font-size: 1.2rem;
    }

    .label {
      font-size: 10px;
      color: var(--swp-text-muted);
      margin-top: 2px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .label.full {
      font-size: 11px;
      text-transform: none;
    }
  `];

  @property({ type: String }) value = '-';
  @property({ type: String }) label = '';
  @property({ type: String }) variant: 'compact' | 'full' = 'full';

  render() {
    const compact = this.variant === 'compact';
    return html`
      <div class="box ${compact ? 'compact' : ''}">
        <div class="value ${compact ? 'compact' : ''}">${this.value}</div>
        <div class="label ${compact ? 'compact' : 'full'}">${this.label}</div>
      </div>
    `;
  }
}
