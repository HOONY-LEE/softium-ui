/**
 * Derivation: the original `data` and `columnDefs` are never mutated.
 * Every view change is expressed as a pure derivation over copies.
 *
 * Phase 1: column resolution + row indexing.
 * Phase 4 adds derived sort / filter / search here.
 */

export {
  createInitialColumnState,
  reconcileColumnState,
  resolveColumns,
} from './columns';
export {
  moveColumn,
  patchColumnState,
  setColumnAlign,
  setColumnLabelOverride,
  setColumnPinned,
  setColumnVisible,
  setColumnWidth,
} from './columnOps';
export { sortRows, toggleSort } from './sort';
export type { ColumnSort, SortLookup } from './sort';
export { applyFilters, matchesFilter } from './filter';
export { applySearch } from './search';
export { clampPage, getPageCount, paginate } from './paginate';
export type { PageSlice } from './paginate';
export { pivot } from './pivot';
export type { PivotAggregate, PivotConfig, PivotResult } from './pivot';
export { buildRows } from './rows';
export type { BuildRowsOptions } from './rows';
