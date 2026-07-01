import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { type MouseEvent, type ReactNode, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../util/cx';

export interface SidebarProps {
  /** brand / logo shown in the sidebar's own header row */
  header?: ReactNode;
  /** pinned content at the very bottom (hidden while collapsed) */
  footer?: ReactNode;
  /** icon-only rail (controlled) */
  collapsed?: boolean;
  /** called by the built-in toggle to collapse (shown when expanded) */
  onCollapse?: () => void;
  /** called by the built-in toggle to expand (shown when collapsed) */
  onExpand?: () => void;
  /** grouped nav (usually <SidebarSection>) */
  children: ReactNode;
  className?: string;
}

/**
 * Sidebar — vertical nav container with an optional brand header, a built-in
 * collapse toggle (→ icon-only rail), scrollable grouped nav, and an optional
 * pinned footer. Ported from akron-ui's LayoutSidebar.
 */
export function Sidebar({
  header,
  footer,
  collapsed = false,
  onCollapse,
  onExpand,
  children,
  className,
}: SidebarProps) {
  const toggle = collapsed ? onExpand : onCollapse;
  const CollapseIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className={cx('sft-sidebar', collapsed && 'sft-sidebar--collapsed', className)}>
      {(header || toggle) && (
        <div className="sft-sidebar__header">
          {header && <div className="sft-sidebar__header-content">{header}</div>}
          {toggle && (
            <button
              type="button"
              className="sft-sidebar__collapse"
              onClick={toggle}
              aria-label={collapsed ? 'expand sidebar' : 'collapse sidebar'}
            >
              <CollapseIcon size={18} />
            </button>
          )}
        </div>
      )}
      <nav className="sft-sidebar__content">{children}</nav>
      {footer && <div className="sft-sidebar__footer">{footer}</div>}
    </div>
  );
}

export interface SidebarBrandProps {
  /** logo / mark slot */
  logo?: ReactNode;
  children: ReactNode;
  /** small text under the title (e.g. version) */
  subtitle?: ReactNode;
}

export function SidebarBrand({ logo, children, subtitle }: SidebarBrandProps) {
  return (
    <div className="sft-sidebar__brand">
      {logo && <span className="sft-sidebar__logo">{logo}</span>}
      <span className="sft-sidebar__brand-text">
        <span className="sft-sidebar__title">{children}</span>
        {subtitle && <span className="sft-sidebar__subtitle">{subtitle}</span>}
      </span>
    </div>
  );
}

export interface SidebarSectionProps {
  label?: ReactNode;
  /** make the group header a toggle that shows/hides its items */
  collapsible?: boolean;
  /** initial open state when collapsible. Default true. */
  defaultOpen?: boolean;
  children: ReactNode;
}

export function SidebarSection({
  label,
  collapsible = false,
  defaultOpen = true,
  children,
}: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hidden = collapsible && !open;

  return (
    <div className="sft-sidebar__section">
      {label &&
        (collapsible ? (
          <button
            type="button"
            className="sft-sidebar__section-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <span>{label}</span>
            <ChevronDown
              size={12}
              className={cx(
                'sft-sidebar__section-chevron',
                open && 'sft-sidebar__section-chevron--open',
              )}
            />
          </button>
        ) : (
          <div className="sft-sidebar__section-label">{label}</div>
        ))}
      {!hidden && <div className="sft-sidebar__items">{children}</div>}
    </div>
  );
}

export interface SidebarItemProps {
  active?: boolean;
  icon?: ReactNode;
  /** label shown as a floating tooltip while the sidebar is collapsed */
  tooltip?: string;
  onClick?: () => void;
  children: ReactNode;
}

export function SidebarItem({ active, icon, tooltip, onClick, children }: SidebarItemProps) {
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  const onEnter = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ top: r.top + r.height / 2, left: r.right + 8 });
  }, []);
  const onLeave = useCallback(() => setTip(null), []);

  return (
    <button
      type="button"
      className={cx('sft-sidebar__item', active && 'sft-sidebar__item--active')}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      onMouseEnter={tooltip ? onEnter : undefined}
      onMouseLeave={tooltip ? onLeave : undefined}
    >
      {icon && <span className="sft-sidebar__item-icon">{icon}</span>}
      <span className="sft-sidebar__item-label">{children}</span>
      {tooltip &&
        tip &&
        createPortal(
          <div className="sft-sidebar__tooltip" style={{ top: tip.top, left: tip.left }}>
            {tooltip}
          </div>,
          document.body,
        )}
    </button>
  );
}
