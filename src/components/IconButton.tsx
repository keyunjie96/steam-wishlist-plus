import { FunctionComponent } from 'preact';

interface IconButtonProps {
  label: string;
  icon?: string;
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
