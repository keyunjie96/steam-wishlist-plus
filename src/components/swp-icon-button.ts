/* istanbul ignore file */
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { swpTheme } from './swp-theme.js';

@customElement('swp-icon-button')
export class SwpIconButton extends LitElement {
  static styles = [swpTheme, css`
    :host {
      display: inline-block;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 6px;
      border: 1px solid transparent;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
      background: var(--swp-accent);
      transition: transform 0.1s ease, opacity 0.15s ease, background 0.15s ease;
    }

    button.secondary {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--swp-border-color);
      color: var(--swp-text-primary);
    }

    button.danger {
      background: rgba(192, 48, 48, 0.85);
      border-color: rgba(192, 48, 48, 0.35);
    }

    button:disabled {
      cursor: default;
      opacity: 0.6;
    }

    .icon {
      width: 16px;
      height: 16px;
      display: inline-block;
    }

    .icon svg {
      width: 100%;
      height: 100%;
    }

    .spinner {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #fff;
      animation: spin 0.8s linear infinite;
    }

    .full {
      width: 100%;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `];

  @property({ type: String }) label = '';
  @property({ type: String }) icon = '';
  @property({ type: String }) variant: 'primary' | 'secondary' | 'danger' = 'primary';
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) fullWidth = false;

  render() {
    const classes = [this.variant, this.fullWidth ? 'full' : ''].filter(Boolean).join(' ');
    return html`
      <button class=${classes} ?disabled=${this.disabled || this.loading}>
        ${this.loading ? html`<span class="spinner" aria-label="Loading"></span>` : null}
        ${!this.loading && this.icon ? html`<span class="icon" .innerHTML=${this.icon}></span>` : null}
        <span>${this.label}</span>
      </button>
    `;
  }
}
