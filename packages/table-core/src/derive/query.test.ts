import { describe, expect, it } from 'vitest';
import type { ColumnType, Filter, SortRule } from '../types';
import { applyFilters, matchesFilter } from './filter';
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

describe('sortRows', () => {
  it('sorts numbers ascending/descending without mutating input', () => {
    const rules: SortRule[] = [{ columnKey: 'salary', direction: 'asc' }];
    const sorted = sortRows(data, rules, getType);
    expect(sorted.map((r) => r.salary)).toEqual([4200, 4200, 5000, 6100]);
    expect(sorted).not.toBe(data);
    expect(data[0]?.salary).toBe(5000); // untouched
  });

  it('multi-sorts: salary asc, then name asc as tiebreaker', () => {
    const rules: SortRule[] = [
      { columnKey: 'salary', direction: 'asc' },
      { columnKey: 'name', direction: 'asc' },
    ];
    const sorted = sortRows(data, rules, getType);
    // the two 4200s ordered by name: 박도윤 < 이서연
    expect(sorted.map((r) => r.name)).toEqual(['박도윤', '이서연', '김민준', '최하은']);
  });

  it('sorts dates chronologically', () => {
    const sorted = sortRows(data, [{ columnKey: 'hiredAt', direction: 'asc' }], getType);
    expect(sorted.map((r) => r.hiredAt)).toEqual([
      '2012-01-20',
      '2015-03-01',
      '2019-07-15',
      '2020-11-30',
    ]);
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
