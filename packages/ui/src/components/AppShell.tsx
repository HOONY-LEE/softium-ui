import type { CSSProperties, ReactNode } from 'react';
import { cx } from '../util/cx';

export interface AppShellProps {
  /** left sidebar content (usually <Sidebar>) */
  sidebar: ReactNode;
  /** top bar content (usually <Header>) */
  header?: ReactNode;
  /** main content area */
  children: ReactNode;
  /** collapse the sidebar to an icon-only rail (controlled) */
  collapsed?: boolean;
  /** expanded sidebar width in px. Default 248. */
  sidebarWidth?: number;
  /** on mobile: whether the sidebar drawer is open (controlled) */
  sidebarOpen?: boolean;
  /** on mobile: called when the backdrop is tapped to close the drawer */
  onSidebarClose?: () => void;
  className?: string;
}

/**
 * AppShell — the docs/admin layout: a fixed left sidebar + a scrolling body with a
 * sticky top header. Ported from the akron-ui shell:
 *   - desktop: sidebar can collapse to an icon-only rail (`collapsed`)
 *   - tablet:  sidebar auto-collapses to the rail
 *   - mobile:  sidebar becomes an off-canvas drawer (`sidebarOpen` + backdrop)
 */
export function AppShell({
  sidebar,
  header,
  children,
  collapsed,
  sidebarWidth = 248,
  sidebarOpen = false,
  onSidebarClose,
  className,
}: AppShellProps) {
  const vars = { '--sft-sidebar-width': `${sidebarWidth}px` } as CSSProperties;

  return (
    <div
      className={cx('sft-app sft-shell', className)}
      style={vars}
      data-collapsed={collapsed || undefined}
      data-drawer-open={sidebarOpen || undefined}
    >
      <aside className="sft-shell__sidebar">{sidebar}</aside>
      {sidebarOpen && onSidebarClose && (
        <div className="sft-shell__overlay" onClick={onSidebarClose} aria-hidden="true" />
      )}
      <div className="sft-shell__main">
        {header && <div className="sft-shell__header">{header}</div>}
        <main className="sft-shell__content">{children}</main>
      </div>
    </div>
  );
}
