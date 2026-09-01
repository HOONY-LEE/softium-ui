import { describe, expect, it } from 'vitest';
import type { ColumnType, Filter, SortRule } from '../types';
import { applyFilters, defaultFilterVariant, getDistinctValues, matchesFilter } from './filter';
import { applySearch } from './search';
import { sortRows, toggleSort } from './sort';

interface Emp {
  name: string;
  dept: string;
  salary: number;
  hiredAt: string;
}

const data: Emp[] = [
  { name: '김민준', dept: '영업', salary: 5000, hiredAt: '2015-03-01' },
  { name: '이서연', dept: '인사', salary: 4200, hiredAt: '2019-07-15' },
  { name: '박도윤', dept: '영업', salary: 4200, hiredAt: '2012-01-20' },
  { name: '최하은', dept: '재무', salary: 6100, hiredAt: '2020-11-30' },
];

const types: Record<string, ColumnType> = {
  name: 'text',
  dept: 'text',
  salary: 'number',
  hiredAt: 'date',
};
const getType = (k: string) => types[k];
const getSort = (k: string) => ({ type: types[k] });

describe('sortRows', () => {
  it('sorts numbers ascending/descending without mutating input', () => {
    const rules: SortRule[] = [{ columnKey: 'salary', direction: 'asc' }];
    const sorted = sortRows(data, rules, getSort);
    expect(sorted.map((r) => r.salary)).toEqual([4200, 4200, 5000, 6100]);
    expect(sorted).not.toBe(data);
    expect(data[0]?.salary).toBe(5000); // untouched
  });

  it('multi-sorts: salary asc, then name asc as tiebreaker', () => {
    const rules: SortRule[] = [
      { columnKey: 'salary', direction: 'asc' },
      { columnKey: 'name', direction: 'asc' },
    ];
    const sorted = sortRows(data, rules, getSort);
    // the two 4200s ordered by name: 박도윤 < 이서연
    expect(sorted.map((r) => r.name)).toEqual(['박도윤', '이서연', '김민준', '최하은']);
  });

  it('sorts dates chronologically', () => {
    const sorted = sortRows(data, [{ columnKey: 'hiredAt', direction: 'asc' }], getSort);
    expect(sorted.map((r) => r.hiredAt)).toEqual([
      '2012-01-20',
      '2015-03-01',
      '2019-07-15',
      '2020-11-30',
    ]);
  });

  it('uses a per-column sortAccessor (e.g. enum rank, not alphabetical)', () => {
    const rank: Record<string, number> = { 사원: 0, 대리: 1, 부장: 2 };
    const rows = [{ pos: '부장' }, { pos: '사원' }, { pos: '대리' }];
    const sorted = sortRows(rows, [{ columnKey: 'pos', direction: 'asc' }], () => ({
      accessor: (r) => rank[r.pos] ?? 99,
    }));
    expect(sorted.map((r) => r.pos)).toEqual(['사원', '대리', '부장']);
  });

  it('uses a per-column custom comparator (overrides type/accessor)', () => {
    const rows = [{ v: 'bb' }, { v: 'a' }, { v: 'ccc' }];
    // sort by string length
    const sorted = sortRows(rows, [{ columnKey: 'v', direction: 'asc' }], () => ({
      comparator: (a, b) => a.v.length - b.v.length,
    }));
    expect(sorted.map((r) => r.v)).toEqual(['a', 'bb', 'ccc']);
  });
});

describe('toggleSort', () => {
  it('cycles none → asc → desc → none for single sort', () => {
    let rules: SortRule[] = [];
    rules = toggleSort(rules, 'salary');
    expect(rules).toEqual([{ columnKey: 'salary', direction: 'asc' }]);
    rules = toggleSort(rules, 'salary');
    expect(rules).toEqual([{ columnKey: 'salary', direction: 'desc' }]);
    rules = toggleSort(rules, 'salary');
    expect(rules).toEqual([]);
  });

  it('replaces sort in single mode but accumulates in multi mode', () => {
    const single = toggleSort([{ columnKey: 'salary', direction: 'asc' }], 'name');
    expect(single).toEqual([{ columnKey: 'name', direction: 'asc' }]);

    const multi = toggleSort([{ columnKey: 'salary', direction: 'asc' }], 'name', true);
    expect(multi).toEqual([
      { columnKey: 'salary', direction: 'asc' },
      { columnKey: 'name', direction: 'asc' },
    ]);
  });
});

describe('matchesFilter / applyFilters', () => {
  it('handles each operator', () => {
    expect(
      matchesFilter(5000, { columnKey: 'salary', operator: 'eq', value: 5000 }, 'number'),
    ).toBe(true);
    expect(
      matchesFilter(5000, { columnKey: 'salary', operator: 'gt', value: 4999 }, 'number'),
    ).toBe(true);
    expect(
      matchesFilter(5000, { columnKey: 'salary', operator: 'lte', value: 5000 }, 'number'),
    ).toBe(true);
    expect(
      matchesFilter('영업팀', { columnKey: 'dept', operator: 'contains', value: '영업' }, 'text'),
    ).toBe(true);
    expect(
      matchesFilter(
        4500,
        { columnKey: 'salary', operator: 'between', value: 4000, value2: 5000 },
        'number',
      ),
    ).toBe(true);
    expect(
      matchesFilter('영업', { columnKey: 'dept', operator: 'in', value: ['영업', '인사'] }, 'text'),
    ).toBe(true);
  });

  it('applies AND semantics across filters without mutating input', () => {
    const filters: Filter[] = [
      { columnKey: 'dept', operator: 'eq', value: '영업' },
      { columnKey: 'salary', operator: 'gte', value: 4500 },
    ];
    const out = applyFilters(data, filters, getType);
    expect(out.map((r) => r.name)).toEqual(['김민준']);
    expect(data.length).toBe(4);
  });

  it('returns input untouched when no filters', () => {
    expect(applyFilters(data, [], getType)).toBe(data);
  });

  it('matches the text sub-string operators', () => {
    const f = (operator: 'startsWith' | 'endsWith', value: string) =>
      matchesFilter('영업팀', { columnKey: 'dept', operator, value }, 'text');
    expect(f('startsWith', '영업')).toBe(true);
    expect(f('startsWith', '팀')).toBe(false);
    expect(f('endsWith', '팀')).toBe(true);
    expect(f('endsWith', '영업')).toBe(false);
  });

  it('treats null / empty / whitespace as blank', () => {
    const blank = (v: unknown) =>
      matchesFilter(v, { columnKey: 'dept', operator: 'blank', value: null }, 'text');
    expect(blank(null)).toBe(true);
    expect(blank(undefined)).toBe(true);
    expect(blank('')).toBe(true);
    expect(blank('  ')).toBe(true);
    expect(blank('영업')).toBe(false);
    expect(
      matchesFilter('영업', { columnKey: 'dept', operator: 'notBlank', value: null }, 'text'),
    ).toBe(true);
  });

  // regression: comparisons used to coerce with Number(), so an ISO date string
  // became NaN and every date range silently matched nothing
  it('compares ISO date strings by calendar day', () => {
    const range = (v: string) =>
      matchesFilter(
        v,
        { columnKey: 'hiredAt', operator: 'between', value: '2024-03-01', value2: '2024-03-31' },
        'date',
      );
    expect(range('2024-03-15')).toBe(true);
    expect(range('2024-03-01')).toBe(true); // lower bound inclusive
    expect(range('2024-03-31')).toBe(true); // upper bound inclusive
    expect(range('2024-02-29')).toBe(false);
    expect(range('2024-04-01')).toBe(false);
    expect(range('not-a-date')).toBe(false);
  });

  it('compares dates independent of the value representation', () => {
    const gte = (v: unknown) =>
      matchesFilter(v, { columnKey: 'hiredAt', operator: 'gte', value: '2024-03-15' }, 'date');
    // a Date object and its ISO string must agree, with no timezone drift
    expect(gte(new Date(2024, 2, 15))).toBe(true);
    expect(gte('2024-03-15')).toBe(true);
    expect(gte(new Date(2024, 2, 14))).toBe(false);
    expect(
      matchesFilter(
        '2024-03-15',
        { columnKey: 'hiredAt', operator: 'eq', value: '2024-03-15' },
        'date',
      ),
    ).toBe(true);
  });
});

describe('getDistinctValues', () => {
  it('collects sorted, de-duplicated, non-empty values', () => {
    expect(getDistinctValues(data, 'dept')).toEqual(['영업', '인사', '재무']);
  });

  it('skips null / undefined / empty and honours the cap', () => {
    const rows = [{ v: 'a' }, { v: null }, { v: undefined }, { v: '' }, { v: 'b' }, { v: 'a' }];
    expect(getDistinctValues(rows, 'v')).toEqual(['a', 'b']);
    expect(getDistinctValues(rows, 'v', 1)).toEqual(['a']);
  });
});

describe('defaultFilterVariant', () => {
  it('maps column types to their editor', () => {
    expect(defaultFilterVariant('select')).toBe('set');
    expect(defaultFilterVariant('date')).toBe('date');
    expect(defaultFilterVariant('number')).toBe('number');
    expect(defaultFilterVariant('boolean')).toBe('boolean');
    expect(defaultFilterVariant('text')).toBe('text');
    expect(defaultFilterVariant(undefined)).toBe('text');
  });
});

describe('applySearch', () => {
  const keys = ['name', 'dept', 'salary', 'hiredAt'];

  it('matches across all columns, case-insensitively', () => {
    const out = applySearch(data, { query: '영업', scope: 'all' }, keys);
    expect(out.map((r) => r.name)).toEqual(['김민준', '박도윤']);
  });

  it('respects a column scope', () => {
    const out = applySearch(data, { query: '김', scope: ['dept'] }, keys);
    expect(out).toEqual([]); // 김 is in name, not dept
  });

  it('returns input untouched for an empty query', () => {
    expect(applySearch(data, { query: '   ', scope: 'all' }, keys)).toBe(data);
  });

  it('is independent from filters (separate state)', () => {
    const searched = applySearch(data, { query: '재무', scope: 'all' }, keys);
    expect(searched.map((r) => r.name)).toEqual(['최하은']);
  });
});
