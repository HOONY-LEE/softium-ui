import type { ReactNode } from 'react';
import type { ResolvedReactColumn } from '../types';
import { cellStyle } from './Cell';

export interface HeaderProps<T> {
  columns: ResolvedReactColumn<T>[];
}

export function Header<T>({ columns }: HeaderProps<T>): ReactNode {
  return (
    <div className="sft-thead" role="rowgroup">
      <div className="sft-tr sft-tr--head" role="row">
        {columns.map((column) => (
          <div
            key={column.key}
            className="sft-th"
            role="columnheader"
            data-align={column.align}
            data-pinned={column.pinned ?? undefined}
            style={cellStyle(column)}
          >
            <span className="sft-th__label">
              {column.renderHeader
                ? column.renderHeader({ column: column.def, displayLabel: column.displayLabel })
                : column.displayLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
