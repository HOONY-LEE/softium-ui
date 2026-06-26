import type { Row as RowModel } from '@softium/table-core';
import type { ReactNode } from 'react';
import type { ResolvedReactColumn } from '../types';
import { Row } from './Row';

export interface BodyProps<T> {
  rows: RowModel<T>[];
  columns: ResolvedReactColumn<T>[];
  emptyText: ReactNode;
}

export function Body<T>({ rows, columns, emptyText }: BodyProps<T>): ReactNode {
  if (rows.length === 0) {
    return (
      <div className="sft-tbody sft-tbody--empty" role="rowgroup">
        <div className="sft-empty">{emptyText}</div>
      </div>
    );
  }

  return (
    <div className="sft-tbody" role="rowgroup">
      {rows.map((row) => (
        <Row key={row.rowId} row={row} columns={columns} />
      ))}
    </div>
  );
}
