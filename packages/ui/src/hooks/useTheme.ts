import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'softium.theme';

function readStored(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export interface UseThemeOptions {
  /** theme to use when nothing is stored. Default 'light'. */
  defaultTheme?: Theme;
  /** persist the choice to localStorage. Default true. */
  persist?: boolean;
}

/**
 * useTheme — applies `data-theme` to <html> and (optionally) persists the choice.
 * The actual re-skin is pure CSS (token swap), so this hook only flips the attribute.
 */
export function useTheme({ defaultTheme = 'light', persist = true }: UseThemeOptions = {}) {
  const [theme, setThemeState] = useState<Theme>(() => readStored() ?? defaultTheme);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    if (persist && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // best-effort
      }
    }
  }, [theme, persist]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'light' ? 'dark' : 'light')),
    [],
  );

  return { theme, setTheme, toggleTheme };
}
