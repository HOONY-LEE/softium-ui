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

// react-bound type aliases
export type { ReactColumnDef, ResolvedReactColumn } from './types';

// components
export * from './components';

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
} from '@softium/table-core';
