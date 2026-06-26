/**
 * Row indexing (SPEC §3).
 *
 * Three distinct numbers, never conflated:
 *   - rowId       stable PK (from getRowId, or a global-index fallback string)
 *   - displayIndex 1-based position within the current page/view slice
 *   - globalIndex  1-based position within the full dataset (page-independent)
 *
 * The original row objects are referenced, never mutated.
 */

import type { Row } from '../types';

export interface BuildRowsOptions<T> {
  /** stable id resolver; falls back to the globalIndex as a string */
  getRowId?: (row: T) => string;
  /** how many rows precede this slice in the full dataset (for pagination). Default 0. */
  offset?: number;
}

/**
 * Turn a (possibly paginated) data slice into indexed rows.
 * Pass the full array with offset 0 for the non-paginated case.
 */
export function buildRows<T>(data: T[], options: BuildRowsOptions<T> = {}): Row<T>[] {
  const { getRowId, offset = 0 } = options;

  return data.map((item, i) => {
    const displayIndex = i + 1;
    const globalIndex = offset + i + 1;
    return {
      rowId: getRowId ? getRowId(item) : String(globalIndex),
      displayIndex,
      globalIndex,
      data: item,
    };
  });
}
