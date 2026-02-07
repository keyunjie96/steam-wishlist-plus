# Preact Framework Migration Plan

## Decision Summary

**Framework chosen:** [Preact](https://preactjs.com) (v10.x)
**Scope:** Popup UI + Options page only. Content script stays vanilla TypeScript.

### Why Preact for This Project

| Factor | Assessment |
|--------|-----------|
| **Bundle size** | ~3KB gzipped — smallest viable framework. Lighter than Lit (~5KB) |
| **Build system** | esbuild has native JSX support. One-line config change, no new tooling |
| **Developer experience** | JSX is more ergonomic than tagged template literals. Familiar React patterns |
| **Ecosystem** | Massive. Any React-compatible library works (state management, testing, UI kits) |
| **TypeScript** | First-class JSX/TSX support. Full type inference in templates |
| **Testing** | Works with existing Jest + jsdom setup. Preact Testing Library available |
| **Content script** | Stays vanilla. Preact is NOT injected into Steam pages |

### Preact vs Lit — Key Trade-offs

| Aspect | Preact | Lit |
|--------|--------|-----|
| **Size** | ~3KB gzip | ~5KB gzip |
| **Templates** | JSX (TSX) — full TypeScript type checking in markup | Tagged template literals — no type checking in markup |
| **Style isolation** | No Shadow DOM — need explicit scoping strategy | Shadow DOM — automatic style encapsulation |
| **Reactivity** | Virtual DOM diffing + hooks (`useState`, `useEffect`) | Reactive properties + lit-html efficient updates |
| **Ecosystem** | Enormous (React-compatible) | Moderate (Web Components ecosystem) |
| **Learning curve** | Very low if you know React | Low-moderate (new API, template syntax) |
| **Component model** | Functions + hooks (modern idiomatic) | Classes + decorators (can also use functions) |
| **Standard conformance** | Framework-specific (JSX is non-standard) | Web standards (Custom Elements, Shadow DOM) |

### What Changes, What Doesn't

| Surface | Today | After Migration |
|---------|-------|-----------------|
| **Popup** (`popup.html` + `popup.ts`) | 430-line HTML with inline styles + 230-line vanilla TS | Minimal HTML shell + `<SwpPopup />` Preact component |
| **Options** (`options.html` + `options.ts`) | 866-line HTML with inline styles + 403-line vanilla TS | Minimal HTML shell + `<SwpOptions />` Preact component |
| **Content script** (`content.ts`) | ~1000-line vanilla TS with raw DOM manipulation | **No change** — stays vanilla |
| **Service worker** (`background.ts`) | Message routing, no DOM | **No change** |
| **Page scripts** (`steamDeckPageScript.ts`, `hltbPageScript.ts`) | Injected into MAIN world | **No change** |
| **Build** (`scripts/build.js`) | esbuild IIFE per file | Add `jsx: 'automatic'` + `jsxImportSource: 'preact'` for popup/options |
| **TypeScript** (`tsconfig.json`) | No JSX support | Add `jsx`, `jsxImportSource` settings |
| **Tests** | Jest + jsdom | Add Preact Testing Library |

---

## Architecture

### Component Tree

```
Shared Components (src/components/)
├── Toggle.tsx              Reusable toggle switch (mini + full variants, optional inline select)
├── StatBox.tsx             Stat display card (value + label)
├── StatusMessage.tsx       Toast-style success/error message with auto-hide
├── Section.tsx             Collapsible section with header accent color
├── IconButton.tsx          Button with SVG icon + label
└── theme.css               Shared CSS custom properties + base styles

Page Components
├── src/popup.tsx           <SwpPopup /> root component (replaces current popup.ts)
└── src/options.tsx         <SwpOptions /> root component (replaces current options.ts)
```

### CSS Strategy (No Shadow DOM)

Since Preact doesn't use Shadow DOM, we need an explicit style scoping strategy. This project has a natural advantage: **popup and options are separate HTML pages** — their styles never collide with each other or with Steam's page.

**Approach: Co-located CSS via esbuild CSS imports**

1. **Global theme** — `src/components/theme.css` defines CSS custom properties on `:root`. Both pages import it.
2. **Component styles** — Each component has a co-located `.css` file (e.g., `Toggle.css`). Styles use a `swp-` class prefix for clarity.
3. **Page styles** — `popup.tsx` and `options.tsx` import their own page-level CSS.
4. **No CSS-in-JS** — Keeps the CSS in familiar `.css` files. No runtime style injection overhead.

**Alternative: Inline styles via `style` prop** — For truly tiny components, inline styles in JSX work fine. Preact handles `style` objects efficiently.

```
┌─────────────────────────────────────────────────┐
│  popup.html                                     │
│  <link rel="stylesheet" href="popup.css">       │
│  <div id="app"></div>                           │
│  <script src="popup.js"></script>               │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  <SwpPopup>                               │  │
│  │  ├── <StatBox /> <StatBox />              │  │
│  │  ├── <Toggle /> <Toggle /> <Toggle />     │  │
│  │  ├── <IconButton variant="danger" />      │  │
│  │  └── <StatusMessage />                    │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘

Styles scoped naturally: popup.html is its own document.
No style leakage possible.
```

---

## Implementation Phases

### Phase 1: Setup & Infrastructure

**Goal:** Install Preact, configure JSX in esbuild + TypeScript, create shared theme, verify build.

#### 1.1 Install Preact

```bash
npm install preact
npm install -D @preact/preset-vite  # Not needed — just for reference
```

Only `preact` is needed as a production dependency. It includes:
- `preact/hooks` — `useState`, `useEffect`, `useCallback`, `useRef`, etc.
- `preact/compat` — React compatibility layer (only needed if using React libraries)
- `preact/jsx-runtime` — Automatic JSX transform support

#### 1.2 Update TypeScript Config

```jsonc
// tsconfig.json additions:
{
  "compilerOptions": {
    // Enable JSX with automatic runtime (no manual h() import needed)
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
```

With `"jsx": "react-jsx"`, TypeScript understands `.tsx` files and provides full type checking in JSX templates — catching typos in prop names, wrong types, missing required props, etc.

#### 1.3 Update Build Script

Modify `scripts/build.js` to handle `.tsx` files and bundle Preact:

```js
// Changes to scripts/build.js:

// 1. Add tsx files to the build list
const files = [
  // ... existing .ts files unchanged ...
  'popup.tsx',      // Was popup.ts
  'options.tsx',    // Was options.ts
];

// 2. For tsx files, configure JSX and allow component bundling
await esbuild.build({
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  // JSX configuration for Preact
  jsx: 'automatic',
  jsxImportSource: 'preact',
  external: ['chrome'],
  plugins: [{
    name: 'externalize-local-imports',
    setup(build) {
      build.onResolve({ filter: /^\.\.?\// }, args => {
        if (args.importer.includes('/src/')) {
          // Allow bundling component imports
          if (args.path.includes('/components/')) {
            return; // Bundle it
          }
          return { path: args.path, external: true };
        }
      });
    }
  }]
});
```

**Key change:** The plugin now allows `./components/*` imports to be bundled rather than externalized. Preact itself (from `node_modules`) is bundled automatically since it's a bare import.

#### 1.4 Create Shared Theme

```css
/* src/components/theme.css */
:root {
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
}
```

#### 1.5 Create Directory Structure

```
src/
├── components/
│   ├── theme.css
│   ├── Toggle.tsx
│   ├── Toggle.css
│   ├── StatBox.tsx
│   ├── StatusMessage.tsx
│   ├── Section.tsx
│   ├── Section.css
│   ├── IconButton.tsx
│   └── IconButton.css
├── popup.tsx           (replaces popup.ts)
├── popup.css           (extracted from popup.html inline styles)
├── options.tsx         (replaces options.ts)
├── options.css         (extracted from options.html inline styles)
└── ... (all other files unchanged)
```

#### 1.6 Verify Build

Run `npm run build` and `npm run typecheck` to confirm everything still compiles.

---

### Phase 2: Shared Components

Build reusable functional components with hooks.

#### 2.1 `<Toggle />` — Toggle Switch

The core shared component. Supports two variants matching the current popup (mini) and options (full with icon tile) designs.

```tsx
// src/components/Toggle.tsx
import { FunctionComponent } from 'preact';
import { useCallback } from 'preact/hooks';

interface SelectOption {
  value: string;
  label: string;
}

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  // Full variant props (options page)
  variant?: 'mini' | 'full';
  icon?: string;          // SVG string for icon tile
  description?: string;
  platform?: string;      // For color theming
  // Inline select (HLTB, Review Scores)
  selectOptions?: SelectOption[];
  selectValue?: string;
  onSelectChange?: (value: string) => void;
}

export const Toggle: FunctionComponent<ToggleProps> = ({
  label,
  checked,
  onChange,
  variant = 'mini',
  icon,
  description,
  platform,
  selectOptions,
  selectValue,
  onSelectChange,
}) => {
  const handleToggle = useCallback(() => {
    onChange(!checked);
  }, [checked, onChange]);

  const handleSelect = useCallback((e: Event) => {
    const target = e.target as HTMLSelectElement;
    onSelectChange?.(target.value);
  }, [onSelectChange]);

  if (variant === 'mini') {
    return (
      <label class={`swp-toggle-mini ${checked ? '' : 'swp-dimmed'}`}>
        <span class="swp-toggle-label">{label}</span>
        <span class="swp-mini-switch">
          <input type="checkbox" checked={checked} onChange={handleToggle} />
          <span class="swp-slider" />
        </span>
      </label>
    );
  }

  // Full variant (options page)
  const hasSelect = selectOptions && selectOptions.length > 0;
  const classes = [
    'swp-toggle-item',
    checked ? 'swp-active' : '',
    hasSelect ? 'swp-has-select' : '',
    !checked && hasSelect ? 'swp-select-hidden' : '',
  ].filter(Boolean).join(' ');

  return (
    <div class={classes} data-platform={platform}>
      {icon && (
        <div
          class={`swp-toggle-icon ${platform === 'steamdeck' ? 'swp-steamdeck-icon' : ''}`}
          dangerouslySetInnerHTML={{ __html: icon }}
        />
      )}
      <div class="swp-toggle-content">
        <div class="swp-toggle-name">{label}</div>
        {description && <div class="swp-toggle-desc">{description}</div>}
      </div>
      {hasSelect && checked && (
        <select class="swp-inline-select" value={selectValue} onChange={handleSelect}>
          {selectOptions!.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      <span class="swp-toggle-switch">
        <input type="checkbox" checked={checked} onChange={handleToggle} />
        <span class="swp-slider" />
      </span>
    </div>
  );
};
```

**Type safety advantage over Lit:** TypeScript checks that `selectOptions` matches the `SelectOption[]` type at compile time. Misspelling `onSelectChange` or passing a number for `label` produces an immediate error. In Lit's tagged template literals, these errors are only caught at runtime.

#### 2.2 `<StatBox />` — Stat Display

```tsx
// src/components/StatBox.tsx
import { FunctionComponent } from 'preact';

interface StatBoxProps {
  value: string;
  label: string;
  variant?: 'compact' | 'full';
}

export const StatBox: FunctionComponent<StatBoxProps> = ({
  value,
  label,
  variant = 'full',
}) => (
  <div class={`swp-stat-box ${variant === 'compact' ? 'swp-stat-compact' : ''}`}>
    <div class="swp-stat-value">{value}</div>
    <div class="swp-stat-label">{label}</div>
  </div>
);
```

#### 2.3 `<StatusMessage />` — Status Toast

```tsx
// src/components/StatusMessage.tsx
import { FunctionComponent } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface StatusMessageProps {
  message: string;
  type: 'success' | 'error' | '';
  autoHideMs?: number;
  onHide?: () => void;
}

export const StatusMessage: FunctionComponent<StatusMessageProps> = ({
  message,
  type,
  autoHideMs = 3000,
  onHide,
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (type && message && autoHideMs > 0) {
      timerRef.current = setTimeout(() => onHide?.(), autoHideMs);
      return () => clearTimeout(timerRef.current);
    }
  }, [message, type, autoHideMs, onHide]);

  if (!type || !message) return null;

  return (
    <div class={`swp-status swp-status-${type}`} role="alert" aria-live="polite">
      {message}
    </div>
  );
};
```

#### 2.4 `<Section />` — Collapsible Section

```tsx
// src/components/Section.tsx
import { FunctionComponent, ComponentChildren } from 'preact';
import { useState, useCallback } from 'preact/hooks';

interface SectionProps {
  heading: string;
  accentColor?: string;
  collapsible?: boolean;
  initialCollapsed?: boolean;
  description?: string;
  children: ComponentChildren;
}

export const Section: FunctionComponent<SectionProps> = ({
  heading,
  accentColor = 'var(--swp-text-muted)',
  collapsible = false,
  initialCollapsed = false,
  description,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = useCallback(() => {
    if (collapsible) setCollapsed(prev => !prev);
  }, [collapsible]);

  return (
    <section class={`swp-section ${collapsed ? 'swp-collapsed' : ''}`}>
      <div class="swp-section-header" style={{ borderLeftColor: accentColor }}>
        {collapsible ? (
          <button
            type="button"
            class="swp-collapse-btn"
            aria-expanded={!collapsed}
            onClick={toggle}
          >
            <h2>{heading}</h2>
            <span class="swp-collapse-icon" aria-hidden="true">▶</span>
          </button>
        ) : (
          <h2>{heading}</h2>
        )}
      </div>
      {!collapsed && (
        <div class="swp-section-body">
          {description && <p class="swp-section-desc">{description}</p>}
          {children}
        </div>
      )}
    </section>
  );
};
```

#### 2.5 `<IconButton />` — Button with Icon

```tsx
// src/components/IconButton.tsx
import { FunctionComponent } from 'preact';

interface IconButtonProps {
  label: string;
  icon?: string;          // SVG string
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick: () => void;
}

export const IconButton: FunctionComponent<IconButtonProps> = ({
  label,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
}) => (
  <button
    type="button"
    class={`swp-btn swp-btn-${variant} ${fullWidth ? 'swp-btn-full' : ''}`}
    disabled={disabled || loading}
    onClick={onClick}
  >
    {loading ? (
      <span class="swp-spinner" />
    ) : (
      icon && <span class="swp-btn-icon" dangerouslySetInnerHTML={{ __html: icon }} />
    )}
    {loading ? 'Loading...' : label}
  </button>
);
```

---

### Phase 3: Popup Migration

Rewrite the popup using Preact functional components and hooks.

#### 3.1 Minimal HTML Shell

Replace the 430-line `popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Steam Wishlist Plus</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="app"></div>
  <script src="../dist/types.js"></script>
  <script src="../dist/popup.js"></script>
</body>
</html>
```

**~430 lines → ~14 lines.** The `popup.css` file contains extracted theme variables + popup-specific styles.

#### 3.2 Popup Component

```tsx
// src/popup.tsx
import { render } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { Toggle } from './components/Toggle';
import { StatBox } from './components/StatBox';
import { StatusMessage } from './components/StatusMessage';
import { IconButton } from './components/IconButton';
import type { UserSettings } from './types';

const { DEFAULT_USER_SETTINGS } = globalThis.SWP_UserSettings;
const LOG_PREFIX = '[SWP Popup]';
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function formatAge(ms: number): string {
  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return '<1h';
}

const PLATFORM_TOGGLES = [
  { key: 'showNintendo', label: 'Switch' },
  { key: 'showPlaystation', label: 'PlayStation' },
  { key: 'showXbox', label: 'Xbox' },
] as const;

const INFO_TOGGLES = [
  { key: 'showSteamDeck', label: 'Steam Deck' },
  { key: 'showHltb', label: 'Play Time' },
  { key: 'showReviewScores', label: 'Reviews' },
] as const;

function SwpPopup() {
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_USER_SETTINGS });
  const [cacheCount, setCacheCount] = useState('-');
  const [cacheAge, setCacheAge] = useState('-');
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({
    message: '', type: ''
  });
  const [clearLoading, setClearLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load settings + cache stats on mount
  useEffect(() => {
    Promise.all([loadSettings(), loadCacheStats()]).then(() => setLoaded(true));
  }, []);

  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get('scpwSettings');
      setSettings(prev => ({ ...prev, ...result.scpwSettings }));
    } catch (err) {
      console.error(`${LOG_PREFIX} Error loading settings:`, err);
    }
  }

  async function loadCacheStats() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_CACHE_STATS' });
      if (resp?.success && resp.count !== undefined) {
        setCacheCount(resp.count.toString());
        setCacheAge(resp.oldestEntry ? formatAge(Date.now() - resp.oldestEntry) : '-');
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Error loading cache stats:`, err);
      setCacheCount('?');
      setCacheAge('?');
    }
  }

  const updateSetting = useCallback(async (key: keyof UserSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await chrome.storage.sync.set({ scpwSettings: updated });
      setStatus({ message: 'Settings saved', type: 'success' });
    } catch (err) {
      console.error(`${LOG_PREFIX} Error saving settings:`, err);
      setStatus({ message: 'Failed to save', type: 'error' });
    }
  }, [settings]);

  const clearCache = useCallback(async () => {
    if (!confirm('Clear all cached platform data?')) return;
    setClearLoading(true);
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' });
      if (resp?.success) {
        setStatus({ message: 'Cache cleared', type: 'success' });
        await loadCacheStats();
      } else {
        setStatus({ message: 'Failed to clear cache', type: 'error' });
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} Error clearing cache:`, err);
      setStatus({ message: 'Failed to clear cache', type: 'error' });
    } finally {
      setClearLoading(false);
    }
  }, []);

  if (!loaded) return null; // Prevent flash of unstyled content

  return (
    <div class="swp-popup">
      <div class="swp-header">
        <div class="swp-header-icon">
          <img src="../assets/icons/icon128.png" alt="" />
        </div>
        <h1>Steam Wishlist Plus</h1>
        <button class="swp-settings-btn" onClick={() => chrome.runtime.openOptionsPage()}>
          {/* gear SVG */}
        </button>
      </div>

      <div class="swp-stats">
        <StatBox value={cacheCount} label="Cached Games" variant="compact" />
        <StatBox value={cacheAge} label="Oldest Entry" variant="compact" />
      </div>

      <div class="swp-section-group">
        <div class="swp-section-title">Platforms</div>
        {PLATFORM_TOGGLES.map(({ key, label }) => (
          <Toggle
            key={key}
            variant="mini"
            label={label}
            checked={settings[key] as boolean}
            onChange={(val) => updateSetting(key, val)}
          />
        ))}
      </div>

      <div class="swp-section-group">
        <div class="swp-section-title">Game Info</div>
        {INFO_TOGGLES.map(({ key, label }) => (
          <Toggle
            key={key}
            variant="mini"
            label={label}
            checked={settings[key] as boolean}
            onChange={(val) => updateSetting(key, val)}
          />
        ))}
      </div>

      <IconButton
        variant="danger"
        label="Clear Cache"
        loading={clearLoading}
        fullWidth
        onClick={clearCache}
      />

      <StatusMessage
        message={status.message}
        type={status.type}
        onHide={() => setStatus({ message: '', type: '' })}
      />
    </div>
  );
}

// Mount
render(<SwpPopup />, document.getElementById('app')!);
```

#### 3.3 Key Behavior Preserved

| Behavior | Before (Vanilla) | After (Preact) |
|----------|-------------------|-----------------|
| Loading flash prevention | `body.is-loading` CSS class | `if (!loaded) return null` + `useEffect` |
| Settings persistence | `chrome.storage.sync` with manual DOM updates | `useState` + `chrome.storage.sync` (reactive) |
| Cache stats | `sendMessage` + `textContent = ...` | `useState` + automatic re-render |
| Toggle save | `addEventListener('change')` → `saveSettings()` | `onChange` prop → `updateSetting()` |
| Status auto-hide | `setTimeout` in `showStatus()` | `StatusMessage` component with `useEffect` timer |
| Reduced motion | CSS `@media (prefers-reduced-motion)` | Same — CSS unchanged |
| Accessibility | ARIA labels, `role="alert"` | Same — JSX outputs same attributes |

---

### Phase 4: Options Page Migration

Rewrite the options page using Preact components.

#### 4.1 Minimal HTML Shell

Replace the 866-line `options.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Steam Wishlist Plus - Options</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div id="app"></div>
  <script src="../dist/types.js"></script>
  <script src="../dist/options.js"></script>
</body>
</html>
```

**~866 lines → ~14 lines**

#### 4.2 Options Component

```tsx
// src/options.tsx
import { render } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { Toggle } from './components/Toggle';
import { StatBox } from './components/StatBox';
import { StatusMessage } from './components/StatusMessage';
import { Section } from './components/Section';
import { IconButton } from './components/IconButton';
import type { UserSettings } from './types';

const { DEFAULT_USER_SETTINGS } = globalThis.SWP_UserSettings;

// SVG icon strings for each toggle (extracted from current options.html)
import { NINTENDO_SVG, PLAYSTATION_SVG, XBOX_SVG, STEAMDECK_SVG, CLOCK_SVG, STAR_SVG,
         REFRESH_SVG, EXPORT_SVG, TRASH_SVG } from './components/icons';

function SwpOptions() {
  const [settings, setSettings] = useState<UserSettings>({ ...DEFAULT_USER_SETTINGS });
  const [cacheCount, setCacheCount] = useState('-');
  const [cacheAge, setCacheAge] = useState('-');
  const [cacheStatus, setCacheStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [settingsStatus, setSettingsStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [loaded, setLoaded] = useState(false);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  useEffect(() => {
    Promise.all([loadSettings(), loadCacheStats()]).then(() => setLoaded(true));
  }, []);

  // ... loadSettings, loadCacheStats, clearCache, exportCache (same logic as current options.ts)

  const updateSetting = useCallback(async (key: keyof UserSettings, value: unknown) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await chrome.storage.sync.set({ scpwSettings: updated });
      setSettingsStatus({ message: 'Settings saved', type: 'success' });
    } catch {
      setSettingsStatus({ message: 'Failed to save settings', type: 'error' });
    }
  }, [settings]);

  if (!loaded) return null;

  return (
    <div class="swp-container">
      <header class="swp-header">
        <div class="swp-header-icon">
          <img src="../assets/icons/icon128.png" alt="" />
        </div>
        <div class="swp-header-text">
          <h1>Steam Wishlist Plus</h1>
          <div class="swp-version">Version {chrome.runtime.getManifest().version}</div>
        </div>
      </header>

      <Section heading="Platforms" accentColor="var(--swp-accent)"
              description="Show game availability on other platforms">
        <div class="swp-toggle-list">
          <Toggle variant="full" label="Nintendo Switch" description="Show eShop availability"
            icon={NINTENDO_SVG} platform="nintendo"
            checked={settings.showNintendo}
            onChange={val => updateSetting('showNintendo', val)} />
          <Toggle variant="full" label="PlayStation" description="Show PS Store availability"
            icon={PLAYSTATION_SVG} platform="playstation"
            checked={settings.showPlaystation}
            onChange={val => updateSetting('showPlaystation', val)} />
          <Toggle variant="full" label="Xbox" description="Show Xbox Store / Game Pass"
            icon={XBOX_SVG} platform="xbox"
            checked={settings.showXbox}
            onChange={val => updateSetting('showXbox', val)} />
        </div>
      </Section>

      <Section heading="Game Info" accentColor="var(--swp-hltb)"
              description="Compatibility, playtime, and review information">
        <div class="swp-toggle-list">
          <Toggle variant="full" label="Steam Deck Compatibility"
            description="Show Verified / Playable status"
            icon={STEAMDECK_SVG} platform="steamdeck"
            checked={settings.showSteamDeck}
            onChange={val => updateSetting('showSteamDeck', val)} />
          <Toggle variant="full" label="How Long To Beat"
            description="Show completion time estimates"
            icon={CLOCK_SVG} platform="hltb"
            checked={settings.showHltb}
            onChange={val => updateSetting('showHltb', val)}
            selectOptions={[
              { value: 'mainStory', label: 'Main Story' },
              { value: 'mainExtra', label: 'Main + Extras' },
              { value: 'completionist', label: 'Completionist' },
            ]}
            selectValue={settings.hltbDisplayStat}
            onSelectChange={val => updateSetting('hltbDisplayStat', val)} />
          <Toggle variant="full" label="Review Scores"
            description="Show game ratings from critics"
            icon={STAR_SVG} platform="review-scores"
            checked={settings.showReviewScores}
            onChange={val => updateSetting('showReviewScores', val)}
            selectOptions={[
              { value: 'opencritic', label: 'OpenCritic' },
              { value: 'ign', label: 'IGN' },
              { value: 'gamespot', label: 'GameSpot' },
            ]}
            selectValue={settings.reviewScoreSource}
            onSelectChange={val => updateSetting('reviewScoreSource', val)} />
        </div>
        <StatusMessage message={settingsStatus.message} type={settingsStatus.type}
          onHide={() => setSettingsStatus({ message: '', type: '' })} />
      </Section>

      <Section heading="Cache" accentColor="var(--swp-text-muted)">
        <div class="swp-stats-grid">
          <StatBox value={cacheCount} label="Games Cached" />
          <StatBox value={cacheAge} label="Oldest Entry" />
        </div>
        <div class="swp-button-row">
          <IconButton variant="secondary" label="Refresh" icon={REFRESH_SVG}
            loading={refreshLoading} onClick={refreshCacheStats} />
          <IconButton variant="secondary" label="Export" icon={EXPORT_SVG}
            loading={exportLoading} onClick={exportCache} />
        </div>
        <IconButton variant="danger" label="Clear Cache" icon={TRASH_SVG}
          fullWidth loading={clearLoading} onClick={clearCache} />
        <StatusMessage message={cacheStatus.message} type={cacheStatus.type}
          onHide={() => setCacheStatus({ message: '', type: '' })} />
      </Section>

      <Section heading="About" collapsible initialCollapsed
              accentColor="var(--swp-border-color)">
        <div class="swp-info-box">
          <strong>Your data stays local</strong>
          <ul>
            <li>Only connects to Steam, Wikidata, HLTB, and OpenCritic</li>
            <li>Wishlist data never leaves your browser</li>
            <li>All cache stored locally in Chrome</li>
            <li>Zero analytics or telemetry</li>
          </ul>
        </div>
        <div class="swp-divider" />
        <div class="swp-info-box">
          <strong>Powered by open data</strong>
          <p>
            Platform data from <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a>.{' '}
            Steam Deck status from Steam's official data.{' '}
            Playtime from <a href="https://howlongtobeat.com" target="_blank" rel="noopener">HowLongToBeat</a>.{' '}
            Review scores from <a href="https://opencritic.com" target="_blank" rel="noopener">OpenCritic</a>.
          </p>
        </div>
      </Section>
    </div>
  );
}

render(<SwpOptions />, document.getElementById('app')!);
```

#### 4.3 Inline Select Behavior

The `<Toggle>` component handles the HLTB and Review Scores inline selects natively:

- When `checked` is `false`, the `<select>` is not rendered (conditional JSX)
- When `checked` is `true`, the `<select>` appears in the grid
- `onSelectChange` fires immediately, calling `updateSetting` which triggers re-render

This replaces the manual `updateSelectVisibilities()` and `updateToggleActiveStates()` functions from the current `options.ts`. Preact's reactive rendering eliminates this bookkeeping entirely.

#### 4.4 Responsive Layout

The responsive breakpoint (`@media (max-width: 480px)`) moves to `options.css`. The same CSS grid adjustments work — Preact outputs the same DOM structure, just generated by JSX instead of static HTML.

---

### Phase 5: Testing

#### 5.1 Test Setup

```bash
npm install -D @testing-library/preact @testing-library/jest-dom
```

**Preact Testing Library** works with the existing Jest + jsdom setup. No test runner change needed.

Key dependencies:
- `@testing-library/preact` — `render()`, `fireEvent`, `screen`, `waitFor`
- `@testing-library/jest-dom` — `toBeInTheDocument()`, `toHaveTextContent()`, etc.

#### 5.2 Component Tests

```
tests/unit/
├── components/
│   ├── Toggle.test.tsx
│   ├── StatBox.test.tsx
│   ├── StatusMessage.test.tsx
│   ├── Section.test.tsx
│   └── IconButton.test.tsx
├── popup.test.tsx          (rewritten for Preact)
└── options.test.tsx        (rewritten for Preact)
```

**Example test:**
```tsx
// tests/unit/components/Toggle.test.tsx
import { render, fireEvent, screen } from '@testing-library/preact';
import { Toggle } from '../../src/components/Toggle';

describe('Toggle', () => {
  it('renders label text', () => {
    render(<Toggle label="Nintendo" checked={false} onChange={() => {}} />);
    expect(screen.getByText('Nintendo')).toBeInTheDocument();
  });

  it('calls onChange when clicked', () => {
    const onChange = jest.fn();
    render(<Toggle label="Test" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('shows select when checked and selectOptions provided', () => {
    const { container } = render(
      <Toggle label="HLTB" checked={true} onChange={() => {}}
        selectOptions={[{ value: 'main', label: 'Main Story' }]}
        selectValue="main" onSelectChange={() => {}} />
    );
    expect(container.querySelector('select')).toBeTruthy();
  });

  it('hides select when unchecked', () => {
    const { container } = render(
      <Toggle label="HLTB" checked={false} onChange={() => {}}
        selectOptions={[{ value: 'main', label: 'Main Story' }]}
        selectValue="main" onSelectChange={() => {}} />
    );
    expect(container.querySelector('select')).toBeFalsy();
  });
});
```

#### 5.3 Jest Config for TSX

Add to `jest.config.js`:
```js
transform: {
  '^.+\\.tsx?$': ['ts-jest', {
    tsconfig: 'tsconfig.json',
    // Enable JSX transformation in tests
  }]
},
moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
```

#### 5.4 Coverage

Existing thresholds remain unchanged. New component files are added to per-file thresholds.

---

### Phase 6: Content Script (No Change)

The content script (`content.ts`) is **explicitly out of scope**. Rationale:

1. **Injected into Steam's pages** — Shipping Preact's 3KB runtime to every Steam wishlist page adds weight for no benefit
2. **Virtual DOM overhead** — The content script creates/updates icons infrequently. VDOM diffing is wasted overhead for one-shot DOM creation
3. **Simple patterns** — `createElement`/`appendChild`/`setAttribute` is sufficient for icons and badges
4. **No component reuse** — Content script elements are one-off, Steam-specific DOM structures
5. **VDOM can't help with `MutationObserver`** — The content script's scroll-based processing is inherently imperative

If content script templating becomes painful in the future, consider using `htm` (a 700-byte tagged template to VDOM bridge) as a lighter alternative.

---

## Migration Checklist

### Phase 1: Setup
- [ ] Install `preact` as production dependency
- [ ] Install `@testing-library/preact` and `@testing-library/jest-dom` as dev dependencies
- [ ] Update `tsconfig.json` with `jsx: "react-jsx"` and `jsxImportSource: "preact"`
- [ ] Create `src/components/` directory
- [ ] Create `src/components/theme.css` with shared CSS variables
- [ ] Update `scripts/build.js`: JSX config + bundle component imports
- [ ] Rename `popup.ts` → `popup.tsx`, `options.ts` → `options.tsx` in build list
- [ ] Verify `npm run build` succeeds
- [ ] Verify `npm run typecheck` succeeds
- [ ] Verify existing tests still pass

### Phase 2: Shared Components
- [ ] Implement `<Toggle />` (mini + full variants, inline select support)
- [ ] Implement `<StatBox />` (compact + full variants)
- [ ] Implement `<StatusMessage />` (auto-hide, success/error)
- [ ] Implement `<Section />` (collapsible, accent color, description)
- [ ] Implement `<IconButton />` (primary/secondary/danger, loading state)
- [ ] Extract SVG icons to `src/components/icons.ts`
- [ ] Write component CSS files
- [ ] Write unit tests for all shared components
- [ ] Verify all tests pass

### Phase 3: Popup Migration
- [ ] Create `src/popup.css` (extracted from inline styles)
- [ ] Rewrite `src/popup.html` as minimal shell (~14 lines)
- [ ] Rewrite `src/popup.ts` → `src/popup.tsx` as `<SwpPopup />` component
- [ ] Verify popup renders correctly in Chrome
- [ ] Verify settings load/save works
- [ ] Verify cache stats display
- [ ] Verify clear cache functionality
- [ ] Verify settings button opens options page
- [ ] Update `tests/unit/popup.test.ts` → `.test.tsx`
- [ ] Verify test coverage thresholds met

### Phase 4: Options Page Migration
- [ ] Create `src/options.css` (extracted from inline styles)
- [ ] Rewrite `src/options.html` as minimal shell (~14 lines)
- [ ] Rewrite `src/options.ts` → `src/options.tsx` as `<SwpOptions />` component
- [ ] Verify options page renders correctly
- [ ] Verify all toggles + inline selects work
- [ ] Verify collapsible About section works
- [ ] Verify cache operations (refresh, export, clear)
- [ ] Verify responsive layout at 480px breakpoint
- [ ] Update `tests/unit/options.test.ts` → `.test.tsx`
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
| VDOM performance in popup | Very Low | Low | Popup is tiny (~20 elements). VDOM overhead is negligible |
| esbuild JSX config issues | Low | Low | esbuild has mature JSX support. Well-documented `jsxImportSource` option |
| Style conflicts without Shadow DOM | Very Low | Low | Popup and options are separate HTML documents — no cross-page leakage |
| Chrome CSP blocks Preact | Very Low | High | Preact uses no `eval()`. JSX compiles to function calls. CSP-safe by design |
| Jest/jsdom TSX transform issues | Low | Medium | `ts-jest` handles TSX. `@testing-library/preact` is purpose-built for this |
| `dangerouslySetInnerHTML` for SVGs | Low | Low | SVGs are hardcoded constants, not user input. No XSS risk. Can sanitize if needed |
| Popup sizing changes | Low | Medium | Test in Chrome popup frame. Set explicit `width: 280px` in CSS |

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `src/components/theme.css` | Shared CSS custom properties |
| `src/components/Toggle.tsx` | Toggle switch component |
| `src/components/Toggle.css` | Toggle styles |
| `src/components/StatBox.tsx` | Stat display component |
| `src/components/StatusMessage.tsx` | Status message component |
| `src/components/Section.tsx` | Collapsible section component |
| `src/components/Section.css` | Section styles |
| `src/components/IconButton.tsx` | Icon button component |
| `src/components/IconButton.css` | Button styles |
| `src/components/icons.ts` | SVG strings for options page icons |
| `src/popup.css` | Popup page styles (extracted from inline) |
| `src/options.css` | Options page styles (extracted from inline) |
| `tests/unit/components/*.test.tsx` | Component tests |

### Modified Files
| File | Change |
|------|--------|
| `package.json` | Add `preact`, `@testing-library/preact`, `@testing-library/jest-dom` |
| `tsconfig.json` | Add `jsx: "react-jsx"`, `jsxImportSource: "preact"` |
| `scripts/build.js` | Add JSX config, allow bundling `./components/*` |
| `src/popup.html` | Reduce to ~14-line shell |
| `src/popup.ts` → `src/popup.tsx` | Rewrite as `<SwpPopup />` Preact component |
| `src/options.html` | Reduce to ~14-line shell |
| `src/options.ts` → `src/options.tsx` | Rewrite as `<SwpOptions />` Preact component |
| `tests/unit/popup.test.ts` → `.test.tsx` | Rewrite for Preact Testing Library |
| `tests/unit/options.test.ts` → `.test.tsx` | Rewrite for Preact Testing Library |
| `manifest.json` | Version bump to 0.8.0 |
| `CLAUDE.md` | Update directory structure, key files |
| `jest.config.js` | Add TSX support to transform (allowed modification) |

### Unchanged Files
| File | Reason |
|------|--------|
| `src/content.ts` | Stays vanilla — injected into Steam pages |
| `src/background.ts` | Service worker — no DOM |
| `src/styles.css` | Content script styles — unrelated to Preact |
| `src/types.ts` | Type definitions — no UI |
| `src/icons.ts` | Icon SVG strings — consumed as-is |
| `src/cache.ts`, `src/resolver.ts`, etc. | Backend logic — no UI |
| `src/steamDeckPageScript.ts`, `src/hltbPageScript.ts` | MAIN world scripts |

---

## Estimated Lines of Code

| Area | Before | After | Delta |
|------|--------|-------|-------|
| `popup.html` | 430 | ~14 | -416 |
| `popup.ts` → `popup.tsx` | 230 | ~150 | -80 |
| `options.html` | 866 | ~14 | -852 |
| `options.ts` → `options.tsx` | 403 | ~220 | -183 |
| Shared components (`.tsx`) | 0 | ~350 | +350 |
| Component CSS (`.css`) | 0 | ~250 | +250 |
| Page CSS (`.css`, extracted) | 0 | ~450 | +450 |
| Component tests (`.test.tsx`) | 0 | ~250 | +250 |
| **Total** | ~1,929 | ~1,698 | **-231** |

Net reduction of ~230 lines. The savings are smaller than Lit because CSS lives in separate files rather than being co-located in `static styles`. However, the TSX components themselves are significantly more concise thanks to JSX syntax and hooks eliminating manual DOM bookkeeping.

---

## Preact vs Lit — Side-by-Side Toggle Component

To help visualize the difference in developer experience:

### Preact (JSX + hooks)
```tsx
export function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label class={`swp-toggle ${checked ? '' : 'swp-dimmed'}`}>
      <span>{label}</span>
      <input type="checkbox" checked={checked}
        onChange={() => onChange(!checked)} />
    </label>
  );
}
```

### Lit (tagged templates + decorators)
```ts
@customElement('swp-toggle')
export class SwpToggle extends LitElement {
  @property() label = '';
  @property({ type: Boolean }) checked = false;

  render() {
    return html`
      <label class="swp-toggle ${this.checked ? '' : 'swp-dimmed'}">
        <span>${this.label}</span>
        <input type="checkbox" .checked=${this.checked}
          @change=${() => this.dispatchEvent(
            new CustomEvent('swp-toggle-change', { detail: { checked: !this.checked } })
          )} />
      </label>
    `;
  }
}
```

Preact is more concise (no boilerplate class, no `@property` declarations, no `CustomEvent` dispatch). Lit is more standards-aligned (native Custom Elements).
