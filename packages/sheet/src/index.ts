/**
 * Sheet — minimal spreadsheet (A1 grid + formulas). A separate, positional track
 * from the schema-bound Table / DataGrid.
 *
 * `Sheet` is a single grid; `Workbook` wraps several of them in a
 * Google-Sheets-style tab bar (add / rename / delete).
 */
export { Sheet } from './Sheet';
export type { SheetProps } from './Sheet';
export { Workbook } from './Workbook';
export type { WorkbookProps } from './Workbook';
export { cellAddr, colToIndex, evaluateCell, indexToCol } from './engine';
export type { RawGetter } from './engine';
