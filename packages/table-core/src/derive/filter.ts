/**
 * Column filters (SPEC §3, §5): structured per-column data queries. Distinct from
 * global search (which is free-text UX). Pure — returns a NEW filtered array.
 */

import type { ColumnType, Filter, FilterVariant } from '../types';

function num(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  const n = Number(value);
  return Number.isNaN(n) ? Number.NaN : n;
}

/**
 * Day-granular epoch used for `date` comparisons, so a date column compares by
 * calendar day rather than by instant. An ISO-ish `YYYY-MM-DD…` string uses its
 * literal date part (never shifted by the runtime's timezone, which is what makes
 * `Date.parse('2024-03-15')` — UTC midnight — disagree with a local-time value);
 * a Date object uses its local calendar day. Unparseable input yields NaN, and
 * every comparison against NaN is false, so such rows drop out of a range filter.
 */
function dayNum(value: unknown): number {
  if (value instanceof Date)
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (iso) {
    const [, y, m, d] = iso;
    return Date.UTC(Number(y), Number(m) - 1, Number(d));
  }
  const t = Date.parse(String(value));
  if (Number.isNaN(t)) return Number.NaN;
  const local = new Date(t);
  return Date.UTC(local.getFullYear(), local.getMonth(), local.getDate());
}

/** Type-aware ordering key: dates compare by day, everything else numerically. */
function ord(value: unknown, type: ColumnType | undefined): number {
  return type === 'date' ? dayNum(value) : num(value);
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).toLocaleLowerCase();
}

export function matchesFilter(value: unknown, filter: Filter, type?: ColumnType): boolean {
  const { operator, value: target, value2 } = filter;

  switch (operator) {
    case 'eq':
      return type === 'number' || type === 'date'
        ? ord(value, type) === ord(target, type)
        : text(value) === text(target);
    case 'neq':
      return type === 'number' || type === 'date'
        ? ord(value, type) !== ord(target, type)
        : text(value) !== text(target);
    case 'gt':
      return ord(value, type) > ord(target, type);
    case 'lt':
      return ord(value, type) < ord(target, type);
    case 'gte':
      return ord(value, type) >= ord(target, type);
    case 'lte':
      return ord(value, type) <= ord(target, type);
    case 'contains':
      return text(value).includes(text(target));
    case 'startsWith':
      return text(value).startsWith(text(target));
    case 'endsWith':
      return text(value).endsWith(text(target));
    case 'between': {
      const v = ord(value, type);
      return v >= ord(target, type) && v <= ord(value2, type);
    }
    case 'in':
      return Array.isArray(target) && target.some((t) => text(value) === text(t));
    case 'blank':
      return text(value).trim() === '';
    case 'notBlank':
      return text(value).trim() !== '';
    default:
      return true;
  }
}

export type TypeLookup = (columnKey: string) => ColumnType | undefined;

/** Apply all filters with AND semantics. An empty filter list returns the input as-is. */
export function applyFilters<T>(data: T[], filters: Filter[], getType: TypeLookup): T[] {
  if (filters.length === 0) return data;
  return data.filter((row) =>
    filters.every((f) => matchesFilter(row[f.columnKey as keyof T], f, getType(f.columnKey))),
  );
}

/** The filter editor a column gets when it doesn't declare `filterVariant`. */
export function defaultFilterVariant(type: ColumnType | undefined): FilterVariant {
  switch (type) {
    case 'select':
      return 'set';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
      return 'boolean';
    default:
      return 'text';
  }
}

/**
 * Distinct non-empty values of one column, sorted for stable display — the choice
 * list behind a `set` filter. Scanned from the FULL dataset (not the filtered view)
 * so options never disappear as the user narrows the selection. `limit` caps the
 * result to keep an accidental high-cardinality column from building a huge list.
 */
export function getDistinctValues<T>(data: T[], columnKey: string, limit = 500): string[] {
  const seen = new Set<string>();
  for (const row of data) {
    const raw = row[columnKey as keyof T];
    if (raw === null || raw === undefined) continue;
    const s = String(raw);
    if (s === '') continue;
    seen.add(s);
    if (seen.size >= limit) break;
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}
