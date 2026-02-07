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
  variant?: 'mini' | 'full';
  icon?: string;
  description?: string;
  platform?: string;
  selectOptions?: SelectOption[];
  selectValue?: string;
  onSelectChange?: (value: string) => void;
}

/** Mini toggle variant used in the popup */
function MiniToggle({ label, checked, onChange }: Pick<ToggleProps, 'label' | 'checked' | 'onChange'>) {
  const handleToggle = useCallback(() => {
    onChange(!checked);
  }, [checked, onChange]);

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

/** Full toggle variant used in the options page */
function FullToggle({
  label, checked, onChange, icon, description, platform,
  selectOptions, selectValue, onSelectChange,
}: Omit<ToggleProps, 'variant'>) {
  const handleToggle = useCallback(() => {
    onChange(!checked);
  }, [checked, onChange]);

  const handleSelect = useCallback((e: Event) => {
    const target = e.target as HTMLSelectElement;
    onSelectChange?.(target.value);
  }, [onSelectChange]);

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
}

export const Toggle: FunctionComponent<ToggleProps> = ({
  variant = 'mini',
  ...props
}) => {
  if (variant === 'mini') return <MiniToggle {...props} />;
  return <FullToggle {...props} />;
};
