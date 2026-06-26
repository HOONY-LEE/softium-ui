import { createContext, useContext } from 'react';
import type { TableInstance } from '../hooks/useTable';
import type { TableMessages } from '../i18n';

export interface TableContextValue<T> {
  table: TableInstance<T>;
  messages: TableMessages;
}

// biome-ignore lint/suspicious/noExplicitAny: context is read through the typed useTableContext<T> accessor below.
export const TableContext = createContext<TableContextValue<any> | null>(null);

export function useTableContext<T>(): TableContextValue<T> {
  const ctx = useContext(TableContext);
  if (!ctx) {
    throw new Error('softium-ui: Table subcomponents must be rendered inside <Table>.');
  }
  return ctx as TableContextValue<T>;
}
