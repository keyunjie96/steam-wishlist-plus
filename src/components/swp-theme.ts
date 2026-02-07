/**
 * Steam Wishlist Plus - Shared Theme
 *
 * CSS custom properties and base styles shared across all Lit components.
 * Properties defined on :host inherit through Shadow DOM boundaries.
 */

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

    --swp-card-bg: rgba(255, 255, 255, 0.04);
    --swp-card-border: rgba(255, 255, 255, 0.08);

    /* Accent colors */
    --swp-accent: #4aa3ff;
    --swp-accent-ring: rgba(74, 163, 255, 0.65);
    --swp-success: #5ba32b;
    --swp-danger: #c03030;

    /* Platform colors */
    --swp-nintendo: #e60012;
    --swp-playstation: #006fcd;
    --swp-xbox: #107c10;
    --swp-hltb: #4aa3ff;
    --swp-review-scores: #ffcc33;

    /* Steam Deck */
    --swp-sd-tile-base: #343a43;
    --swp-sd-arc: #ffffff;

    /* Gradients */
    --swp-gradient-button: linear-gradient(to right, #47bfff 0%, #1a9fff 100%);
    --swp-gradient-button-hover: linear-gradient(to right, #5bc7ff 0%, #47bfff 100%);

    font-family: "Motiva Sans", Arial, Helvetica, sans-serif;
    color: var(--swp-text-primary);
    line-height: 1.5;
  }
`;

/** Shared loading spinner keyframes */
export const spinKeyframes = css`
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

/** Shared reduced motion styles */
export const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
