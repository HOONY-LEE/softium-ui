import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { TableInstance } from '../hooks/useTable';
import { resolveMessages } from '../i18n';
import type { LocaleKey, TableMessages } from '../i18n';
import { Body } from './Body';
import { FilterRow } from './FilterRow';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { TableContext } from './context';

export interface TableProps<T> {
  table: TableInstance<T>;
  /** UI language for the library's own strings (not column headers). Default 'ko'. */
  locale?: LocaleKey;
  /** override individual UI strings */
  messages?: Partial<TableMessages>;
  /** override the empty-state content */
  emptyText?: ReactNode;
  /** show the column-control toolbar (visibility / rename / pin / reset). Default true. */
  toolbar?: boolean;
  /** extra class on the root element */
  className?: string;
}

/**
 * The batteries-included table. One line renders a fully styled table:
 *
 *   <Table table={table} />
 *
 * Header/Body/Row/Cell are also exported for advanced composition; they read the
 * same instance via context.
 */
export function Table<T>({
  table,
  locale,
  messages,
  emptyText,
  toolbar = true,
  className,
}: TableProps<T>): ReactNode {
  const resolvedMessages = useMemo(() => resolveMessages(locale, messages), [locale, messages]);
  const columns = table.getRenderColumns();
  const rows = table.getRows();
  const hasFilters = columns.some((c) => c.filterable);

  const contextValue = useMemo(
    () => ({ table, messages: resolvedMessages }),
    [table, resolvedMessages],
  );

  return (
    <TableContext.Provider value={contextValue}>
      <div className={className ? `sft-table ${className}` : 'sft-table'}>
        {toolbar && <Toolbar />}
        <div className="sft-table__scroll" role="table">
          <Header columns={columns} />
          {hasFilters && <FilterRow columns={columns} />}
          <Body rows={rows} columns={columns} emptyText={emptyText ?? resolvedMessages.emptyText} />
        </div>
      </div>
    </TableContext.Provider>
  );
}
