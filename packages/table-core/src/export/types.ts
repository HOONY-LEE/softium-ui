/** a single exportable cell value */
export type ExportCell = string | number | boolean | null | undefined;

/** a rectangular export view: header labels + a matrix of stringifiable cells */
export interface ExportTable {
  headers: string[];
  rows: ExportCell[][];
}

/** the supported export formats */
export type ExportFormat = 'csv' | 'json' | 'xml' | 'xlsx';
