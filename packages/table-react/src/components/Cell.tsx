import type { Row } from '@softium/table-core';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ResolvedReactColumn } from '../types';
import { useTableContext } from './context';

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
      return value ? <Check size={15} /> : '';
    case 'date': {
      const d = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
    }
    default:
      return String(value);
  }
}

export function Cell<T>({ row, column }: CellProps<T>): ReactNode {
  const { scrollX } = useTableContext<T>();
  const value = row.data[column.key];

  const content = column.renderCell
    ? column.renderCell({ row, column: column.def, value })
    : formatValue(value, column.type);

  return (
    <div
      className="sft-td"
      role="cell"
      data-col-key={column.key}
      data-align={column.align}
      data-pinned={column.pinned ?? undefined}
      style={cellStyle(column, scrollX)}
    >
      <span className="sft-td__content">{content}</span>
    </div>
  );
}

export function cellStyle<T>(column: ResolvedReactColumn<T>, scrollX = false): React.CSSProperties {
  const { width, minWidth, maxWidth, flex } = column;

  // flexible column: grows to absorb leftover space (fills the container)
  if (flex && flex > 0) {
    return { flex: `${flex} 1 ${width ?? 0}px`, minWidth: minWidth ?? 0, maxWidth };
  }
  // fixed column — rigid in scroll mode, shrink-to-fit in the default (no-scroll) mode
  if (width) {
    return scrollX
      ? { flex: `0 0 ${width}px`, width, minWidth: minWidth ?? width, maxWidth }
      : { flex: `0 1 ${width}px`, minWidth: minWidth ?? 64, maxWidth };
  }
  // width-less column behaves as flex:1 (legacy default)
  return { flex: '1 1 0', minWidth: minWidth ?? 80, maxWidth };
}
