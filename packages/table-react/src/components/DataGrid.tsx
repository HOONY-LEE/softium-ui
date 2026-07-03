import type { ReactNode } from 'react';
import { Table, type TableProps } from './Table';

export type DataGridProps<T> = TableProps<T>;

/**
 * DataGrid — the editable variant of Table. Same headless core (sort/filter/search/
 * paginate/columns) plus inline cell editing: double-click an `editable` column's
 * cell (or focus + type) to edit; Enter/blur commits, Escape cancels. Wire up
 * `onCellChange` to persist edits.
 *
 * Row/column borders and striping aren't forced here — Table's own defaults
 * already flip based on edit-mode state: while read-only, rows are striped
 * with a row-hover highlight (same feel as the plain Table); once edit mode
 * turns on, striping gives way to grid lines and a per-cell hover. Pass
 * `rowBorders`/`columnBorders`/`striped` explicitly to pin a fixed value.
 */
export function DataGrid<T>(props: DataGridProps<T>): ReactNode {
  return <Table {...props} editable={props.editable ?? true} />;
}
