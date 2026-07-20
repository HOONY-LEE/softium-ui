/**
 * Sheet — minimal spreadsheet (A1 grid + formulas). A separate, positional track
 * from the schema-bound Table / DataGrid.
 */
export { Sheet } from './Sheet';
export type { SheetProps } from './Sheet';
export {
  cellAddr,
  colToIndex,
  evaluateCell,
  indexToCol,
} from './engine';
export type { RawGetter } from './engine';
