/**
 * Sorting (SPEC §5): single and multi-column. Pure — returns a NEW array, never
 * mutates the input. JS sort is stable, so a single comparator that walks the rule
 * list in priority order yields correct multi-sort with stable ties.
 */

import type { ColumnType, SortRule } from '../types';

export type TypeLookup = (columnKey: string) => ColumnType | undefined;

/** Per-column sort configuration. */
export interface ColumnSort<T> {
  type?: ColumnType;
  /** sort by a derived value instead of row[key] */
  accessor?: (row: T) => unknown;
  /** full custom comparator (ascending); overrides type/accessor */
  comparator?: (a: T, b: T) => number;
}

export type SortLookup<T> = (columnKey: string) => ColumnSort<T> | undefined;

function toComparable(value: unknown, type: ColumnType | undefined): number | string {
  if (value === null || value === undefined)
    return type === 'number' ? Number.NEGATIVE_INFINITY : '';
  if (type === 'number') {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(n) ? Number.NEGATIVE_INFINITY : n;
  }
  if (type === 'date') {
    const t = value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
    return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
  }
  if (type === 'boolean') return value ? 1 : 0;
  return String(value).toLocaleLowerCase();
}

function compare(a: unknown, b: unknown, type: ColumnType | undefined): number {
  const ca = toComparable(a, type);
  const cb = toComparable(b, type);
  if (typeof ca === 'number' && typeof cb === 'number') return ca - cb;
  return String(ca).localeCompare(String(cb));
}

/**
 * Sort by the active rules. `getSort` supplies each column's sort behavior:
 *   - comparator: full custom (ascending) comparator over rows
 *   - accessor:   sort by a derived value instead of row[key]
 *   - type:       typed comparison (number/date/boolean/text)
 */
export function sortRows<T>(data: T[], rules: SortRule[], getSort: SortLookup<T>): T[] {
  if (rules.length === 0) return data;

  return [...data].sort((ra, rb) => {
    for (const rule of rules) {
      const cfg = getSort(rule.columnKey);
      let diff: number;
      if (cfg?.comparator) {
        diff = cfg.comparator(ra, rb);
      } else {
        const key = rule.columnKey as keyof T & string;
        const av = cfg?.accessor ? cfg.accessor(ra) : ra[key];
        const bv = cfg?.accessor ? cfg.accessor(rb) : rb[key];
        diff = compare(av, bv, cfg?.type);
      }
      if (diff !== 0) return rule.direction === 'asc' ? diff : -diff;
    }
    return 0;
  });
}

/**
 * Cycle a column's sort for click-to-sort headers: none → asc → desc → none.
 * `multi` keeps existing rules (appending/updating this column); otherwise this
 * column becomes the sole sort.
 */
export function toggleSort(rules: SortRule[], columnKey: string, multi = false): SortRule[] {
  const existing = rules.find((r) => r.columnKey === columnKey);
  const others = multi ? rules.filter((r) => r.columnKey !== columnKey) : [];

  if (!existing) return [...others, { columnKey, direction: 'asc' }];
  if (existing.direction === 'asc') return [...others, { columnKey, direction: 'desc' }];
  return others; // was desc → remove
}
