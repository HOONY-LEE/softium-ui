import { useCallback, useEffect, useState } from 'react';
import { type PageKey, nav } from './nav';

const ALL_KEYS = new Set<PageKey>(nav.flatMap((group) => group.items.map((item) => item.key)));

/** deploy base without the trailing slash — '' locally, '/softium-ui' on GitHub
 * Pages (Vite sets BASE_URL from the build's --base). Making the router
 * base-aware is what lets it live under a Pages sub-path instead of the root. */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** `overview` lives at the base root; every other page is `<base>/<key>`. */
export function pathForPage(key: PageKey): string {
  return key === 'overview' ? `${BASE}/` : `${BASE}/${key}`;
}

export function pageForPath(pathname: string): PageKey {
  let path = pathname;
  if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
  const slug = path.replace(/^\/+/, '').replace(/\/+$/, '');
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
