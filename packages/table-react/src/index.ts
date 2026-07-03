/**
 * @softium/table-react
 *
 * React bindings for the softium-ui Table: the `useTable` hook, batteries-included
 * styled components, and i18n.
 *
 * Remember to import the stylesheet once in your app:
 *   import '@softium/table-styles';
 */

export const VERSION = '0.0.0';

// the hook + instance
export { useTable } from './hooks/useTable';
export type {
  ColumnStateUpdater,
  TableInstance,
  UseTableOptions,
} from './hooks/useTable';
export { useVirtualRows } from './hooks/useVirtualRows';
export type { UseVirtualRowsOptions, VirtualWindow } from './hooks/useVirtualRows';

// columnState persistence
export { clearColumnState, loadColumnState, saveColumnState } from './persistence';

// react-bound type aliases
export type { ReactColumnDef, ResolvedReactColumn } from './types';

// components
export * from './components';

// built-in cell renderers
export * from './cells';

// sheet (minimal spreadsheet)
export * from './sheet';

// export helpers (build the export matrix from a table instance + trigger a download)
export { buildExportTable, downloadTableExport } from './export/download';
export type { DownloadOptions } from './export/download';

// i18n
export {
  defaultMessages,
  en,
  ko,
  locales,
  resolveMessages,
} from './i18n';
export type { LocaleKey, TableMessages } from './i18n';

// re-export the core types/utilities so consumers need a single dependency
export type {
  CellContext,
  ColumnDef,
  ColumnState,
  ColumnType,
  Filter,
  FilterOperator,
  HeaderContext,
  PinSide,
  PivotAggregate,
  PivotConfig,
  PivotResult,
  ResolvedColumn,
  Row,
  SearchState,
  SortRule,
  TableInput,
} from '@softium/table-core';
export {
  adaptArray,
  adaptDynamicSchema,
  adaptPaginated,
  pivot,
} from '@softium/table-core';
