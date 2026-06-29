/**
 * softium-ui — core type system (SPEC §3).
 *
 * This file is the contract. Guardrails encoded here:
 *   - `label` (immutable, export/binding key) ≠ `labelOverride` (user-facing, display only)
 *   - `rowId` (stable PK) ≠ `displayIndex` (per-page position) ≠ `globalIndex` (dataset position)
 *   - no `any`; the row type `T` is inferred end-to-end via generics
 *   - no React/DOM: cell/header renderers return a generic `TNode` (the React layer
 *     binds `TNode = ReactNode`), so table-core stays framework-agnostic.
 */

// ── column blueprint (structure, not data) ──────────────────────────
export type ColumnType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'custom';

export type ColumnAlign = 'left' | 'center' | 'right';

export interface ColumnDef<T, TNode = unknown> {
  /** data-binding key (unique, immutable) */
  key: keyof T & string;
  /** original header text — the export/binding anchor. The user cannot change this. */
  label: string;
  type?: ColumnType;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  /** grow weight: a column with flex > 0 absorbs leftover horizontal space so the
   *  table fills its container (no empty gap on the right). 0/undefined = fixed width. */
  flex?: number;
  align?: ColumnAlign;
  sortable?: boolean;
  /** sort by a derived value instead of `row[key]` (e.g. an enum's rank). */
  sortAccessor?: (row: T) => string | number | boolean | Date | null | undefined;
  /** full custom comparator (ascending); overrides type/accessor. Receives raw rows. */
  sortComparator?: (a: T, b: T) => number;
  filterable?: boolean;
  resizable?: boolean;
  pinnable?: boolean;
  hideable?: boolean;
  /** allow inline editing of this column's cells (DataGrid). Default false. */
  editable?: boolean;
  /** custom cell renderer. Returns `TNode` so core has no React dependency. */
  renderCell?: (ctx: CellContext<T>) => TNode;
  renderHeader?: (ctx: HeaderContext<T, TNode>) => TNode;
}

// ── user view state (the spreadsheet-like, persisted layer) ─────────
export type PinSide = 'left' | 'right' | null;

export interface ColumnState {
  key: string;
  visible: boolean;
  order: number;
  width?: number;
  pinned?: PinSide;
  /** user-chosen text alignment override (falls back to ColumnDef.align) */
  align?: ColumnAlign;
  /** user-renamed column header. Kept SEPARATE from `label` so data mapping never breaks. */
  labelOverride?: string;
}

// ── row ─────────────────────────────────────────────────────────────
export interface Row<T> {
  /** stable identifier (PK). Never conflate with displayIndex. */
  rowId: string;
  /** 1-based position within the current page/view. Resets when the page changes. */
  displayIndex: number;
  /** 1-based position within the full dataset. Page-independent and unique. */
  globalIndex: number;
  /** the original object (immutable — never mutated by the library) */
  data: T;
  selected?: boolean;
}

// ── cell (row × column intersection) ────────────────────────────────
export interface CellContext<T> {
  row: Row<T>;
  column: ColumnDef<T>;
  value: T[keyof T];
}

export interface HeaderContext<T, TNode = unknown> {
  column: ColumnDef<T, TNode>;
  /** the label currently shown (labelOverride ?? label) */
  displayLabel: string;
}

// ── search (global text match, UX) vs filter (data query) — kept apart ──
export interface SearchState {
  query: string;
  /** which columns to search; 'all' or an explicit list of column keys */
  scope: 'all' | string[];
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'between'
  | 'in';

export interface Filter {
  columnKey: string;
  operator: FilterOperator;
  value: unknown;
  /** second operand for `between` */
  value2?: unknown;
}

export type SortDirection = 'asc' | 'desc';

export interface SortRule {
  columnKey: string;
  direction: SortDirection;
}

// ── the canonical library input (an adapter's eventual output) ──────
export interface TableInput<T, TNode = unknown> {
  data: T[];
  columns: ColumnDef<T, TNode>[];
  /** stable row id resolver. Falls back to a global-index string when absent. */
  getRowId?: (row: T) => string;
}

// ── resolved column: ColumnDef merged with ColumnState, ready to render ──
export interface ResolvedColumn<T, TNode = unknown> {
  key: keyof T & string;
  /** immutable original label */
  label: string;
  /** what the header should display: labelOverride ?? label */
  displayLabel: string;
  type: ColumnType;
  align: ColumnAlign;
  order: number;
  visible: boolean;
  pinned: PinSide;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  sortable: boolean;
  filterable: boolean;
  resizable: boolean;
  pinnable: boolean;
  hideable: boolean;
  editable: boolean;
  renderCell?: (ctx: CellContext<T>) => TNode;
  renderHeader?: (ctx: HeaderContext<T, TNode>) => TNode;
  /** the originating definition (escape hatch for advanced renderers) */
  def: ColumnDef<T, TNode>;
}
