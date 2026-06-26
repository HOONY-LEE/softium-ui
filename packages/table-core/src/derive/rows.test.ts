import { describe, expect, it } from 'vitest';
import { buildRows } from './rows';

interface Employee {
  id: string;
  name: string;
}

const data: Employee[] = [
  { id: 'e-10', name: 'A' },
  { id: 'e-20', name: 'B' },
  { id: 'e-30', name: 'C' },
];

describe('buildRows', () => {
  it('assigns 1-based displayIndex and globalIndex (no offset)', () => {
    const rows = buildRows(data, { getRowId: (r) => r.id });
    expect(rows.map((r) => r.displayIndex)).toEqual([1, 2, 3]);
    expect(rows.map((r) => r.globalIndex)).toEqual([1, 2, 3]);
  });

  it('uses getRowId for the stable id — distinct from displayIndex', () => {
    const rows = buildRows(data, { getRowId: (r) => r.id });
    expect(rows.map((r) => r.rowId)).toEqual(['e-10', 'e-20', 'e-30']);
    // rowId must NOT equal the positional index
    expect(rows[0]?.rowId).not.toBe(String(rows[0]?.displayIndex));
  });

  it('falls back to globalIndex string when getRowId is absent', () => {
    const rows = buildRows(data);
    expect(rows.map((r) => r.rowId)).toEqual(['1', '2', '3']);
  });

  it('keeps displayIndex page-local but globalIndex dataset-global under an offset', () => {
    // page 2, pageSize 3 → offset 3
    const rows = buildRows(data, { getRowId: (r) => r.id, offset: 3 });
    expect(rows.map((r) => r.displayIndex)).toEqual([1, 2, 3]);
    expect(rows.map((r) => r.globalIndex)).toEqual([4, 5, 6]);
  });

  it('references the original objects without mutating them', () => {
    const snapshot = JSON.stringify(data);
    const rows = buildRows(data, { getRowId: (r) => r.id });
    expect(rows[0]?.data).toBe(data[0]);
    expect(JSON.stringify(data)).toBe(snapshot);
  });
});
