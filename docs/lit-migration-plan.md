# Lit Framework Migration Plan

## Decision Summary

**Framework chosen:** [Lit](https://lit.dev) (v3.x)
**Scope:** Popup UI + Options page only. Content script stays vanilla TypeScript.

### Why Lit for This Project

| Factor | Assessment |
|--------|-----------|
| **Bundle size** | ~5KB gzipped runtime. Acceptable for popup/options pages (not injected into third-party sites) |
| **Build system** | Works with existing esbuild setup. No compiler step needed (unlike Svelte). No JSX config (unlike Preact) |
| **Shadow DOM** | Provides style isolation. Each component owns its own styles — no more 600+ lines of inline `<style>` in HTML files |
| **Web standards** | Custom Elements and Shadow DOM are native browser APIs. No proprietary syntax or file formats |
| **Content script** | Stays vanilla. Lit components are NOT injected into Steam pages — no risk of conflicts or bloat |
| **TypeScript** | First-class support. Lit decorators work with TypeScript's `experimentalDecorators` or the TC39 standard decorators |

### What Changes, What Doesn't

| Surface | Today | After Migration |
|---------|-------|-----------------|
| **Popup** (`popup.html` + `popup.ts`) | 430-line HTML with inline styles + 230-line vanilla TS | Minimal HTML shell + `<swp-popup>` Lit component |
| **Options** (`options.html` + `options.ts`) | 866-line HTML with inline styles + 403-line vanilla TS | Minimal HTML shell + `<swp-options>` Lit component |
| **Content script** (`content.ts`) | ~1000-line vanilla TS with raw DOM manipulation | **No change** — stays vanilla |
| **Service worker** (`background.ts`) | Message routing, no DOM | **No change** |
| **Page scripts** (`steamDeckPageScript.ts`, `hltbPageScript.ts`) | Injected into MAIN world | **No change** |
| **Build** (`scripts/build.js`) | esbuild IIFE per file, all relative imports externalized | Small plugin tweak: allow bundling `./components/*` imports |
| **Tests** | Jest + jsdom | Add Lit-compatible test utilities |

---

## Architecture

### Component Tree

```
Shared Components (src/components/)
├── swp-toggle.ts          Reusable toggle switch with label + optional inline select
├── swp-stat-box.ts        Stat display card (value + label)
├── swp-status-message.ts  Toast-style success/error message with auto-hide
├── swp-section.ts         Collapsible section with header accent color
├── swp-icon-button.ts     Button with SVG icon + label
└── swp-theme.ts           Shared CSS custom properties + base styles (exported as CSSResult)

Page Components
├── src/popup.ts           <swp-popup> root component (replaces current popup.ts)
└── src/options.ts         <swp-options> root component (replaces current options.ts)
```

### Shadow DOM & Theming Strategy

CSS custom properties **inherit through Shadow DOM boundaries**. This means:

1. **Global theme** — Define colors, fonts, spacing in a shared `swp-theme.ts` as a `css` tagged template. Each component imports and includes it.
2. **Component styles** — Each component defines its own scoped styles via Lit's `static styles`. These don't leak out.
3. **No global stylesheet needed** — Theme variables are defined once and shared via import, not via a `<link>` tag.

```
┌─────────────────────────────────────────────────┐
│  popup.html / options.html                      │
│  (Minimal shell: <meta>, <script>, <swp-*>)     │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  <swp-popup> or <swp-options>  (Shadow)   │  │
│  │  ┌─────────────┐  ┌─────────────┐        │  │
│  │  │ <swp-toggle> │  │ <swp-stat>  │  ...   │  │
│  │  │  (Shadow)    │  │  (Shadow)   │        │  │
│  │  └─────────────┘  └─────────────┘        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

CSS custom properties (--bg-0, --accent, etc.)
flow DOWN through all shadow boundaries.
```

---

## Implementation Phases

### Phase 1: Setup & Infrastructure

**Goal:** Install Lit, update build config, create shared theme, verify build still works.

#### 1.1 Install Lit

```bash
npm install lit
```

This adds `lit` as a production dependency (~5KB gzipped). Lit v3 includes:
- `lit-html` — Tagged template literal rendering
- `lit-element` — Base class for Web Components
- `@lit/reactive-element` — Reactive property system

#### 1.2 Update TypeScript Config

```jsonc
// tsconfig.json changes:
{
  "compilerOptions": {
    // Required for Lit decorators (@customElement, @property, @state)
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

**Note:** Lit 3.x also supports standard TC39 decorators. We use `experimentalDecorators` for broader TypeScript compatibility and smaller output.

#### 1.3 Update Build Script

Modify `scripts/build.js` to allow bundling component imports instead of externalizing them:

```js
// In the externalize-local-imports plugin:
build.onResolve({ filter: /^\.\.?\// }, args => {
  if (args.importer.includes('/src/')) {
    // Allow bundling component imports — they should be included in the output
    if (args.path.includes('/components/')) {
      return; // Don't externalize
    }
    return { path: args.path, external: true };
  }
});
```

Also add `src/components/*.ts` files to the exclude list (they're bundled into popup.js/options.js, not built as standalone files).

#### 1.4 Create Shared Theme

```typescript
// src/components/swp-theme.ts
import { css } from 'lit';

export const swpTheme = css`
  :host {
    /* Steam-inspired color palette */
    --swp-bg-body: #1b2838;
    --swp-bg-card: #16202d;
    --swp-bg-input: #32404f;
    --swp-bg-hover: rgba(255, 255, 255, 0.075);

    --swp-text-primary: rgba(255, 255, 255, 0.92);
    --swp-text-secondary: rgba(255, 255, 255, 0.68);
    --swp-text-bright: #ffffff;
    --swp-text-muted: rgba(255, 255, 255, 0.45);

    --swp-border-color: rgba(255, 255, 255, 0.1);
    --swp-border-subtle: rgba(255, 255, 255, 0.06);

    --swp-accent: #4aa3ff;
    --swp-success: #5ba32b;
    --swp-danger: #c03030;

    /* Platform colors */
    --swp-nintendo: #e60012;
    --swp-playstation: #006fcd;
    --swp-xbox: #107c10;
    --swp-hltb: #4aa3ff;
    --swp-review-scores: #ffcc33;

    font-family: "Motiva Sans", Arial, Helvetica, sans-serif;
    color: var(--swp-text-primary);
    line-height: 1.5;
  }
`;
```

#### 1.5 Create Directory Structure

```
src/
├── components/
│   ├── swp-theme.ts
│   ├── swp-toggle.ts
│   ├── swp-stat-box.ts
│   ├── swp-status-message.ts
│   ├── swp-section.ts
│   └── swp-icon-button.ts
├── popup.ts          (rewritten as Lit component)
├── options.ts        (rewritten as Lit component)
└── ... (all other files unchanged)
```

#### 1.6 Verify Build

Run `npm run build` and `npm run typecheck` to confirm everything still compiles. Existing functionality is unaffected.

---

### Phase 2: Shared Components

Build the reusable Lit components. Each component is self-contained with its own styles.

#### 2.1 `<swp-toggle>` — Toggle Switch

The most-used shared component. Currently duplicated between popup (mini-switch, 32x16) and options (toggle-switch, 40x20 with icon tile and description).

**Props:**
| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Toggle label text |
| `checked` | `boolean` | Toggle state |
| `icon` | `string` (SVG) | Optional SVG icon string (options page variant) |
| `description` | `string` | Optional description text (options page variant) |
| `platform` | `string` | Platform key for color theming |
| `variant` | `'mini' \| 'full'` | Mini (popup) or full (options page) |
| `disabled` | `boolean` | Disabled state |

**Events:**
- `swp-toggle-change` — Fires with `{ checked: boolean }` detail

**Example usage:**
```html
<!-- Popup (mini variant) -->
<swp-toggle variant="mini" label="Switch" platform="nintendo"
  .checked=${this.settings.showNintendo}
  @swp-toggle-change=${this._onToggle}>
</swp-toggle>

<!-- Options (full variant with icon and description) -->
<swp-toggle variant="full" label="Nintendo Switch"
  description="Show eShop availability"
  platform="nintendo"
  .icon=${NINTENDO_SVG}
  .checked=${this.settings.showNintendo}
  @swp-toggle-change=${this._onToggle}>
</swp-toggle>
```

#### 2.2 `<swp-toggle>` with Inline Select

For HLTB and Review Scores toggles that have an associated dropdown:

**Additional props:**
| Property | Type | Description |
|----------|------|-------------|
| `selectOptions` | `Array<{value, label}>` | Dropdown options |
| `selectValue` | `string` | Current selection |
| `selectHidden` | `boolean` | Whether dropdown is hidden (follows checkbox state) |

**Additional events:**
- `swp-select-change` — Fires with `{ value: string }` detail

#### 2.3 `<swp-stat-box>` — Stat Display

**Props:**
| Property | Type | Description |
|----------|------|-------------|
| `value` | `string` | Display value (e.g., "42", "3d 5h", "-") |
| `label` | `string` | Description label (e.g., "Cached Games") |
| `variant` | `'compact' \| 'full'` | Compact (popup) or full (options) sizing |

#### 2.4 `<swp-status-message>` — Status Toast

**Props:**
| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Message text |
| `type` | `'success' \| 'error' \| ''` | Message type (empty = hidden) |
| `autoHideMs` | `number` | Auto-hide delay (default: 3000) |

**Methods:**
- `show(message, type)` — Show a message (starts auto-hide timer)

#### 2.5 `<swp-section>` — Collapsible Section

**Props:**
| Property | Type | Description |
|----------|------|-------------|
| `heading` | `string` | Section title |
| `accentColor` | `string` | Left border accent color |
| `collapsible` | `boolean` | Whether section can collapse |
| `collapsed` | `boolean` | Current collapsed state |

**Slots:**
- Default slot — Section body content
- `description` slot — Section description paragraph

#### 2.6 `<swp-icon-button>` — Button with Icon

**Props:**
| Property | Type | Description |
|----------|------|-------------|
| `label` | `string` | Button text |
| `icon` | `string` (SVG) | SVG icon string |
| `variant` | `'primary' \| 'secondary' \| 'danger'` | Button style |
| `loading` | `boolean` | Loading state (shows spinner) |
| `disabled` | `boolean` | Disabled state |
| `fullWidth` | `boolean` | Whether to take full width |

---

### Phase 3: Popup Migration

Rewrite the popup UI using Lit components.

#### 3.1 Minimal HTML Shell

Replace the 430-line `popup.html` with a minimal shell:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Steam Wishlist Plus</title>
  <style>
    /* Minimal body reset — component handles all styling */
    body {
      margin: 0;
      padding: 0;
      width: 280px;
      background: #1b2838;
    }
  </style>
</head>
<body>
  <swp-popup></swp-popup>
  <script src="../dist/types.js"></script>
  <script src="../dist/popup.js"></script>
</body>
</html>
```

**~430 lines → ~20 lines**

#### 3.2 Popup Component

Rewrite `popup.ts` as a `SwpPopup` Lit element. All rendering logic, event handling, and Chrome API calls move into the component:

```typescript
// src/popup.ts
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { swpTheme } from './components/swp-theme.js';
import './components/swp-toggle.js';
import './components/swp-stat-box.js';
import './components/swp-status-message.js';
import type { UserSettings } from './types';

@customElement('swp-popup')
export class SwpPopup extends LitElement {
  static styles = [swpTheme, css`
    :host { display: block; padding: 14px; }
    /* ... popup-specific styles ... */
  `];

  @state() private settings: UserSettings = { ...DEFAULT_USER_SETTINGS };
  @state() private cacheCount = '-';
  @state() private cacheAge = '-';
  @state() private statusMessage = '';
  @state() private statusType: 'success' | 'error' | '' = '';
  @state() private clearLoading = false;

  connectedCallback() {
    super.connectedCallback();
    this._loadSettings();
    this._loadCacheStats();
  }

  render() {
    return html`
      <div class="header">
        <div class="header-icon">
          <img src="../assets/icons/icon128.png" alt="">
        </div>
        <h1>Steam Wishlist Plus</h1>
        <button class="settings-btn" @click=${this._openSettings}>
          <!-- gear SVG -->
        </button>
      </div>

      <div class="stats">
        <swp-stat-box value=${this.cacheCount} label="Cached Games" variant="compact"></swp-stat-box>
        <swp-stat-box value=${this.cacheAge} label="Oldest Entry" variant="compact"></swp-stat-box>
      </div>

      <div class="section-group">
        <div class="section-title">Platforms</div>
        ${this._renderToggles(['nintendo', 'playstation', 'xbox'])}
      </div>

      <div class="section-group">
        <div class="section-title">Game Info</div>
        ${this._renderToggles(['steamdeck', 'hltb', 'reviewScores'])}
      </div>

      <swp-icon-button variant="danger" label="Clear Cache"
        .loading=${this.clearLoading}
        @click=${this._clearCache}>
      </swp-icon-button>

      <swp-status-message .message=${this.statusMessage} .type=${this.statusType}>
      </swp-status-message>
    `;
  }

  // ... methods: _loadSettings, _loadCacheStats, _clearCache, _openSettings, _onToggle
}
```

#### 3.3 Key Behavior Preserved

- Loading state (`is-loading`) → Lit handles via `@state()` reactivity
- Settings persistence → Same `chrome.storage.sync` calls
- Cache stats → Same `chrome.runtime.sendMessage` calls
- Toggle → checkbox sync → save flow → `@swp-toggle-change` → `_saveSettings()`
- Reduced motion / accessibility → Preserved in component styles

---

### Phase 4: Options Page Migration

Rewrite the options page using Lit components.

#### 4.1 Minimal HTML Shell

Replace the 866-line `options.html` with a minimal shell:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Steam Wishlist Plus - Options</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: linear-gradient(to bottom, #1b2838 0%, #171a21 100%);
      background-attachment: fixed;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <swp-options></swp-options>
  <script src="../dist/types.js"></script>
  <script src="../dist/options.js"></script>
</body>
</html>
```

**~866 lines → ~20 lines**

#### 4.2 Options Component

The options page is more complex. It composes multiple shared components:

```typescript
@customElement('swp-options')
export class SwpOptions extends LitElement {
  static styles = [swpTheme, css`/* options-specific styles */`];

  @state() private settings: UserSettings = { ...DEFAULT_USER_SETTINGS };
  @state() private cacheCount = '-';
  @state() private cacheAge = '-';
  // ... other state

  render() {
    return html`
      <div class="container">
        <header class="header"><!-- icon + title + version --></header>

        <swp-section heading="Platforms" accentColor="var(--swp-accent)">
          <p slot="description">Show game availability on other platforms</p>
          ${this._renderPlatformToggles()}
        </swp-section>

        <swp-section heading="Game Info" accentColor="var(--swp-hltb)">
          <p slot="description">Compatibility, playtime, and review information</p>
          ${this._renderGameInfoToggles()}
        </swp-section>

        <swp-section heading="Cache" accentColor="var(--swp-text-muted)">
          <div class="stats-grid">
            <swp-stat-box value=${this.cacheCount} label="Games Cached"></swp-stat-box>
            <swp-stat-box value=${this.cacheAge} label="Oldest Entry"></swp-stat-box>
          </div>
          <div class="button-row">
            <swp-icon-button variant="secondary" label="Refresh" .icon=${REFRESH_SVG}
              @click=${this._refreshStats}></swp-icon-button>
            <swp-icon-button variant="secondary" label="Export" .icon=${EXPORT_SVG}
              @click=${this._exportCache}></swp-icon-button>
          </div>
          <swp-icon-button variant="danger" label="Clear Cache" .icon=${TRASH_SVG}
            fullWidth @click=${this._clearCache}></swp-icon-button>
          <swp-status-message .message=${this.cacheStatusMsg} .type=${this.cacheStatusType}>
          </swp-status-message>
        </swp-section>

        <swp-section heading="About" collapsible collapsed
          accentColor="var(--swp-border-color)">
          <!-- about content -->
        </swp-section>
      </div>
    `;
  }
}
```

#### 4.3 HLTB / Review Score Toggles with Inline Select

The `<swp-toggle>` component handles inline selects natively:

```typescript
_renderGameInfoToggles() {
  return html`
    <swp-toggle variant="full" label="How Long To Beat"
      description="Show completion time estimates"
      platform="hltb" .icon=${CLOCK_SVG}
      .checked=${this.settings.showHltb}
      .selectOptions=${[
        { value: 'mainStory', label: 'Main Story' },
        { value: 'mainExtra', label: 'Main + Extras' },
        { value: 'completionist', label: 'Completionist' }
      ]}
      .selectValue=${this.settings.hltbDisplayStat}
      .selectHidden=${!this.settings.showHltb}
      @swp-toggle-change=${(e) => this._updateSetting('showHltb', e.detail.checked)}
      @swp-select-change=${(e) => this._updateSetting('hltbDisplayStat', e.detail.value)}>
    </swp-toggle>
  `;
}
```

---

### Phase 5: Testing

#### 5.1 Test Setup for Lit

Lit components need a DOM environment that supports Custom Elements. Options:

**Option A: @open-wc/testing (Recommended)**
```bash
npm install -D @open-wc/testing @web/test-runner
```
Provides `fixture()`, `html`, and `expect` utilities for testing Lit components in a real browser.

**Option B: Jest + jsdom with shimming**
Since the project already uses Jest, we can continue with Jest but add Custom Elements shimming:
```bash
npm install -D @lit-labs/testing jest-environment-jsdom
```

**Recommendation:** Start with **Option B** (Jest + shimming) to avoid changing the test runner. The existing Jest infrastructure, coverage thresholds, and CI integration continue to work. If jsdom limitations become blocking, migrate to `@web/test-runner` later.

#### 5.2 Component Tests

Each shared component gets its own test file:

```
tests/unit/
├── components/
│   ├── swp-toggle.test.ts
│   ├── swp-stat-box.test.ts
│   ├── swp-status-message.test.ts
│   ├── swp-section.test.ts
│   └── swp-icon-button.test.ts
├── popup.test.ts          (rewritten for Lit component)
└── options.test.ts        (rewritten for Lit component)
```

**Example test:**
```typescript
import { fixture, html } from '@open-wc/testing';
import '../src/components/swp-toggle.js';

describe('swp-toggle', () => {
  it('renders label', async () => {
    const el = await fixture(html`
      <swp-toggle label="Nintendo" variant="mini"></swp-toggle>
    `);
    const label = el.shadowRoot!.querySelector('.label');
    expect(label?.textContent).toBe('Nintendo');
  });

  it('fires change event on click', async () => {
    const el = await fixture(html`
      <swp-toggle label="Test" variant="mini"></swp-toggle>
    `);
    const changeSpy = jest.fn();
    el.addEventListener('swp-toggle-change', changeSpy);
    el.shadowRoot!.querySelector('input')!.click();
    expect(changeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ detail: { checked: true } })
    );
  });
});
```

#### 5.3 Coverage

Existing thresholds in `jest.config.js` remain unchanged. New component files are added to per-file thresholds as appropriate.

---

### Phase 6: Content Script (No Change)

The content script (`content.ts`) is **explicitly out of scope** for this migration. Rationale:

1. **Injected into Steam's pages** — Adding a framework runtime to every Steam wishlist page adds unnecessary weight
2. **Simple DOM patterns** — `createElement`, `appendChild`, `setAttribute` are sufficient for icons and badges
3. **No component reuse need** — Content script elements are unique to Steam's DOM structure
4. **Risk of conflicts** — Custom Elements registered in Steam's page could conflict with Steam's own code or other extensions
5. **The `scpw-` prefix strategy already works** — Style isolation via class prefixes is proven and lightweight

If content script complexity grows significantly in the future, consider using Lit's `html` template literals _without_ Custom Elements (just for templating convenience).

---

## Migration Checklist

### Phase 1: Setup
- [ ] Install `lit` as production dependency
- [ ] Update `tsconfig.json` with decorator support
- [ ] Create `src/components/` directory
- [ ] Create `src/components/swp-theme.ts` with shared CSS variables
- [ ] Update `scripts/build.js` to bundle component imports
- [ ] Verify `npm run build` succeeds
- [ ] Verify `npm run typecheck` succeeds
- [ ] Verify existing tests still pass

### Phase 2: Shared Components
- [ ] Implement `<swp-toggle>` (mini + full variants, inline select support)
- [ ] Implement `<swp-stat-box>` (compact + full variants)
- [ ] Implement `<swp-status-message>` (auto-hide, success/error)
- [ ] Implement `<swp-section>` (collapsible, accent color)
- [ ] Implement `<swp-icon-button>` (primary/secondary/danger, loading state)
- [ ] Write unit tests for all shared components
- [ ] Verify all component tests pass

### Phase 3: Popup Migration
- [ ] Rewrite `popup.html` as minimal shell (~20 lines)
- [ ] Rewrite `popup.ts` as `<swp-popup>` Lit component
- [ ] Verify popup renders correctly in Chrome
- [ ] Verify settings load/save works
- [ ] Verify cache stats display
- [ ] Verify clear cache functionality
- [ ] Verify settings button opens options page
- [ ] Update popup tests
- [ ] Verify test coverage thresholds met

### Phase 4: Options Page Migration
- [ ] Rewrite `options.html` as minimal shell (~20 lines)
- [ ] Rewrite `options.ts` as `<swp-options>` Lit component
- [ ] Verify options page renders correctly
- [ ] Verify all toggles + inline selects work
- [ ] Verify collapsible About section works
- [ ] Verify cache operations (refresh, export, clear)
- [ ] Verify responsive layout at 480px breakpoint
- [ ] Update options tests
- [ ] Verify test coverage thresholds met

### Phase 5: Final Validation
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` succeeds
- [ ] `npm run test:unit` passes with coverage thresholds
- [ ] Manual test: load extension in Chrome, verify popup
- [ ] Manual test: verify options page
- [ ] Manual test: verify content script still works (no regression)
- [ ] Manual test: verify reduced motion / accessibility
- [ ] Update CLAUDE.md with new directory structure and component docs
- [ ] Update version number (minor bump: 0.8.0)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Shadow DOM breaks existing test assertions | Medium | Low | Override `createRenderRoot()` in tests, or query through `shadowRoot` |
| esbuild bundling issues with Lit | Low | Medium | Lit is designed for standard bundlers. Fallback: adjust plugin config |
| Popup sizing changes | Low | Medium | Test in Chrome popup frame. Set explicit `width: 280px` on `:host` |
| Chrome CSP blocks Lit | Very Low | High | Lit uses no `eval()` or inline scripts. Tagged templates are CSP-safe |
| Custom Elements registration conflicts | Very Low | Low | Components are only registered in popup/options contexts, not content scripts |
| Jest/jsdom lacks Custom Elements support | Medium | Medium | Use polyfills (`@webcomponents/webcomponentsjs`) or switch to `@web/test-runner` |

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/swp-theme.ts` | Shared CSS custom properties |
| `src/components/swp-toggle.ts` | Toggle switch component |
| `src/components/swp-stat-box.ts` | Stat display component |
| `src/components/swp-status-message.ts` | Status message component |
| `src/components/swp-section.ts` | Collapsible section component |
| `src/components/swp-icon-button.ts` | Icon button component |
| `tests/unit/components/*.test.ts` | Component tests |

### Modified Files
| File | Change |
|------|--------|
| `package.json` | Add `lit` dependency |
| `tsconfig.json` | Add `experimentalDecorators`, `useDefineForClassFields: false` |
| `scripts/build.js` | Allow bundling `./components/*` imports |
| `src/popup.html` | Reduce to ~20-line minimal shell |
| `src/popup.ts` | Rewrite as `<swp-popup>` Lit component |
| `src/options.html` | Reduce to ~20-line minimal shell |
| `src/options.ts` | Rewrite as `<swp-options>` Lit component |
| `tests/unit/popup.test.ts` | Update for Lit component testing |
| `tests/unit/options.test.ts` | Update for Lit component testing |
| `manifest.json` | Version bump to 0.8.0 |
| `CLAUDE.md` | Update directory structure, key files, conventions |

### Unchanged Files
| File | Reason |
|------|--------|
| `src/content.ts` | Stays vanilla — injected into Steam pages |
| `src/background.ts` | Service worker — no DOM |
| `src/styles.css` | Content script styles — unrelated to Lit |
| `src/types.ts` | Type definitions — no UI |
| `src/icons.ts` | Icon SVG strings — consumed by both Lit and vanilla |
| `src/cache.ts`, `src/resolver.ts`, etc. | Backend logic — no UI |
| `src/steamDeckPageScript.ts`, `src/hltbPageScript.ts` | MAIN world scripts — no UI framework |

---

## Estimated Lines of Code

| Area | Before | After | Delta |
|------|--------|-------|-------|
| `popup.html` | 430 | ~20 | -410 |
| `popup.ts` | 230 | ~180 | -50 |
| `options.html` | 866 | ~20 | -846 |
| `options.ts` | 403 | ~250 | -153 |
| Shared components | 0 | ~500 | +500 |
| Component tests | 0 | ~300 | +300 |
| **Total** | ~1,929 | ~1,270 | **-659** |

Net reduction of ~660 lines, with better organization, reusability, and maintainability. The inline CSS that made up the bulk of the HTML files moves into component `static styles` where it's co-located with the markup it applies to.
