/**
 * Derivation: the original `data` and `columnDefs` are never mutated.
 * Every view change is expressed as a pure derivation over copies.
 *
 * Phase 1: column resolution + row indexing.
 * Phase 4 adds derived sort / filter / search here.
 */

export {
  createInitialColumnState,
  resolveColumns,
} from './columns';
export {
  moveColumn,
  patchColumnState,
  setColumnLabelOverride,
  setColumnPinned,
  setColumnVisible,
  setColumnWidth,
} from './columnOps';
export { sortRows, toggleSort } from './sort';
export { applyFilters, matchesFilter } from './filter';
export { applySearch } from './search';
export { buildRows } from './rows';
export type { BuildRowsOptions } from './rows';
