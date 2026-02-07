/**
 * Steam Wishlist Plus - Toggle Switch Component
 *
 * Reusable toggle switch with two variants:
 * - "mini" (32x16): Used in popup for compact toggles
 * - "full" (40x20): Used in options page with icon tile and description
 *
 * Supports optional inline select dropdown for HLTB/Review Scores toggles.
 */

import { LitElement, html, css, nothing } from 'lit';
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
    }

    /* ── Mini variant (popup) ── */
    .toggle-mini {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      background: none;
      border: none;
      border-radius: 4px;
      padding: 6px 8px;
      cursor: pointer;
      transition: background-color 0.15s;
      font-size: 12px;
      color: var(--swp-text-primary);
      user-select: none;
    }

    .toggle-mini:hover {
      background: var(--swp-bg-hover);
    }

    .toggle-mini.unchecked {
      opacity: 0.55;
    }

    .toggle-mini .label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Mini switch (32x16) */
    .mini-switch {
      position: relative;
      width: 32px;
      height: 16px;
      flex-shrink: 0;
    }

    .mini-switch input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }

    .mini-switch .slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: var(--swp-bg-input);
      border-radius: 8px;
      transition: background 0.2s;
    }

    .mini-switch .slider::before {
      position: absolute;
      content: "";
      height: 10px;
      width: 10px;
      left: 3px;
      top: 3px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 50%;
      transition: transform 0.2s, background 0.2s;
    }

    .mini-switch input:checked + .slider {
      background: var(--swp-accent);
    }

    .mini-switch input:checked + .slider::before {
      transform: translateX(16px);
      background: white;
    }

    .mini-switch input:focus-visible + .slider {
      outline: 2px solid var(--swp-accent-ring);
      outline-offset: 2px;
    }

    /* ── Full variant (options page) ── */
    .toggle-full {
      display: grid;
      grid-template-columns: 40px 1fr auto;
      align-items: center;
      column-gap: 12px;
      padding: 14px 16px;
      border-radius: 8px;
      cursor: pointer;
      background: var(--swp-card-bg);
      border: 1px solid var(--swp-card-border);
      transition: background 0.12s ease, border-color 0.12s ease;
      user-select: none;
    }

    .toggle-full:hover {
      background: var(--swp-bg-hover);
      border-color: rgba(255, 255, 255, 0.14);
    }

    .toggle-full:focus-within {
      outline: 2px solid var(--swp-accent-ring);
      outline-offset: 2px;
    }

    .toggle-full.active {
      border-color: rgba(74, 163, 255, 0.32);
      box-shadow: 0 0 0 2px rgba(74, 163, 255, 0.10);
    }

    /* With inline select: 4-column grid */
    .toggle-full.has-select {
      grid-template-columns: 40px 1fr 160px auto;
    }

    .toggle-full.has-select.select-hidden {
      grid-template-columns: 40px 1fr auto;
    }

    .toggle-full.has-select .toggle-switch-wrap {
      grid-column: 4;
      justify-self: end;
    }

    .toggle-full.has-select.select-hidden .toggle-switch-wrap {
      grid-column: 3;
    }

    /* Icon tile */
    .toggle-icon {
      width: 40px;
      height: 40px;
      border-radius: 6px;
      display: grid;
      place-items: center;
      background: var(--swp-bg-input);
      transition: all 0.2s;
    }

    .toggle-icon ::slotted(svg),
    .toggle-icon svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
      display: block;
      opacity: 0.8;
    }

    /* Platform colors on icon */
    :host([platform="nintendo"]) .toggle-icon { color: var(--swp-nintendo); }
    :host([platform="playstation"]) .toggle-icon { color: var(--swp-playstation); }
    :host([platform="xbox"]) .toggle-icon { color: var(--swp-xbox); }
    :host([platform="hltb"]) .toggle-icon { color: var(--swp-hltb); }
    :host([platform="review-scores"]) .toggle-icon { color: var(--swp-review-scores); }

    /* Active icon tint (fill icon bg with platform color, icon goes white) */
    .toggle-full.active:not(.steamdeck) .toggle-icon {
      background: currentColor;
    }

    .toggle-full.active:not(.steamdeck) .toggle-icon svg {
      fill: white;
      opacity: 1;
    }

    /* Inactive icon dimming */
    .toggle-full:not(.active):not(.steamdeck) .toggle-icon {
      opacity: 0.5;
      filter: saturate(0.5);
    }

    /* Steam Deck special styling */
    .toggle-full.steamdeck .toggle-icon {
      background:
        linear-gradient(180deg, rgba(255,255,255,.07), rgba(0,0,0,.22)),
        var(--swp-sd-tile-base);
      border: 1px solid rgba(255, 255, 255, 0.10);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    .toggle-full.steamdeck .toggle-icon svg {
      fill: none;
      opacity: 1;
    }

    .toggle-full.steamdeck:not(.active) .toggle-icon {
      opacity: 0.6;
      filter: saturate(0.7) brightness(0.9);
    }

    /* Larger SVG for Steam Deck (tall viewBox) */
    .toggle-full.steamdeck .toggle-icon svg {
      width: 26px;
      height: 26px;
    }

    .toggle-content {
      min-width: 0;
    }

    .toggle-label {
      font-size: 14px;
      font-weight: 500;
      color: var(--swp-text-primary);
      letter-spacing: 0.01em;
    }

    .toggle-desc {
      font-size: 12px;
      color: var(--swp-text-secondary);
      margin-top: 3px;
      line-height: 1.4;
    }

    /* Full toggle switch (40x20) */
    .toggle-switch {
      position: relative;
      width: 40px;
      height: 20px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-switch .slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: var(--swp-bg-input);
      border-radius: 10px;
      transition: all 0.2s;
    }

    .toggle-switch .slider::before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      top: 3px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 50%;
      transition: all 0.2s;
    }

    .toggle-switch input:checked + .slider {
      background: var(--swp-accent);
    }

    .toggle-switch input:checked + .slider::before {
      transform: translateX(20px);
      background: white;
    }

    .toggle-switch input:focus-visible + .slider {
      outline: 2px solid var(--swp-accent);
      outline-offset: 2px;
    }

    /* Inline select */
    .inline-select {
      grid-column: 3;
      width: 160px;
      padding: 6px 10px;
      background: var(--swp-bg-input);
      border: 1px solid var(--swp-border-color);
      border-radius: 8px;
      color: var(--swp-text-primary);
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
      transition: border-color 0.15s;
      align-self: center;
      justify-self: end;
      margin-right: 8px;
    }

    .inline-select:hover {
      border-color: var(--swp-accent);
    }

    .inline-select:focus {
      outline: none;
      border-color: var(--swp-accent);
    }

    .inline-select[hidden] {
      display: none;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .toggle-full.has-select {
        grid-template-columns: 40px 1fr auto;
        grid-template-rows: auto auto;
      }

      .toggle-full.has-select .toggle-switch-wrap {
        grid-column: 3;
      }

      .toggle-full.has-select .inline-select {
        grid-column: 2 / 4;
        grid-row: 2;
        width: 100%;
        margin: 8px 0 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
  `];

  @property({ type: String }) label = '';
  @property({ type: Boolean }) checked = false;
  @property({ type: String }) icon = '';
  @property({ type: String }) description = '';
  @property({ type: String, reflect: true }) platform = '';
  @property({ type: String }) variant: 'mini' | 'full' = 'mini';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Array }) selectOptions: SelectOption[] = [];
  @property({ type: String }) selectValue = '';
  @property({ type: Boolean }) selectHidden = true;

  render() {
    return this.variant === 'mini' ? this._renderMini() : this._renderFull();
  }

  private _renderMini() {
    return html`
      <label class="toggle-mini ${this.checked ? '' : 'unchecked'}">
        <span class="label">${this.label}</span>
        <span class="mini-switch">
          <input type="checkbox"
            .checked=${this.checked}
            ?disabled=${this.disabled}
            @change=${this._onToggleChange}>
          <span class="slider"></span>
        </span>
      </label>
    `;
  }

  private _renderFull() {
    const hasSelect = this.selectOptions.length > 0;
    const isSteamDeck = this.platform === 'steamdeck';
    const classes = [
      'toggle-full',
      this.checked ? 'active' : '',
      isSteamDeck ? 'steamdeck' : '',
      hasSelect ? 'has-select' : '',
      hasSelect && this.selectHidden ? 'select-hidden' : ''
    ].filter(Boolean).join(' ');

    return html`
      <div class=${classes}>
        <div class="toggle-icon" @click=${this._clickCheckbox}>
          ${this.icon ? html`<span .innerHTML=${this.icon}></span>` : nothing}
        </div>
        <div class="toggle-content" @click=${this._clickCheckbox}>
          <div class="toggle-label">${this.label}</div>
          ${this.description ? html`<div class="toggle-desc">${this.description}</div>` : nothing}
        </div>
        ${hasSelect ? html`
          <select class="inline-select"
            ?hidden=${this.selectHidden}
            .value=${this.selectValue}
            @change=${this._onSelectChange}
            @click=${this._stopPropagation}>
            ${this.selectOptions.map(opt => html`
              <option value=${opt.value} ?selected=${opt.value === this.selectValue}>${opt.label}</option>
            `)}
          </select>
        ` : nothing}
        <div class="toggle-switch-wrap">
          <label class="toggle-switch">
            <input type="checkbox"
              .checked=${this.checked}
              ?disabled=${this.disabled}
              @change=${this._onToggleChange}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;
  }

  private _clickCheckbox() {
    if (this.disabled) return;
    const input = this.shadowRoot!.querySelector<HTMLInputElement>('.toggle-switch input, .mini-switch input');
    if (input) {
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  private _stopPropagation(e: Event) {
    e.stopPropagation();
  }

  private _onToggleChange(e: Event) {
    e.stopPropagation();
    const input = e.target as HTMLInputElement;
    this.checked = input.checked;
    this.dispatchEvent(new CustomEvent('swp-toggle-change', {
      detail: { checked: this.checked },
      bubbles: true,
      composed: true
    }));
  }

  private _onSelectChange(e: Event) {
    e.stopPropagation();
    const select = e.target as HTMLSelectElement;
    this.selectValue = select.value;
    this.dispatchEvent(new CustomEvent('swp-select-change', {
      detail: { value: this.selectValue },
      bubbles: true,
      composed: true
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'swp-toggle': SwpToggle;
  }
}
