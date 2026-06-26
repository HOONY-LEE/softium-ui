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
  type ColumnType,
  type Filter,
  type PinSide,
  type SearchState,
  type SortRule,
  applyFilters,
  applySearch,
  buildRows,
  createInitialColumnState,
  moveColumn,
  resolveColumns,
  setColumnLabelOverride,
  setColumnPinned,
  setColumnVisible,
  setColumnWidth,
  sortRows,
  toggleSort,
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

  // ── sort / filter / search (derived; original data never mutated) ──
  /** current sort rules, in priority order */
  getSortRules: () => SortRule[];
  /** click-to-sort cycle (none→asc→desc→none). `multi` keeps other sorts. */
  toggleSort: (columnKey: string, multi?: boolean) => void;
  /** replace all sort rules */
  setSortRules: (rules: SortRule[]) => void;
  /** current structured column filters */
  getFilters: () => Filter[];
  /** set or clear (null) the filter for one column */
  setColumnFilter: (columnKey: string, filter: Filter | null) => void;
  /** replace all filters */
  setFilters: (filters: Filter[]) => void;
  /** current global search state (separate from filters) */
  getSearch: () => SearchState;
  /** set the global search query (scope stays as-is) */
  setSearchQuery: (query: string) => void;
  /** replace the whole search state */
  setSearch: (search: SearchState) => void;

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
  const [sortRules, setSortRulesRaw] = useState<SortRule[]>([]);
  const [filters, setFiltersRaw] = useState<Filter[]>([]);
  const [search, setSearchRaw] = useState<SearchState>({ query: '', scope: 'all' });

  const renderColumns = useMemo(() => resolveColumns(columns, columnState), [columns, columnState]);

  // type lookup by column key (for typed sort/filter comparisons)
  const getType = useMemo(() => {
    const map = new Map<string, ColumnType>();
    for (const def of columns) map.set(def.key, def.type ?? 'text');
    return (key: string): ColumnType | undefined => map.get(key);
  }, [columns]);

  const allKeys = useMemo(() => columns.map((c) => c.key), [columns]);

  // derive pipeline: filter → search → sort → index. The original data is never mutated.
  const rows = useMemo(() => {
    const filtered = applyFilters(data, filters, getType);
    const searched = applySearch(filtered, search, allKeys);
    const sorted = sortRows(searched, sortRules, getType);
    return buildRows(sorted, { getRowId });
  }, [data, filters, search, sortRules, getType, allKeys, getRowId]);

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

  const cycleSort = useCallback(
    (columnKey: string, multi = false) =>
      setSortRulesRaw((prev) => toggleSort(prev, columnKey, multi)),
    [],
  );
  const setColumnFilter = useCallback((columnKey: string, filter: Filter | null) => {
    setFiltersRaw((prev) => {
      const others = prev.filter((f) => f.columnKey !== columnKey);
      return filter ? [...others, filter] : others;
    });
  }, []);
  const setSearchQuery = useCallback(
    (query: string) => setSearchRaw((prev) => ({ ...prev, query })),
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
      getSortRules: () => sortRules,
      toggleSort: cycleSort,
      setSortRules: setSortRulesRaw,
      getFilters: () => filters,
      setColumnFilter,
      setFilters: setFiltersRaw,
      getSearch: () => search,
      setSearchQuery,
      setSearch: setSearchRaw,
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
      sortRules,
      cycleSort,
      filters,
      setColumnFilter,
      search,
      setSearchQuery,
      columns,
      data,
    ],
  );
}
