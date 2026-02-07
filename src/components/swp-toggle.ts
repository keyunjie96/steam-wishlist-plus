/* istanbul ignore file */
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { swpTheme } from './swp-theme.js';

interface SelectOption {
  value: string;
  label: string;
}

@customElement('swp-toggle')
export class SwpToggle extends LitElement {
  static styles = [swpTheme, css`
    :host {
      display: block;
      color: var(--swp-text-primary);
    }

    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    .row.full {
      background: var(--swp-bg-card);
      border: 1px solid var(--swp-border-subtle);
      border-radius: 8px;
      padding: 10px 12px;
    }

    .row.mini {
      padding: 6px 8px;
      border-radius: 6px;
      transition: background-color 0.15s ease;
    }

    .row.mini:hover {
      background: var(--swp-bg-hover);
    }

    .icon {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.05);
      color: var(--platform-color, var(--swp-accent));
      flex-shrink: 0;
    }

    .icon svg {
      width: 22px;
      height: 22px;
    }

    .content {
      flex: 1;
      min-width: 0;
    }

    .label {
      font-size: 13px;
      font-weight: 600;
      color: var(--swp-text-bright);
    }

    .label.mini {
      font-size: 12px;
      font-weight: 500;
    }

    .description {
      font-size: 12px;
      color: var(--swp-text-secondary);
      margin-top: 2px;
    }

    .switch {
      position: relative;
      width: var(--switch-width, 40px);
      height: var(--switch-height, 20px);
      flex-shrink: 0;
    }

    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      inset: 0;
      background: var(--swp-bg-input);
      border-radius: 999px;
      transition: background-color 0.2s ease;
    }

    .slider::before {
      content: '';
      position: absolute;
      height: calc(var(--switch-height, 20px) - 6px);
      width: calc(var(--switch-height, 20px) - 6px);
      left: 3px;
      top: 3px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s ease;
    }

    input:checked + .slider {
      background: var(--swp-accent);
    }

    input:checked + .slider::before {
      transform: translateX(calc(var(--switch-width, 40px) - var(--switch-height, 20px)));
    }

    .select {
      background: var(--swp-bg-input);
      border: 1px solid var(--swp-border-color);
      color: var(--swp-text-primary);
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 12px;
      min-width: 140px;
    }

    .select[hidden] {
      display: none;
    }

    :host([disabled]) {
      opacity: 0.6;
      pointer-events: none;
    }
  `];

  @property({ type: String }) label = '';
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: String }) icon = '';
  @property({ type: String }) description = '';
  @property({ type: String }) platform = '';
  @property({ type: String }) variant: 'mini' | 'full' = 'full';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property({ type: Array }) selectOptions: SelectOption[] = [];
  @property({ type: String }) selectValue = '';
  @property({ type: Boolean }) selectHidden = false;

  private getPlatformColor(): string {
    if (!this.platform) return '';
    return `--platform-color: var(--swp-${this.platform})`;
  }

  private onToggleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.checked = target.checked;
    this.dispatchEvent(new CustomEvent('swp-toggle-change', {
      detail: { checked: this.checked },
      bubbles: true,
      composed: true
    }));
  }

  private onSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectValue = target.value;
    this.dispatchEvent(new CustomEvent('swp-select-change', {
      detail: { value: this.selectValue },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    const isMini = this.variant === 'mini';
    const hasSelect = this.selectOptions.length > 0;
    return html`
      <div class="row ${this.variant}" style="${this.getPlatformColor()}">
        ${!isMini && this.icon ? html`<div class="icon" .innerHTML=${this.icon}></div>` : null}
        <div class="content">
          <div class="label ${isMini ? 'mini' : ''}">${this.label}</div>
          ${!isMini && this.description ? html`<div class="description">${this.description}</div>` : null}
        </div>
        ${hasSelect ? html`
          <select
            class="select"
            ?hidden=${this.selectHidden}
            .value=${this.selectValue}
            @change=${this.onSelectChange}
          >
            ${this.selectOptions.map(option => html`
              <option value=${option.value}>${option.label}</option>
            `)}
          </select>
        ` : null}
        <label class="switch" style="${isMini ? '--switch-width: 32px; --switch-height: 16px;' : ''}">
          <input
            type="checkbox"
            .checked=${this.checked}
            ?disabled=${this.disabled}
            @change=${this.onToggleChange}
          />
          <span class="slider"></span>
        </label>
      </div>
    `;
  }
}
