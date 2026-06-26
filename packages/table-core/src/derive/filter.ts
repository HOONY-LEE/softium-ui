/**
 * Column filters (SPEC §3, §5): structured per-column data queries. Distinct from
 * global search (which is free-text UX). Pure — returns a NEW filtered array.
 */

import type { ColumnType, Filter } from '../types';

function num(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  const n = Number(value);
  return Number.isNaN(n) ? Number.NaN : n;
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).toLocaleLowerCase();
}

export function matchesFilter(value: unknown, filter: Filter, type?: ColumnType): boolean {
  const { operator, value: target, value2 } = filter;

  switch (operator) {
    case 'eq':
      return type === 'number' ? num(value) === num(target) : text(value) === text(target);
    case 'neq':
      return type === 'number' ? num(value) !== num(target) : text(value) !== text(target);
    case 'gt':
      return num(value) > num(target);
    case 'lt':
      return num(value) < num(target);
    case 'gte':
      return num(value) >= num(target);
    case 'lte':
      return num(value) <= num(target);
    case 'contains':
      return text(value).includes(text(target));
    case 'between': {
      const v = num(value);
      return v >= num(target) && v <= num(value2);
    }
    case 'in':
      return Array.isArray(target) && target.some((t) => text(value) === text(t));
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
