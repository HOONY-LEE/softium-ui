import { describe, expect, it } from 'vitest';
import type { ColumnDef, ColumnState } from '../types';
import { createInitialColumnState, reconcileColumnState, resolveColumns } from './columns';

interface Employee {
  name: string;
  dept: string;
  salary: number;
}

const defs: ColumnDef<Employee>[] = [
  { key: 'name', label: '사원명' },
  { key: 'dept', label: '부서' },
  { key: 'salary', label: '급여', type: 'number' },
];

describe('createInitialColumnState', () => {
  it('makes every column visible in declaration order', () => {
    const state = createInitialColumnState(defs);
    expect(state.map((s) => s.key)).toEqual(['name', 'dept', 'salary']);
    expect(state.every((s) => s.visible)).toBe(true);
    expect(state.map((s) => s.order)).toEqual([0, 1, 2]);
  });
});

describe('resolveColumns', () => {
  it('returns all visible columns in order with sensible defaults', () => {
    const resolved = resolveColumns(defs, createInitialColumnState(defs));
    expect(resolved.map((c) => c.key)).toEqual(['name', 'dept', 'salary']);
    // number columns default to right alignment
    expect(resolved[2]?.align).toBe('right');
    expect(resolved[0]?.align).toBe('left');
    expect(resolved[0]?.displayLabel).toBe('사원명');
  });

  it('drops hidden columns', () => {
    const state = createInitialColumnState(defs);
    state[1] = { ...state[1], visible: false } as ColumnState;
    const resolved = resolveColumns(defs, state);
    expect(resolved.map((c) => c.key)).toEqual(['name', 'salary']);
  });

  it('honors order', () => {
    const state: ColumnState[] = [
      { key: 'name', visible: true, order: 2 },
      { key: 'dept', visible: true, order: 0 },
      { key: 'salary', visible: true, order: 1 },
    ];
    expect(resolveColumns(defs, state).map((c) => c.key)).toEqual(['dept', 'salary', 'name']);
  });

  it('groups pinned columns: left → none → right, order within group', () => {
    const state: ColumnState[] = [
      { key: 'name', visible: true, order: 0, pinned: 'right' },
      { key: 'dept', visible: true, order: 1, pinned: null },
      { key: 'salary', visible: true, order: 2, pinned: 'left' },
    ];
    expect(resolveColumns(defs, state).map((c) => c.key)).toEqual(['salary', 'dept', 'name']);
  });

  it('uses labelOverride for display but keeps label immutable', () => {
    const state: ColumnState[] = [
      { key: 'name', visible: true, order: 0, labelOverride: '이름' },
      { key: 'dept', visible: true, order: 1 },
      { key: 'salary', visible: true, order: 2 },
    ];
    const resolved = resolveColumns(defs, state);
    expect(resolved[0]?.displayLabel).toBe('이름');
    expect(resolved[0]?.label).toBe('사원명'); // original untouched
  });

  it('does not mutate the input defs or state', () => {
    const state = createInitialColumnState(defs);
    const defsSnapshot = JSON.stringify(defs);
    const stateSnapshot = JSON.stringify(state);
    resolveColumns(defs, state);
    expect(JSON.stringify(defs)).toBe(defsSnapshot);
    expect(JSON.stringify(state)).toBe(stateSnapshot);
  });

  it('reconcile keeps stored entries, drops removed cols, appends new ones', () => {
    // stored state from before: dept was renamed/reordered, "salary" no longer stored
    const stored: ColumnState[] = [
      { key: 'name', visible: true, order: 1, labelOverride: '이름' },
      { key: 'dept', visible: false, order: 0 },
      { key: 'legacy', visible: true, order: 5 }, // column no longer in defs
    ];
    const reconciled = reconcileColumnState(defs, stored);
    const byKey = new Map(reconciled.map((s) => [s.key, s]));

    // kept
    expect(byKey.get('name')?.labelOverride).toBe('이름');
    expect(byKey.get('dept')?.visible).toBe(false);
    // dropped
    expect(byKey.has('legacy')).toBe(false);
    // appended (salary wasn't in stored) with an order after the max stored order
    expect(byKey.get('salary')).toBeDefined();
    expect(byKey.get('salary')?.order).toBe(6);
    // exactly the current defs' columns
    expect(reconciled.map((s) => s.key).sort()).toEqual(['dept', 'name', 'salary']);
  });

  it('prefers a state width over the def width', () => {
    const state: ColumnState[] = [
      { key: 'name', visible: true, order: 0, width: 200 },
      { key: 'dept', visible: true, order: 1 },
      { key: 'salary', visible: true, order: 2 },
    ];
    const withWidthDef: ColumnDef<Employee>[] = [
      { key: 'name', label: '사원명', width: 100 },
      ...defs.slice(1),
    ];
    expect(resolveColumns(withWidthDef, state)[0]?.width).toBe(200);
  });
});
