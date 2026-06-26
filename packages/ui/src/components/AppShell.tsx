import type { ReactNode } from 'react';
import { cx } from '../util/cx';

export interface AppShellProps {
  /** left sidebar content (usually <Sidebar>) */
  sidebar: ReactNode;
  /** top bar content (usually <Header>) */
  header: ReactNode;
  /** main content area */
  children: ReactNode;
  className?: string;
}

/**
 * AppShell — the docs/admin layout: fixed left sidebar, sticky top header, scrolling
 * content. The reference shape (left sidebar + top-right header) lives here so every
 * screen gets it for free.
 */
export function AppShell({ sidebar, header, children, className }: AppShellProps) {
  return (
    <div className={cx('sft-app sft-shell', className)}>
      <aside className="sft-shell__sidebar">{sidebar}</aside>
      <div className="sft-shell__main">
        <div className="sft-shell__header">{header}</div>
        <main className="sft-shell__content">{children}</main>
      </div>
    </div>
  );
}
