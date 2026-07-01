import type { ReactNode } from 'react';
import { cx } from '../util/cx';

export interface HeaderProps {
  /** far-left slot shown only on mobile (a hamburger that opens the drawer) */
  menuButton?: ReactNode;
  /** left side — brand / breadcrumb. Ignored if `children` is provided. */
  logo?: ReactNode;
  /** left side — plain title. Ignored if `logo` or `children` is provided. */
  title?: ReactNode;
  /** left side override (takes precedence over `logo` / `title`) */
  children?: ReactNode;
  /** center nav slot */
  nav?: ReactNode;
  /** right side — actions (search, theme toggle, links, …) */
  actions?: ReactNode;
  className?: string;
}

/**
 * Header — the top bar. A mobile menu button, then a brand/breadcrumb on the left,
 * an optional center nav, and an actions cluster pushed to the right. Ported from
 * akron-ui's Header.
 */
export function Header({
  menuButton,
  logo,
  title,
  children,
  nav,
  actions,
  className,
}: HeaderProps) {
  const left =
    children ?? logo ?? (title != null ? <h1 className="sft-header__title">{title}</h1> : null);

  return (
    <header className={cx('sft-header', className)}>
      {menuButton && <div className="sft-header__menu">{menuButton}</div>}
      {left && <div className="sft-header__left">{left}</div>}
      {nav && <nav className="sft-header__nav">{nav}</nav>}
      {actions && <div className="sft-header__actions">{actions}</div>}
    </header>
  );
}
