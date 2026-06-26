import type { Row as RowModel } from '@softium/table-core';
import type { ReactNode } from 'react';
import type { ResolvedReactColumn } from '../types';
import type { VirtualWindow } from '../hooks/useVirtualRows';
import { Row } from './Row';

export interface BodyProps<T> {
  rows: RowModel<T>[];
  columns: ResolvedReactColumn<T>[];
  emptyText: ReactNode;
  /** when present and enabled, only the windowed slice is rendered */
  virtual?: VirtualWindow;
}

export function Body<T>({ rows, columns, emptyText, virtual }: BodyProps<T>): ReactNode {
  if (rows.length === 0) {
    return (
      <div className="sft-tbody sft-tbody--empty" role="rowgroup">
        <div className="sft-empty">{emptyText}</div>
      </div>
    );
  }

  // virtualized path: size the scroll area to totalHeight, render the slice translated down
  if (virtual?.enabled) {
    const slice = rows.slice(virtual.startIndex, virtual.endIndex);
    return (
      <div
        className="sft-tbody sft-tbody--virtual"
        role="rowgroup"
        style={{ height: virtual.totalHeight }}
      >
        <div className="sft-tbody__window" style={{ transform: `translateY(${virtual.offsetY}px)` }}>
          {slice.map((row) => (
            <Row key={row.rowId} row={row} columns={columns} />
          ))}
        </div>
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
