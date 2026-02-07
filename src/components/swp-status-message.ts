/**
 * Steam Wishlist Plus - Status Message Component
 *
 * Toast-style success/error message with optional auto-hide.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { swpTheme } from './swp-theme.js';

@customElement('swp-status-message')
export class SwpStatusMessage extends LitElement {
  static styles = [swpTheme, css`
    :host {
      display: block;
    }

    .status {
      padding: 10px 12px;
      border-radius: 8px;
      margin-top: 10px;
      font-size: 13px;
      display: none;
    }

    .status.success {
      display: block;
      background: rgba(91, 163, 43, 0.2);
      color: #8bc34a;
      border-left: 3px solid var(--swp-success);
    }

    .status.error {
      display: block;
      background: rgba(192, 48, 48, 0.2);
      color: #e87070;
      border-left: 3px solid var(--swp-danger);
    }

    /* Compact variant for popup */
    :host([variant="compact"]) .status.success {
      background: #1e4620;
      color: #4ade80;
      border: 1px solid #22c55e;
      border-left: 1px solid #22c55e;
      font-size: 12px;
      padding: 8px 12px;
    }

    :host([variant="compact"]) .status.error {
      background: #461e1e;
      color: #f87171;
      border: 1px solid #dc2626;
      border-left: 1px solid #dc2626;
      font-size: 12px;
      padding: 8px 12px;
    }
  `];

  @property({ type: String }) message = '';
  @property({ type: String }) type: 'success' | 'error' | '' = '';
  @property({ type: Number }) autoHideMs = 0;
  @property({ type: String, reflect: true }) variant: 'default' | 'compact' = 'default';

  private _autoHideTimer: ReturnType<typeof setTimeout> | null = null;

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('message') || changedProperties.has('type')) {
      this._scheduleAutoHide();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
    }
  }

  /** Show a message programmatically */
  show(message: string, type: 'success' | 'error') {
    this.message = message;
    this.type = type;
  }

  /** Hide the message */
  hide() {
    this.type = '';
    this.message = '';
  }

  private _scheduleAutoHide() {
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
      this._autoHideTimer = null;
    }
    if (this.autoHideMs > 0 && this.type) {
      this._autoHideTimer = setTimeout(() => {
        this.hide();
      }, this.autoHideMs);
    }
  }

  render() {
    return html`
      <div class="status ${this.type}" role="alert" aria-live="polite">
        ${this.message}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'swp-status-message': SwpStatusMessage;
  }
}
