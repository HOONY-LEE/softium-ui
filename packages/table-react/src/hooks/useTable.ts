/**
 * useTable — the single entry point (SPEC §8).
 *
 *   const table = useTable({ data, columns, getRowId });
 *   return <Table table={table} />;
 *
 * The returned instance also exposes headless primitives for advanced users who
 * want to render the table themselves: getRenderColumns(), getRows(), etc.
 *
 * Phase 2 wires up the read path (resolve columns, index rows) and holds
 * columnState. Phases 3+ layer mutation (reorder/pin/resize/rename), sort,
 * filter, search, selection, and pagination onto the same instance.
 */

import {
  type ColumnState,
  type PinSide,
  buildRows,
  createInitialColumnState,
  moveColumn,
  resolveColumns,
  setColumnLabelOverride,
  setColumnPinned,
  setColumnVisible,
  setColumnWidth,
} from '@softium/table-core';
import type { Row } from '@softium/table-core';
import { useCallback, useMemo, useState } from 'react';
import type { ReactColumnDef, ResolvedReactColumn } from '../types';

export interface UseTableOptions<T> {
  data: T[];
  columns: ReactColumnDef<T>[];
  /** stable row id resolver; falls back to a global-index string */
  getRowId?: (row: T) => string;
  /** seed the user view state (e.g. restored from localStorage). Defaults to all-visible. */
  initialColumnState?: ColumnState[];
}

export type ColumnStateUpdater = (prev: ColumnState[]) => ColumnState[];

export interface TableInstance<T> {
  /** resolved, ordered, visible columns ready to render */
  getRenderColumns: () => ResolvedReactColumn<T>[];
  /** indexed rows (rowId / displayIndex / globalIndex) */
  getRows: () => Row<T>[];
  /** current user view state (the persistable layer) */
  getColumnState: () => ColumnState[];
  /** replace the view state; never touches data or columnDefs */
  setColumnState: (updater: ColumnState[] | ColumnStateUpdater) => void;
  /** restore the default view state (all visible, declaration order) */
  resetColumnState: () => void;

  // ── column gestures (each is columnState-only; data & columnDefs stay immutable) ──
  /** show / hide a column */
  setColumnVisible: (key: string, visible: boolean) => void;
  /** drag-reorder: place `activeKey` where `overKey` currently sits */
  moveColumn: (activeKey: string, overKey: string) => void;
  /** pin a column left / right, or unpin with null */
  setColumnPinned: (key: string, pinned: PinSide) => void;
  /** set an explicit pixel width (from a resize handle) */
  setColumnWidth: (key: string, width: number) => void;
  /** rename for display only — writes labelOverride, never the original label */
  renameColumn: (key: string, labelOverride: string | undefined) => void;

  /** the immutable column blueprints as supplied */
  readonly columns: ReactColumnDef<T>[];
  /** the original data array (referenced, never mutated) */
  readonly data: T[];
}

export function useTable<T>(options: UseTableOptions<T>): TableInstance<T> {
  const { data, columns, getRowId, initialColumnState } = options;

  const [columnState, setColumnStateRaw] = useState<ColumnState[]>(
    () => initialColumnState ?? createInitialColumnState(columns),
  );

  const renderColumns = useMemo(() => resolveColumns(columns, columnState), [columns, columnState]);

  const rows = useMemo(() => buildRows(data, { getRowId }), [data, getRowId]);

  const setColumnState = useCallback((updater: ColumnState[] | ColumnStateUpdater) => {
    setColumnStateRaw((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const resetColumnState = useCallback(() => {
    setColumnStateRaw(createInitialColumnState(columns));
  }, [columns]);

  const setVisible = useCallback(
    (key: string, visible: boolean) =>
      setColumnStateRaw((prev) => setColumnVisible(prev, key, visible)),
    [],
  );
  const move = useCallback(
    (activeKey: string, overKey: string) =>
      setColumnStateRaw((prev) => moveColumn(prev, activeKey, overKey)),
    [],
  );
  const setPinned = useCallback(
    (key: string, pinned: PinSide) =>
      setColumnStateRaw((prev) => setColumnPinned(prev, key, pinned)),
    [],
  );
  const setWidth = useCallback(
    (key: string, width: number) => setColumnStateRaw((prev) => setColumnWidth(prev, key, width)),
    [],
  );
  const rename = useCallback(
    (key: string, labelOverride: string | undefined) =>
      setColumnStateRaw((prev) => setColumnLabelOverride(prev, key, labelOverride)),
    [],
  );

  return useMemo<TableInstance<T>>(
    () => ({
      getRenderColumns: () => renderColumns,
      getRows: () => rows,
      getColumnState: () => columnState,
      setColumnState,
      resetColumnState,
      setColumnVisible: setVisible,
      moveColumn: move,
      setColumnPinned: setPinned,
      setColumnWidth: setWidth,
      renameColumn: rename,
      columns,
      data,
    }),
    [
      renderColumns,
      rows,
      columnState,
      setColumnState,
      resetColumnState,
      setVisible,
      move,
      setPinned,
      setWidth,
      rename,
      columns,
      data,
    ],
  );
}
