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
  type ColumnAlign,
  type ColumnSort,
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
  getPageCount,
  moveColumn,
  paginate,
  reconcileColumnState,
  resolveColumns,
  setColumnAlign,
  setColumnLabelOverride,
  setColumnPinned,
  setColumnVisible,
  setColumnWidth,
  sortRows,
  toggleSort,
} from '@softium/table-core';
import type { Row } from '@softium/table-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clearColumnState, loadColumnState, saveColumnState } from '../persistence';
import type { ReactColumnDef, ResolvedReactColumn } from '../types';

export interface UseTableOptions<T> {
  data: T[];
  columns: ReactColumnDef<T>[];
  /** stable row id resolver; falls back to a global-index string */
  getRowId?: (row: T) => string;
  /** seed the user view state (e.g. restored from localStorage). Defaults to all-visible. */
  initialColumnState?: ColumnState[];
  /** rows per page. 0 / omitted disables pagination (render the whole set). */
  pageSize?: number;
  /** localStorage key. When set, columnState is restored on mount and saved on change. */
  persistKey?: string;
}

export type ColumnStateUpdater = (prev: ColumnState[]) => ColumnState[];

export interface TableInstance<T> {
  /** resolved, ordered, visible columns ready to render */
  getRenderColumns: () => ResolvedReactColumn<T>[];
  /** indexed rows for the current page (rowId / displayIndex / globalIndex) */
  getRows: () => Row<T>[];
  /** every filtered/searched/sorted row, ignoring pagination (used for export) */
  getAllRows: () => Row<T>[];
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
  /** override a column's text alignment (left / center / right) */
  setColumnAlign: (key: string, align: ColumnAlign) => void;
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

  // ── selection (keyed by stable rowId, so it survives paging/sort/filter) ──
  isRowSelected: (rowId: string) => boolean;
  toggleRowSelected: (rowId: string) => void;
  setRowSelected: (rowId: string, selected: boolean) => void;
  /** select/deselect a set of rows at once (e.g. the current page) */
  setRowsSelected: (rowIds: string[], selected: boolean) => void;
  clearSelection: () => void;
  getSelectedIds: () => string[];
  getSelectedCount: () => number;

  // ── pagination (globalIndex stays absolute; displayIndex resets per page) ──
  getPage: () => number;
  setPage: (page: number) => void;
  getPageSize: () => number;
  setPageSize: (pageSize: number) => void;
  getPageCount: () => number;
  /** total rows after filter+search, before paging */
  getTotalCount: () => number;

  /** the immutable column blueprints as supplied */
  readonly columns: ReactColumnDef<T>[];
  /** the original data array (referenced, never mutated) */
  readonly data: T[];
}

export function useTable<T>(options: UseTableOptions<T>): TableInstance<T> {
  const {
    data,
    columns,
    getRowId,
    initialColumnState,
    pageSize: initialPageSize = 0,
    persistKey,
  } = options;

  const [columnState, setColumnStateRaw] = useState<ColumnState[]>(() => {
    // restore persisted state on mount, reconciled against current defs
    if (persistKey) {
      const stored = loadColumnState(persistKey);
      if (stored) return reconcileColumnState(columns, stored);
    }
    return initialColumnState ?? createInitialColumnState(columns);
  });

  // persist on every columnState change (skip the very first commit — nothing changed yet)
  const firstSave = useRef(true);
  useEffect(() => {
    if (!persistKey) return;
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    saveColumnState(persistKey, columnState);
  }, [persistKey, columnState]);
  const [sortRules, setSortRulesRaw] = useState<SortRule[]>([]);
  const [filters, setFiltersRaw] = useState<Filter[]>([]);
  const [search, setSearchRaw] = useState<SearchState>({ query: '', scope: 'all' });
  const [selection, setSelection] = useState<ReadonlySet<string>>(() => new Set());
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(initialPageSize);

  const renderColumns = useMemo(() => resolveColumns(columns, columnState), [columns, columnState]);

  // type lookup by column key (for typed filter comparisons)
  const getType = useMemo(() => {
    const map = new Map<string, ColumnType>();
    for (const def of columns) map.set(def.key, def.type ?? 'text');
    return (key: string): ColumnType | undefined => map.get(key);
  }, [columns]);

  // per-column sort config: type + optional accessor / custom comparator
  const getSort = useMemo(() => {
    const map = new Map<string, ColumnSort<T>>();
    for (const def of columns) {
      map.set(def.key, {
        type: def.type ?? 'text',
        accessor: def.sortAccessor,
        comparator: def.sortComparator,
      });
    }
    return (key: string): ColumnSort<T> | undefined => map.get(key);
  }, [columns]);

  const allKeys = useMemo(() => columns.map((c) => c.key), [columns]);

  // filter → search → sort, over copies. The original data is never mutated.
  const processed = useMemo(() => {
    const filtered = applyFilters(data, filters, getType);
    const searched = applySearch(filtered, search, allKeys);
    return sortRows(searched, sortRules, getSort);
  }, [data, filters, search, sortRules, getType, getSort, allKeys]);

  const totalCount = processed.length;
  const pageCount = pageSize > 0 ? getPageCount(totalCount, pageSize) : 1;

  // page slice → index (globalIndex absolute via offset) → apply selection flag
  const rows = useMemo(() => {
    const slice =
      pageSize > 0 ? paginate(processed, page, pageSize) : { items: processed, offset: 0 };
    const built = buildRows(slice.items, { getRowId, offset: slice.offset });
    return selection.size === 0
      ? built
      : built.map((r) => (selection.has(r.rowId) ? { ...r, selected: true } : r));
  }, [processed, page, pageSize, getRowId, selection]);

  // all processed rows (no pagination) — the export/full-view surface
  const allRows = useMemo(
    () => buildRows(processed, { getRowId, offset: 0 }),
    [processed, getRowId],
  );

  const setColumnState = useCallback((updater: ColumnState[] | ColumnStateUpdater) => {
    setColumnStateRaw((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const resetColumnState = useCallback(() => {
    if (persistKey) clearColumnState(persistKey);
    setColumnStateRaw(createInitialColumnState(columns));
  }, [columns, persistKey]);

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
  const setAlign = useCallback(
    (key: string, align: ColumnAlign) =>
      setColumnStateRaw((prev) => setColumnAlign(prev, key, align)),
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

  const setRowSelected = useCallback((rowId: string, selected: boolean) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (selected) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  }, []);
  const toggleRowSelected = useCallback((rowId: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);
  const setRowsSelected = useCallback((rowIds: string[], selected: boolean) => {
    setSelection((prev) => {
      const next = new Set(prev);
      for (const id of rowIds) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelection(new Set()), []);

  const setPage = useCallback((p: number) => setPageRaw(Math.max(1, Math.floor(p))), []);
  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(Math.max(0, Math.floor(size)));
    setPageRaw(1);
  }, []);

  return useMemo<TableInstance<T>>(
    () => ({
      getRenderColumns: () => renderColumns,
      getRows: () => rows,
      getAllRows: () => allRows,
      getColumnState: () => columnState,
      setColumnState,
      resetColumnState,
      setColumnVisible: setVisible,
      moveColumn: move,
      setColumnPinned: setPinned,
      setColumnWidth: setWidth,
      setColumnAlign: setAlign,
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
      isRowSelected: (rowId: string) => selection.has(rowId),
      toggleRowSelected,
      setRowSelected,
      setRowsSelected,
      clearSelection,
      getSelectedIds: () => [...selection],
      getSelectedCount: () => selection.size,
      getPage: () => page,
      setPage,
      getPageSize: () => pageSize,
      setPageSize,
      getPageCount: () => pageCount,
      getTotalCount: () => totalCount,
      columns,
      data,
    }),
    [
      renderColumns,
      rows,
      allRows,
      columnState,
      setColumnState,
      resetColumnState,
      setVisible,
      move,
      setPinned,
      setWidth,
      setAlign,
      rename,
      sortRules,
      cycleSort,
      filters,
      setColumnFilter,
      search,
      setSearchQuery,
      selection,
      toggleRowSelected,
      setRowSelected,
      setRowsSelected,
      clearSelection,
      page,
      setPage,
      pageSize,
      setPageSize,
      pageCount,
      totalCount,
      columns,
      data,
    ],
  );
}
