/* istanbul ignore file */
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { swpTheme } from './swp-theme.js';

@customElement('swp-status-message')
export class SwpStatusMessage extends LitElement {
  static styles = [swpTheme, css`
    :host {
      display: block;
      min-height: 20px;
    }

    .status {
      font-size: 12px;
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: rgba(255, 255, 255, 0.04);
      color: var(--swp-text-secondary);
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .status.visible {
      opacity: 1;
    }

    .status.success {
      border-color: rgba(91, 163, 43, 0.4);
      color: #dff3d2;
      background: rgba(91, 163, 43, 0.15);
    }

    .status.error {
      border-color: rgba(192, 48, 48, 0.4);
      color: #f7dada;
      background: rgba(192, 48, 48, 0.2);
    }
  `];

  @property({ type: String }) message = '';
  @property({ type: String }) type: 'success' | 'error' | '' = '';
  @property({ type: Number }) autoHideMs = 3000;

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  show(message: string, type: 'success' | 'error'): void {
    this.message = message;
    this.type = type;
    this.requestUpdate();
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    this.hideTimer = setTimeout(() => {
      this.type = '';
      this.message = '';
    }, this.autoHideMs);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  render() {
    const visible = Boolean(this.message && this.type);
    return html`
      <div class="status ${this.type} ${visible ? 'visible' : ''}">
        ${this.message}
      </div>
    `;
  }
}
