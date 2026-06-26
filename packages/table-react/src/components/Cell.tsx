import type { Row } from '@softium/table-core';
import type { ReactNode } from 'react';
import type { ResolvedReactColumn } from '../types';

export interface CellProps<T> {
  row: Row<T>;
  column: ResolvedReactColumn<T>;
}

/** Default value formatting per column type. Custom renderers bypass this entirely. */
function formatValue(value: unknown, type: ResolvedReactColumn<unknown>['type']): ReactNode {
  if (value === null || value === undefined || value === '') return null;
  switch (type) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    case 'boolean':
      return value ? '✓' : '';
    case 'date': {
      const d = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
    }
    default:
      return String(value);
  }
}

export function Cell<T>({ row, column }: CellProps<T>): ReactNode {
  const value = row.data[column.key];

  const content = column.renderCell
    ? column.renderCell({ row, column: column.def, value })
    : formatValue(value, column.type);

  return (
    <div
      className="sft-td"
      role="cell"
      data-align={column.align}
      data-pinned={column.pinned ?? undefined}
      style={cellStyle(column)}
    >
      <span className="sft-td__content">{content}</span>
    </div>
  );
}

export function cellStyle<T>(column: ResolvedReactColumn<T>): React.CSSProperties {
  const width = column.width;
  return width
    ? { flex: `0 0 ${width}px`, width, minWidth: column.minWidth ?? width }
    : { flex: '1 1 0', minWidth: column.minWidth ?? 80 };
}
