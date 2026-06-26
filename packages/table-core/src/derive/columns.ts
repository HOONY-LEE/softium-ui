/**
 * Column derivation (SPEC §2): the final render columns are a pure composition of
 * the immutable `columnDefs` (developer) and the mutable `columnState` (end user).
 *
 *   renderColumns = columnDefs
 *     .map(def => merge(def, columnState[def.key]))
 *     .filter(c => c.visible)
 *     .sort by (pinned group, order)
 *
 * `columnDefs` and the input `columnState` are never mutated.
 */

import type { ColumnDef, ColumnState, PinSide, ResolvedColumn } from '../types';

/** Build the default view state for a set of column defs (order = declaration order). */
export function createInitialColumnState<T, TNode>(defs: ColumnDef<T, TNode>[]): ColumnState[] {
  return defs.map((def, index) => ({
    key: def.key,
    visible: true,
    order: index,
    width: def.width,
    pinned: null,
  }));
}

const PIN_GROUP: Record<'left' | 'none' | 'right', number> = {
  left: 0,
  none: 1,
  right: 2,
};

function pinGroup(pinned: PinSide): number {
  if (pinned === 'left') return PIN_GROUP.left;
  if (pinned === 'right') return PIN_GROUP.right;
  return PIN_GROUP.none;
}

/**
 * Merge defs with state, drop hidden columns, and order them.
 * Ordering: left-pinned first, then unpinned, then right-pinned; `order` breaks ties.
 */
export function resolveColumns<T, TNode>(
  defs: ColumnDef<T, TNode>[],
  state: ColumnState[],
): ResolvedColumn<T, TNode>[] {
  const stateByKey = new Map<string, ColumnState>();
  for (const s of state) stateByKey.set(s.key, s);

  const resolved: ResolvedColumn<T, TNode>[] = [];

  defs.forEach((def, index) => {
    const s = stateByKey.get(def.key);
    const visible = s?.visible ?? true;
    if (!visible) return;

    const order = s?.order ?? index;
    const pinned = s?.pinned ?? null;
    const labelOverride = s?.labelOverride;

    resolved.push({
      key: def.key,
      label: def.label,
      displayLabel: labelOverride && labelOverride.length > 0 ? labelOverride : def.label,
      type: def.type ?? 'text',
      align: def.align ?? defaultAlign(def.type),
      order,
      visible: true,
      pinned,
      width: s?.width ?? def.width,
      minWidth: def.minWidth,
      sortable: def.sortable ?? false,
      filterable: def.filterable ?? false,
      resizable: def.resizable ?? false,
      pinnable: def.pinnable ?? false,
      hideable: def.hideable ?? true,
      renderCell: def.renderCell,
      renderHeader: def.renderHeader,
      def,
    });
  });

  return resolved.sort((a, b) => {
    const groupDiff = pinGroup(a.pinned) - pinGroup(b.pinned);
    if (groupDiff !== 0) return groupDiff;
    return a.order - b.order;
  });
}

/** Numbers default to right alignment; everything else to left. */
function defaultAlign(type: ColumnDef<unknown>['type']): 'left' | 'right' {
  return type === 'number' ? 'right' : 'left';
}
