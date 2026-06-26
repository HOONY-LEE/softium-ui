import type { Row as RowModel } from '@softium/table-core';
import type { ReactNode } from 'react';
import type { ResolvedReactColumn } from '../types';
import { Cell } from './Cell';

export interface RowProps<T> {
  row: RowModel<T>;
  columns: ResolvedReactColumn<T>[];
}

export function Row<T>({ row, columns }: RowProps<T>): ReactNode {
  return (
    <div className="sft-tr" role="row" data-selected={row.selected ?? undefined}>
      {columns.map((column) => (
        <Cell key={column.key} row={row} column={column} />
      ))}
    </div>
  );
}
