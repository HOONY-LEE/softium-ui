import { describe, expect, it } from 'vitest';
import { adaptArray } from './adaptArray';
import { adaptDynamicSchema } from './adaptDynamicSchema';
import { adaptPaginated } from './adaptPaginated';

interface Employee {
  id: number;
  name: string;
}

describe('adaptArray', () => {
  it('returns a plain array unchanged', () => {
    const raw = [{ id: 1, name: 'A' }];
    expect(adaptArray<Employee>(raw)).toBe(raw);
  });

  it('throws on non-array input', () => {
    expect(() => adaptArray({})).toThrow(TypeError);
    expect(() => adaptArray(null)).toThrow(/null/);
  });
});

describe('adaptPaginated', () => {
  it('unwraps the default { data, total, page, pageSize }', () => {
    const raw = { data: [{ id: 1, name: 'A' }], total: 42, page: 2, pageSize: 20 };
    expect(adaptPaginated<Employee>(raw)).toEqual({
      data: raw.data,
      total: 42,
      page: 2,
      pageSize: 20,
    });
  });

  it('supports custom key names', () => {
    const raw = { rows: [{ id: 1, name: 'A' }], count: 1, pageNo: 3, size: 10 };
    const result = adaptPaginated<Employee>(raw, {
      dataKey: 'rows',
      totalKey: 'count',
      pageKey: 'pageNo',
      pageSizeKey: 'size',
    });
    expect(result).toEqual({ data: raw.rows, total: 1, page: 3, pageSize: 10 });
  });

  it('falls back sensibly when meta is missing', () => {
    const raw = {
      data: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
    };
    const result = adaptPaginated<Employee>(raw);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
  });

  it('throws when the data key is not an array', () => {
    expect(() => adaptPaginated({ data: 'nope' })).toThrow(TypeError);
  });
});

describe('adaptDynamicSchema', () => {
  it('builds ColumnDefs and data from a server-described schema', () => {
    const raw = {
      columns: [
        { field: 'name', label: '사원명' },
        { field: 'salary', label: '급여', type: 'number' },
      ],
      rows: [{ name: 'A', salary: 100 }],
    };
    const { columns, data } = adaptDynamicSchema(raw);
    expect(columns).toEqual([
      { key: 'name', label: '사원명' },
      { key: 'salary', label: '급여', type: 'number' },
    ]);
    expect(data).toBe(raw.rows);
  });

  it('falls back to field name when label is missing, and drops unknown types', () => {
    const raw = {
      columns: [{ field: 'code', type: 'weird' }],
      rows: [],
    };
    const { columns } = adaptDynamicSchema(raw);
    expect(columns[0]).toEqual({ key: 'code', label: 'code' });
  });

  it('respects custom descriptor keys', () => {
    const raw = {
      cols: [{ name: 'dept', title: '부서' }],
      items: [{ dept: 'HR' }],
    };
    const { columns, data } = adaptDynamicSchema(raw, {
      columnsKey: 'cols',
      rowsKey: 'items',
      fieldKey: 'name',
      labelKey: 'title',
    });
    expect(columns[0]).toEqual({ key: 'dept', label: '부서' });
    expect(data).toEqual([{ dept: 'HR' }]);
  });

  it('throws on malformed descriptors', () => {
    expect(() => adaptDynamicSchema({ columns: [{ label: 'no field' }], rows: [] })).toThrow(
      /no string/,
    );
    expect(() => adaptDynamicSchema({ columns: 'x', rows: [] })).toThrow(TypeError);
  });
});
