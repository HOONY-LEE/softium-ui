import type { ReactNode } from 'react';
import { cx } from '../util/cx';

export interface HeaderProps {
  /** left side — title / breadcrumb. Ignored if `children` is provided. */
  title?: ReactNode;
  /** left side override (e.g. a breadcrumb component) */
  children?: ReactNode;
  /** right side — actions (theme toggle, links, etc.) */
  actions?: ReactNode;
  className?: string;
}

/**
 * Header — the top bar. Title/breadcrumb on the left, actions on the right
 * (the reference's top-right cluster: search, theme, links).
 */
export function Header({ title, children, actions, className }: HeaderProps) {
  return (
    <header className={cx('sft-header', className)}>
      <div className="sft-header__left">
        {children ?? <h1 className="sft-header__title">{title}</h1>}
      </div>
      {actions && <div className="sft-header__actions">{actions}</div>}
    </header>
  );
}
