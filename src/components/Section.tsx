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
            <span class="swp-collapse-icon" aria-hidden="true">&#9654;</span>
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
