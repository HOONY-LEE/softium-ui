import { createContext, useContext } from 'react';
import type { TableInstance } from '../hooks/useTable';
import type { TableMessages } from '../i18n';

/** runtime display settings, editable from the footer settings menu */
export interface TableSettings {
  rowBorders: boolean;
  columnBorders: boolean;
  striped: boolean;
  scrollX: boolean;
  stickyHeader: boolean;
}

export interface TableContextValue<T> {
  table: TableInstance<T>;
  messages: TableMessages;
  /** whether a leading selection checkbox column is rendered */
  selectable: boolean;
  /** horizontal scroll mode: fixed columns stay rigid (vs. shrink-to-fit) */
  scrollX: boolean;
  /** column-resize mode: handles are only active while this is on */
  resizeMode: boolean;
  toggleResizeMode: () => void;
  /** live display settings + setter (footer settings popups) */
  settings: TableSettings;
  setSetting: (key: keyof TableSettings, value: boolean) => void;
}

/** fixed width (px) of the leading selection column */
export const SELECT_COL_WIDTH = 44;

// biome-ignore lint/suspicious/noExplicitAny: context is read through the typed useTableContext<T> accessor below.
export const TableContext = createContext<TableContextValue<any> | null>(null);

export function useTableContext<T>(): TableContextValue<T> {
  const ctx = useContext(TableContext);
  if (!ctx) {
    throw new Error('softium-ui: Table subcomponents must be rendered inside <Table>.');
  }
  return ctx as TableContextValue<T>;
}
