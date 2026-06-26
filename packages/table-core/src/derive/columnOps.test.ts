import { describe, expect, it } from 'vitest';
import type { ColumnDef, ColumnState } from '../types';
import {
  moveColumn,
  setColumnLabelOverride,
  setColumnPinned,
  setColumnVisible,
  setColumnWidth,
} from './columnOps';
import { createInitialColumnState, resolveColumns } from './columns';

interface Employee {
  name: string;
  dept: string;
  salary: number;
}

const defs: ColumnDef<Employee>[] = [
  { key: 'name', label: '사원명' },
  { key: 'dept', label: '부서' },
  { key: 'salary', label: '급여' },
];

function freshState(): ColumnState[] {
  return createInitialColumnState(defs);
}

function expectImmutable(fn: (s: ColumnState[]) => ColumnState[]) {
  const state = freshState();
  const snapshot = JSON.stringify(state);
  const next = fn(state);
  expect(next).not.toBe(state); // new array
  expect(JSON.stringify(state)).toBe(snapshot); // input untouched
}

describe('column operations — only columnState mutates, always a new array', () => {
  it('setColumnVisible toggles visibility immutably', () => {
    expectImmutable((s) => setColumnVisible(s, 'dept', false));
    const next = setColumnVisible(freshState(), 'dept', false);
    expect(next.find((s) => s.key === 'dept')?.visible).toBe(false);
  });

  it('setColumnPinned sets the pin side immutably', () => {
    expectImmutable((s) => setColumnPinned(s, 'name', 'left'));
    const next = setColumnPinned(freshState(), 'name', 'left');
    expect(next.find((s) => s.key === 'name')?.pinned).toBe('left');
  });

  it('setColumnWidth rounds and clamps', () => {
    const next = setColumnWidth(freshState(), 'salary', 142.7);
    expect(next.find((s) => s.key === 'salary')?.width).toBe(143);
    const clamped = setColumnWidth(freshState(), 'salary', -50);
    expect(clamped.find((s) => s.key === 'salary')?.width).toBe(0);
  });

  it('setColumnLabelOverride writes labelOverride, never label', () => {
    const next = setColumnLabelOverride(freshState(), 'name', '이름');
    expect(next.find((s) => s.key === 'name')?.labelOverride).toBe('이름');
    // the ColumnDef label is on `defs`, which this op never receives or touches
    expect(defs[0]?.label).toBe('사원명');
  });

  it('clears labelOverride when given empty/whitespace', () => {
    const renamed = setColumnLabelOverride(freshState(), 'name', '이름');
    const cleared = setColumnLabelOverride(renamed, 'name', '   ');
    expect(cleared.find((s) => s.key === 'name')?.labelOverride).toBeUndefined();
  });

  it('moveColumn reorders and renumbers densely', () => {
    // move 'salary' (order 2) onto 'name' (order 0) → salary, name, dept
    const next = moveColumn(freshState(), 'salary', 'name');
    const ordered = resolveColumns(defs, next).map((c) => c.key);
    expect(ordered).toEqual(['salary', 'name', 'dept']);
    expect(next.map((s) => s.order).sort()).toEqual([0, 1, 2]);
  });

  it('moveColumn is a no-op when active === over', () => {
    const state = freshState();
    expect(moveColumn(state, 'name', 'name')).toBe(state);
  });

  it('resolveColumns reflects a hide without dropping the state entry', () => {
    const hidden = setColumnVisible(freshState(), 'dept', false);
    expect(resolveColumns(defs, hidden).map((c) => c.key)).toEqual(['name', 'salary']);
    // the state still tracks dept (so it can be re-shown) — just not rendered
    expect(hidden.some((s) => s.key === 'dept')).toBe(true);
  });
});
