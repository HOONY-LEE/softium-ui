/**
 * Global search (SPEC §3): free-text UX matching, kept deliberately separate from
 * structured column filters. Case-insensitive substring match over the column scope.
 * Pure — returns a NEW array (or the input untouched when the query is empty).
 */

import type { SearchState } from '../types';

export function applySearch<T>(data: T[], search: SearchState, allKeys: string[]): T[] {
  const query = search.query.trim().toLocaleLowerCase();
  if (query.length === 0) return data;

  const keys = search.scope === 'all' ? allKeys : search.scope;

  return data.filter((row) =>
    keys.some((key) => {
      const value = row[key as keyof T];
      if (value === null || value === undefined) return false;
      return String(value).toLocaleLowerCase().includes(query);
    }),
  );
}
