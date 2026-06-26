import type { Filter } from '@softium/table-core';
import type { ReactNode } from 'react';
import type { ResolvedReactColumn } from '../types';
import { cellStyle } from './Cell';
import { useTableContext } from './context';

export interface FilterRowProps<T> {
  columns: ResolvedReactColumn<T>[];
}

/**
 * Per-column filter inputs (SPEC §4). A column opts in with `filterable: true`.
 * Each input applies a structured `contains` Filter to that column — separate state
 * from the global search box. Clearing the input removes the filter.
 */
export function FilterRow<T>({ columns }: FilterRowProps<T>): ReactNode {
  const { table, messages } = useTableContext<T>();
  const filters = table.getFilters();
  const valueByKey = new Map(filters.map((f) => [f.columnKey, f.value]));

  return (
    <div className="sft-tr sft-tr--filter" role="row">
      {columns.map((column) => {
        const current = valueByKey.get(column.key);
        return (
          <div
            key={column.key}
            className="sft-filter-cell"
            data-pinned={column.pinned ?? undefined}
            style={cellStyle(column)}
          >
            {column.filterable && (
              <input
                className="sft-filter-input"
                type="text"
                value={typeof current === 'string' ? current : ''}
                placeholder={messages.searchPlaceholder}
                aria-label={column.displayLabel}
                onChange={(e) => {
                  const value = e.target.value;
                  const filter: Filter | null = value
                    ? { columnKey: column.key, operator: 'contains', value }
                    : null;
                  table.setColumnFilter(column.key, filter);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
