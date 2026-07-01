import { createContext, useContext } from 'react';
import type { TableInstance } from '../hooks/useTable';
import type { TableMessages } from '../i18n';

export type TableDensity = 'compact' | 'normal' | 'comfortable';

/** when inline editing is allowed (DataGrid) */
export type EditMode = 'always' | 'toggle';
/** when edits reach the host: per-cell (immediate) or batched behind a Save button */
export type CommitMode = 'cell' | 'batch';

/** a single staged cell edit (batch commit mode) */
export interface CellChange {
  rowId: string;
  columnKey: string;
  value: unknown;
}

/** runtime display settings, editable from the footer settings menu */
export interface TableSettings {
  rowBorders: boolean;
  columnBorders: boolean;
  striped: boolean;
  scrollX: boolean;
  stickyHeader: boolean;
  density: TableDensity;
}

export interface TableContextValue<T> {
  table: TableInstance<T>;
  messages: TableMessages;
  /** whether a leading selection checkbox column is rendered */
  selectable: boolean;
  /** whether a leading row-number (index) column is rendered */
  indexColumn: boolean;
  /** absolute index of the first row on the current page (for the index column) */
  indexOffset: number;
  /** horizontal scroll mode: fixed columns stay rigid (vs. shrink-to-fit) */
  scrollX: boolean;
  /** column-resize mode: handles are only active while this is on */
  resizeMode: boolean;
  toggleResizeMode: () => void;
  /** inline cell editing (DataGrid) — true when the grid supports editing at all */
  editable: boolean;
  /** edit-mode policy: 'always' (cells always editable) or 'toggle' (behind a button) */
  editMode: EditMode;
  /** commit policy: 'cell' (immediate) or 'batch' (staged until Save) */
  commitMode: CommitMode;
  /** whether editing is currently active (always-mode: always true; toggle-mode: user-driven) */
  editEnabled: boolean;
  /** turn edit mode on (toggle mode) */
  enableEdit: () => void;
  /** turn edit mode off, clearing the active/editing cell (toggle mode) */
  exitEdit: () => void;
  /** the currently selected cell (one click); editing is a second click / Enter */
  activeCell: { rowId: string; columnKey: string } | null;
  setActiveCell: (cell: { rowId: string; columnKey: string } | null) => void;
  editingCell: { rowId: string; columnKey: string } | null;
  beginEdit: (rowId: string, columnKey: string) => void;
  cancelEdit: () => void;
  commitEdit: (rowId: string, columnKey: string, value: unknown) => void;
  /** number of staged (unsaved) cell edits (batch mode) */
  dirtyCount: number;
  /** staged value for a cell, if it has an unsaved edit */
  getStaged: (rowId: string, columnKey: string) => { dirty: boolean; value: unknown };
  /** flush all staged edits to the host (batch mode) */
  saveAll: () => void;
  /** drop all staged edits (batch mode) */
  discardAll: () => void;
  /** live display settings + setters (footer settings popups) */
  settings: TableSettings;
  setSetting: (
    key: 'rowBorders' | 'columnBorders' | 'striped' | 'scrollX' | 'stickyHeader',
    value: boolean,
  ) => void;
  setDensity: (density: TableDensity) => void;
}

/** fixed width (px) of the leading selection column */
export const SELECT_COL_WIDTH = 44;

/** fixed width (px) of the leading row-number (index) column */
export const INDEX_COL_WIDTH = 56;

// biome-ignore lint/suspicious/noExplicitAny: context is read through the typed useTableContext<T> accessor below.
export const TableContext = createContext<TableContextValue<any> | null>(null);

export function useTableContext<T>(): TableContextValue<T> {
  const ctx = useContext(TableContext);
  if (!ctx) {
    throw new Error('softium-ui: Table subcomponents must be rendered inside <Table>.');
  }
  return ctx as TableContextValue<T>;
}
