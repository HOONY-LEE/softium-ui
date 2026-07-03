/**
 * @softium/table-core
 *
 * Headless core for the softium-ui Table.
 * Pure TypeScript — does not import React, DOM, or `window`.
 */

export const VERSION = '0.0.0';

// types — the contract
export type {
  ColumnAlign,
  ColumnDef,
  ColumnState,
  ColumnType,
  CellContext,
  Filter,
  FilterOperator,
  HeaderContext,
  PinSide,
  ResolvedColumn,
  Row,
  SearchState,
  SortDirection,
  SortRule,
  TableInput,
} from './types';

// adapters — absorb any server shape
export * from './adapters';

// derive — pure view derivations (no mutation of inputs)
export * from './derive';

// export — CSV / JSON / XML / XLSX serializers (DOM-free)
export * from './export';
