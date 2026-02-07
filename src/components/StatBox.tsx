import { h, type FunctionComponent } from '../preact';

interface StatBoxProps {
  value: string;
  label: string;
  variant?: 'compact' | 'full';
}

export const StatBox: FunctionComponent<StatBoxProps> = ({
  value,
  label,
  variant = 'full'
}) => (
  <div class={`swp-stat-box ${variant === 'compact' ? 'swp-stat-compact' : ''}`}>
    <div class="swp-stat-value">{value}</div>
    <div class="swp-stat-label">{label}</div>
  </div>
);
