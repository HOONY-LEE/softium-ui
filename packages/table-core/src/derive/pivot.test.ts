import { describe, expect, it } from 'vitest';
import { pivot } from './pivot';

interface Sale {
  dept: string;
  role: string;
  amount: number;
}

const data: Sale[] = [
  { dept: '영업', role: '사원', amount: 100 },
  { dept: '영업', role: '사원', amount: 50 },
  { dept: '영업', role: '부장', amount: 300 },
  { dept: '인사', role: '사원', amount: 200 },
];

describe('pivot', () => {
  it('cross-tabs sum with row/column/grand totals', () => {
    const p = pivot(data, { rows: ['dept'], columns: ['role'], value: 'amount', aggregate: 'sum' });
    expect(p.rowKeys.map((r) => r[0])).toEqual(['영업', '인사']);
    expect(p.columnKeys.map((c) => c[0])).toEqual(['부장', '사원']);
    // 영업: 부장=300, 사원=150 ; 인사: 부장=null, 사원=200
    expect(p.values[0]).toEqual([300, 150]);
    expect(p.values[1]).toEqual([null, 200]);
    expect(p.rowTotals).toEqual([450, 200]);
    expect(p.columnTotals).toEqual([300, 350]);
    expect(p.grandTotal).toBe(650);
  });

  it('count ignores the value field', () => {
    const p = pivot(data, {
      rows: ['dept'],
      columns: ['role'],
      value: 'amount',
      aggregate: 'count',
    });
    expect(p.values[0]).toEqual([1, 2]); // 영업: 부장 1, 사원 2
    expect(p.grandTotal).toBe(4);
  });

  it('avg / min / max aggregate the underlying values, not the cells', () => {
    const avg = pivot(data, {
      rows: ['dept'],
      columns: ['role'],
      value: 'amount',
      aggregate: 'avg',
    });
    expect(avg.values[0]).toEqual([300, 75]); // 영업 사원 (100+50)/2
    const max = pivot(data, {
      rows: ['dept'],
      columns: ['role'],
      value: 'amount',
      aggregate: 'max',
    });
    expect(max.rowTotals[0]).toBe(300); // 영업 max across all
  });

  it('does not mutate the input data', () => {
    const snap = JSON.stringify(data);
    pivot(data, { rows: ['dept'], columns: ['role'], value: 'amount', aggregate: 'sum' });
    expect(JSON.stringify(data)).toBe(snap);
  });
});
