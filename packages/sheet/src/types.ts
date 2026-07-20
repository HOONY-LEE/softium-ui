/**
 * Internal model types for the Sheet grid: selection geometry, per-cell
 * formatting, merges, and the undo/redo snapshot shape. Not part of the public
 * API surface (SheetProps stays value-only) — kept here so Sheet.tsx and the
 * constants/series modules can share them without a circular import.
 */

export interface CellPos {
  c: number;
  r: number;
}

/** one rectangular selection: `anchor` is its own editable cell, `focus` is
 * the far corner it's dragged/extended to. A single cell is anchor===focus. */
export interface CellRange {
  anchor: CellPos;
  focus: CellPos;
}

export interface CellRect {
  minC: number;
  maxC: number;
  minR: number;
  maxR: number;
}

export function rectOf(range: CellRange): CellRect {
  return {
    minC: Math.min(range.anchor.c, range.focus.c),
    maxC: Math.max(range.anchor.c, range.focus.c),
    minR: Math.min(range.anchor.r, range.focus.r),
    maxR: Math.max(range.anchor.r, range.focus.r),
  };
}

export type CellAlign = 'left' | 'center' | 'right';
export type CellValign = 'top' | 'middle' | 'bottom';
export type CellWrap = 'overflow' | 'wrap' | 'clip';

export interface BorderSpec {
  color: string;
  width: number;
  style: 'solid' | 'dashed' | 'dotted';
}

export interface CellBorders {
  top?: BorderSpec;
  right?: BorderSpec;
  bottom?: BorderSpec;
  left?: BorderSpec;
}

/** per-cell character formatting, applied from the toolbar to the selection.
 * Separate from cell *values* so it can be undone/serialized independently. */
export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** text color (any CSS color) */
  color?: string;
  /** fill / background color */
  bg?: string;
  /** per-cell horizontal align, overriding the column's type-based default */
  align?: CellAlign;
  /** display-only number format pattern (e.g. '#,##0.00', '0.00%', '$#,##0.00') */
  numFmt?: string;
  fontFamily?: string;
  /** px */
  fontSize?: number;
  valign?: CellValign;
  wrap?: CellWrap;
  borders?: CellBorders;
}

/** a merged rectangular block of cells, anchored at (c, r) */
export interface CellMerge {
  c: number;
  r: number;
  colSpan: number;
  rowSpan: number;
}

/** the full undo/redo-able document state */
export interface SheetSnapshot {
  cells: Record<string, string>;
  formats: Record<string, CellFormat>;
  colWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  rowCount: number;
  colCount: number;
  merges: CellMerge[];
}

export type BoolFormatKey = 'bold' | 'italic' | 'underline' | 'strike';
