import { useCallback, useEffect, useState } from 'react';
import { type PageKey, nav } from './nav';

const ALL_KEYS = new Set<PageKey>(nav.flatMap((group) => group.items.map((item) => item.key)));

/** `overview` lives at `/`; every other page is `/<key>`. */
export function pathForPage(key: PageKey): string {
  return key === 'overview' ? '/' : `/${key}`;
}

export function pageForPath(pathname: string): PageKey {
  const slug = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!slug) return 'overview';
  return ALL_KEYS.has(slug as PageKey) ? (slug as PageKey) : 'overview';
}

/**
 * Minimal client-side router: syncs the active page with `window.location`
 * via the History API — no router dependency. Supports direct links, refresh,
 * and browser back/forward (Vite's dev/preview servers fall back to
 * index.html for unknown paths, so deep links work out of the box).
 */
export function usePageRouter(): readonly [PageKey, (key: PageKey) => void] {
  const [page, setPage] = useState<PageKey>(() => pageForPath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setPage(pageForPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((key: PageKey) => {
    const path = pathForPage(key);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setPage(key);
  }, []);

  return [page, navigate] as const;
}
