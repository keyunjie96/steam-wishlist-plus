import { h, useCallback, type FunctionComponent } from '../preact';

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
  onSelectChange
}) => {
  const handleToggle = useCallback((event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    onChange(target.checked);
  }, [onChange]);

  const handleSelect = useCallback((event: Event) => {
    const target = event.currentTarget as HTMLSelectElement;
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

  const hasSelect = Boolean(selectOptions?.length);
  const classes = [
    'swp-toggle-item',
    checked ? 'swp-active' : '',
    hasSelect ? 'swp-has-select' : '',
    !checked && hasSelect ? 'swp-select-hidden' : ''
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
          {selectOptions?.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
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
