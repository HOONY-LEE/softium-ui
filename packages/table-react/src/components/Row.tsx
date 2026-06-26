import type { Row as RowModel } from '@softium/table-core';
import type { ReactNode } from 'react';
import type { ResolvedReactColumn } from '../types';
import { Cell } from './Cell';
import { SELECT_COL_WIDTH, useTableContext } from './context';

export interface RowProps<T> {
  row: RowModel<T>;
  columns: ResolvedReactColumn<T>[];
}

export function Row<T>({ row, columns }: RowProps<T>): ReactNode {
  const { table, selectable } = useTableContext<T>();

  return (
    <div className="sft-tr" role="row" data-selected={row.selected ?? undefined}>
      {selectable && (
        <div
          className="sft-td sft-td--select"
          role="cell"
          style={{ flex: `0 0 ${SELECT_COL_WIDTH}px`, width: SELECT_COL_WIDTH }}
        >
          <input
            type="checkbox"
            checked={row.selected ?? false}
            aria-label={`select ${row.rowId}`}
            onChange={() => table.toggleRowSelected(row.rowId)}
          />
        </div>
      )}
      {columns.map((column) => (
        <Cell key={column.key} row={row} column={column} />
      ))}
    </div>
  );
}
