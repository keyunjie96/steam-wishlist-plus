/**
 * Steam Wishlist Plus - Section Component
 *
 * Card-style section with header, optional accent color, and optional collapse.
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { swpTheme } from './swp-theme.js';

@customElement('swp-section')
export class SwpSection extends LitElement {
  static styles = [swpTheme, css`
    :host {
      display: block;
      margin-bottom: 10px;
    }

    .section {
      background: var(--swp-bg-card);
      border: 1px solid var(--swp-border-subtle);
      border-radius: 8px;
      overflow: hidden;
    }

    .section-header {
      padding: 10px 16px;
      background: rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: default;
      border-left: 3px solid var(--accent-color, var(--swp-text-muted));
    }

    .section-header h2 {
      font-size: 11px;
      font-weight: 600;
      color: var(--swp-text-secondary);
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin: 0;
    }

    /* Collapsible button */
    .collapse-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: transparent;
      border: 0;
      padding: 0;
      color: inherit;
      cursor: pointer;
      font: inherit;
    }

    .collapse-btn:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    .collapse-btn:focus-visible {
      outline: 2px solid var(--swp-accent);
      outline-offset: -2px;
    }

    .collapse-icon {
      color: var(--swp-text-muted);
      font-size: 10px;
      transition: transform 0.15s ease;
      opacity: 0.7;
    }

    :host(:not([collapsed])) .collapse-icon {
      transform: rotate(90deg);
    }

    .section-body {
      padding: 12px 16px;
    }

    .section-body[hidden] {
      display: none;
    }

    ::slotted([slot="description"]) {
      font-size: 13px;
      color: var(--swp-text-secondary);
      margin: 0 0 12px;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
  `];

  @property({ type: String }) heading = '';
  @property({ type: String }) accentColor = '';
  @property({ type: Boolean }) collapsible = false;
  @property({ type: Boolean, reflect: true }) collapsed = false;

  render() {
    return html`
      <div class="section"
        style=${this.accentColor ? `--accent-color: ${this.accentColor}` : ''}>
        <div class="section-header">
          ${this.collapsible ? html`
            <button type="button" class="collapse-btn"
              aria-expanded=${String(!this.collapsed)}
              @click=${this._toggleCollapse}>
              <h2>${this.heading}</h2>
              <span class="collapse-icon" aria-hidden="true">&#9654;</span>
            </button>
          ` : html`
            <h2>${this.heading}</h2>
          `}
        </div>
        <div class="section-body" ?hidden=${this.collapsible && this.collapsed}>
          <slot name="description"></slot>
          <slot></slot>
        </div>
      </div>
    `;
  }

  private _toggleCollapse() {
    this.collapsed = !this.collapsed;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'swp-section': SwpSection;
  }
}
