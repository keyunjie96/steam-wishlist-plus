/**
 * Steam Wishlist Plus - Icon Button Component
 *
 * Button with optional SVG icon and label. Supports primary, secondary, and danger variants.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { swpTheme, spinKeyframes } from './swp-theme.js';

@customElement('swp-icon-button')
export class SwpIconButton extends LitElement {
  static styles = [swpTheme, spinKeyframes, css`
    :host {
      display: block;
    }

    button {
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      padding: 10px 16px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      width: 100%;
      color: var(--swp-text-primary);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button:focus-visible {
      outline: 2px solid var(--swp-accent);
      outline-offset: 2px;
    }

    /* Variants */
    .btn-primary {
      background: var(--swp-gradient-button);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--swp-gradient-button-hover);
    }

    .btn-secondary {
      background: rgba(103, 193, 245, 0.2);
      color: #67c1f5;
    }

    .btn-secondary:hover:not(:disabled) {
      background: rgba(103, 193, 245, 0.3);
    }

    .btn-danger {
      background: rgba(192, 48, 48, 0.3);
      color: #e87070;
    }

    .btn-danger:hover:not(:disabled) {
      background: rgba(192, 48, 48, 0.5);
    }

    /* Compact danger variant (popup) */
    .btn-danger-compact {
      width: 100%;
      padding: 7px 12px;
      border: 1px solid rgba(192, 48, 48, 0.35);
      border-radius: 8px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      background: rgba(150, 54, 54, 0.85);
      color: #ffffff;
      transition: background-color 0.15s, opacity 0.15s;
      text-transform: none;
      letter-spacing: normal;
    }

    .btn-danger-compact:hover:not(:disabled) {
      background: rgba(176, 68, 68, 0.90);
    }

    .btn-danger-compact:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Full width modifier */
    :host([fullWidth]) button {
      margin-top: 10px;
    }

    button svg {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      display: block;
    }

    .loading-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid var(--swp-border-color);
      border-top-color: var(--swp-accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    /* Compact spinner */
    .btn-danger-compact .loading-spinner {
      width: 12px;
      height: 12px;
      margin-right: 6px;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
  `];

  @property({ type: String }) label = '';
  @property({ type: String }) icon = '';
  @property({ type: String }) variant: 'primary' | 'secondary' | 'danger' | 'danger-compact' = 'secondary';
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean, reflect: true }) fullWidth = false;

  render() {
    const btnClass = `btn-${this.variant}`;

    return html`
      <button type="button"
        class=${btnClass}
        ?disabled=${this.disabled || this.loading}
        @click=${this._onClick}>
        ${this.loading ? html`
          <span class="loading-spinner"></span>
        ` : this.icon ? html`
          <span .innerHTML=${this.icon}></span>
        ` : nothing}
        ${this.loading ? 'Loading...' : this.label}
      </button>
    `;
  }

  private _onClick(e: Event) {
    if (this.loading || this.disabled) {
      e.stopPropagation();
      e.preventDefault();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'swp-icon-button': SwpIconButton;
  }
}
