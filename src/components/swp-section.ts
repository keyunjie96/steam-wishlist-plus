/* istanbul ignore file */
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { swpTheme } from './swp-theme.js';

@customElement('swp-section')
export class SwpSection extends LitElement {
  static styles = [swpTheme, css`
    :host {
      display: block;
    }

    .section {
      background: var(--swp-bg-card);
      border: 1px solid var(--swp-border-subtle);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: rgba(0, 0, 0, 0.15);
      border-left: 3px solid var(--accent-color, var(--swp-border-color));
    }

    .header button {
      width: 100%;
      background: transparent;
      border: 0;
      padding: 0;
      color: inherit;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      font: inherit;
    }

    .title {
      font-size: 11px;
      font-weight: 600;
      color: var(--swp-text-secondary);
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin: 0;
    }

    .icon {
      font-size: 10px;
      color: var(--swp-text-muted);
      transition: transform 0.15s ease;
    }

    .collapsed .icon {
      transform: rotate(-90deg);
    }

    .body {
      padding: 12px 16px;
    }

    .body[hidden] {
      display: none;
    }

    .description {
      font-size: 13px;
      color: var(--swp-text-secondary);
      margin-bottom: 12px;
    }
  `];

  @property({ type: String }) heading = '';
  @property({ type: String }) accentColor = '';
  @property({ type: Boolean }) collapsible = false;
  @property({ type: Boolean }) collapsed = false;

  private toggleCollapse(): void {
    if (!this.collapsible) return;
    this.collapsed = !this.collapsed;
  }

  render() {
    return html`
      <section class="section ${this.collapsed ? 'collapsed' : ''}" style="--accent-color: ${this.accentColor}">
        <div class="header">
          ${this.collapsible ? html`
            <button type="button" @click=${this.toggleCollapse} aria-expanded=${String(!this.collapsed)}>
              <h2 class="title">${this.heading}</h2>
              <span class="icon">▶</span>
            </button>
          ` : html`
            <h2 class="title">${this.heading}</h2>
          `}
        </div>
        <div class="body" ?hidden=${this.collapsed}>
          <div class="description"><slot name="description"></slot></div>
          <slot></slot>
        </div>
      </section>
    `;
  }
}
