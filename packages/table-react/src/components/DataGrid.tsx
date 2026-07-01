import type { ReactNode } from 'react';
import { Table, type TableProps } from './Table';

export type DataGridProps<T> = TableProps<T>;

/**
 * DataGrid — the editable variant of Table. Same headless core (sort/filter/search/
 * paginate/columns) plus inline cell editing: double-click an `editable` column's
 * cell (or focus + type) to edit; Enter/blur commits, Escape cancels. Wire up
 * `onCellChange` to persist edits.
 *
 * Row/column borders aren't forced here — Table shows them by default while edit
 * mode is active and hides them otherwise (see Table's own default), unless this
 * caller passes `rowBorders`/`columnBorders` explicitly.
 */
export function DataGrid<T>(props: DataGridProps<T>): ReactNode {
  return <Table {...props} editable={props.editable ?? true} />;
}
