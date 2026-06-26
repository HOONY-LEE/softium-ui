import type { ReactNode } from 'react';
import { cx } from '../util/cx';

export interface SidebarProps {
  children: ReactNode;
  className?: string;
}

/** Sidebar — vertical container: brand on top, grouped nav below. */
export function Sidebar({ children, className }: SidebarProps) {
  return <nav className={cx('sft-sidebar', className)}>{children}</nav>;
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
  children: ReactNode;
}

export function SidebarSection({ label, children }: SidebarSectionProps) {
  return (
    <div className="sft-sidebar__section">
      {label && <div className="sft-sidebar__section-label">{label}</div>}
      <div className="sft-sidebar__items">{children}</div>
    </div>
  );
}

export interface SidebarItemProps {
  active?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}

export function SidebarItem({ active, icon, onClick, children }: SidebarItemProps) {
  return (
    <button
      type="button"
      className={cx('sft-sidebar__item', active && 'sft-sidebar__item--active')}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {icon && <span className="sft-sidebar__item-icon">{icon}</span>}
      <span className="sft-sidebar__item-label">{children}</span>
    </button>
  );
}
