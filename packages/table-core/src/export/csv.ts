import type { ExportCell, ExportTable } from './types';

export interface CsvOptions {
  /** field delimiter. Default ",". Use "\t" for TSV. */
  delimiter?: string;
}

function escapeCell(value: ExportCell, delimiter: string): string {
  const s = value == null ? '' : String(value);
  if (s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serialize an export table to RFC-4180 CSV (CRLF line breaks). */
export function toCSV(table: ExportTable, options: CsvOptions = {}): string {
  const delimiter = options.delimiter ?? ',';
  const lines: string[] = [table.headers.map((h) => escapeCell(h, delimiter)).join(delimiter)];
  for (const row of table.rows) {
    lines.push(row.map((c) => escapeCell(c, delimiter)).join(delimiter));
  }
  return lines.join('\r\n');
}
