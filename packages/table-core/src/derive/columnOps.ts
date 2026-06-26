/**
 * Column operations (SPEC §3, §10): every user gesture on the table — hide, reorder,
 * resize, pin, rename — is a pure transformation of `ColumnState[]` into a NEW array.
 *
 * Invariants enforced by these functions:
 *   - `columnDefs` and `data` are never referenced here (this layer only knows view state)
 *   - the input `state` array is never mutated; a fresh array is always returned
 *   - renaming writes `labelOverride`, NEVER the immutable `label`
 */

import type { ColumnState, PinSide } from '../types';

/** Apply a partial patch to one column's state, returning a new array. */
export function patchColumnState(
  state: ColumnState[],
  key: string,
  patch: Partial<Omit<ColumnState, 'key'>>,
): ColumnState[] {
  return state.map((s) => (s.key === key ? { ...s, ...patch } : s));
}

export function setColumnVisible(
  state: ColumnState[],
  key: string,
  visible: boolean,
): ColumnState[] {
  return patchColumnState(state, key, { visible });
}

export function setColumnPinned(state: ColumnState[], key: string, pinned: PinSide): ColumnState[] {
  return patchColumnState(state, key, { pinned });
}

export function setColumnWidth(state: ColumnState[], key: string, width: number): ColumnState[] {
  return patchColumnState(state, key, { width: Math.max(0, Math.round(width)) });
}

/**
 * Rename a column. An empty/whitespace override clears back to the original `label`.
 * The original `label` lives on the ColumnDef and is untouched.
 */
export function setColumnLabelOverride(
  state: ColumnState[],
  key: string,
  labelOverride: string | undefined,
): ColumnState[] {
  const trimmed = labelOverride?.trim();
  return patchColumnState(state, key, {
    labelOverride: trimmed && trimmed.length > 0 ? trimmed : undefined,
  });
}

/** Immutable array move. */
function arrayMove<U>(arr: U[], from: number, to: number): U[] {
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return next;
  next.splice(to, 0, moved);
  return next;
}

/**
 * Reorder so that `activeKey` lands where `overKey` currently sits (DnD semantics),
 * then renumber `order` densely (0..n-1) in the resulting sequence.
 */
export function moveColumn(
  state: ColumnState[],
  activeKey: string,
  overKey: string,
): ColumnState[] {
  if (activeKey === overKey) return state;

  const ordered = [...state].sort((a, b) => a.order - b.order);
  const from = ordered.findIndex((s) => s.key === activeKey);
  const to = ordered.findIndex((s) => s.key === overKey);
  if (from === -1 || to === -1) return state;

  const moved = arrayMove(ordered, from, to);
  const orderByKey = new Map<string, number>();
  moved.forEach((s, i) => orderByKey.set(s.key, i));

  return state.map((s) => ({ ...s, order: orderByKey.get(s.key) ?? s.order }));
}
