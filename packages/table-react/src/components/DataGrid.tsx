import type { ReactNode } from 'react';
import { Table, type TableProps } from './Table';

export type DataGridProps<T> = TableProps<T>;

/**
 * DataGrid — the editable variant of Table. Same headless core (sort/filter/search/
 * paginate/columns) plus inline cell editing: double-click an `editable` column's
 * cell (or focus + type) to edit; Enter/blur commits, Escape cancels. Wire up
 * `onCellChange` to persist edits.
 */
export function DataGrid<T>(props: DataGridProps<T>): ReactNode {
  return <Table {...props} editable={props.editable ?? true} />;
}
