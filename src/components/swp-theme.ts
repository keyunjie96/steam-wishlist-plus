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
