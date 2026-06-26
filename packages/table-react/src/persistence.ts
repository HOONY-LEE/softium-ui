/**
 * columnState persistence (SPEC §6, §7).
 *
 * Lives in the React layer, not table-core — only this side is allowed to touch
 * `window`/`localStorage`. SSR-safe (no-ops when there is no window) and tolerant
 * of corrupt stored data (returns null rather than throwing).
 */

import type { ColumnState } from '@softium/table-core';

function isColumnStateArray(value: unknown): value is ColumnState[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        typeof v === 'object' &&
        v !== null &&
        typeof (v as { key?: unknown }).key === 'string' &&
        typeof (v as { visible?: unknown }).visible === 'boolean' &&
        typeof (v as { order?: unknown }).order === 'number',
    )
  );
}

export function loadColumnState(storageKey: string): ColumnState[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isColumnStateArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveColumnState(storageKey: string, state: ColumnState[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // quota / privacy mode — persistence is best-effort
  }
}

export function clearColumnState(storageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}
